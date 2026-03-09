"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Mail, ArrowLeft, ShieldCheck } from "lucide-react";
import { authService, getDashboardRoute, UserRole } from "../../../../services/AuthService";

const OTP_LENGTH   = 6;
const RESEND_DELAY = 30;

export default function OtpPage() {
  const router = useRouter();

  const [otp,       setOtp]       = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [activeIndex, setActive]  = useState(0);
  const [loading,   setLoading]   = useState(false);
  const [timer,     setTimer]     = useState(RESEND_DELAY);
  const [canResend, setCanResend] = useState(false);
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState("");
  const [email,     setEmail]     = useState("");

  const inputsRef    = useRef<(HTMLInputElement | null)[]>([]);
  const isNavigating = useRef(false);

  // Guard : récupère l'email pending
  useEffect(() => {
    if (isNavigating.current) return;
    const pending = authService.getPendingEmail();
    if (!pending) { router.replace("/admin/login"); return; }
    setEmail(pending);
  }, [router]);

  // Focus premier champ
  useEffect(() => { inputsRef.current[0]?.focus(); }, []);

  // Countdown resend
  useEffect(() => {
    if (timer <= 0) { setCanResend(true); return; }
    const id = setInterval(() => setTimer(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  // Saisie OTP
  const handleChange = useCallback((value: string, index: number) => {
    if (!/^\d?$/.test(value)) return;
    setError("");
    const updated = [...otp];
    updated[index] = value;
    setOtp(updated);
    if (value && index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
      setActive(index + 1);
    }
    if (value && index === OTP_LENGTH - 1) {
      const full = updated.join("");
      if (full.length === OTP_LENGTH) submitOtp(full);
    }
  }, [otp]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      if (otp[index]) {
        const updated = [...otp]; updated[index] = ""; setOtp(updated);
      } else if (index > 0) {
        inputsRef.current[index - 1]?.focus(); setActive(index - 1);
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
    if (pasted.length === OTP_LENGTH) submitOtp(pasted);
  }, []);

  // Submit OTP
  const submitOtp = async (code: string) => {
    const currentEmail = authService.getPendingEmail() || email;
    if (code.length !== OTP_LENGTH || !currentEmail) return;
    setLoading(true);
    setError("");

    try {
      const data = await authService.verifyOtp(currentEmail, code);
      if (data?.token && data?.user) {
        const role  = data.user.role as UserRole;
        const route = getDashboardRoute(role);
        isNavigating.current = true;
        authService.clearPendingEmail();
        setSuccess("Code validé ! Redirection en cours…");
        setTimeout(() => router.replace(route), 800);
      }
    } catch (err: any) {
      console.error("Erreur OTP:", err);
      const status  = err.response?.status;
      const message = err.response?.data?.message;
      if      (status === 429) setError("Trop de tentatives. Compte temporairement bloqué.");
      else if (status === 401) setError(message || "Code incorrect. Vérifiez et réessayez.");
      else                     setError(message || "Erreur lors de la vérification.");
      setOtp(Array(OTP_LENGTH).fill(""));
      setTimeout(() => { inputsRef.current[0]?.focus(); setActive(0); }, 100);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => submitOtp(otp.join(""));

  const maskedEmail = email
    ? email.replace(/(.{2})(.*)(@.*)/, (_: string, a: string, b: string, c: string) =>
        `${a}${"*".repeat(Math.min(b.length, 4))}${c}`)
    : "votre adresse email";

  const isComplete = otp.every(d => d !== "");

  return (
    <div
      className="min-h-screen flex items-center justify-center relative bg-cover bg-center"
      style={{ backgroundImage: "url('/assets/bg_login.png')" }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-md">

        {/* Accent bar — suit le thème */}
        <div className="h-1 w-full bg-theme-primary rounded-t-xl" />

        <div className="bg-white rounded-b-3xl shadow-2xl px-8 py-10">

          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Image src="/images/logoci.png" alt="CANAL+" width={160} height={40} priority />
          </div>

          {/* Icône shield — bg-theme-primary */}
          <div className="flex justify-center mb-5">
            <div className="w-14 h-14 rounded-2xl bg-theme-primary flex items-center justify-center shadow-lg">
              <ShieldCheck size={26} className="text-white" />
            </div>
          </div>

          {/* Header */}
          <div className="mb-7 text-center">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Vérification en deux étapes
            </h1>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              Un code à 6 chiffres a été envoyé à{" "}
              <span className="font-semibold text-gray-700">{maskedEmail}</span>
            </p>
          </div>

          {/* Champs OTP */}
          <div className="flex justify-center gap-2.5 mb-6" onPaste={handlePaste}>
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={el => (inputsRef.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleChange(e.target.value, index)}
                onKeyDown={e => handleKeyDown(e, index)}
                onFocus={() => setActive(index)}
                disabled={loading || !!success}
                className={[
                  "w-11 h-14 text-center text-xl font-bold rounded-xl border-2 transition-all duration-150 focus:outline-none",
                  loading || !!success ? "opacity-50 cursor-not-allowed bg-gray-50" : "",
                  success
                    ? "border-green-400 bg-green-50 text-green-700"
                    : activeIndex === index
                    ? "border-theme-primary ring-2 ring-theme-primary/10 bg-white"
                    : digit
                    ? "border-gray-400 bg-white text-gray-900"
                    : "border-gray-200 bg-gray-50 text-gray-900",
                ].join(" ")}
              />
            ))}
          </div>

          {/* Erreur */}
          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
              <span className="mt-0.5 shrink-0">⚠</span>
              <span>{error}</span>
            </div>
          )}

          {/* Succès */}
          {success && (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm mb-4">
              <span>✓</span>
              <span>{success}</span>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading || !isComplete || !!success}
            className="w-full py-3.5 rounded-xl bg-theme-primary text-white font-semibold text-sm
                       hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed
                       transition-all duration-200 shadow-lg
                       flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Vérification…
              </>
            ) : "Valider le code"}
          </button>

          {/* Resend / info */}
          <div className="mt-6 text-center space-y-3">
            <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
              <Mail size={13} />
              <span>Vérifiez aussi votre dossier spam</span>
            </div>

            {canResend ? (
              <p className="text-xs text-gray-500">
                Vous n'avez pas reçu le code ?{" "}
                <button
                  onClick={() => router.push("/admin/login")}
                  className="font-semibold text-theme-primary hover:opacity-70 underline transition-colors"
                >
                  Reconnectez-vous
                </button>{" "}
                pour en recevoir un nouveau.
              </p>
            ) : (
              <p className="text-xs text-gray-400">
                Nouveau code disponible dans{" "}
                <span className="font-semibold text-theme-primary">{timer}s</span>
              </p>
            )}
          </div>

          {/* Retour */}
          <div className="mt-6 pt-5 border-t border-gray-100 flex justify-center">
            <button
              onClick={() => router.push("/admin/login")}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-theme-primary transition-colors"
            >
              <ArrowLeft size={13} />
              Retour à la connexion
            </button>
          </div>

          <div className="mt-4 text-center text-xs text-gray-400">
            © {new Date().getFullYear()} CIPLUS • Accès sécurisé
          </div>
        </div>
      </div>
    </div>
  );
}