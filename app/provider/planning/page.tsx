"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import ActionGroup from "@/components/ActionGroup";
import StatsCard from "@/components/StatsCard";
import PageHeader from "@/components/PageHeader";
import MainCard from "@/components/MainCard";
import { Filter, CheckCircle2, XCircle, CalendarDays } from "lucide-react";
import ReusableForm, { FieldConfig } from "@/components/ReusableForm";
import { useToast } from "../../../contexts/ToastContext";

import { useProviderPlanning } from "../../../hooks/provider/useProviderPlanning";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  getSiteName,
  getProviderName,
} from "../../../services/provider/providerPlanningService";
import { formatDate } from "@/lib/utils";
import { providerReportService } from "../../../services/provider/providerReportService";

// ─── Stats cards builder - même pattern que la page admin ─────────────────────

function buildStatsCards(stats: any, isLoading: boolean) {
  if (isLoading || !stats) {
    return [
      { label: "Nombre total de plannings", value: "-", delta: "", trend: "up" as const },
      { label: "Plannings en cours", value: "-", delta: "", trend: "up" as const },
      { label: "Plannings en retard", value: "-", delta: "", trend: "up" as const },
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
  const { toast } = useToast();
  const {
    plannings, stats, selectedPlanning,
    isLoading, isLoadingStats, error,
    isPanelOpen,
    openPanel: baseOpenPanel, closePanel,
    setFilters,
  } = useProviderPlanning();

  const router = useRouter();

  const openPanel = (p: any) => {
    router.push(`/provider/planning/${p.id}`);
  };

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isReportFormOpen, setIsReportFormOpen] = useState(false);
  const [isReportSubmitting, setIsReportSubmitting] = useState(false);

  const showToast = (message: string, type: "success" | "error") => {
    type === "success" ? toast.success(message) : toast.error(message);
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
        const next = order[(order.indexOf(statusFilter) + 1) % order.length];
        setStatusFilter(next);
        setFilters({ status: next === "all" ? undefined : next });
      },
      variant: "secondary" as const,
    },
  ];

  // ── Champs pour le rapport d'entretien préventif ───────────────────────────
  const newReportFields: FieldConfig[] = [
    {
      name: "result",
      label: "Résultat de la visite",
      type: "select",
      required: true,
      options: [
        { label: "RAS - Rien à signaler", value: "RAS" },
        { label: "Anomalie détectée", value: "anomalie" },
      ],
      icon: <CheckCircle2 size={18} />,
      gridSpan: 2,
    },
    {
      name: "period",
      label: "Période de l'intervention (Début - Fin)",
      type: "date-range",
      disablePastDates: true,
      required: true,
      gridSpan: 2,
    },
    {
      name: "findings",
      label: "Observations / Constatations ",
      type: "rich-text",
      required: true,
      gridSpan: 2,
    },
    {
      name: "action_taken",
      label: "Actions menées / Travaux effectués",
      type: "rich-text",
      required: true,
      gridSpan: 2,
    },
    {
      name: "attachments",
      label: "Photos justificatives",
      type: "image-upload",
      required: false,
      maxImages: 5,
      gridSpan: 2,
    },
  ];

  // ── Format pour SideDetailsPanel - même structure que la page admin ─────────
  const formattedSelectedEvent = selectedPlanning
    ? {
      title: selectedPlanning.codification,
      reference: `#${String(selectedPlanning.id).padStart(7, "0")}`,
      description: selectedPlanning.description ?? undefined,
      fields: [
        { label: "Site", value: getSiteName(selectedPlanning.site) },
        { label: "Prestataire", value: getProviderName(selectedPlanning.provider) },
        { label: "Responsable", value: selectedPlanning.responsable_name },
        { label: "Téléphone", value: selectedPlanning.responsable_phone ?? "-" },
        {
          label: "Date de début",
          value: formatDate(selectedPlanning.date_debut),
        },
        {
          label: "Date de fin",
          value: formatDate(selectedPlanning.date_fin),
        },
        {
          label: "Statut",
          value: STATUS_LABELS[selectedPlanning.status] ?? selectedPlanning.status,
          isStatus: true,
          statusColor: STATUS_COLORS[selectedPlanning.status],
        },
        {
          label: "Rapport préventif",
          value: "Aucun rapport soumis pour ce planning.",
        },
      ],
    }
    : null;

  const cpis = buildStatsCards(stats, isLoadingStats);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <div className="flex-1 flex flex-col">
        <Navbar />

        <main className="mt-20 p-8 space-y-8">

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
            MainCard - même composant que la page admin.
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
            onEditClick={() => { }}    // provider : pas de modification du planning en lui-même
            onDeleteClick={undefined} // provider : pas de suppression
            onCustomAction={() => {
              // Ouvre le modal / formulaire
              setIsReportFormOpen(true);
            }}
            customActionLabel="Faire un rapport pour ce planning"
          />

        </main>
      </div>

      <ReusableForm
        isOpen={isReportFormOpen}
        onClose={() => setIsReportFormOpen(false)}
        title="Nouveau Rapport préventif"
        subtitle={`Soumettez votre rapport pour ce planning ${selectedPlanning?.codification ?? ""}`}
        fields={newReportFields}
        submitLabel="Soumettre le rapport"
        isSubmitting={isReportSubmitting}
        onSubmit={async (values) => {
          if (!selectedPlanning) return;
          setIsReportSubmitting(true);
          try {
            await providerReportService.createReport({
              planning_id: selectedPlanning.id,
              intervention_type: "preventif",
              result: values.result as "RAS" | "anomalie" | undefined,
              findings: values.findings ?? "",
              action_taken: values.action_taken,
              start_date: values.start_date,
              end_date: values.end_date,
              anomaly_detected: values.result === "anomalie",
              attachments: values.attachments as File[] | undefined,
            });
            setIsReportFormOpen(false);
            showToast("Rapport soumis avec succès.", "success");
          } catch (err: any) {
            const msg = err?.response?.data?.message ?? "Erreur lors de la soumission du rapport.";
            showToast(msg, "error");
          } finally {
            setIsReportSubmitting(false);
          }
        }}
      />
    </>
  );
}