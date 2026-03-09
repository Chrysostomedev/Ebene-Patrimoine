"use client";

// ============================================================
// components/MainCard.tsx
// Reçoit les plannings réels depuis PlanningPage via props
// ============================================================

import { useState } from "react";
import SearchInput from "./SearchInput";
import EventLegend from "./EventLegend";
import CalendarGrid from "./CalendarGrid";
import MiniCalendar from "./MiniCalendar";
import SideDetailsPanel from "./SideDetailsPanel";
import { Planning } from "../../../services/planningService";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DetailField {
  label: string;
  value: string;
  isStatus?: boolean;
  statusColor?: string;
}

interface FormattedEvent {
  title: string;
  reference?: string;
  description?: string;
  fields: DetailField[];
}

interface MainCardProps {
  plannings: Planning[];
  isLoading?: boolean;
  selectedEvent: FormattedEvent | null;
  isPanelOpen: boolean;
  onEventClick: (planning: Planning) => void;
  onPanelClose: () => void;
  onEditClick: () => void;
  onDeleteClick?: () => void;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function MainCard({
  plannings,
  isLoading = false,
  selectedEvent,
  isPanelOpen,
  onEventClick,
  onPanelClose,
  onEditClick,
  onDeleteClick,
}: MainCardProps) {
  const [searchQuery, setSearchQuery]     = useState("");
  const [activeMonth, setActiveMonth]     = useState(new Date());

  // Filtre local par recherche (sur codification, responsable, site)
  const filteredPlannings = plannings.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.codification.toLowerCase().includes(q) ||
      p.responsable_name.toLowerCase().includes(q) ||
      (p.site?.name ?? "").toLowerCase().includes(q) ||
      (p.provider?.user?.name ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full space-y-6">
      {/* 1. Top Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 max-w-md">
          <SearchInput
            onSearch={(q) => setSearchQuery(q)}
            placeholder="Rechercher un planning, responsable, site..."
          />
        </div>
      </div>

      {/* 2. Main Layout */}
      <div className="grid grid-cols-12 gap-6 items-start">

        {/* Sidebar Gauche */}
        <div className="col-span-12 lg:col-span-3 space-y-6">
          <div className="bg-white p-4 rounded-[24px] border border-slate-100 shadow-sm">
            {/* MiniCalendar contrôle le mois affiché dans CalendarGrid */}
            <MiniCalendar
              activeMonth={activeMonth}
              onMonthChange={setActiveMonth}
              plannings={filteredPlannings}
            />
          </div>

          <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm space-y-8">
            {/* EventLegend reçoit les plannings filtrés pour "à venir" */}
            <EventLegend
              search={searchQuery}
              plannings={filteredPlannings}
            />
          </div>
        </div>

        {/* Grille Calendrier */}
        <div className="col-span-12 lg:col-span-9 bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden">
          {isLoading ? (
            // Skeleton loader
            <div className="p-8 space-y-4 animate-pulse">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-slate-100 rounded-xl" />
              ))}
            </div>
          ) : (
            <CalendarGrid
              search={searchQuery}
              plannings={filteredPlannings}
              activeMonth={activeMonth}
              onEventClick={onEventClick}
            />
          )}
        </div>
      </div>

      {/* 3. SideDetailsPanel — données réelles */}
      <SideDetailsPanel
        isOpen={isPanelOpen}
        onClose={onPanelClose}
        title={selectedEvent?.title || ""}
        reference={selectedEvent?.reference}
        fields={selectedEvent?.fields || []}
        descriptionContent={selectedEvent?.description}
        onEdit={onEditClick}
      />
    </div>
  );
}