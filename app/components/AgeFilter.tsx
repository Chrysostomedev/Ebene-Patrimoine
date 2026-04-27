"use client";

import React, { useState, useEffect, useRef } from "react";
import { format, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { DayPicker, DateRange } from "react-day-picker";
import { CalendarDays, X, ChevronRight, ChevronLeft } from "lucide-react";
import "react-day-picker/dist/style.css";

export interface DateRangePickerProps {
  date: DateRange | undefined;
  onDateChange: (date: DateRange | undefined) => void;
  disablePastDates?: boolean;
  className?: string;
  placeholder?: string;
  singleDate?: boolean;
}

const fmt = (d: Date) => format(d, "dd MMM yyyy", { locale: fr });

function formatDisplay(date: DateRange | undefined, placeholder: string, singleDate: boolean): string {
  if (!date?.from) return placeholder;
  if (singleDate || !date.to || date.to.getTime() === date.from.getTime()) return fmt(date.from);
  return `${fmt(date.from)}  →  ${fmt(date.to)}`;
}

export function DateRangePicker({
  date,
  onDateChange,
  disablePastDates = false,
  className = "",
  placeholder = "Filtrer par période",
  singleDate = false,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const today = startOfDay(new Date());

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const openPopover = () => {
    if (!triggerRef.current) { setIsOpen(o => !o); return; }
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const popoverH = singleDate ? 380 : 440;
    const popoverW = singleDate ? 340 : 660;
    const top = spaceBelow > popoverH ? rect.bottom + 6 : rect.top - popoverH - 6;
    const left = Math.min(rect.left, window.innerWidth - popoverW - 8);
    setPopoverStyle({ position: "fixed", top, left: Math.max(8, left), zIndex: 99999, width: popoverW });
    setIsOpen(o => !o);
  };

  const hasValue = Boolean(date?.from);
  const label = formatDisplay(date, placeholder, singleDate);

  const handleSelect = (range: DateRange | undefined) => {
    if (singleDate && range?.from) {
      onDateChange({ from: range.from, to: range.from });
      setIsOpen(false);
    } else {
      onDateChange(range);
      if (range?.from && range?.to) setIsOpen(false);
    }
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDateChange(undefined);
    setIsDragging(false);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>

      {/* ── Trigger ── */}
      <button
        ref={triggerRef}
        type="button"
        onClick={openPopover}
        className={`
          group flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-semibold
          transition-all duration-200 select-none w-full
          ${isOpen || hasValue
            ? "bg-slate-900 text-white border-slate-900 shadow-md"
            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
          }
        `}
      >
        <CalendarDays size={15} strokeWidth={2.5} className={`shrink-0 ${isOpen || hasValue ? "text-white" : "text-slate-400"}`} />
        <span className="flex-1 text-left truncate">{label}</span>
        {hasValue && (
          <span role="button" onClick={clear} className="ml-0.5 flex items-center justify-center w-4 h-4 rounded-full cursor-pointer hover:bg-white/20 shrink-0">
            <X size={11} strokeWidth={3} />
          </span>
        )}
      </button>

      {/* ── Popover (fixed pour éviter le clipping dans les modales) ── */}
      {isOpen && (
        <div style={popoverStyle} className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
                <CalendarDays size={13} className="text-white" />
              </div>
              <span className="text-sm font-black text-slate-900 tracking-tight">
                {singleDate ? "Choisir une date" : "Sélectionner une période"}
              </span>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-xl transition text-slate-400 hover:text-slate-700">
              <X size={14} strokeWidth={2.5} />
            </button>
          </div>

          {/* Résumé */}
          {hasValue && (
            <div className="flex items-center gap-2 px-5 py-3 bg-slate-50 border-b border-slate-100">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest shrink-0">{singleDate ? "Date" : "Du"}</span>
              <span className="text-xs font-bold text-slate-900 truncate">{date?.from ? fmt(date.from) : "—"}</span>
              {!singleDate && date?.to && date.to.getTime() !== date.from!.getTime() && (
                <>
                  <ChevronRight size={12} className="text-slate-300 shrink-0" />
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest shrink-0">Au</span>
                  <span className="text-xs font-bold text-slate-900 truncate">{fmt(date.to)}</span>
                </>
              )}
              <button onClick={clear} className="ml-auto text-[10px] font-bold text-slate-400 hover:text-red-500 transition shrink-0">Effacer</button>
            </div>
          )}

          {/* Calendar */}
          <div className="p-4">
            <DayPicker
              mode="range"
              defaultMonth={date?.from ?? today}
              selected={date}
              onSelect={handleSelect}
              numberOfMonths={singleDate ? 1 : (typeof window !== "undefined" && window.innerWidth > 640 ? 2 : 1)}
              locale={fr}
              pagedNavigation
              disabled={disablePastDates ? { before: today } : undefined}
              components={{
                IconLeft: () => <ChevronLeft size={16} strokeWidth={3} />,
                IconRight: () => <ChevronRight size={16} strokeWidth={3} />,
              }}
              classNames={{
                months: "flex flex-col sm:flex-row gap-8 justify-center",
                month: "space-y-6",
                caption: "flex justify-center pt-2 relative items-center mb-4",
                caption_label: "text-sm font-black text-slate-900 capitalize tracking-tight",
                nav: "flex items-center",
                nav_button: "h-9 w-9 flex items-center justify-center rounded-xl transition-all duration-200 shadow-sm border border-blue-100 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white hover:shadow-blue-200 active:scale-90",
                nav_button_previous: "absolute left-0 z-10",
                nav_button_next: "absolute right-0 z-10",
                table: "w-full border-collapse",
                head_row: "flex mb-2",
                head_cell: "text-slate-400 w-9 font-black text-[10px] uppercase text-center tracking-widest",
                row: "flex w-full mt-1.5",
                cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-slate-50 first:[&:has([aria-selected])]:rounded-l-2xl last:[&:has([aria-selected])]:rounded-r-2xl",
                day: "h-9 w-9 p-0 font-bold rounded-2xl transition-all duration-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900",
                day_range_start: "bg-blue-600 !text-white hover:bg-blue-700 rounded-2xl shadow-lg shadow-blue-200",
                day_range_end: "bg-blue-600 !text-white hover:bg-blue-700 rounded-2xl shadow-lg shadow-blue-200",
                day_selected: "bg-blue-600 !text-white hover:bg-blue-700",
                day_today: "bg-slate-50 text-blue-600 font-black ring-2 ring-inset ring-blue-100",
                day_outside: "text-slate-300 opacity-40",
                day_disabled: "text-slate-200 opacity-20 cursor-not-allowed hover:bg-transparent",
                day_range_middle: "aria-selected:bg-blue-50/50 aria-selected:text-blue-900 rounded-none",
                day_hidden: "invisible",
              }}
            />
          </div>

          {/* Footer */}
          {!singleDate && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-slate-50 bg-slate-50/50">
              <p className="text-[11px] text-slate-400 font-medium">
                {!date?.from ? "Cliquez sur une date de début"
                  : !date?.to ? "Cliquez sur une date de fin"
                    : `${Math.round((date.to!.getTime() - date.from!.getTime()) / 86400000) + 1} jour(s) sélectionné(s)`}
              </p>
              <button onClick={() => setIsOpen(false)} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-black transition active:scale-95">
                Appliquer
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
