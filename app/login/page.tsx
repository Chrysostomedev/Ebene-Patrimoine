/**
 * app/login/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Page de connexion UNIFIÉE - tous les rôles sur la même page.
 *
 * Flux :
 *   1. L'utilisateur saisit email + password
 *   2. authService.login() tente les endpoints dans l'ordre (super-admin → admin → manager → provider)
 *   3. Le back répond { otp_required: true, email, role } → OTP envoyé par mail
 *   4. On stocke l'email pending + le préfixe endpoint dans le localStorage
 *   5. Redirection vers /login/otp
 *
 * NOTE : Pas de sélection de rôle côté front - le backend détecte le rôle automatiquement.
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Image from "next/image";
import { Mail, Lock, Eye, EyeOff, ArrowRight, ChevronDown } from "lucide-react";
import { authService, getDashboardRoute } from "../../services/AuthService";
import type { UserRole } from "../../services/AuthService";

// ─── Pays CANAL+ Afrique ──────────────────────────────────────────────────────
// Les drapeaux sont chargés depuis flagcdn.com (CDN fiable, SVG, code ISO 3166-1 alpha-2)
const CANAL_COUNTRIES = [
  { code: "ci", name: "Côte d'Ivoire"  },
  { code: "sn", name: "Sénégal"        },
  { code: "cm", name: "Cameroun"       },
  { code: "bf", name: "Burkina Faso"   },
  { code: "ml", name: "Mali"           },
  { code: "gn", name: "Guinée"         },
  { code: "tg", name: "Togo"           },
  { code: "bj", name: "Bénin"          },
  { code: "ne", name: "Niger"          },
  { code: "ga", name: "Gabon"          },
  { code: "cg", name: "Congo"          },
  { code: "cd", name: "RD Congo"       },
  { code: "mg", name: "Madagascar"     },
  { code: "mu", name: "Maurice"        },
  { code: "re", name: "La Réunion"     },
  { code: "gh", name: "Ghana"          },
  { code: "ng", name: "Nigéria"        },
  { code: "za", name: "Afrique du Sud" },
  { code: "ke", name: "Kenya"          },
  { code: "tz", name: "Tanzanie"       },
  { code: "ug", name: "Ouganda"        },
  { code: "rw", name: "Rwanda"         },
  { code: "et", name: "Éthiopie"       },
  { code: "mz", name: "Mozambique"     },
  { code: "zm", name: "Zambie"         },
  { code: "zw", name: "Zimbabwe"       },
  { code: "ao", name: "Angola"         },
] as const;

/** Retourne l'URL du drapeau PNG pour un code pays ISO */
const flagUrl = (code: string) =>
  `https://flagcdn.com/w20/${code}.png`;
// ─────────────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");

  // ── Sélecteur de pays - Côte d'Ivoire par défaut ──
  const [selectedCountry, setSelectedCountry] = useState<(typeof CANAL_COUNTRIES)[number]>(
    CANAL_COUNTRIES[0]
  );
  const [countryOpen, setCountryOpen] = useState(false);
  const [currentYear, setCurrentYear] = useState<number | string>("--");

  useEffect(() => {
    if (authService.isAuthenticated()) {
      const role = authService.getRole() as UserRole;
      router.replace(getDashboardRoute(role));
    }
  }, [router]);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);
  // ──────────────────────────────────────────────────

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Veuillez remplir tous les champs.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // authService.login() tente super-admin → admin → manager → provider
      // et stocke automatiquement le préfixe endpoint pour les étapes suivantes
      const data = await authService.login({ email, password, country: selectedCountry.code });

      if (data?.otp_required) {
        // OTP envoyé par mail → aller sur la page de vérification
        router.push("/login/otp");
        return;
      }

      // Fallback si le backend répond sans OTP (connexion directe - rare)
      const role = authService.getRole() as UserRole;
      router.push(getDashboardRoute(role));

    } catch (err: unknown) {
      console.error("Erreur login:", err);
      const axiosErr = err as { response?: { data?: { message?: string; error?: string; success?: boolean }; status?: number } };
      const status   = axiosErr?.response?.status;
      let message    = axiosErr?.response?.data?.message || axiosErr?.response?.data?.error;

      if (status === 403) {
        // Erreur spécifique au cloisonnement par pays
        message = message || "Ce compte n'est pas autorisé pour le pays sélectionné.";
      } else if (status === 401 || !message) {
        message = "Identifiants invalides. Vérifiez votre email et mot de passe.";
      }

      setError(message);
      // On log uniquement le message pour éviter les overlays de dev trop agressifs
      if (process.env.NODE_ENV === 'development') {
        console.warn("[Auth] Échec connexion:", message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative bg-cover bg-center"
      style={{ backgroundImage: "url('/assets/bg_login.png')" }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-md">
        {/* Barre d'accent top */}
        <div className="h-1 w-full bg-gradient-to-r from-gray-700 to-gray-900 rounded-xl" />

        <div className="bg-white rounded-b-3xl shadow-2xl px-8 py-10">

          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Image
              src="/images/logo_canal.png"
              alt="CANAL+"
              width={160}
              height={40}
              priority
            />
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 text-center tracking-tight">
              Espace de connexion
            </h1>
            <p className="text-sm text-gray-500 text-center mt-1.5">
              Connectez-vous pour accéder à votre tableau de bord
            </p>
          </div>

          {/* Formulaire */}
          <form
            className="space-y-4"
            onSubmit={(e) => { e.preventDefault(); handleLogin(); }}
          >

            {/* ── Sélecteur de pays ────────────────────────────────────────── */}
            <div className="relative">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 ml-1">
                Pays
              </label>
              <button
                type="button"
                onClick={() => setCountryOpen((v) => !v)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl
                           border border-gray-200 bg-gray-50 text-gray-900 text-sm
                           hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900
                           focus:border-transparent focus:bg-white transition-all"
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={flagUrl(selectedCountry.code)}
                    alt={selectedCountry.name}
                    style={{ width: 24, height: 16, flexShrink: 0, borderRadius: 3, objectFit: "cover", display: "block" }}
                  />
                  <span className="font-medium truncate">{selectedCountry.name}</span>
                </span>
                <ChevronDown
                  size={15}
                  className={`text-gray-400 transition-transform duration-200 ${countryOpen ? "rotate-180" : ""}`}
                />
              </button>

              {/* Dropdown */}
              {countryOpen && (
                <div
                  className="absolute z-20 mt-1.5 w-full bg-white border border-gray-200 rounded-xl
                             shadow-xl overflow-y-auto max-h-56 divide-y divide-gray-50"
                >
                  {CANAL_COUNTRIES.map((country) => (
                    <button
                      key={country.code}
                      type="button"
                      onClick={() => {
                        setSelectedCountry(country);
                        setCountryOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left
                                  transition-colors hover:bg-gray-50
                                  ${selectedCountry.code === country.code
                                    ? "bg-gray-100 font-semibold text-gray-900"
                                    : "text-gray-700"}`}
                    >
                      <img
                        src={flagUrl(country.code)}
                        alt={country.name}
                        style={{ width: 22, height: 15, flexShrink: 0, borderRadius: 3, objectFit: "cover", display: "block" }}
                      />
                      <span>{country.name}</span>
                      {selectedCountry.code === country.code && (
                        <span className="ml-auto text-gray-900 text-xs">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* ────────────────────────────────────────────────────────────── */}

            {/* Email */}
            <div className="group relative">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 ml-1">
                Adresse email
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-gray-700 transition-colors"
                />
                <input
                  type="email"
                  placeholder="exemple@canal.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent focus:bg-white transition-all text-sm"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div className="group relative">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 ml-1">
                Mot de passe
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-gray-700 transition-colors"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent focus:bg-white transition-all text-sm"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Erreur */}
            {error && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                <span className="mt-0.5 shrink-0 text-red-500">⚠</span>
                <span>{error}</span>
              </div>
            )}

            {/* Bouton submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 mt-2 rounded-xl bg-gray-900 text-white font-semibold text-sm
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
                  Vérification en cours...
                </>
              ) : (
                <>
                  Se connecter
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            {/* Mot de passe oublié */}
            <div className="text-center mt-3">
              <a
                href="/login/password"
                className="text-sm text-gray-400 hover:text-gray-700 transition-colors underline underline-offset-2"
              >
                Mot de passe oublié ?
              </a>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-100 text-center text-xs text-gray-400">
            © {currentYear} CANAL+ • Accès réservé aux utilisateurs autorisés
          </div>
        </div>
      </div>
    </div>
  );
}