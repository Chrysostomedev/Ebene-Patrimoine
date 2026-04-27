"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Home, HelpCircle } from "lucide-react";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
      {/* Logo Placeholder / Icon */}
      <div className="mb-8 relative">
        <div className="w-24 h-24 bg-slate-900 rounded-[32px] flex items-center justify-center rotate-12 shadow-2xl">
          <span className="text-white text-4xl font-black rotate-[-12deg]">C+</span>
        </div>
        <div className="absolute -bottom-2 -right-2 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
          404
        </div>
      </div>

      <h1 className="text-4xl md:text-6xl font-black text-slate-900 mb-4 tracking-tighter uppercase">
        Page non trouvée
      </h1>

      <p className="text-slate-500 text-lg md:text-xl font-medium max-w-md mb-10 leading-relaxed">
        Oups ! Cette page n'est plus disponible pour le moment.
        Veuillez revenir plus tard ou retourner à votre tableau de bord.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-xs sm:max-w-md">
        <button
          onClick={() => router.back()}
          className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-slate-100 text-slate-900 rounded-2xl font-black hover:bg-slate-200 transition-all border border-slate-200 shadow-sm"
        >
          <ChevronLeft size={20} /> Retourner
        </button>

        <Link
          href="/"
          className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-black transition-all shadow-xl shadow-slate-900/20"
        >
          <Home size={20} /> Accueil
        </Link>
      </div>

      <div className="mt-16 flex items-center gap-6">
        <Link href="#" className="text-slate-400 hover:text-slate-900 text-sm font-bold transition flex items-center gap-2">
          <HelpCircle size={16} /> Besoin d'aide ?
        </Link>
      </div>

      {/* Background Decorative Element */}
      <div className="fixed bottom-0 left-0 w-full h-1 bg-gradient-to-r from-slate-900 via-red-600 to-slate-900 opacity-20" />
    </div>
  );
}
