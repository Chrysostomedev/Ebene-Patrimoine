"use client";

import { useEffect, useRef } from "react";
import { authService } from "@/services/AuthService";

/**
 * InactivityTracker
 * ─────────────────────────────────────────────────────────────────────────────
 * Gère la déconnexion automatique après 30 minutes d'inactivité.
 * Se réinitialise sur : mouvement souris, clic, appui touche.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function InactivityTracker() {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutes

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    
    // Si l'utilisateur n'est pas connecté, pas besoin de tracker
    if (!authService.isAuthenticated()) return;

    timerRef.current = setTimeout(() => {
      handleLogout();
    }, INACTIVITY_LIMIT);
  };

  const handleLogout = async () => {
    console.warn("[Security] Session expirée par inactivité.");
    // On appelle le logout qui vide le stockage et redirige vers /login?message=session_expired
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "/login?message=session_expired";
  };

  useEffect(() => {
    // Événements d'activité
    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
    
    const handleActivity = () => resetTimer();

    // Initialisation
    resetTimer();

    events.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, []);

  return null; // Composant invisible
}
