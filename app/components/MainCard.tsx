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
import DataTable, { ColumnConfig } from "./DataTable";
import { LayoutGrid, List, X, ChevronRight } from "lucide-react";
import { Planning, formatDate, formatTime, getSiteName, getProviderName, STATUS_LABELS, STATUS_COLORS } from "../../services/admin/planningService";

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
  onEventDrop?: (planningId: number, newDate: Date) => void;
  onDeleteClick?: () => void;
  canAddEvent?: boolean;
  onEventAdd?: (date: Date) => void;
  onCustomAction?: () => void;
  customActionLabel?: string;
  onCellClick?: (date: Date) => void;
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
  onEventDrop,
  onDeleteClick,
  canAddEvent,
  onEventAdd,
  onCustomAction,
  customActionLabel,
  onCellClick,
}: MainCardProps) {
  const [searchQuery, setSearchQuery]     = useState("");
  const [activeMonth, setActiveMonth]     = useState(new Date());
  const [viewMode, setViewMode]           = useState<"grid" | "list">("grid");

  // Panel "liste du jour" quand on clique "+N autres"
  const [dayListOpen,     setDayListOpen]     = useState(false);
  const [dayListPlannings, setDayListPlannings] = useState<Planning[]>([]);
  const [dayListDate,     setDayListDate]     = useState<Date | null>(null);

  const handleShowMore = (plannings: Planning[], date: Date) => {
    setDayListPlannings(plannings);
    setDayListDate(date);
    setDayListOpen(true);
  };

  const handleDayListClick = (planning: Planning) => {
    setDayListOpen(false);
    onEventClick(planning);
  };

  // Filtre local par recherche (sur codification, responsable, site)
  const filteredPlannings = plannings.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.codification.toLowerCase().includes(q) ||
      p.responsable_name.toLowerCase().includes(q) ||
      (p.site?.nom ?? "").toLowerCase().includes(q) ||
      (p.provider?.company_name ?? p.provider?.user?.first_name ?? "").toLowerCase().includes(q)
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
        <div className="flex items-center bg-slate-100/80 p-1 rounded-xl">
          <button
            onClick={() => setViewMode("grid")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition ${
              viewMode === "grid" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <LayoutGrid size={16} /> Grille
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition ${
              viewMode === "list" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <List size={16} /> Liste
          </button>
        </div>
      </div>

      {/* 2. Main Layout */}
      {viewMode === "grid" ? (
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
                canAddEvent={canAddEvent}
                onEventAdd={onEventAdd}
                onEventClick={onEventClick}
                onEventDrop={onEventDrop}
                onShowMore={handleShowMore}
                onCellClick={onCellClick}
              />
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden p-6 mt-4">
          <DataTable
            title="Liste des événements planifiés"
            columns={[
              { header: "Codification", key: "codification", render: (_: any, row: Planning) => <span className="font-bold text-slate-800">{row.codification}</span> },
              { header: "Site", key: "site", render: (_: any, row: Planning) => getSiteName(row.site) },
              { header: "Prestataire", key: "provider", render: (_: any, row: Planning) => getProviderName(row.provider) },
              { header: "Date de début", key: "date_debut", render: (_: any, row: Planning) => `${formatDate(row.date_debut)} à ${formatTime(row.date_debut)}` },
              { header: "Date de fin", key: "date_fin", render: (_: any, row: Planning) => `${formatDate(row.date_fin)} à ${formatTime(row.date_fin)}` },
              { header: "Statut", key: "status", render: (_: any, row: Planning) => (
                <span className="px-2 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: `${STATUS_COLORS[row.status]}15`, color: STATUS_COLORS[row.status] }}>
                  {STATUS_LABELS[row.status]}
                </span>
              )},
              { header: "Actions", key: "actions", render: (_: any, row: Planning) => (
                <button
                  onClick={() => onEventClick(row)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold transition"
                >
                  Détails
                </button>
              )}
            ]}
            data={filteredPlannings}
          />
        </div>
      )}

      {/* Panel liste du jour ("+N autres") */}
      {dayListOpen && (
        <>
          <div className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[9998]" onClick={() => setDayListOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-[420px] bg-white z-[9999] shadow-2xl flex flex-col rounded-l-3xl overflow-hidden animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  {dayListDate ? dayListDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }) : "Plannings du jour"}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">{dayListPlannings.length} planning{dayListPlannings.length > 1 ? "s" : ""}</p>
              </div>
              <button onClick={() => setDayListOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition">
                <X size={18} className="text-slate-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {dayListPlannings.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleDayListClick(p)}
                  className="w-full flex items-center gap-4 px-6 py-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition text-left group"
                >
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: STATUS_COLORS[p.status] ?? "#94a3b8" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{p.codification}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {getSiteName(p.site)} · {formatTime(p.date_debut)}
                    </p>
                    <p className="text-xs text-slate-400">{getProviderName(p.provider)}</p>
                  </div>
                  <span
                    className="text-[10px] font-bold px-2 py-1 rounded-lg shrink-0"
                    style={{ backgroundColor: `${STATUS_COLORS[p.status]}18`, color: STATUS_COLORS[p.status] }}
                  >
                    {STATUS_LABELS[p.status] ?? p.status}
                  </span>
                  <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-600 transition shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* SideDetailsPanel - données réelles */}
      <SideDetailsPanel
        isOpen={isPanelOpen}
        onClose={onPanelClose}
        title={selectedEvent?.title || ""}
        reference={selectedEvent?.reference}
        fields={selectedEvent?.fields || []}
        descriptionContent={selectedEvent?.description}
        onEdit={onEditClick}
        customAction={onCustomAction}
        customActionLabel={customActionLabel}
      />
    </div>
  );
}