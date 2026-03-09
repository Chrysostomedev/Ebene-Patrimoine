"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import ActionGroup from "@/components/ActionGroup";
import StatsCard from "@/components/StatsCard";
import ReusableForm from "@/components/ReusableForm";
import PageHeader from "@/components/PageHeader";
import MainCard from "@/components/MainCard";
import { Filter, CalendarClock, Plus, CheckCircle2, XCircle } from "lucide-react";

import { usePlanning } from "../../../hooks/usePlanning";
import {
  CreatePlanningPayload,
  UpdatePlanningPayload,
  STATUS_COLORS,
  STATUS_LABELS,
  formatDate,
  formatTime,
  getSiteName,
  getProviderName,
} from "../../../services/planningService";
import type { FieldConfig } from "@/components/ReusableForm";

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
        : <XCircle      size={20} className="text-red-500 shrink-0" />
      }
      {toast.message}
    </div>
  );
}

// ─── Stats ────────────────────────────────────────────────────────────────────

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

export default function PlanningPage() {
  const {
    plannings, stats, selectedPlanning,
    isLoading, isLoadingStats, isSubmitting, error,
    isCreateModalOpen, isEditModalOpen, isPanelOpen,
    handleCreate, handleUpdate, handleDelete,
    openCreateModal, closeCreateModal,
    openEditModal, closeEditModal,
    openPanel, closePanel,
    setFilters,
  } = usePlanning();

  // ── Toast ────────────────────────────────────────────────────
  const [toast, setToast] = useState<ToastType>(null);
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Providers et Sites dynamiques ────────────────────────────
  // FIX : on fetch les vraies listes pour les selects du formulaire
  const [providers, setProviders] = useState<{ label: string; value: number }[]>([]);
  const [sites, setSites]         = useState<{ label: string; value: number }[]>([]);

  useEffect(() => {
    // Fetch providers
    import("../../../core/axios").then(({ default: api }) => {
      api.get("/provider").then(({ data }) => {
        const list = data?.data ?? data ?? [];
        // La réponse peut être paginée ou directe
        const items = Array.isArray(list) ? list : (list.data ?? list.items ?? []);
        setProviders(
          items.map((p: any) => ({
            label: p.company_name ?? `${p.user?.first_name ?? ""} ${p.user?.last_name ?? ""}`.trim(),
            value: p.id,
          }))
        );
      }).catch(() => {
        // Fallback si endpoint indisponible
        setProviders([{ label: "SOUDOTEC", value: 1 }]);
      });
    });

    // Fetch sites
    import("../../../core/axios").then(({ default: api }) => {
      api.get("/admin/sites").then(({ data }) => {
        const list = data?.data ?? data ?? [];
        const items = Array.isArray(list) ? list : (list.data ?? list.items ?? []);
        setSites(
          items.map((s: any) => ({
            label: s.nom ?? s.name ?? `Site #${s.id}`,
            value: s.id,
          }))
        );
      }).catch(() => {
        // Fallback si endpoint indisponible
        setSites([
          { label: "Siège Canal+",     value: 1 },
          { label: "Entrepôt Central", value: 2 },
          { label: "Boutique Canal+",  value: 3 },
        ]);
      });
    });
  }, []);

  // ── Champs formulaire dynamiques ────────────────────────────
  const planningFields: FieldConfig[] = [
    {
      name: "site_id", label: "Site",
      type: "select", required: true,
      options: sites,      // ← dynamique depuis l'API (site.nom)
    },
    { name: "date_debut",        label: "Date de début",           type: "date",  required: true, icon: CalendarClock },
    { name: "date_fin",          label: "Date de fin",             type: "date",  required: true, icon: CalendarClock },
    { name: "responsable_name",  label: "Nom du responsable",      type: "text",  required: true },
    { name: "responsable_phone", label: "Téléphone du responsable",type: "text" },
    // {
    //   name: "status", label: "Statut", type: "select",
    //   options: [
    //     { label: "Planifié",  value: "planifie"  },
    //     { label: "En cours",  value: "en_cours"  },
    //     { label: "En retard", value: "en_retard" },
    //     { label: "Réalisé",   value: "realise"   },
    //   ],
    // },
    {
      name: "provider_id", label: "Prestataire assigné",
      type: "select", required: true,
      options: providers,  // ← dynamique depuis l'API
    },
    
    {
      name: "description", label: "Description / Observations",
      type: "rich-text", gridSpan: 2,
      placeholder: "Décrivez les différentes observations sur le planning...",
    },
  ];

  // ── Filtre statut ────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const cpis = buildStatsCards(stats, isLoadingStats);

  const siteActions = [
    {
      label: statusFilter === "all"
        ? "Filtrer par statut"
        : `Statut : ${STATUS_LABELS[statusFilter as keyof typeof STATUS_LABELS] ?? statusFilter}`,
      icon: Filter,
      onClick: () => {
        const order = ["all", "planifie", "en_cours", "en_retard", "realise"];
        const next  = order[(order.indexOf(statusFilter) + 1) % order.length];
        setStatusFilter(next);
        setFilters({ status: next === "all" ? undefined : (next as any) });
      },
      variant: "secondary" as const,
    },
    {
      label: "Nouveau planning",
      icon: Plus,
      onClick: openCreateModal,
      variant: "primary" as const,
    },
  ];

  // ── Submit création ──────────────────────────────────────────
  const handleCreateSubmit = async (formData: Record<string, any>) => {
    const payload: CreatePlanningPayload = {
      codification:      formData.codification,
      date_debut:        formData.date_debut,
      date_fin:          formData.date_fin,
      responsable_name:  formData.responsable_name,
      responsable_phone: formData.responsable_phone || undefined,
      provider_id:       Number(formData.provider_id),
      site_id:           Number(formData.site_id),
      status:            (formData.status as any) || "planifie",
      description:       formData.description || undefined,
    };
    const ok = await handleCreate(payload);
    // FIX : toast feedback après création
    showToast(
      ok ? "Planning créé avec succès ✓" : (error || "Erreur lors de la création"),
      ok ? "success" : "error"
    );
  };

  // ── Submit édition ───────────────────────────────────────────
  const handleEditSubmit = async (formData: Record<string, any>) => {
    if (!selectedPlanning) return;
    const payload: UpdatePlanningPayload = {
      codification:      formData.codification,
      date_debut:        formData.date_debut,
      date_fin:          formData.date_fin,
      responsable_name:  formData.responsable_name,
      responsable_phone: formData.responsable_phone || undefined,
      provider_id:       formData.provider_id ? Number(formData.provider_id) : undefined,
      site_id:           formData.site_id ? Number(formData.site_id) : undefined,
      status:            (formData.status as any) || undefined,
      description:       formData.description || undefined,
    };
    const ok = await handleUpdate(selectedPlanning.id, payload);
    showToast(
      ok ? "Planning mis à jour avec succès ✓" : (error || "Erreur de mise à jour"),
      ok ? "success" : "error"
    );
  };

  // ── initialValues édition ────────────────────────────────────
  const editInitialValues = selectedPlanning
    ? {
        codification:      selectedPlanning.codification,
        date_debut:        selectedPlanning.date_debut?.split("T")[0] ?? "",
        date_fin:          selectedPlanning.date_fin?.split("T")[0] ?? "",
        responsable_name:  selectedPlanning.responsable_name,
        responsable_phone: selectedPlanning.responsable_phone ?? "",
        status:            selectedPlanning.status,
        provider_id:       String(selectedPlanning.provider_id),
        site_id:           String(selectedPlanning.site_id),
        description:       selectedPlanning.description ?? "",
      }
    : {};

  // ── Format SideDetailsPanel ──────────────────────────────────
  // FIX : getSiteName → site.nom | getProviderName → company_name
  const formattedSelectedEvent = selectedPlanning
    ? {
        title:       selectedPlanning.codification,
        reference:   `#${String(selectedPlanning.id).padStart(7, "0")}`,
        description: selectedPlanning.description ?? "Aucune description disponible.",
        fields: [
          {
            label: "Site",
            value: getSiteName(selectedPlanning.site),           // ← site.nom ✓
          },
          {
            label: "Prestataire",
            value: getProviderName(selectedPlanning.provider),   // ← company_name ✓
          },
          { label: "Responsable", value: selectedPlanning.responsable_name },
          { label: "Téléphone",   value: selectedPlanning.responsable_phone ?? "—" },
          {
            label: "Date de début",
            // FIX : affiche date ET heure
            value: `${formatDate(selectedPlanning.date_debut)} à ${formatTime(selectedPlanning.date_debut)}`,
          },
          {
            label: "Date de fin",
            value: `${formatDate(selectedPlanning.date_fin)} à ${formatTime(selectedPlanning.date_fin)}`,
          },
          {
            label:       "Statut",
            value:       STATUS_LABELS[selectedPlanning.status],
            isStatus:    true,
            statusColor: STATUS_COLORS[selectedPlanning.status],
          },
        ],
      }
    : null;

  // ─── Render ───────────────────────────────────────────────────
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
              title="Planning"
              subtitle="Ce menu vous permet de voir le calendrier des évènements planifiés"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {cpis.map((cpi, i) => <StatsCard key={i} {...cpi} />)}
          </div>

          <div className="shrink-0 flex justify-end">
            <ActionGroup actions={siteActions} />
          </div>

          {/* FIX : MainCard reçoit les plannings réels + handlers corrects */}
          <MainCard
            plannings={plannings}
            isLoading={isLoading}
            selectedEvent={formattedSelectedEvent}
            isPanelOpen={isPanelOpen}
            onEventClick={openPanel}
            onPanelClose={closePanel}
            onEditClick={() => selectedPlanning && openEditModal(selectedPlanning)}
            onDeleteClick={async () => {
              if (!selectedPlanning) return;
              const ok = await handleDelete(selectedPlanning.id);
              showToast(
                ok ? "Planning supprimé avec succès" : "Erreur lors de la suppression",
                ok ? "success" : "error"
              );
            }}
          />
        </main>
      </div>

      {/* Modal Création */}
      <ReusableForm
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
        title="Publier un nouveau planning"
        subtitle="Remplissez les informations pour enregistrer un nouveau planning."
        fields={planningFields}
        onSubmit={handleCreateSubmit}
        submitLabel={isSubmitting ? "Diffusion du planning..." : "Diffuser"}
      />

      {/* Modal Édition */}
      <ReusableForm
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        title="Modifier le planning"
        subtitle="Modifiez les informations du planning sélectionné."
        fields={planningFields}
        onSubmit={handleEditSubmit}
        initialValues={editInitialValues}
        submitLabel={isSubmitting ? "Mise à jour..." : "Mettre à jour"}
      />

      {/* Toast feedback */}
      <Toast toast={toast} />
    </div>
  );
}