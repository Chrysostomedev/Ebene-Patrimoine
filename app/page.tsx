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
    <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white">
      {/* Logo avec légère animation */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1 }}
        className="mb-12"
      >
        <Image
          src="/images/logo_canal.png" 
          alt="CANAL+"
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
        className="text-center px-6 sm:px-0 max-w-xl"
      >
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
          Bienvenue sur Facility Management
        </h1>
        <p className="text-lg sm:text-xl text-gray-300">
          Gérez facilement vos parcs et suivez vos performances en temps réel.
        </p>
      </motion.div>

      {/* Bouton principal */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1, duration: 0.8 }}
        className="mt-12"
      >
        <button
          onClick={() => router.push("/login")}
          className="relative flex items-center gap-3 bg-white text-black font-semibold rounded-full px-8 py-4 shadow-lg hover:bg-gray-200 transition-all duration-300"
        >
          Continuer
          {/* Petite icône animée à droite */}
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
