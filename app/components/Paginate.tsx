"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Paginate({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex items-center gap-2">
      {/* Précédent */}
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        className="p-4 bg-slate-200/60 text-slate-600 rounded-2xl hover:bg-slate-300 transition-colors"
      >
        <ChevronLeft size={20} />
      </button>

      {/* Numéros */}
      {pages.map(page => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`w-12 h-12 flex items-center justify-center rounded-2xl font-bold transition-all ${
            currentPage === page
              ? "bg-theme-primary text-white scale-105"
              : "bg-slate-100 text-slate-800 hover:bg-slate-200"
          }`}
        >
          {page}
        </button>
      ))}

      {/* Suivant */}
      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        className="p-4 bg-theme-primary text-white rounded-2xl hover:opacity-90 transition-colors"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}