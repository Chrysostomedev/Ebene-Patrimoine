/**
 * app/login/password/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Page "Mot de passe oublié" - orchestre deux étapes :
 *
 *   Étape 1 : <ForgetEmail>
 *     → Saisie de l'email
 *     → authService.forgotPassword(email) → POST /{prefix}/forgot-password
 *     → Le back envoie un OTP par mail
 *     → Passage à l'étape 2
 *
 *   Étape 2 : <ForgetPassword>
 *     → Saisie du code OTP reçu + nouveau mot de passe + confirmation
 *     → authService.resetPassword({ email, code, password, password_confirmation })
 *     → POST /{prefix}/reset-password
 *     → Le back vérifie l'OTP via OTPService PUIS change le mot de passe
 *     → Redirection vers /login
 *
 * Le préfixe endpoint (super-admin | admin | manager | provider) est détecté
 * automatiquement par authService.forgotPassword() et stocké en localStorage.
 * authService.resetPassword() le réutilise sans configuration supplémentaire.
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use client";

import { useState } from "react";
import ForgetEmail    from "@/components/ForgetEmail";
import ForgetPassword from "@/components/ForgetPassword";

export default function ForgotPasswordPage() {
  // null = étape 1 (email), string = étape 2 (OTP + nouveau mdp)
  const [email, setEmail] = useState<string | null>(null);

  // ── Étape 1 : Saisie de l'email ───────────────────────────────────────────
  // onEmailSent est appelé par ForgetEmail APRÈS que authService.forgotPassword()
  // a réussi (le back a trouvé l'utilisateur et a envoyé l'OTP)
  if (!email) {
    return (
      <ForgetEmail
        onEmailSent={(submittedEmail) => setEmail(submittedEmail)}
        backHref="/login"
      />
    );
  }

  // ── Étape 2 : OTP + nouveau mot de passe ─────────────────────────────────
  // ForgetPassword appelle authService.resetPassword() avec l'OTP réel
  // envoyé par Laravel - c'est le back qui le vérifie via OTPService
  return (
    <ForgetPassword
      email={email}
      onSuccess={() => {
        // Optionnel : analytics, toast global, etc.
        console.log("Mot de passe réinitialisé avec succès");
      }}
      backHref="/login"
    />
  );
}