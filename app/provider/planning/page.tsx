"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import ActionGroup from "@/components/ActionGroup";
import StatsCard from "@/components/StatsCard";
import PageHeader from "@/components/PageHeader";
import MainCard from "@/components/MainCard";
import { Filter, CheckCircle2, XCircle } from "lucide-react";

import { useProviderPlanning } from "../../../hooks/useProviderPlanning";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  formatDate,
  formatTime,
  getSiteName,
  getProviderName,
} from "../../../services/providerPlanningService";

// ─── Toast ────────────────────────────────────────────────────────────────────

type ToastType = { message: string; type: "success" | "error" } | null;

function Toast({ toast }: { toast: ToastType }) {
  if (!toast) return null;
  return (
    <div className={`
      fixed bottom-6 right-6 z-[99999] flex items-center gap-3
      px-5 py-4 rounded-2xl shadow-2xl border text-sm font-semibold
      animate-in slide-in-from-bottom-4 duration-300
      ${toast.type === "success"
        ? "bg-white border-green-100 text-green-700"
        : "bg-white border-red-100 text-red-700"}
    `}>
      {toast.type === "success"
        ? <CheckCircle2 size={20} className="text-green-500 shrink-0" />
        : <XCircle      size={20} className="text-red-500 shrink-0" />}
      {toast.message}
    </div>
  );
}

// ─── Stats cards builder — même pattern que la page admin ─────────────────────

function buildStatsCards(stats: any, isLoading: boolean) {
  if (isLoading || !stats) {
    return [
      { label: "Nombre total de plannings", value: "—", delta: "", trend: "up" as const },
      { label: "Plannings en cours",        value: "—", delta: "", trend: "up" as const },
      { label: "Plannings en retard",       value: "—", delta: "", trend: "up" as const },
    ];
  }
  return [
    {
      label: "Nombre total de plannings",
      value: stats.total,
      delta: `${stats.realise} réalisé(s)`,
      trend: "up" as const,
    },
    {
      label: "Plannings en cours",
      value: stats.en_cours,
      delta: `${stats.planifie} planifié(s)`,
      trend: "up" as const,
    },
    {
      label: "Plannings en retard",
      value: stats.en_retard,
      delta: `${stats.non_realise} non réalisé(s)`,
      trend: stats.en_retard > 0 ? ("down" as const) : ("up" as const),
    },
  ];
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProviderPlanningPage() {
  const {
    plannings, stats, selectedPlanning,
    isLoading, isLoadingStats, error,
    isPanelOpen,
    openPanel, closePanel,
    setFilters,
  } = useProviderPlanning();

  const [toast,        setToast]        = useState<ToastType>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Filtre statut cyclique ─────────────────────────────────────────────────
  const siteActions = [
    {
      label: statusFilter === "all"
        ? "Filtrer par statut"
        : `Statut : ${STATUS_LABELS[statusFilter] ?? statusFilter}`,
      icon: Filter,
      onClick: () => {
        const order = ["all", "planifie", "en_cours", "en_retard", "realise"];
        const next  = order[(order.indexOf(statusFilter) + 1) % order.length];
        setStatusFilter(next);
        setFilters({ status: next === "all" ? undefined : next });
      },
      variant: "secondary" as const,
    },
  ];

  // ── Format pour SideDetailsPanel — même structure que la page admin ─────────
  const formattedSelectedEvent = selectedPlanning
    ? {
        title:       selectedPlanning.codification,
        reference:   `#${String(selectedPlanning.id).padStart(7, "0")}`,
        description: selectedPlanning.description ?? "Aucune description disponible.",
        fields: [
          { label: "Site",         value: getSiteName(selectedPlanning.site) },
          { label: "Prestataire",  value: getProviderName(selectedPlanning.provider) },
          { label: "Responsable",  value: selectedPlanning.responsable_name },
          { label: "Téléphone",    value: selectedPlanning.responsable_phone ?? "—" },
          {
            label: "Date de début",
            value: `${formatDate(selectedPlanning.date_debut)} à ${formatTime(selectedPlanning.date_debut)}`,
          },
          {
            label: "Date de fin",
            value: `${formatDate(selectedPlanning.date_fin)} à ${formatTime(selectedPlanning.date_fin)}`,
          },
          {
            label:       "Statut",
            value:       STATUS_LABELS[selectedPlanning.status] ?? selectedPlanning.status,
            isStatus:    true,
            statusColor: STATUS_COLORS[selectedPlanning.status],
          },
        ],
      }
    : null;

  const cpis = buildStatsCards(stats, isLoadingStats);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />

        <main className="ml-64 mt-20 p-8 space-y-8">

          {/* Erreur globale */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-3 rounded-xl text-sm font-medium">
              ⚠️ {error}
            </div>
          )}

          <div className="flex justify-between items-start">
            <PageHeader
              title="Mon Planning"
              subtitle="Consultez le calendrier de vos interventions planifiées"
            />
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {cpis.map((cpi, i) => <StatsCard key={i} {...cpi} />)}
          </div>

          {/* Filtre */}
          <div className="shrink-0 flex justify-end">
            <ActionGroup actions={siteActions} />
          </div>

          {/*
            MainCard — même composant que la page admin.
            Il gère CalendarGrid, MiniCalendar, EventLegend, SideDetailsPanel.
            On lui passe onEditClick et onDeleteClick vides car le provider
            ne peut pas modifier/supprimer un planning.
          */}
          <MainCard
            plannings={plannings}
            isLoading={isLoading}
            selectedEvent={formattedSelectedEvent}
            isPanelOpen={isPanelOpen}
            onEventClick={openPanel}
            onPanelClose={closePanel}
            onEditClick={() => {}}    // provider : lecture seule
            onDeleteClick={undefined} // provider : pas de suppression
          />

        </main>
      </div>

      <Toast toast={toast} />
    </div>
  );
}