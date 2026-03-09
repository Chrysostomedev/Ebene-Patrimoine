"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

interface SideModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function SideModal({ isOpen, onClose, title, subtitle, children }: SideModalProps) {
  // Empêcher le scroll quand la modale est ouverte
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Overlay sombre avec flou */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Contenu de la modale (Slide-in) */}
      <div className="relative w-full max-w-2xl bg-white h-screen shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300 p-8 flex flex-col">
        
        {/* Header */}
        <div className="mb-8">
          <button 
            onClick={onClose}
            className="p-2 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors mb-6"
          >
            <X size={20} />
          </button>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">{title}</h2>
          {subtitle && <p className="text-slate-500 mt-2 text-sm leading-relaxed">{subtitle}</p>}
        </div>

        {/* Body (Formulaire) */}
        <div className="flex-grow">
          {children}
        </div>
      </div>
    </div>
  );
}