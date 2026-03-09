"use client";  

import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function Home() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white text-orane-600">
      {/* Logo avec légère animation */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1 }}
        className="mb-12"
      >
        <Image
          src="/images/logoci.png" 
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
          Bienvenue sur Ebène Patrimoine
        </h1>
        <p className="text-lg sm:text-xl text-gray-500">
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
          onClick={() => router.push("/admin/login")}
          className="relative flex items-center gap-3 bg-orange-500 text-white font-semibold rounded-full px-8 py-4 shadow-lg hover:bg-orange-600 transition-all duration-300"
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
