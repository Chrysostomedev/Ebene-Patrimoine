/**
 * components/ForgetPassword.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Étape 2 du flux "mot de passe oublié".
 *
 * L'utilisateur saisit :
 *   - Le code OTP à 6 chiffres reçu par mail
 *   - Son nouveau mot de passe
 *   - La confirmation du nouveau mot de passe
 *
 * authService.resetPassword() est appelé → POST /{prefix}/reset-password
 * Le back Laravel valide :
 *   email|required|email
 *   code|required|string|size:6         ← OTP vérifié par OTPService
 *   password|required|string|min:8|confirmed
 *
 * En cas de succès → redirection vers /login.
 *
 * Props :
 *   email      — email saisi à l'étape 1 (passé par password/page.tsx)
 *   onSuccess  — callback optionnel après succès (analytics, toast global...)
 *   backHref   — lien "Retour" (généralement "/login")
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use client";

import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Lock, Eye, EyeOff, ArrowLeft, ShieldCheck } from "lucide-react";
import { authService } from "../../services/AuthService";

const OTP_LENGTH = 6;

interface ForgetPasswordProps {
  email: string;
  onSuccess?: () => void;
  backHref?: string;
}

export default function ForgetPassword({ email, onSuccess, backHref = "/login" }: ForgetPasswordProps) {
  const router = useRouter();

  // ── State OTP ──────────────────────────────────────────────────────────────
  const [otp, setOtp]            = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [activeIndex, setActive] = useState(0);
  const inputsRef                = useRef<(HTMLInputElement | null)[]>([]);

  // ── State formulaire ───────────────────────────────────────────────────────
  const [password, setPassword]         = useState("");
  const [confirmPassword, setConfirm]   = useState("");
  const [showPassword, setShowPass]     = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);

  // ── State UI ───────────────────────────────────────────────────────────────
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");

  // ── Email masqué ────────────────────────────────────────────────────────────
  const maskedEmail = email
    ? email.replace(/(.{2})(.*)(@.*)/, (_: string, a: string, b: string, c: string) =>
        `${a}${"*".repeat(Math.min(b.length, 4))}${c}`)
    : "votre adresse email";

  // ── Saisie OTP ─────────────────────────────────────────────────────────────
  const handleOtpChange = useCallback((value: string, index: number) => {
    if (!/^\d?$/.test(value)) return;
    setError("");

    const updated = [...otp];
    updated[index] = value;
    setOtp(updated);

    if (value && index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
      setActive(index + 1);
    }
  }, [otp]);

  const handleOtpKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      if (otp[index]) {
        const updated = [...otp];
        updated[index] = "";
        setOtp(updated);
      } else if (index > 0) {
        inputsRef.current[index - 1]?.focus();
        setActive(index - 1);
      }
    }
  }, [otp]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;

    const updated = Array(OTP_LENGTH).fill("");
    pasted.split("").forEach((char, i) => { updated[i] = char; });
    setOtp(updated);

    const next = Math.min(pasted.length, OTP_LENGTH - 1);
    inputsRef.current[next]?.focus();
    setActive(next);
  }, []);

  // ── Validation locale ───────────────────────────────────────────────────────
  const validate = (): string | null => {
    const code = otp.join("");
    if (code.length !== OTP_LENGTH) return "Veuillez saisir le code à 6 chiffres complet.";
    if (!password)                  return "Veuillez saisir un nouveau mot de passe.";
    if (password.length < 8)        return "Le mot de passe doit contenir au moins 8 caractères.";
    if (password !== confirmPassword) return "Les mots de passe ne correspondent pas.";
    return null;
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    setError("");

    try {
      const code = otp.join("");

      // POST /{prefix}/reset-password
      // Laravel : valide code via OTPService, puis Hash::make(password)
      await authService.resetPassword({
        email,
        code,
        password,
        password_confirmation: confirmPassword,
      });

      setSuccess("Mot de passe réinitialisé avec succès !");
      onSuccess?.();

      // Redirection vers /login après 1.5s
      setTimeout(() => router.replace(backHref), 1500);

    } catch (err: unknown) {
      console.error("Erreur resetPassword:", err);
      const axiosErr = err as { response?: { data?: { message?: string }; status?: number } };
      const status   = axiosErr?.response?.status;
      const message  = axiosErr?.response?.data?.message;

      if (status === 400) {
        // Code OTP invalide / expiré — message précis retourné par Laravel
        setError(message || "Code invalide ou expiré. Recommencez la procédure.");
      } else if (status === 429) {
        setError("Trop de tentatives. Réessayez dans quelques minutes.");
      } else {
        setError(message || "Une erreur est survenue. Réessayez.");
      }

      // Reset du code OTP pour une nouvelle tentative
      setOtp(Array(OTP_LENGTH).fill(""));
      setTimeout(() => { inputsRef.current[0]?.focus(); setActive(0); }, 100);

    } finally {
      setLoading(false);
    }
  };

  const otpComplete = otp.every((d) => d !== "");

  return (
    <div
      className="min-h-screen flex items-center justify-center relative bg-cover bg-center"
      style={{ backgroundImage: "url('/assets/bg_login.png')" }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-md">
        <div className="h-1 w-full bg-gradient-to-r from-gray-700 to-gray-900 rounded-xl" />

        <div className="bg-white rounded-b-3xl shadow-2xl px-8 py-10">

          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Image src="/images/logo_canal.png" alt="CANAL+" width={160} height={40} priority />
          </div>

          {/* Icône */}
          <div className="flex justify-center mb-5">
            <div className="w-14 h-14 rounded-2xl bg-gray-900 flex items-center justify-center shadow-lg">
              <ShieldCheck size={26} className="text-white" />
            </div>
          </div>

          {/* Header */}
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Réinitialisation du mot de passe
            </h1>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              Code envoyé à{" "}
              <span className="font-semibold text-gray-700">{maskedEmail}</span>
            </p>
          </div>

          <form
            className="space-y-5"
            onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
          >
            {/* ── Code OTP ─────────────────────────────────────────────────── */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2 ml-1">
                Code de vérification
              </label>
              <div className="flex justify-center gap-2.5" onPaste={handlePaste}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputsRef.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(e.target.value, index)}
                    onKeyDown={(e) => handleOtpKeyDown(e, index)}
                    onFocus={() => setActive(index)}
                    disabled={loading || !!success}
                    className={[
                      "w-11 h-14 text-center text-xl font-bold rounded-xl border-2 transition-all duration-150 focus:outline-none",
                      loading || !!success ? "opacity-50 cursor-not-allowed" : "",
                      success
                        ? "border-green-400 bg-green-50 text-green-700"
                        : activeIndex === index
                        ? "border-gray-900 ring-2 ring-gray-900/10 bg-white"
                        : digit
                        ? "border-gray-400 bg-white text-gray-900"
                        : "border-gray-200 bg-gray-50 text-gray-900",
                    ].join(" ")}
                  />
                ))}
              </div>
            </div>

            {/* ── Nouveau mot de passe ──────────────────────────────────────── */}
            <div className="group relative">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 ml-1">
                Nouveau mot de passe
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-gray-700 transition-colors"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 8 caractères"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading || !!success}
                  className="w-full pl-11 pr-12 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent focus:bg-white transition-all text-sm disabled:opacity-50"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* ── Confirmation mot de passe ─────────────────────────────────── */}
            <div className="group relative">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 ml-1">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-gray-700 transition-colors"
                />
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Répétez le mot de passe"
                  value={confirmPassword}
                  onChange={(e) => setConfirm(e.target.value)}
                  disabled={loading || !!success}
                  className={[
                    "w-full pl-11 pr-12 py-3 rounded-xl border bg-gray-50 text-gray-900 placeholder-gray-400",
                    "focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent focus:bg-white",
                    "transition-all text-sm disabled:opacity-50",
                    confirmPassword && password !== confirmPassword
                      ? "border-red-300"
                      : confirmPassword && password === confirmPassword
                      ? "border-green-400"
                      : "border-gray-200",
                  ].join(" ")}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {/* Indicateur de correspondance */}
              {confirmPassword && (
                <p className={`text-xs mt-1 ml-1 ${password === confirmPassword ? "text-green-600" : "text-red-500"}`}>
                  {password === confirmPassword ? "✓ Les mots de passe correspondent" : "✗ Les mots de passe ne correspondent pas"}
                </p>
              )}
            </div>

            {/* ── Erreur ───────────────────────────────────────────────────── */}
            {error && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                <span className="mt-0.5 shrink-0">⚠</span>
                <span>{error}</span>
              </div>
            )}

            {/* ── Succès ───────────────────────────────────────────────────── */}
            {success && (
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
                <span>✓</span>
                <span>{success}</span>
              </div>
            )}

            {/* ── Bouton submit ─────────────────────────────────────────────── */}
            <button
              type="submit"
              disabled={loading || !otpComplete || !!success}
              className="w-full py-3.5 rounded-xl bg-gray-900 text-white font-semibold text-sm
                         hover:bg-black disabled:bg-gray-300 disabled:cursor-not-allowed
                         transition-all duration-200 shadow-lg shadow-gray-900/20
                         flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Réinitialisation en cours...
                </>
              ) : "Réinitialiser le mot de passe"}
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
            © {new Date().getFullYear()} CANAL+ • Accès sécurisé
          </div>
        </div>
      </div>
    </div>
  );
}