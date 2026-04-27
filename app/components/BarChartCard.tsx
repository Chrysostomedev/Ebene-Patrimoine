"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Ban } from "lucide-react";

type BarChartData = {
  label: string;
  value: number;
  color?: string;
};

type BarChartCardProps = {
  title?: string;
  data?: BarChartData[];
  onYearChange?: (year: string) => void;
};

const YEARS = ["2025", "2026", "2027", "2028", "2029", "2030"];
const CURRENT_YEAR = new Date().getFullYear().toString();
const DEFAULT_YEAR = YEARS.includes(CURRENT_YEAR) ? CURRENT_YEAR : YEARS[0];

export default function BarChartCard({
  title = "Tendance de l'année",
  data = [],
  onYearChange,
}: BarChartCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(DEFAULT_YEAR);

  const isFutureYear = (year: string) => parseInt(year) > parseInt(CURRENT_YEAR);

  const handleYearSelect = (year: string) => {
    if (isFutureYear(year)) return;
    setSelectedYear(year);
    setIsOpen(false);
    if (onYearChange) onYearChange(year);
  };

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-8 text-slate-400 text-sm flex items-center justify-center h-64">
        Aucune donnée pour {selectedYear}
      </div>
    );
  }

  const realMax = Math.max(...data.map((d) => d.value));
  const maxValue = realMax === 0 ? 100 : realMax > 1000
    ? Math.ceil(realMax / 1000) * 1000
    : Math.ceil(realMax / 100) * 100;

  const yAxisMarkers = [maxValue, Math.round(maxValue * 0.66), Math.round(maxValue * 0.33), 0];

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 relative z-10 overflow-hidden h-full flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between mb-8 relative z-20">
        <h3 className="font-bold text-slate-800 text-base tracking-tight leading-tight">{title}</h3>

        <div className="relative flex-shrink-0">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-900 hover:bg-white hover:shadow-md transition-all active:scale-95"
          >
            {selectedYear}
            <ChevronDown size={14} className={`text-slate-500 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
          </button>

          <AnimatePresence>
            {isOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 5, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 top-full w-32 bg-white border border-slate-100 shadow-2xl rounded-2xl p-2 overflow-hidden z-40"
                >
                  {YEARS.map((year) => {
                    const future = isFutureYear(year);
                    return (
                      <button
                        key={year}
                        onClick={() => handleYearSelect(year)}
                        disabled={future}
                        className={`w-full text-left px-3 py-2 rounded-xl text-sm font-bold transition-colors flex items-center justify-between gap-2 ${
                          future
                            ? "text-slate-300 cursor-not-allowed"
                            : selectedYear === year
                            ? "bg-black text-white"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <span>{year}{year === CURRENT_YEAR ? " ●" : ""}</span>
                        {future && <Ban size={12} className="text-red-400 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Zone graphique */}
      <div className="w-full flex-1 pt-2 pb-8">
        <div className="relative flex h-full">

          {/* Axe Y */}
          <div className="flex flex-col justify-between flex-shrink-0 w-8 text-slate-300 text-[9px] font-black text-right pr-1">
            {yAxisMarkers.map((marker) => (
              <span key={marker}>
                {marker >= 1000 ? `${Math.round(marker / 1000)}K` : marker}
              </span>
            ))}
          </div>

          {/* Lignes horizontales + barres */}
          <div className="relative flex-1 min-w-0">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {yAxisMarkers.map((marker) => (
                <div key={marker} className="w-full h-[1px] bg-slate-50" />
              ))}
            </div>

            <div className="absolute inset-0 flex items-end gap-[2px] px-1">
              {data.map((item) => (
                <div key={item.label} className="relative flex flex-col items-center flex-1 h-full group">
                  <div className="flex-1 w-full flex items-end">
                    <motion.div
                      layout
                      initial={{ height: 0 }}
                      animate={{ height: maxValue === 0 ? "2px" : `${(item.value / maxValue) * 100}%` }}
                      transition={{ type: "spring", damping: 15, stiffness: 100 }}
                      style={{ backgroundColor: item.color || "#0F172A" }}
                      className="w-full rounded-t-md hover:brightness-125 transition-all cursor-pointer relative"
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[9px] py-0.5 px-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none font-bold whitespace-nowrap z-10">
                        {item.value} tickets
                      </div>
                    </motion.div>
                  </div>
                  <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-slate-400 text-[8px] font-black tracking-tighter whitespace-nowrap">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}