import axiosInstance from "../core/axios";

// ─── Clés localStorage ────────────────────────────────────────────────────────
const AUTH_TOKEN_KEY    = "auth_token";
const USER_ROLE_KEY     = "user_role";
const PENDING_EMAIL_KEY = "pending_otp_email"; // Email en attente de vérification OTP

// ─── Types ────────────────────────────────────────────────────────────────────
export type UserRole = "SUPER-ADMIN" | "ADMIN" | "MANAGER";

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

// Réponse de la 1ère étape (login → OTP envoyé)
export interface LoginStepResponse {
  otp_required: boolean;
  email: string;
}

// Résultat interne de verifyOtp
export interface OtpVerifyResult {
  success: boolean;
  data?: AuthResponse;
  status?: "expired" | "invalid" | "locked";
  message?: string;
}

// ─── Helpers de routing par rôle ─────────────────────────────────────────────
export const getDashboardRoute = (role: UserRole): string => {
  switch (role) {
    case "SUPER-ADMIN":
      return "/admin/dashboard/admin";
    case "ADMIN":
      return "/admin/dashboard/admin";
    case "MANAGER":
      return "/admin/dashboard/manager";
    default:
      return "/admin/login";
  }
};

// ─── Sélection du bon endpoint selon le rôle ─────────────────────────────────
// Le backend expose 3 préfixes distincts : super-admin / admin / manager
// Mais côté front on ne connaît pas encore le rôle au moment du login.
// On utilise donc le endpoint générique /admin/login + /admin/verify-otp
// car le AuthController Laravel est partagé (même contrôleur, 3 préfixes routes).
// Si ton backend a des comportements différents par préfixe, change ici.
const LOGIN_ENDPOINT      = "/admin/login";
const VERIFY_OTP_ENDPOINT = "/admin/verify-otp";
const LOGOUT_ENDPOINT     = "/admin/logout";

// ─── Service ─────────────────────────────────────────────────────────────────
export const authService = {

  /**
   * Étape 1 — Login avec email + password.
   * Laravel envoie l'OTP par mail et retourne { otp_required: true, email }.
   * On stocke l'email en "pending" pour l'étape OTP.
   */
  loginAdmin: async (credentials: { email: string; password: string }): Promise<LoginStepResponse> => {
    const response = await axiosInstance.post(LOGIN_ENDPOINT, credentials);
    const data = response.data?.data as LoginStepResponse;

    if (data?.otp_required && data?.email) {
      // Stocker l'email temporairement pour la page OTP
      if (typeof window !== "undefined") {
        localStorage.setItem(PENDING_EMAIL_KEY, data.email);
      }
    }

    return data;
  },

  /**
   * Étape 2 — Vérification OTP.
   * Laravel retourne { user, token } en cas de succès.
   * On finalise le stockage ici.
   */
  verifyOtp: async (email: string, code: string): Promise<AuthResponse> => {
    const response = await axiosInstance.post(VERIFY_OTP_ENDPOINT, { email, code });
    const data = response.data?.data as AuthResponse;

    if (data?.token && data?.user) {
      authService._persistSession(data);
    }

    return data;
  },

  /**
   * Stockage session complet après OTP validé.
   * Séparé pour pouvoir être réutilisé (ex: refresh token).
   */
  _persistSession: (data: AuthResponse): void => {
    if (typeof window === "undefined") return;

    const { user, token } = data;

    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(USER_ROLE_KEY, user.role ?? "");
    localStorage.setItem("user_email", user.email ?? "");
    localStorage.setItem("user_id", String(user.id ?? ""));

    // Gestion du nom — backend peut retourner first_name/last_name OU name
    const firstName = user.first_name ?? "";
    const lastName  = user.last_name  ?? "";

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

    // NE PAS supprimer PENDING_EMAIL_KEY ici — la page OtpPage en a encore besoin
    // pour son guard au mount (useEffect qui vérifie si email est présent).
    // La suppression se fait dans clearPendingEmail(), appelée après router.replace().
  },

  /**
   * À appeler explicitement après que la navigation vers le dashboard
   * est confirmée. Nettoie l'email OTP temporaire.
   */
  clearPendingEmail: (): void => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(PENDING_EMAIL_KEY);
    }
  },

  logout: async (): Promise<void> => {
    try {
      await axiosInstance.post(LOGOUT_ENDPOINT);
    } catch (error) {
      console.warn("Erreur logout (ignorée):", error);
    } finally {
      const keys = [
        AUTH_TOKEN_KEY, USER_ROLE_KEY, PENDING_EMAIL_KEY,
        "first_name", "last_name", "user_email", "user_id",
      ];
      if (typeof window !== "undefined") {
        keys.forEach((k) => localStorage.removeItem(k));
        window.location.href = "/admin/login";
      }
    }
  },

  // ─── Getters ───────────────────────────────────────────────────────────────
  getFirstName    : (): string => typeof window !== "undefined" ? localStorage.getItem("first_name")     ?? "" : "",
  getLastName     : (): string => typeof window !== "undefined" ? localStorage.getItem("last_name")      ?? "" : "",
  getRole         : (): string => typeof window !== "undefined" ? localStorage.getItem(USER_ROLE_KEY)    ?? "" : "",
  getEmail        : (): string => typeof window !== "undefined" ? localStorage.getItem("user_email")     ?? "" : "",
  getUserId       : (): string => typeof window !== "undefined" ? localStorage.getItem("user_id")        ?? "" : "",
  getPendingEmail : (): string => typeof window !== "undefined" ? localStorage.getItem(PENDING_EMAIL_KEY) ?? "" : "",

  getToken: (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(AUTH_TOKEN_KEY);
  },

  /**
   * FIX CRITIQUE : manager est maintenant inclus.
   * Utilisé par les middleware/guards de route Next.js.
   */
  isAuthenticated: (): boolean => {
    if (typeof window === "undefined") return false;
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const role  = localStorage.getItem(USER_ROLE_KEY) as UserRole | null;
    const validRoles: UserRole[] = ["admin", "super-admin", "manager"];
    return !!token && !!role && validRoles.includes(role);
  },

  /**
   * Vérifie si un rôle spécifique a accès à une route.
   */
  hasRole: (allowedRoles: UserRole[]): boolean => {
    const role = authService.getRole() as UserRole;
    return allowedRoles.includes(role);
  },
};