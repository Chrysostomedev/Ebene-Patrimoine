"use client";

// ============================================================
// components/EventLegend.tsx
// Légende statique + Événements à venir dynamiques
// Reçoit les plannings réels via props depuis MainCard
// ============================================================

import { Planning, STATUS_COLORS, STATUS_BG, STATUS_LABELS } from "../../services/planningService";

const LEGEND_ITEMS = [
  { label: "Planifié",   color: STATUS_COLORS.planifie,  bg: STATUS_BG.planifie },
  { label: "En cours",  color: STATUS_COLORS.en_cours,  bg: STATUS_BG.en_cours },
  { label: "En retard", color: STATUS_COLORS.en_retard, bg: STATUS_BG.en_retard },
  { label: "Réalisé",   color: STATUS_COLORS.realise,   bg: STATUS_BG.realise },
];

interface EventLegendProps {
  search?: string;
  plannings: Planning[];
}

export default function EventLegend({ search = "", plannings }: EventLegendProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Events à venir = plannings dont date_debut >= aujourd'hui
  // Filtrés par la recherche texte
  const upcomingPlannings = plannings
    .filter((p) => {
      const debut = new Date(p.date_debut);
      debut.setHours(0, 0, 0, 0);
      const isUpcoming = debut >= today;
      const matchSearch =
        !search ||
        p.codification.toLowerCase().includes(search.toLowerCase()) ||
        p.responsable_name.toLowerCase().includes(search.toLowerCase()) ||
        (p.site?.name ?? "").toLowerCase().includes(search.toLowerCase());
      return isUpcoming && matchSearch;
    })
    .slice(0, 5); // Limite à 5 pour ne pas déborder

  return (
    <div className="space-y-8">

      {/* ── Légende en Badges ── */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-slate-400">Légende</h3>
        <div className="grid grid-cols-2 gap-2">
          {LEGEND_ITEMS.map((item) => (
            <div
              key={item.label}
              style={{ backgroundColor: item.bg }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg"
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-[11px] font-bold text-slate-700">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Événements à venir — DYNAMIQUES ── */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-slate-400">Événements à venir</h3>

        {upcomingPlannings.length === 0 ? (
          <p className="text-[13px] text-slate-400 italic">Aucun événement à venir.</p>
        ) : (
          <div className="space-y-4">
            {upcomingPlannings.map((planning) => {
              const color = STATUS_COLORS[planning.status] ?? "#000";
              // Affiche la date de début courte "JJ/MM"
              const [year, month, day] = planning.date_debut.split("T")[0].split("-");
              const dateLabel = `${day}/${month}`;

              return (
                <div
                  key={planning.id}
                  className="flex items-center justify-between text-[13px]"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-800 leading-tight line-clamp-1">
                        {planning.codification}
                      </span>
                      {planning.site?.name && (
                        <span className="text-slate-400 text-[11px]">
                          {planning.site.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-slate-400 flex-shrink-0 ml-2">{dateLabel}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}