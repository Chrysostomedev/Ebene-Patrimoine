"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import ActionGroup from "@/components/ActionGroup";
import StatsCard from "@/components/StatsCard";
import ReusableForm from "@/components/ReusableForm";
import PageHeader from "@/components/PageHeader";
import MainCard from "@/components/MainCard";
import { Filter, CalendarClock, Plus, CheckCircle2, XCircle, X } from "lucide-react";

import { usePlanning } from "../../../hooks/admin/usePlanning";
import {
  CreatePlanningPayload,
  UpdatePlanningPayload,
  STATUS_COLORS,
  STATUS_LABELS,
  getSiteName,
  getProviderName,
  PlanningStatus, // Ajouté
} from "../../../services/admin/planningService";
import { formatDate, formatCurrency } from "@/lib/utils";

import { useToast } from "@/contexts/ToastContext";
import type { FieldConfig } from "@/components/ReusableForm";


// ─── Filter Dropdown (pattern identique à SitesPage) ─────────────────────────

interface PlanningFiltersState {
  status?: string;
}

function PlanningFilterDropdown({
  isOpen, onClose, filters, onApply,
}: {
  isOpen: boolean;
  onClose: () => void;
  filters: PlanningFiltersState;
  onApply: (f: PlanningFiltersState) => void;
}) {
  const [local, setLocal] = useState<PlanningFiltersState>(filters);
  useEffect(() => { setLocal(filters); }, [filters]);
  if (!isOpen) return null;

  const Pill = ({
    val, current, onClick, label,
  }: { val: string; current?: string; onClick: () => void; label: string }) => (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-2 rounded-xl text-sm font-semibold transition ${(current ?? "") === val
        ? "bg-slate-900 text-white"
        : "bg-slate-50 text-slate-600 hover:bg-slate-100"
        }`}
    >
      {label}
    </button>
  );

  return (
    <div className="absolute right-0 top-full mt-2 z-50 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <span className="text-sm font-black text-slate-900 uppercase tracking-widest">Filtres</span>
        <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition">
          <X size={16} className="text-slate-500" />
        </button>
      </div>

      {/* Options statut */}
      <div className="p-5 space-y-3">
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Statut</p>
        <div className="flex flex-col gap-1.5">
          {[
            { val: "", label: "Tous les plannings" },
            { val: "PLANIFIÉ", label: "Soumis" },
            { val: "EN_COURS", label: "En cours" },
            { val: "EN_RETARD", label: "En retard" },
            { val: "RÉALISÉ", label: "Réalisé" },
          ].map(o => (
            <Pill
              key={o.val}
              val={o.val}
              current={local.status ?? ""}
              label={o.label}
              onClick={() => setLocal({ ...local, status: o.val || undefined })}
            />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 py-4 border-t border-slate-100 flex gap-3">
        <button
          onClick={() => { setLocal({}); onApply({}); onClose(); }}
          className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition"
        >
          Réinitialiser
        </button>
        <button
          onClick={() => { onApply(local); onClose(); }}
          className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition"
        >
          Appliquer
        </button>
      </div>
    </div>
  );
}

// ─── Stats ────────────────────────────────────────────────────────────────────

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

export default function PlanningPage() {
  const {
    plannings, stats, selectedPlanning,
    isLoading, isLoadingStats, isSubmitting, error,
    isCreateModalOpen, isEditModalOpen, isPanelOpen,
    handleCreate, handleUpdate, handleDelete,
    openCreateModal, closeCreateModal,
    openEditModal: baseOpenEditModal, closeEditModal,
    openPanel: baseOpenPanel, closePanel,
    setFilters,
  } = usePlanning();

  const router = useRouter();

  /**
   * Redirection vers la page de détails au lieu d'ouvrir le panneau latéral.
   */
  const openPanel = (p: any) => {
    router.push(`/admin/planning/${p.id}`);
  };

  const openEditModal = (p: any) => {
    baseOpenEditModal(p);
    if (p.site_id) loadAssetsBySite(Number(p.site_id));
  };

  const { toast } = useToast();

  // ── Filter dropdown state (pattern SitesPage) ──────────────────────────────
  const [planningFilters, setPlanningFilters] = useState<PlanningFiltersState>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Ferme dropdown au clic extérieur
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node))
        setFiltersOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const activeCount = [planningFilters.status].filter(Boolean).length;

  const handleApplyFilters = (f: PlanningFiltersState) => {
    setPlanningFilters(f);
    setFilters({ status: f.status as any ?? undefined });
  };

  // ── Providers et Sites dynamiques ─────────────────────────────────────────
  const [providers, setProviders] = useState<{ label: string; value: number }[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [assets, setAssets] = useState<{ label: string; value: number }[]>([]);
  const [formInitialValues, setFormInitialValues] = useState<Record<string, any>>({});

  useEffect(() => {
    import("../../../core/axios").then(({ default: api }) => {

      api.get("/admin/providers", { params: { per_page: 1000 } }).then(({ data }) => {
        const raw = data?.data ?? data ?? {};
        const items: any[] = Array.isArray(raw) ? raw : (raw.items ?? raw.data ?? []);
        setProviders(
          items.map((p: any) => ({
            label: (p.company_name ?? `${p.user?.first_name ?? ""} ${p.user?.last_name ?? ""}`.trim()) || `Prestataire #${p.id}`,
            value: p.id,
          }))
        );
      }).catch(() => setProviders([]));

      api.get("/admin/site", { params: { per_page: 1000 } }).then(({ data }) => {
        const raw = data?.data ?? data ?? {};
        const items: any[] = Array.isArray(raw) ? raw : (raw.items ?? raw.data ?? []);
        setSites(items);
      }).catch(() => setSites([]));

    });
  }, []);

  // Charge les assets quand le site change
  const loadAssetsBySite = (siteId: number) => {
    import("../../../core/axios").then(({ default: api }) => {
      api.get("/admin/asset", { params: { site_id: siteId, per_page: 200 } }).then(({ data }) => {
        const raw = data?.data ?? data ?? {};
        const items: any[] = Array.isArray(raw) ? raw : (raw.items ?? raw.data ?? []);
        setAssets(
          items.map((a: any) => ({
            label: `${a.designation} (${a.codification})`,
            value: a.id,
          }))
        );
      }).catch(() => setAssets([]));
    });
  };

  const planningFields: FieldConfig[] = [
    {
      name: "site_id", label: "Site",
      type: "select", required: true,
      options: sites.map(s => ({ label: s.nom, value: s.id })),
    },
    { name: "date_debut", label: "Date de début", type: "date", required: true, disablePastDates: true, icon: CalendarClock },
    // { name: "date_fin", label: "Date de fin", type: "date", required: false, disablePastDates: true, icon: CalendarClock },
    {
      name: "company_asset_id", label: "Patrimoine / Équipement",
      type: "select", required: true,
      options: assets,
    },
    { name: "responsable_name", label: "Nom du responsable", type: "text", required: false, disabled: true },
    { name: "responsable_phone", label: "Téléphone du responsable", type: "text", required: false, disabled: true },
    {
      name: "provider_id", label: "Prestataire assigné",
      type: "select", required: true,
      options: providers,
    },
    {
      name: "description", label: "Description / Observations",
      type: "rich-text", gridSpan: 2,
      placeholder: "Décrivez les différentes observations sur le planning...",
    },
  ];

  const handleFieldChange = (name: string, value: any) => {
    if (name === "site_id") {
      const site = sites.find(s => String(s.id) === String(value));
      if (site) {
        setFormInitialValues(prev => ({
          ...prev,
          site_id: value,
          responsable_name: resolveManagerName(site),
          responsable_phone: resolveManagerPhone(site),
        }));
        loadAssetsBySite(Number(value)); // ✅ Charger les assets du site
      }
    }
  };

  const handleEventDrop = async (planningId: number, newDate: Date) => {
    const p = plannings.find(pl => pl.id === planningId);
    if (!p) return;

    const start = new Date(p.date_debut);
    const end = new Date(p.date_fin);
    const diff = end.getTime() - start.getTime();

    const nextStart = new Date(newDate);
    nextStart.setHours(start.getHours(), start.getMinutes());
    const nextEnd = new Date(nextStart.getTime() + diff);

    // Formatage local pour éviter le décalage UTC
    const toLocalISO = (d: Date) => {
      const y = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, "0");
      const da = String(d.getDate()).padStart(2, "0");
      const h = String(d.getHours()).padStart(2, "0");
      const mi = String(d.getMinutes()).padStart(2, "0");
      return `${y}-${mo}-${da}T${h}:${mi}:00`;
    };

    const ok = await handleUpdate(planningId, {
      date_debut: toLocalISO(nextStart),
      date_fin: toLocalISO(nextEnd),
    });

    if (ok) {
      toast.success("Planning déplacé avec succès !");
    } else {
      toast.error("Erreur lors du déplacement");
    }
  };

  const handleEventAdd = (date: Date) => {
    // Formatage local pour éviter le décalage UTC (toISOString() retourne UTC)
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const formattedDate = `${y}-${m}-${d}`;
    setFormInitialValues((prev) => ({
      ...prev,
      date_debut: formattedDate,
      date_fin: formattedDate,
    }));
    openCreateModal();
  };


  // ── Submit création ────────────────────────────────────────────────────────
  const handleCreateSubmit = async (formData: Record<string, any>) => {
    const payload: CreatePlanningPayload = {
      date_debut: formData.date_debut,
      date_fin: formData.date_fin || null,
      provider_id: Number(formData.provider_id),
      site_id: Number(formData.site_id),
      company_asset_id: Number(formData.company_asset_id),
      ...(formData.responsable_name ? { responsable_name: formData.responsable_name } : {}),
      ...(formData.responsable_phone ? { responsable_phone: formData.responsable_phone } : {}),
      ...(formData.description ? { description: formData.description } : {}),
    };
    const ok = await handleCreate(payload);
    if (ok) {
      toast.success("Planning créé avec succès !");
    } else {
      toast.error(error || "Erreur lors de la création");
    }
  };

  // ── Submit édition ─────────────────────────────────────────────────────────
  const handleEditSubmit = async (formData: Record<string, any>) => {
    if (!selectedPlanning) return;
    const payload: UpdatePlanningPayload = {
      date_debut: formData.date_debut,
      date_fin: formData.date_fin || null,
      provider_id: formData.provider_id ? Number(formData.provider_id) : undefined,
      site_id: formData.site_id ? Number(formData.site_id) : undefined,
      company_asset_id: formData.company_asset_id ? Number(formData.company_asset_id) : undefined,
      status: (formData.status as any) || undefined,
      ...(formData.responsable_name ? { responsable_name: formData.responsable_name } : {}),
      ...(formData.responsable_phone ? { responsable_phone: formData.responsable_phone } : {}),
      ...(formData.description ? { description: formData.description } : {}),
    };
    const ok = await handleUpdate(selectedPlanning.id, payload);
    if (ok) {
      toast.success("Planning mis à jour avec succès !");
    } else {
      toast.error(error || "Erreur de mise à jour");
    }
  };


  // ── initialValues édition ──────────────────────────────────────────────────
  const editInitialValues = selectedPlanning
    ? {
      codification: selectedPlanning.codification,
      date_debut: selectedPlanning.date_debut?.split("T")[0] ?? "",
      date_fin: selectedPlanning.date_fin?.split("T")[0] ?? "",
      responsable_name: selectedPlanning.responsable_name,
      responsable_phone: selectedPlanning.responsable_phone ?? "",
      status: selectedPlanning.status,
      provider_id: String(selectedPlanning.provider_id),
      site_id: String(selectedPlanning.site_id),
      company_asset_id: selectedPlanning.company_asset_id ? String(selectedPlanning.company_asset_id) : "",
      description: selectedPlanning.description ?? "",
    }
    : {};

  // ── Format SideDetailsPanel ────────────────────────────────────────────────
  const formattedSelectedEvent = selectedPlanning
    ? {
      title: selectedPlanning.codification,
      reference: `#${String(selectedPlanning.id).padStart(7, "0")}`,
      description: selectedPlanning.description ?? "Aucune description disponible.",
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
          value: STATUS_LABELS[selectedPlanning.status],
          isStatus: true,
          statusColor: STATUS_COLORS[selectedPlanning.status],
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
              title="Planning"
              subtitle="Ce menu vous permet de voir le calendrier des évènements planifiés"
            />
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {cpis.map((cpi, i) => <StatsCard key={i} {...cpi} />)}
          </div>

          {/* ── Barre d'actions ── */}
          <div className="flex items-center justify-between gap-3">

            {/* Gauche : badges filtres actifs */}
            <div className="flex items-center gap-2 flex-wrap min-h-[36px]">
              {activeCount === 0 && (
                <p className="text-xs text-slate-400 font-medium">Aucun filtre actif</p>
              )}
              {planningFilters.status && (
                <span className="flex items-center gap-1.5 bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded-full">
                  {STATUS_LABELS[planningFilters.status as keyof typeof STATUS_LABELS] ?? planningFilters.status}
                  <button
                    onClick={() => handleApplyFilters({ ...planningFilters, status: undefined })}
                    className="hover:opacity-70"
                  >
                    <X size={11} />
                  </button>
                </span>
              )}
            </div>

            {/* Droite : boutons */}
            <div className="flex items-center gap-3 shrink-0">

              {/* Filtrer - dropdown identique à SitesPage */}
              <div className="relative" ref={filterRef}>
                <button
                  onClick={() => setFiltersOpen(!filtersOpen)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition ${filtersOpen || activeCount > 0
                    ? "bg-slate-900 text-white border-slate-900"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                >
                  <Filter size={16} />
                  Filtrer
                  {activeCount > 0 && (
                    <span className="ml-1 bg-white text-slate-900 text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                      {activeCount}
                    </span>
                  )}
                </button>

                <PlanningFilterDropdown
                  isOpen={filtersOpen}
                  onClose={() => setFiltersOpen(false)}
                  filters={planningFilters}
                  onApply={handleApplyFilters}
                />
              </div>

              {/* Nouveau planning */}
              <button
                onClick={openCreateModal}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition shadow-sm"
              >
                <Plus size={16} />
                Nouveau planning
              </button>
            </div>
          </div>

          {/* Tableau / Calendrier */}
          <MainCard
            plannings={plannings}
            isLoading={isLoading}
            selectedEvent={formattedSelectedEvent}
            isPanelOpen={isPanelOpen}
            onEventClick={openPanel}
            onPanelClose={closePanel}
            onEventDrop={handleEventDrop} // Ajouté
            canAddEvent={true}
            onEventAdd={handleEventAdd}
            onEditClick={() => selectedPlanning && openEditModal(selectedPlanning)}
            onDeleteClick={async () => {
              if (!selectedPlanning) return;
              const ok = await handleDelete(selectedPlanning.id);
              if (ok) {
                toast.success("Planning supprimé avec succès");
              } else {
                toast.error("Erreur lors de la suppression");
              }
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
        onFieldChange={handleFieldChange} // Ajouté
        initialValues={formInitialValues} // Ajouté
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

    </>
  );
}