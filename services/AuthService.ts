/**
 * AuthService.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Service d'authentification unifié — gère tous les rôles :
 *   SUPER-ADMIN · ADMIN · MANAGER · PROVIDER
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
 * ──────────────────────────────────────────────────────────────────────────────
 */

import axiosInstance from "../core/axios";

// ─── Clés localStorage ────────────────────────────────────────────────────────
const AUTH_TOKEN_KEY    = "auth_token";
const USER_ROLE_KEY     = "user_role";
const PENDING_EMAIL_KEY = "pending_otp_email"; // Email en attente de vérification OTP
const PENDING_FLOW_KEY  = "pending_otp_flow";  // "login" | "reset" — distingue les deux flux OTP

// ─── Types ────────────────────────────────────────────────────────────────────
export type UserRole = "SUPER-ADMIN" | "ADMIN" | "MANAGER" | "PROVIDER";

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
export const getDashboardRoute = (role: UserRole): string => {
  switch (role) {
    case "SUPER-ADMIN":
      return "/admin/dashboard";
    case "ADMIN":
      return "/admin/dashboard";
    case "MANAGER":
      return "/manager/dashboard";
    case "PROVIDER":
      return "/provider/dashboard";
    default:
      return "/login";
  }
};

// ─── Endpoints unifiés ────────────────────────────────────────────────────────
// Le backend Laravel expose plusieurs préfixes (super-admin, admin, manager, provider)
// mais le AuthService Laravel gère tous les rôles depuis le même controller.
// On utilise /admin comme point d'entrée unifié — le back détecte le rôle tout seul.
const LOGIN_ENDPOINT            = "/admin/login";
const VERIFY_OTP_ENDPOINT       = "/admin/verify-otp";
const LOGOUT_ENDPOINT           = "/admin/logout";
const FORGOT_PASSWORD_ENDPOINT  = "/admin/forgot-password";
const RESET_PASSWORD_ENDPOINT   = "/admin/reset-password";

// ─── Service ─────────────────────────────────────────────────────────────────
export const authService = {

  // ┌─────────────────────────────────────────────────────────────────────────┐
  // │  ÉTAPE 1 — Login (email + password)                                     │
  // └─────────────────────────────────────────────────────────────────────────┘
  /**
   * Envoie email + password au backend.
   * Laravel vérifie les credentials, envoie l'OTP par mail,
   * et retourne { otp_required: true, email }.
   * On stocke l'email en "pending" pour la page OTP.
   * Fonctionne pour tous les rôles : SUPER-ADMIN, ADMIN, MANAGER, PROVIDER.
   */
  login: async (credentials: { email: string; password: string }): Promise<LoginStepResponse> => {
    const response = await axiosInstance.post(LOGIN_ENDPOINT, credentials);
    const data = response.data?.data as LoginStepResponse;

    if (data?.otp_required && data?.email) {
      // Stocker l'email et marquer le flux comme "login" (pas "reset")
      if (typeof window !== "undefined") {
        localStorage.setItem(PENDING_EMAIL_KEY, data.email);
        localStorage.setItem(PENDING_FLOW_KEY, "login");
      }
    }

    return data;
  },

  /** Alias pour compatibilité avec le code existant sur login/page.tsx */
  loginAdmin: async (credentials: { email: string; password: string }): Promise<LoginStepResponse> => {
    return authService.login(credentials);
  },

  // ┌─────────────────────────────────────────────────────────────────────────┐
  // │  ÉTAPE 2 — Vérification OTP (connexion)                                 │
  // └─────────────────────────────────────────────────────────────────────────┘
  /**
   * Envoie email + code OTP au backend.
   * Laravel vérifie le code, retourne { user, token } en cas de succès.
   * On persiste la session (token, rôle, infos user) dans le localStorage.
   */
  verifyOtp: async (email: string, code: string): Promise<AuthResponse> => {
    const response = await axiosInstance.post(VERIFY_OTP_ENDPOINT, { email, code });
    const data = response.data?.data as AuthResponse;

    if (data?.token && data?.user) {
      authService._persistSession(data);
    }

    return data;
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

    // Stocker l'email + marquer le flux comme "reset"
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
    // POST /admin/reset-password { email, code, password, password_confirmation }
    // Laravel valide : email|required, code|size:6, password|min:8|confirmed
    await axiosInstance.post(RESET_PASSWORD_ENDPOINT, data);

    // Nettoyer email pending + flux après succès
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
      // POST /admin/logout — Laravel révoque le token Sanctum
      await axiosInstance.post(LOGOUT_ENDPOINT);
    } catch (error) {
      // On continue même si le logout back échoue (token expiré, réseau, etc.)
      console.warn("Erreur logout backend (ignorée):", error);
    } finally {
      // Nettoyage complet du localStorage dans tous les cas
      const keys = [
        AUTH_TOKEN_KEY,
        USER_ROLE_KEY,
        PENDING_EMAIL_KEY,
        PENDING_FLOW_KEY,
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
    localStorage.setItem(USER_ROLE_KEY, user.role ?? "");
    localStorage.setItem("user_email", user.email ?? "");
    localStorage.setItem("user_id", String(user.id ?? ""));

    // Le backend peut retourner first_name/last_name OU un champ name unique
    const firstName = user.first_name ?? "";
    const lastName  = user.last_name  ?? "";

    if (firstName || lastName) {
      localStorage.setItem("first_name", firstName);
      localStorage.setItem("last_name", lastName);
    } else if (user.name) {
      // Fallback : split sur le premier espace
      const parts = user.name.trim().split(/\s+/);
      localStorage.setItem("first_name", parts[0] ?? "");
      localStorage.setItem("last_name", parts.slice(1).join(" ") ?? "");
    } else {
      localStorage.setItem("first_name", "");
      localStorage.setItem("last_name", "");
    }
  },

  /**
   * À appeler APRÈS que router.replace(dashboardRoute) est déclenché.
   * Nettoie l'email OTP temporaire et le flux pending.
   * Voir le commentaire "ORDRE CRITIQUE" dans login/otp/page.tsx.
   */
  clearPendingEmail: (): void => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(PENDING_EMAIL_KEY);
      localStorage.removeItem(PENDING_FLOW_KEY);
    }
  },

  // ┌─────────────────────────────────────────────────────────────────────────┐
  // │  Getters                                                                 │
  // └─────────────────────────────────────────────────────────────────────────┘
  getFirstName    : (): string => typeof window !== "undefined" ? localStorage.getItem("first_name")      ?? "" : "",
  getLastName     : (): string => typeof window !== "undefined" ? localStorage.getItem("last_name")       ?? "" : "",
  getRole         : (): string => typeof window !== "undefined" ? localStorage.getItem(USER_ROLE_KEY)     ?? "" : "",
  getEmail        : (): string => typeof window !== "undefined" ? localStorage.getItem("user_email")      ?? "" : "",
  getUserId       : (): string => typeof window !== "undefined" ? localStorage.getItem("user_id")         ?? "" : "",
  getPendingEmail : (): string => typeof window !== "undefined" ? localStorage.getItem(PENDING_EMAIL_KEY) ?? "" : "",
  /** Retourne le flux OTP en cours : "login" | "reset" | "" */
  getPendingFlow  : (): OtpFlow | "" => typeof window !== "undefined" ? (localStorage.getItem(PENDING_FLOW_KEY) as OtpFlow) ?? "" : "",

  getToken: (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(AUTH_TOKEN_KEY);
  },

  /**
   * Vérifie si l'utilisateur est authentifié (token + rôle valide).
   * Utilisé par les guards de route.
   */
  isAuthenticated: (): boolean => {
    if (typeof window === "undefined") return false;
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const role  = localStorage.getItem(USER_ROLE_KEY) as UserRole | null;
    const validRoles: UserRole[] = ["SUPER-ADMIN", "ADMIN", "MANAGER", "PROVIDER"];
    return !!token && !!role && validRoles.includes(role);
  },

  /**
   * Vérifie si le rôle courant est dans la liste des rôles autorisés.
   */
  hasRole: (allowedRoles: UserRole[]): boolean => {
    const role = authService.getRole() as UserRole;
    return allowedRoles.includes(role);
  },
};