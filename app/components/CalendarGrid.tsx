"use client";

// ============================================================
// components/CalendarGrid.tsx
// Reçoit les plannings réels depuis MainCard via props
// Affiche les events groupés par jour du mois actif
// ============================================================

import { Planning, STATUS_COLORS, isPlanningOnDate } from "../../services/planningService";
import { DayCell } from "./DayCell";

interface CalendarEvent {
  id: number;
  label: string;
  time: string;
  color: string;
  status: string;
  planning: Planning; // référence complète pour le panel
}

interface CalendarGridProps {
  search?: string;
  plannings: Planning[];
  activeMonth: Date;
  onEventClick: (planning: Planning) => void;
}

export default function CalendarGrid({
  search = "",
  plannings,
  activeMonth,
  onEventClick,
}: CalendarGridProps) {
  const year  = activeMonth.getFullYear();
  const month = activeMonth.getMonth();

  const daysInMonth     = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  // Lundi = 0
  const startingDay     = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  // Jours du mois précédent (cellules vides à gauche)
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // ── Construction des cellules ──────────────────────────────
  const cells: { day: number; currentMonth: boolean; events: CalendarEvent[] }[] = [];

  // Jours prev month
  for (let i = startingDay; i > 0; i--) {
    cells.push({ day: daysInPrevMonth - i + 1, currentMonth: false, events: [] });
  }

  // Jours du mois courant
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);

    // Plannings qui couvrent ce jour
    const dayPlannings = plannings.filter((p) => isPlanningOnDate(p, date));

    // Filtre par recherche
    const filtered = dayPlannings.filter((p) => {
      const q = search.toLowerCase();
      return (
        !q ||
        p.codification.toLowerCase().includes(q) ||
        p.responsable_name.toLowerCase().includes(q) ||
        (p.site?.name ?? "").toLowerCase().includes(q) ||
        (p.provider?.user?.name ?? "").toLowerCase().includes(q)
      );
    });

    // Transformation vers le format CalendarEvent attendu par DayCell
    const events: CalendarEvent[] = filtered.map((p) => ({
      id:       p.id,
      label:    p.codification,
      time:     p.date_debut.split("T")[1]?.slice(0, 5) ?? "—",
      color:    STATUS_COLORS[p.status] ?? "#000000",
      status:   p.status,
      planning: p,
    }));

    cells.push({ day: d, currentMonth: true, events });
  }

  // Compléter jusqu'à 35 ou 42 cases
  const remaining = cells.length <= 35 ? 35 - cells.length : 42 - cells.length;
  for (let i = 1; i <= remaining; i++) {
    cells.push({ day: i, currentMonth: false, events: [] });
  }

  // ── En-têtes jours ─────────────────────────────────────────
  const DAY_HEADERS = ["LUN", "MAR", "MER", "JEU", "VEN", "SAM", "DIM"];

  return (
    <div className="w-full">
      {/* Headers */}
      <div className="grid grid-cols-7 border-b border-slate-100">
        {DAY_HEADERS.map((d) => (
          <div
            key={d}
            className="text-[11px] font-bold text-slate-400 tracking-widest text-center py-3"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grille */}
      <div className="grid grid-cols-7 border-l border-slate-100">
        {cells.map((cell, i) => (
          <DayCell
            key={i}
            day={cell.day}
            currentMonth={cell.currentMonth}
            events={cell.events}
            onClick={(event) => {
              // On remonte le planning complet, pas juste l'event formaté
              if (event?.planning) onEventClick(event.planning);
            }}
          />
        ))}
      </div>
    </div>
  );
}