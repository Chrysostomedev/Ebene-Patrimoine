/**
 * AuthService.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Service d'authentification unifié — gère tous les rôles :
 *   SUPER-ADMIN · ADMIN · MANAGER · PROVIDER · SUPPLIER
 *
 * Flux complet :
 *   1. login()         → POST /admin/login          → OTP envoyé par mail
 *   2. verifyOtp()     → POST /admin/verify-otp     → token + user retournés
 *   3. forgotPassword()→ POST /admin/forgot-password→ OTP de reset envoyé
 *   4. resetPassword() → POST /admin/reset-password → OTP vérifié + mdp changé
 *
 * NOTE Backend : /admin/login est l'endpoint UNIFIÉ côté Laravel.
 *   Le AuthService Laravel cherche d'abord dans la table Admin, puis User.
 *   Le rôle retourné dans user.role détermine la redirection front.
 *
 * Redirection par rôle :
 *   SUPER-ADMIN → /admin/dashboard
 *   ADMIN       → /admin/dashboard
 *   MANAGER     → /manager/dashboard
 *   PROVIDER    → /provider/dashboard
 *   SUPPLIER    → /provider/dashboard (par défaut)
 * ──────────────────────────────────────────────────────────────────────────────
 */

import axiosInstance from "../core/axios";

// ─── Clés localStorage ────────────────────────────────────────────────────────
const AUTH_TOKEN_KEY    = "auth_token";
const USER_ROLE_KEY     = "user_role";
const PENDING_EMAIL_KEY = "pending_otp_email";
const PENDING_FLOW_KEY  = "pending_otp_flow";
const PENDING_PREFIX_KEY = "pending_otp_prefix"; // "admin" | "provider" | "manager" | "supplier"

// ─── Types ────────────────────────────────────────────────────────────────────
export type UserRole = "SUPER-ADMIN" | "ADMIN" | "MANAGER" | "PROVIDER" | "SUPPLIER" | "USER";

/** Flux OTP en cours — permet à la page OTP de savoir quoi faire après validation */
export type OtpFlow = "login" | "reset";

export interface AuthUser {
  id: number;
  first_name?: string;
  last_name?: string;
  name?: string;
  email: string;
  role: UserRole;
  phone?: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

/** Réponse de la 1ère étape (login → OTP envoyé) */
export interface LoginStepResponse {
  otp_required: boolean;
  email: string;
}

// ─── Helpers de routing par rôle ─────────────────────────────────────────────
/**
 * Retourne la route dashboard selon le rôle de l'utilisateur.
 * SUPER-ADMIN et ADMIN partagent /admin/dashboard.
 */
export const getDashboardRoute = (role: string): string => {
  const normalizedRole = role.toUpperCase();
  switch (normalizedRole) {
    case "SUPER-ADMIN":
    case "ADMIN":
      return "/admin/dashboard";
    case "MANAGER":
      return "/manager/dashboard";
    case "PROVIDER":
    case "SUPPLIER":
    case "USER": // Sécurité : Mapper USER vers PROVIDER
      return "/provider/dashboard";
    default:
      return "/login";
  }
};

// ─── Endpoints par préfixe ────────────────────────────────────────────────────
const PREFIXES = ["admin", "provider", "manager", "supplier"] as const;
type Prefix = typeof PREFIXES[number];

const endpoint = (prefix: string, action: string) => `/${prefix}/${action}`;

// Rétrocompat
const LOGIN_ENDPOINT          = "/admin/login";
const VERIFY_OTP_ENDPOINT     = "/admin/verify-otp";
const LOGOUT_ENDPOINT         = "/admin/logout";
const FORGOT_PASSWORD_ENDPOINT = "/admin/forgot-password";
const RESET_PASSWORD_ENDPOINT  = "/admin/reset-password";

// ─── Service ─────────────────────────────────────────────────────────────────
export const authService = {

  // ┌─────────────────────────────────────────────────────────────────────────┐
  // │  ÉTAPE 1 — Login (email + password)                                     │
  // └─────────────────────────────────────────────────────────────────────────┐
  /**
   * Envoie email + password au backend.
   * Laravel vérifie les credentials, envoie l'OTP par mail,
   * et retourne { otp_required: true, email }.
   */
  login: async (credentials: { email: string; password: string; country: string }): Promise<LoginStepResponse> => {
    // Essaie les endpoints dans l'ordre : admin → provider → manager → supplier
    const prefixesToTry: Prefix[] = ["manager", "admin", "provider", "supplier"];
    let lastError: any = null;

    for (const prefix of prefixesToTry) {
      try {
        const response = await axiosInstance.post(endpoint(prefix, "login"), credentials);
        const data = response.data?.data as LoginStepResponse & { guard?: string; role?: string };

        if (data?.otp_required && data?.email) {
          if (typeof window !== "undefined") {
            localStorage.setItem(PENDING_EMAIL_KEY, data.email);
            localStorage.setItem(PENDING_FLOW_KEY, "login");
            // Utilise le guard retourné par le back, sinon le préfixe qui a réussi
            const guardToStore = (data as any).guard ?? prefix;
            localStorage.setItem(PENDING_PREFIX_KEY, guardToStore);
          }
        }
        return data;
      } catch (err: any) {
        const status = err?.response?.status;
        if (status === 401 || status === 403 || status === 404 || status === 422) {
          lastError = err;
          continue;
        }
        throw err;
      }
    }
    throw lastError;
  },

  /** Alias pour compatibilité avec le code existant sur login/page.tsx */
  loginAdmin: async (credentials: { email: string; password: string; country: string }): Promise<LoginStepResponse> => {
    return authService.login(credentials);
  },

  // ┌─────────────────────────────────────────────────────────────────────────┐
  // │  ÉTAPE 2 — Vérification OTP (connexion)                                 │
  // └─────────────────────────────────────────────────────────────────────────┘
  verifyOtp: async (email: string, code: string): Promise<AuthResponse> => {
    // Utilise le préfixe stocké lors du login
    const storedPrefix = (typeof window !== "undefined"
      ? localStorage.getItem(PENDING_PREFIX_KEY)
      : null) ?? "admin";

    // Essaie d'abord le préfixe stocké, puis les autres en fallback
    const prefixesToTry = [storedPrefix, ...["admin", "provider", "manager", "supplier"].filter(p => p !== storedPrefix)];

    let lastError: any = null;
    for (const prefix of prefixesToTry) {
      try {
        const response = await axiosInstance.post(endpoint(prefix, "verify-otp"), { email, code });
        const data = response.data?.data as AuthResponse;
        if (data?.token && data?.user) {
          authService._persistSession(data);
        }
        return data;
      } catch (err: any) {
        const status = err?.response?.status;
        const msg: string = err?.response?.data?.message ?? "";
        // 401 avec "invalide/expiré" → vrai échec OTP, pas la peine d'essayer les autres
        if (status === 401) {
          throw err;
        }
        // 404/403 → mauvais endpoint, essaie le suivant
        lastError = err;
        continue;
      }
    }
    throw lastError;
  },

  // ┌─────────────────────────────────────────────────────────────────────────┐
  // │  ÉTAPE 3 — Mot de passe oublié                                          │
  // └─────────────────────────────────────────────────────────────────────────┘
  /**
   * Envoie l'email au backend → Laravel génère et envoie un OTP de reset.
   * On stocke l'email + le flux "reset" pour que la page OTP sache
   * qu'après validation elle doit aller vers le formulaire de nouveau mdp.
   *
   * IMPORTANT : Le backend utilise le MÊME mécanisme OTP pour le login et le reset.
   * C'est pourquoi on distingue le flux via PENDING_FLOW_KEY.
   */
  forgotPassword: async (email: string): Promise<void> => {
    // POST /admin/forgot-password { email }
    // Laravel retourne { success: true, message: "..." }
    await axiosInstance.post(FORGOT_PASSWORD_ENDPOINT, { email });

    if (typeof window !== "undefined") {
      localStorage.setItem(PENDING_EMAIL_KEY, email);
      localStorage.setItem(PENDING_FLOW_KEY, "reset");
    }
  },

  // ┌─────────────────────────────────────────────────────────────────────────┐
  // │  ÉTAPE 4 — Réinitialisation du mot de passe                             │
  // └─────────────────────────────────────────────────────────────────────────┘
  /**
   * Envoie email + code OTP + nouveau password au backend.
   * Laravel vérifie l'OTP (via OTPService) PUIS hash et sauvegarde le nouveau mdp.
   *
   * Contrairement au flux login, ici l'OTP sert à AUTORISER le changement de mdp,
   * pas à se connecter — donc pas de token retourné.
   *
   * Champs requis par Laravel resetPassword() :
   *   email, code, password, password_confirmation
   */
  resetPassword: async (data: {
    email: string;
    code: string;
    password: string;
    password_confirmation: string;
  }): Promise<void> => {
    await axiosInstance.post(RESET_PASSWORD_ENDPOINT, data);

    if (typeof window !== "undefined") {
      localStorage.removeItem(PENDING_EMAIL_KEY);
      localStorage.removeItem(PENDING_FLOW_KEY);
    }
  },

  // ┌─────────────────────────────────────────────────────────────────────────┐
  // │  Déconnexion                                                             │
  // └─────────────────────────────────────────────────────────────────────────┘
  logout: async (): Promise<void> => {
    try {
      await axiosInstance.post(LOGOUT_ENDPOINT);
    } catch (error) {
      console.warn("Erreur logout backend (ignorée):", error);
    } finally {
      const keys = [
        AUTH_TOKEN_KEY,
        USER_ROLE_KEY,
        PENDING_EMAIL_KEY,
        PENDING_FLOW_KEY,
        PENDING_PREFIX_KEY,
        "first_name",
        "last_name",
        "user_email",
        "user_id",
      ];
      if (typeof window !== "undefined") {
        keys.forEach((k) => localStorage.removeItem(k));
        window.location.href = "/login";
      }
    }
  },

  // ┌─────────────────────────────────────────────────────────────────────────┐
  // │  Persistence session                                                     │
  // └─────────────────────────────────────────────────────────────────────────┘
  /**
   * Stocke toutes les infos de session après OTP validé.
   * Méthode interne — appelée par verifyOtp().
   *
   * NE PAS supprimer PENDING_EMAIL_KEY ici :
   * la page OtpPage en a encore besoin pour son guard au mount.
   * La suppression se fait via clearPendingEmail(), appelée après router.replace().
   */
  _persistSession: (data: AuthResponse): void => {
    if (typeof window === "undefined") return;

    const { user, token } = data;

    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(USER_ROLE_KEY, (user.role ?? "").toUpperCase());
    localStorage.setItem("user_email", user.email ?? "");
    localStorage.setItem("user_id", String(user.id ?? ""));

    const firstName = user.first_name ?? "";
    const lastName = user.last_name ?? "";

    if (firstName || lastName) {
      localStorage.setItem("first_name", firstName);
      localStorage.setItem("last_name", lastName);
    } else if (user.name) {
      const parts = user.name.trim().split(/\s+/);
      localStorage.setItem("first_name", parts[0] ?? "");
      localStorage.setItem("last_name", parts.slice(1).join(" ") ?? "");
    } else {
      localStorage.setItem("first_name", "");
      localStorage.setItem("last_name", "");
    }
  },

  clearPendingEmail: (): void => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(PENDING_EMAIL_KEY);
      localStorage.removeItem(PENDING_FLOW_KEY);
      localStorage.removeItem(PENDING_PREFIX_KEY);
    }
  },

  // ┌─────────────────────────────────────────────────────────────────────────┐
  // │  Getters                                                                 │
  // └─────────────────────────────────────────────────────────────────────────┘
  getFirstName: (): string => typeof window !== "undefined" ? localStorage.getItem("first_name") ?? "" : "",
  getLastName: (): string => typeof window !== "undefined" ? localStorage.getItem("last_name") ?? "" : "",
  getRole: (): string => typeof window !== "undefined" ? localStorage.getItem(USER_ROLE_KEY) ?? "" : "",
  getEmail: (): string => typeof window !== "undefined" ? localStorage.getItem("user_email") ?? "" : "",
  getUserId: (): string => typeof window !== "undefined" ? localStorage.getItem("user_id") ?? "" : "",
  getPendingEmail: (): string => typeof window !== "undefined" ? localStorage.getItem(PENDING_EMAIL_KEY) ?? "" : "",
  getPendingFlow: (): OtpFlow | "" => typeof window !== "undefined" ? (localStorage.getItem(PENDING_FLOW_KEY) as OtpFlow) ?? "" : "",

  getToken: (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(AUTH_TOKEN_KEY);
  },

  isAuthenticated: (): boolean => {
    if (typeof window === "undefined") return false;
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const role = (localStorage.getItem(USER_ROLE_KEY) ?? "").toUpperCase() as UserRole;
    const validRoles: string[] = ["SUPER-ADMIN", "ADMIN", "MANAGER", "PROVIDER", "SUPPLIER", "USER"];
    return !!token && !!role && validRoles.includes(role);
  },

  hasRole: (allowedRoles: UserRole[]): boolean => {
    const role = (authService.getRole() ?? "").toUpperCase() as UserRole;
    const normalizedAllowed = allowedRoles.map(r => r.toUpperCase());
    if (role === "USER" && (normalizedAllowed.includes("PROVIDER") || normalizedAllowed.includes("SUPPLIER"))) return true;
    return normalizedAllowed.includes(role);
  },
};