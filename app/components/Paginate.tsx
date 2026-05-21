"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Paginate({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const { t } = useLanguage();

  const getVisiblePages = () => {
    const delta = 2; // Number of pages to show around current page
    const range: (number | string)[] = [];
    const rangeWithDots: (number | string)[] = [];

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        range.push(i);
      }
    }

    let last: number | string | undefined;
    for (const i of range) {
      if (last !== undefined) {
        if (typeof i === "number" && typeof last === "number") {
          if (i - last === 2) {
            rangeWithDots.push(last + 1);
          } else if (i - last !== 1) {
            rangeWithDots.push("...");
          }
        }
      }
      rangeWithDots.push(i);
      last = i;
    }

    return rangeWithDots;
  };

  const pages = getVisiblePages();

  return (
    <div className="flex items-center justify-between md:justify-center w-full md:w-auto gap-2">
      {/* Previous Button */}
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        aria-label={t("pagination.previous")}
        className={`p-4 rounded-2xl transition-all ${
          currentPage === 1
            ? "bg-slate-50 text-slate-300 cursor-not-allowed"
            : "bg-slate-100 text-slate-600 hover:bg-slate-200 active:scale-95"
        }`}
      >
        <ChevronLeft size={20} />
      </button>

      {/* Page Info visible sur mobile */}
      <span className="md:hidden font-bold text-sm text-slate-600">
        Page {currentPage} / {totalPages}
      </span>

      {/* Page Numbers */}
      <div className="hidden md:flex items-center gap-1.5">
        {pages.map((page, index) => (
          typeof page === "number" ? (
            <button
              type="button"
              key={index}
              onClick={() => onPageChange(page)}
              className={`w-11 h-11 flex items-center justify-center rounded-xl font-bold transition-all ${
                currentPage === page
                  ? "bg-theme-primary text-white scale-105 shadow-md shadow-theme-primary/20"
                  : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/60 active:scale-95"
              }`}
            >
              {page}
            </button>
          ) : (
            <span key={index} className="w-8 text-center font-black text-slate-300 select-none tracking-tighter">
              •••
            </span>
          )
        ))}
      </div>

      {/* Next Button */}
      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        aria-label={t("pagination.next")}
        className={`p-4 rounded-2xl transition-all ${
          currentPage === totalPages
            ? "bg-slate-50 text-slate-300 cursor-not-allowed"
            : "bg-theme-primary text-white hover:opacity-90 shadow-md shadow-theme-primary/20 active:scale-95"
        }`}
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}