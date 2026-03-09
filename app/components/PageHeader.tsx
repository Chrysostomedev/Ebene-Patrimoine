"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle: string;
}

export default function PageHeader({ title, subtitle }: PageHeaderProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <>
      {/* Spacer dynamique : ajuste sa hauteur selon l'état du header */}
      <div 
        className={`transition-all duration-300 ease-in-out ${isCollapsed ? "h-[80px]" : "h-[140px]"}`} 
      />

      {/* Header fixe */}
      <div className="fixed top-20 left-64 right-0 z-30 bg-white border-b border-slate-100 shadow-sm transition-all duration-300 ease-in-out">
        <div className={`relative px-8 flex flex-col justify-center transition-all duration-300 ${isCollapsed ? "h-20" : "h-[140px]"}`}>
          
          <div className="flex flex-col gap-1">
            <h1 className={`font-black text-slate-900 tracking-tighter transition-all duration-300 ${isCollapsed ? "text-2xl" : "text-4xl md:text-5xl"}`}>
              {title}
            </h1>
            
            {/* Le sous-titre disparaît proprement en mode réduit */}
            <p className={`text-slate-500 max-w-2xl text-sm transition-all duration-300 overflow-hidden ${isCollapsed ? "h-0 opacity-0" : "h-auto opacity-100"}`}>
              {subtitle}
            </p>
          </div>

          {/* Bouton de bascule à l'extrême droite */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute right-8 top-1/2 -translate-y-1/2 p-2 hover:bg-slate-50 rounded-full border border-slate-100 text-slate-400 hover:text-slate-600 transition-colors shadow-sm"
            title={isCollapsed ? "Déplier" : "Plier"}
          >
            {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
        </div>
      </div>
    </>
  );
}