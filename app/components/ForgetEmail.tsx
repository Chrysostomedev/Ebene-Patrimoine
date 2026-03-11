/**
 * components/ForgetEmail.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Étape 1 du flux "mot de passe oublié".
 *
 * L'utilisateur saisit son email.
 * authService.forgotPassword(email) est appelé — il tente les endpoints
 * dans l'ordre (super-admin → admin → provider) jusqu'à trouver le bon rôle.
 * Le back envoie un OTP par mail et stocke le préfixe en localStorage.
 *
 * Props :
 *   onEmailSent(email) — callback appelé après succès back, déclenchant l'étape 2
 *   backHref           — lien "Retour" (généralement "/login")
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use client";

import { useState } from "react";
import Image from "next/image";
import { Mail, ArrowLeft, ArrowRight } from "lucide-react";
import { authService } from "../../services/AuthService";

interface ForgetEmailProps {
  onEmailSent: (email: string) => void;
  backHref?: string;
}

export default function ForgetEmail({ onEmailSent, backHref = "/login" }: ForgetEmailProps) {
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handleSubmit = async () => {
    if (!email) {
      setError("Veuillez saisir votre adresse email.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // POST /{prefix}/forgot-password — le préfixe est auto-détecté
      // Le back envoie l'OTP par mail si l'email est trouvé
      await authService.forgotPassword(email);

      // Succès → passer à l'étape 2
      onEmailSent(email);

    } catch (err: unknown) {
      console.error("Erreur forgotPassword:", err);
      const axiosErr = err as { response?: { data?: { message?: string }; status?: number } };
      const status   = axiosErr?.response?.status;
      const message  = axiosErr?.response?.data?.message;

      if (status === 404 || !message) {
        setError("Aucun compte associé à cette adresse email.");
      } else {
        setError(message ?? "Une erreur est survenue. Réessayez.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative bg-cover bg-center"
      style={{ backgroundImage: "url('/images/bg-poste.png')" }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

     <div className="relative z-10 w-full max-w-md">
  <div className="rounded-3xl overflow-hidden shadow-2xl">
        <div className="h-1 w-full bg-gradient-to-r from-gray-700 to-gray-900 rounded-xl" />

        <div className="bg-white rounded-b-3xl shadow-2xl px-8 py-10">

          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Image src="/images/logo-poste.png" alt="La Poste" width={160} height={40} priority />
          </div>

          {/* Icône */}
          <div className="flex justify-center mb-5">
            <div className="w-14 h-14 rounded-2xl bg-theme-primary flex items-center justify-center shadow-lg">
              <Mail size={26} className="text-white" />
            </div>
          </div>

          {/* Header */}
          <div className="mb-7 text-center">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Mot de passe oublié
            </h1>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              Saisissez votre email. Nous vous enverrons un code de vérification.
            </p>
          </div>

          {/* Formulaire */}
          <form
            className="space-y-4"
            onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
          >
            <div className="group relative">
              <label className="block text-xs font-semibold text-theme-primary mb-1.5 ml-1">
                Adresse email
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-gray-700 transition-colors"
                />
                <input
                  type="email"
                  placeholder="exemple@laposte.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent focus:bg-white transition-all text-sm"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Erreur */}
            {error && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                <span className="mt-0.5 shrink-0">⚠</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 mt-2 rounded-xl bg-theme-primary text-white font-semibold text-sm
                         hover:bg-black disabled:bg-gray-300 disabled:cursor-not-allowed
                         transition-all duration-200 shadow-lg shadow-gray-900/20
                         flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Envoi en cours...
                </>
              ) : (
                <>
                  Envoyer le code
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Retour */}
          <div className="mt-6 pt-5 border-t border-gray-100 flex justify-center">
            <a
              href={backHref}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft size={13} />
              Retour à la connexion
            </a>
          </div>

          <div className="mt-4 text-center text-xs text-gray-400">
            © {new Date().getFullYear()} la poste• Accès sécurisé
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}