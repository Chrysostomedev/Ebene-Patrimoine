"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import ActionGroup from "@/components/ActionGroup";
import StatsCard from "@/components/StatsCard";
import ReusableForm from "@/components/ReusableForm";
import PageHeader from "@/components/PageHeader";
import MainCard from "@/components/MainCard";
import { Filter, CalendarClock, Plus, CheckCircle2, XCircle } from "lucide-react";
import type { FieldConfig } from "@/components/ReusableForm";

/* -------------------------------------------------------------------------- */
/*                              STATIC MOCK DATA                              */
/* -------------------------------------------------------------------------- */

// STATIC: données simulées pour remplacer l'API
const mockPlannings = [
  {
    id: 1,
    codification: "PLN-0001",
    date_debut: "2026-03-10T08:00:00",
    date_fin: "2026-03-10T16:00:00",
    responsable_name: "Jean Kouassi",
    responsable_phone: "0700000000",
    status: "planifie",
    provider_id: 1,
    site_id: 1,
    description: "Maintenance réseau du site principal",
    site: { nom: "Siège Canal+" },
    provider: { company_name: "SOUDOTEC" },
  },
  {
    id: 2,
    codification: "PLN-0002",
    date_debut: "2026-03-12T09:00:00",
    date_fin: "2026-03-12T18:00:00",
    responsable_name: "Awa Traoré",
    responsable_phone: "0500000000",
    status: "en_cours",
    provider_id: 2,
    site_id: 2,
    description: "Inspection technique des installations",
    site: { nom: "Entrepôt Central" },
    provider: { company_name: "Tech Services CI" },
  },
];

// STATIC: stats simulées
const mockStats = {
  total: 2,
  realise: 0,
  en_cours: 1,
  planifie: 1,
  en_retard: 0,
  non_realise: 0,
};

// STATIC: options fixes
const providers = [
  { label: "SOUDOTEC", value: 1 },
  { label: "Tech Services CI", value: 2 },
];

const sites = [
  { label: "Siège Canal+", value: 1 },
  { label: "Entrepôt Central", value: 2 },
  { label: "Boutique Canal+", value: 3 },
];

// STATIC: mapping statut
const STATUS_LABELS: Record<string, string> = {
  planifie: "Planifié",
  en_cours: "En cours",
  en_retard: "En retard",
  realise: "Réalisé",
};

const STATUS_COLORS: Record<string, string> = {
  planifie: "blue",
  en_cours: "orange",
  en_retard: "red",
  realise: "green",
};

/* -------------------------------------------------------------------------- */
/*                                  TOAST                                     */
/* -------------------------------------------------------------------------- */

type ToastType = { message: string; type: "success" | "error" } | null;

function Toast({ toast }: { toast: ToastType }) {
  if (!toast) return null;

  return (
    <div
      className={`fixed bottom-6 right-6 z-[99999] flex items-center gap-3
      px-5 py-4 rounded-2xl shadow-2xl border text-sm font-semibold
      ${toast.type === "success"
        ? "bg-white border-green-100 text-green-700"
        : "bg-white border-red-100 text-red-700"}`}
    >
      {toast.type === "success" ? (
        <CheckCircle2 size={20} className="text-green-500 shrink-0" />
      ) : (
        <XCircle size={20} className="text-red-500 shrink-0" />
      )}
      {toast.message}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   PAGE                                     */
/* -------------------------------------------------------------------------- */

export default function PlanningPage() {

  /* ------------------------------ STATIC STATE ----------------------------- */

  // STATIC: remplacement de usePlanning
  const [plannings] = useState(mockPlannings);
  const [selectedPlanning, setSelectedPlanning] = useState<any>(null);

  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [toast, setToast] = useState<ToastType>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  /* ------------------------------ FORM FIELDS ------------------------------ */

  const planningFields: FieldConfig[] = [
    {
      name: "site_id",
      label: "Site",
      type: "select",
      required: true,
      options: sites, // STATIC
    },
    {
      name: "date_debut",
      label: "Date de début",
      type: "date",
      required: true,
      icon: CalendarClock,
    },
    {
      name: "date_fin",
      label: "Date de fin",
      type: "date",
      required: true,
      icon: CalendarClock,
    },
    {
      name: "responsable_name",
      label: "Nom du responsable",
      type: "text",
      required: true,
    },
    {
      name: "responsable_phone",
      label: "Téléphone du responsable",
      type: "text",
    },
    {
      name: "provider_id",
      label: "Prestataire assigné",
      type: "select",
      required: true,
      options: providers, // STATIC
    },
    {
      name: "description",
      label: "Description / Observations",
      type: "rich-text",
      gridSpan: 2,
    },
  ];

  /* ------------------------------ ACTION GROUP ----------------------------- */

  const siteActions = [
    {
      label: "Filtrer par statut",
      icon: Filter,
      onClick: () => {
        // STATIC: aucune logique backend
        showToast("Filtre statique (désactivé)", "success");
      },
      variant: "secondary" as const,
    },
    {
      label: "Nouveau planning",
      icon: Plus,
      onClick: () => setIsCreateModalOpen(true),
      variant: "primary" as const,
    },
  ];

  /* ------------------------------ PANEL FORMAT ----------------------------- */

  const formattedSelectedEvent = selectedPlanning
    ? {
        title: selectedPlanning.codification,
        reference: `#${String(selectedPlanning.id).padStart(7, "0")}`,
        description: selectedPlanning.description,
        fields: [
          { label: "Site", value: selectedPlanning.site.nom },
          { label: "Prestataire", value: selectedPlanning.provider.company_name },
          { label: "Responsable", value: selectedPlanning.responsable_name },
          { label: "Téléphone", value: selectedPlanning.responsable_phone },
          { label: "Date début", value: selectedPlanning.date_debut },
          { label: "Date fin", value: selectedPlanning.date_fin },
          {
            label: "Statut",
            value: STATUS_LABELS[selectedPlanning.status],
            isStatus: true,
            statusColor: STATUS_COLORS[selectedPlanning.status],
          },
        ],
      }
    : null;

  /* -------------------------------------------------------------------------- */
  /*                                   RENDER                                   */
  /* -------------------------------------------------------------------------- */

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Navbar />

        <main className="ml-64 mt-20 p-8 space-y-8">

          <div className="flex justify-between items-start">
            <PageHeader
              title="Planning"
              subtitle="Ce menu vous permet de voir le calendrier des évènements planifiés"
            />
          </div>

          {/* STATIC: stats simulées */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatsCard
              label="Nombre total de plannings"
              value={mockStats.total}
              delta={`${mockStats.realise} réalisé(s)`}
              trend="up"
            />
            <StatsCard
              label="Plannings en cours"
              value={mockStats.en_cours}
              delta={`${mockStats.planifie} planifié(s)`}
              trend="up"
            />
            <StatsCard
              label="Plannings en retard"
              value={mockStats.en_retard}
              delta={`${mockStats.non_realise} non réalisé(s)`}
              trend="up"
            />
          </div>

          <div className="shrink-0 flex justify-end">
            <ActionGroup actions={siteActions} />
          </div>

          {/* STATIC: MainCard reçoit les données mock */}
          <MainCard
            plannings={plannings}
            isLoading={false}
            selectedEvent={formattedSelectedEvent}
            isPanelOpen={isPanelOpen}
            onEventClick={(event: any) => {
              setSelectedPlanning(event);
              setIsPanelOpen(true);
            }}
            onPanelClose={() => setIsPanelOpen(false)}
            onEditClick={() => setIsEditModalOpen(true)}
            onDeleteClick={() => {
              showToast("Suppression désactivée (mode statique)", "error");
            }}
          />
        </main>
      </div>

      {/* STATIC: modal création sans backend */}
      <ReusableForm
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Publier un nouveau planning"
        subtitle="Mode statique — aucune sauvegarde backend"
        fields={planningFields}
        onSubmit={() => {
          showToast("Création désactivée (mode statique)", "error");
        }}
        submitLabel="Diffuser"
      />

      {/* STATIC: modal édition */}
      <ReusableForm
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Modifier le planning"
        subtitle="Mode statique — aucune modification sauvegardée"
        fields={planningFields}
        onSubmit={() => {
          showToast("Modification désactivée (mode statique)", "error");
        }}
        submitLabel="Mettre à jour"
      />

      <Toast toast={toast} />
    </div>
  );
}