"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";

interface StatCardProps {
  title: string;
  value: string | number;
  href: string;
  orientation?: "horizontal" | "vertical";
  className?: string; 
}

export default function DetailsCard({ 
  title, 
  value, 
  href, 
  orientation = "horizontal",
  className = "" 
}: StatCardProps) {
  
  // Formater la valeur pour avoir toujours 2 chiffres (05 au lieu de 5)
  const formattedValue = value.toString().padStart(2, '0');

  return (
    <div className={`
      bg-white rounded-xl border border-slate-100 shadow-sm p-8 
      hover:shadow-md hover:border-slate-200 transition-all duration-300 group
      ${orientation === "vertical" ? "h-full min-h-[240px]" : ""}
      ${className} 
    `}>
      <div className={`flex h-full ${orientation === "vertical" ? "flex-col" : "justify-between items-end"}`}>
        
        {/* Titre et Valeur */}
        <div className="space-y-4">
          <p className="text-[12px] font-semibold text-slate-500 ">
            {title}
          </p>
          <h3 className="text-5xl font-black text-[#0F172A] tracking-tighter">
            {formattedValue}
          </h3>
        </div>
        
        {/* Lien "Voir le détail" */}
        <Link 
          href={href}
          className={`
            flex items-center gap-1 text-[13px] font-bold text-slate-900 
            transition-all no-underline group-hover:text-black
            ${orientation === "vertical" ? "mt-auto ml-auto" : "mb-2"}
          `}
        >
          <span>Voir le détail</span>
          <ChevronRight 
            size={20} 
            strokeWidth={3}
            className="group-hover:translate-x-1 transition-transform duration-200" 
          />
        </Link>
      </div>
    </div>
  );
}