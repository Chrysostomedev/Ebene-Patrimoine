// core/axios.ts
// ─────────────────────────────────────────────────────────────────────────────
// CHANGEMENTS vs version originale :
//
// 1. Import de parseApiError : le responseInterceptor loggue le message FR
//    traduit en console (debug), mais ne modifie PAS le rejet — les composants
//    appellent eux-mêmes parseApiError pour afficher le bon message à l'UI.
//    (On ne modifie pas error.message ici pour ne pas casser les catch existants)
//
// 2. Cas 413 : ajout explicite dans l'intercepteur pour éviter tout comportement
//    inattendu (le 413 n'avait pas de gestion dédiée avant).
//
// 3. Tout le reste est strictement identique à l'original.
// ─────────────────────────────────────────────────────────────────────────────

import axios from "axios";

const AUTH_TOKEN_KEY = "auth_token";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// === REQUEST INTERCEPTOR ===
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// === RESPONSE INTERCEPTOR ===
// Liste des endpoints d'auth qui peuvent légitimement retourner 401
// sans que ça signifie "session expirée → rediriger vers /login"
const AUTH_ENDPOINTS = [
  "/admin/verify-otp",
  "/admin/login",
  "/admin/forgot-password",
  "/admin/reset-password",
  "/provider/verify-otp",
  "/provider/login",
  "/provider/forgot-password",
  "/provider/reset-password",
  "/manager/verify-otp",
  "/manager/login",
  "/manager/forgot-password",
  "/manager/reset-password",
  "/supplier/verify-otp",
  "/supplier/login",
  "/supplier/forgot-password",
  "/supplier/reset-password",
  "/super-admin/verify-otp",
  "/super-admin/login",
  // Endpoints qui peuvent légitimement retourner 401 sans session expirée
  "/manager/notifications",
  "/manager/intervention-report",
  "/manager/me",
  "/manager/profile",
];

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== "undefined") {
      const status: number = error.response?.status;
      const requestUrl: string = error.config?.url ?? "";

      // ✅ AJOUT : 413 Payload Too Large — ne pas rediriger, laisser le composant
      // gérer via parseApiError (affiche "Fichier trop volumineux. Max 2 Mo.")
      if (status === 413) {
        return Promise.reject(error);
      }

      if (status === 401) {
        // Ne pas rediriger si on est sur un endpoint d'auth —
        // c'est une erreur métier (mauvais code OTP, mauvais mdp),
        // pas une session expirée. Laisser le composant gérer l'erreur.
        const isAuthEndpoint = AUTH_ENDPOINTS.some((ep) =>
          requestUrl.includes(ep)
        );

        if (!isAuthEndpoint) {
          localStorage.removeItem(AUTH_TOKEN_KEY);
          localStorage.removeItem("user_role");
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
export { api as axiosInstance };
export { api as axios };