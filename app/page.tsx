"use client";  

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { authService, getDashboardRoute } from "../services/AuthService";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    if (authService.isAuthenticated()) {
      const role = authService.getRole();
      router.replace(getDashboardRoute(role));
    }
  }, [router]);

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center relative bg-cover bg-center text-white"
      style={{ backgroundImage: "url('/assets/bg_login.png')" }}
    >
      {/* Overlay sombre pour lisibilité */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Logo avec légère animation */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1 }}
        className="relative z-10 mb-12"
      >
        <Image
          src="/images/logoci.png" 
          alt="Ebene Patrimoine"
          width={240}
          height={80}
          priority
        />
      </motion.div>

      {/* Texte de bienvenue */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.8 }}
        className="relative z-10 text-center px-6 sm:px-0 max-w-xl"
      >
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
          Bienvenue sur Ebene Patrimoine 
        </h1>
        <p className="text-lg sm:text-xl text-white/80">
          Gérez facilement vos parcs et suivez vos performances en temps réel.
        </p>
      </motion.div>

      {/* Bouton principal */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1, duration: 0.8 }}
        className="relative z-10 mt-12"
      >
        <button
          onClick={() => router.push("/login")}
          className="relative flex items-center gap-3 bg-white text-theme-primary font-semibold rounded-full px-8 py-4 shadow-lg hover:bg-gray-100 transition-all duration-300"
        >
          Continuer
          <motion.span
            className="inline-block"
            animate={{ x: [0, 5, 0] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
          >
            ➔
          </motion.span>
        </button>
      </motion.div>
    </div>
  );
}
