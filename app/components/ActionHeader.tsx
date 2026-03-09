"use client";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

interface ActionHeaderProps {
  title: string;
  linkText?: string;
  href?: string;
}

export default function ActionHeader({ title, linkText = "Voir tous", href = "#" }: ActionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6 px-2">
      <h3 className="font-bold text-slate-800 text-lg">{title}</h3>
      <Link 
        href={href} 
        className="flex items-center gap-1 text-slate-500 hover:text-slate-900 transition-colors text-sm font-bold"
      >
        {linkText}
        <ChevronRight size={18} strokeWidth={2.5} />
      </Link>
    </div>
  );
}