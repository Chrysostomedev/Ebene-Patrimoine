"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Filter, Download, Upload, PlusCircle, X,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import SearchInput from "@/components/SearchInput";
import ReusableForm from "@/components/ReusableForm";
import StatsCard from "@/components/StatsCard";
import ProfileModal from "@/components/ProfileModal";
import Paginate from "@/components/Paginate";
import PrestCard from "@/components/PrestCard";
import PageHeader from "@/components/PageHeader";

import { useProviders } from "../../../hooks/useProviders";
import { ProviderService, Provider } from "../../../services/provider.service";
import { useServices } from "../../../hooks/useServices";

// ═══════════════════════════════════════════════
// FILTER DROPDOWN
// ═══════════════════════════════════════════════

interface ProviderFilters { is_active?: boolean; service_id?: number; }

function ProviderFilterDropdown({
  isOpen, onClose, filters, onApply, services,
}: {
  isOpen: boolean; onClose: () => void;
  filters: ProviderFilters;
  onApply: (f: ProviderFilters) => void;
  services: { id: number; name: string }[];
}) {
  const [local, setLocal] = useState<ProviderFilters>(filters);
  useEffect(() => { setLocal(filters); }, [filters]);
  if (!isOpen) return null;

  const currentStatus =
    local.is_active === undefined ? "" :
    local.is_active ? "true" : "false";

  const Pill = ({
    val, current, onClick, label,
  }: { val: string; current: string; onClick: () => void; label: string }) => (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-2 rounded-xl text-sm font-semibold transition ${
        current === val
          ? "bg-slate-900 text-white"
          : "bg-slate-50 text-slate-600 hover:bg-slate-100"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <span className="text-sm font-black text-slate-900 uppercase tracking-widest">Filtres</span>
        <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition">
          <X size={16} className="text-slate-500" />
        </button>
      </div>

      <div className="p-5 space-y-5 max-h-[65vh] overflow-y-auto">
        {/* Statut */}
        <div className="space-y-1.5">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Statut</p>
          <div className="flex flex-col gap-1.5">
            {[
              { val: "",      label: "Tous les prestataires" },
              { val: "true",  label: "Actifs seulement"      },
              { val: "false", label: "Inactifs seulement"    },
            ].map(o => (
              <Pill
                key={o.val} val={o.val} current={currentStatus} label={o.label}
                onClick={() => setLocal({
                  ...local,
                  is_active: o.val === "" ? undefined : o.val === "true",
                })}
              />
            ))}
          </div>
        </div>

        {/* Service */}
        {services.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Service</p>
            <div className="flex flex-col gap-1.5">
              <Pill
                val="" current={String(local.service_id ?? "")}
                label="Tous les services"
                onClick={() => setLocal({ ...local, service_id: undefined })}
              />
              {services.map(s => (
                <Pill
                  key={s.id} val={String(s.id)}
                  current={String(local.service_id ?? "")}
                  label={s.name}
                  onClick={() => setLocal({ ...local, service_id: s.id })}
                />
              ))}
            </div>
          </div>
        )}
      </div>

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

// ═══════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════

export default function PrestatairesPage() {
  const router = useRouter();

  const {
    providers, stats, isLoading, meta,
    page, setPage,
    applySearch, applyFilters, filters,
    fetchProviders,
  } = useProviders();

  const { services } = useServices();

  const [isModalOpen,      setIsModalOpen]      = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<any | null>(null);
  const [filtersOpen,      setFiltersOpen]      = useState(false);
  const [flash,            setFlash]            = useState<{ type: "success"|"error"; message: string } | null>(null);

  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node))
        setFiltersOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 5000);
    return () => clearTimeout(t);
  }, [flash]);

  const showFlash = (type: "success"|"error", message: string) =>
    setFlash({ type, message });

  const activeCount = [
    filters.is_active !== undefined ? "1" : "",
    filters.service_id              ? "1" : "",
  ].filter(Boolean).length;

  const handleOpenProfil = async (p: Provider) => {
    try {
      const detail = await ProviderService.getProvider(p.id);
      setSelectedProvider({ ...p, loadedStats: detail.stats });
    } catch {
      setSelectedProvider({ ...p, loadedStats: null });
    }
  };

  const handleExport = () =>
    showFlash("error", "Fonctionnalité d'export en cours de développement.");
  const handleImport = () =>
    showFlash("error", "Fonctionnalité d'import en cours de développement.");

  const handleToggleStatus = async (p: Provider) => {
    try {
      if (p.is_active) {
        await ProviderService.desactivateProvider(p.id);
        showFlash("success", `${p.company_name} désactivé.`);
      } else {
        await ProviderService.activateProvider(p.id);
        showFlash("success", `${p.company_name} activé.`);
      }
      fetchProviders();
    } catch {
      showFlash("error", "Erreur lors du changement de statut.");
    }
  };

  // ── Champs formulaire création prestataire ──
  // Structure : Infos société → Responsable → Médias (logo + photos)
  const prestFields = [

    // ── BLOC 1 : Informations société ──
    { name: "company_name", label: "Nom du prestataire", type: "text",   required: true },
    {
      name: "service_id",   label: "Service",             type: "select", required: true,
      options: services.map(s => ({ label: s.name, value: String(s.id) })),
    },
    { name: "city",         label: "Ville",               type: "text",   required: true },
    { name: "street",       label: "Rue / Adresse",       type: "text"                   },
    { name: "date_entree",  label: "Date d'entrée",       type: "date",   required: true },
    { name: "users.password",   label: "Mot de passe",        type: "password", required: true },

    // ── BLOC 2 : Responsable compte ──
    { name: "users.last_name",  label: "Nom du responsable", type: "text",     required: true },
    { name: "users.first_name", label: "Prénom",              type: "text",     required: true },
    { name: "users.email",      label: "Email du responsable",type: "email",    required: true },
    { name: "users.phone",      label: "Téléphone",           type: "text",     required: true },
    
    // Description pleine largeur
    { name: "description",  label: "Description",         type: "rich-text", gridSpan: 2 },

    

    // ── BLOC 3 : Médias ──
    // Logo : 1 seule image carrée (identité visuelle du prestataire)
    {
      name: "logo",   label: "Logo du prestataire",
      type: "image-upload", gridSpan: 1, maxImages: 1,
    },
    // Photos : jusqu'à 3 images supplémentaires (locaux, équipe, etc.)
    {
      name: "images", label: "Photos supplémentaires",
      type: "image-upload", gridSpan: 1, maxImages: 3,
    },
  ];

  const handleCreate = async (formData: any) => {
    try {
      await ProviderService.createProvider({
        company_name: formData.company_name,
        city:         formData.city,
        neighborhood: formData.neighborhood  || undefined,
        street:       formData.street        || undefined,
        service_id:   Number(formData.service_id),
        date_entree:  formData.date_entree   || undefined,
        description:  formData.description   || undefined,
        users: {
          first_name: formData["users.first_name"],
          last_name:  formData["users.last_name"],
          email:      formData["users.email"],
          phone:      formData["users.phone"],
          password:   formData["users.password"],
        },
        // logo & images transmis séparément si ton backend supporte multipart
        // logo:   formData.logo,
        // images: formData.images,
      });
      showFlash("success", "Prestataire créé avec succès.");
      setIsModalOpen(false);
      fetchProviders();
    } catch (err: any) {
      showFlash("error", err?.response?.data?.message ?? err?.message ?? "Erreur lors de la création.");
    }
  };

  // ── KPIs ──
  const kpis = [
    { label: "Total prestataires",       value: stats?.total_providers           ?? 0,  delta: "+0%", trend: "up"   as const },
    { label: "Prestataires actifs",      value: stats?.active_providers          ?? 0,  delta: "+0%", trend: "up"   as const },
    { label: "Prestataires inactifs",    value: stats?.inactive_providers        ?? 0,  delta: "+0%", trend: "down" as const },
    { label: "Délai moyen intervention", value: stats?.average_intervention_time ?? "—",              delta: "+0%", trend: "up"   as const },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />

        <main className="ml-64 mt-20 p-6 space-y-8">
          <PageHeader
            title="Prestataires"
            subtitle="Gérez tous vos prestataires de services"
          />

          {/* Flash */}
          {flash && (
            <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-xl shadow-lg text-sm font-semibold border ${
              flash.type === "success"
                ? "text-green-700 bg-green-50 border-green-200"
                : "text-red-600 bg-red-100 border-red-300"
            }`}>
              {flash.message}
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis.map((k, i) => <StatsCard key={i} {...k} />)}
          </div>

          {/* ── Barre d'actions ── */}
          <div className="flex items-center justify-between gap-3">

            {/* Gauche : badges filtres actifs */}
            <div className="flex items-center gap-2 flex-wrap min-h-[36px]">
              {activeCount === 0 && (
                <p className="text-xs text-slate-400 font-medium">Aucun filtre actif</p>
              )}
              {filters.is_active !== undefined && (
                <span className="flex items-center gap-1.5 bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded-full">
                  {filters.is_active ? "Actifs" : "Inactifs"}
                  <button onClick={() => applyFilters({ ...filters, is_active: undefined })} className="hover:opacity-70 transition">
                    <X size={11} />
                  </button>
                </span>
              )}
              {filters.service_id && (
                <span className="flex items-center gap-1.5 bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded-full">
                  {services.find(s => s.id === filters.service_id)?.name ?? `Service #${filters.service_id}`}
                  <button onClick={() => applyFilters({ ...filters, service_id: undefined })} className="hover:opacity-70 transition">
                    <X size={11} />
                  </button>
                </span>
              )}
            </div>

            {/* Droite : boutons d'action */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={handleImport}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-bold hover:bg-slate-50 transition"
              >
                <Download size={16} /> Importer
              </button>

              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-bold hover:bg-slate-50 transition"
              >
                <Upload size={16} /> Exporter
              </button>

              <div className="relative" ref={filterRef}>
                <button
                  onClick={() => setFiltersOpen(o => !o)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition ${
                    filtersOpen || activeCount > 0
                      ? "bg-slate-900 text-white border-slate-900"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Filter size={16} /> Filtrer
                  {activeCount > 0 && (
                    <span className="ml-1 bg-white text-slate-900 text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                      {activeCount}
                    </span>
                  )}
                </button>
                <ProviderFilterDropdown
                  isOpen={filtersOpen}
                  onClose={() => setFiltersOpen(false)}
                  filters={filters}
                  onApply={(f) => { applyFilters(f); setFiltersOpen(false); }}
                  services={services}
                />
              </div>

              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition shadow-sm"
              >
                <PlusCircle size={16} /> Ajouter un prestataire
              </button>
            </div>
          </div>

          {/* ── Liste + Search ── */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
            <div className="w-80">
              <SearchInput
                onSearch={applySearch}
                placeholder="Rechercher un prestataire..."
              />
            </div>

            {isLoading ? (
              <div className="py-20 text-center">
                <span className="inline-block w-6 h-6 border-2 border-slate-200 border-t-slate-700 rounded-full animate-spin mb-3" />
                <p className="text-slate-400 text-sm">Chargement des prestataires...</p>
              </div>
            ) : providers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {providers.map(p => (
                  <PrestCard
                    key={p.id}
                    id={p.id}
                    name={p.company_name ?? "Prestataire"}
                    location={p.city ?? "—"}
                    category={p.service?.name ?? "—"}
                    phone={p.user?.phone ?? "—"}
                    email={p.user?.email ?? "—"}
                    rating={p.rating ?? 0}
                    status={p.is_active ? "Actif" : "Inactif"}
                    logo={p.logoUrl}
                    onProfilClick={() => handleOpenProfil(p)}
                    onTicketsClick={() => router.push(`/admin/prestataires/details/${p.id}`)}
                    detailUrl={`/admin/prestataires/details/${p.id}`}
                  />
                ))}
              </div>
            ) : (
              <div className="py-20 text-center text-slate-400 italic">
                Aucun prestataire trouvé{activeCount > 0 ? " pour ces filtres" : ""}.
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-50">
              <p className="text-xs text-slate-400">
                Page {page} sur {meta.last_page} · {meta.total} prestataire{meta.total > 1 ? "s" : ""}
              </p>
              <Paginate currentPage={page} totalPages={meta.last_page} onPageChange={setPage} />
            </div>
          </div>
        </main>
      </div>

      {/* ── Formulaire création ── */}
      <ReusableForm
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Ajouter un nouveau prestataire"
        subtitle="Remplissez les informations pour enregistrer un prestataire."
        fields={prestFields as any}
        onSubmit={handleCreate}
        submitLabel="Créer le prestataire"
      />

      {/* ── ProfileModal ── */}
      <ProfileModal
        isOpen={!!selectedProvider}
        onClose={() => setSelectedProvider(null)}
        provider={selectedProvider ? {
          name:       selectedProvider.company_name  ?? "Prestataire",
          location:   selectedProvider.city          ?? "—",
          phone:      selectedProvider.user?.phone   ?? "—",
          email:      selectedProvider.user?.email   ?? "—",
          category:   selectedProvider.service?.name ?? "—",
          dateEntree: selectedProvider.date_entree   ?? "—",
          status:     selectedProvider.is_active ? "Actif" : "Inactif",
          logo:       selectedProvider.logoUrl,
          stats: {
            totalBillets:   { value: selectedProvider.loadedStats?.total_tickets       ?? 0, delta: "+0%" },
            ticketsEnCours: { value: selectedProvider.loadedStats?.in_progress_tickets ?? 0, delta: "+0%" },
            ticketsTraites: { value: selectedProvider.loadedStats?.closed_tickets      ?? 0, delta: "+0%" },
            noteObtenue:    selectedProvider.loadedStats?.rating
              ? `${selectedProvider.loadedStats.rating}/5`
              : (selectedProvider.rating ? `${selectedProvider.rating}/5` : "N/A"),
          },
        } : null}
      />
    </div>
  );
}