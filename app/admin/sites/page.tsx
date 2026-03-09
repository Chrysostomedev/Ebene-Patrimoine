"use client";

import { useState, useEffect, useRef } from "react";
import {
  Filter, Download, Upload, Globe, X,
} from "lucide-react";

import Navbar      from "@/components/Navbar";
import Sidebar     from "@/components/Sidebar";
import SiteCard    from "@/components/SiteCard";
import StatsCard   from "@/components/StatsCard";
import Paginate    from "@/components/Paginate";
import ReusableForm from "@/components/ReusableForm";
import PageHeader  from "@/components/PageHeader";
import SearchInput from "@/components/SearchInput";
import { FieldConfig } from "@/components/ReusableForm";

import { useSites } from "../../../hooks/useSites";
import { exportSites, importSites, downloadSiteImportTemplate } from "../../../services/site.service";

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

const formatMontant = (v: number | null | undefined): string => {
  if (!v) return "0";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v % 1_000_000 !== 0 ? 1 : 0)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(v % 1_000 !== 0 ? 1 : 0)}K`;
  return String(v);
};

// ═══════════════════════════════════════════════
// FILTER DROPDOWN
// ═══════════════════════════════════════════════

interface SiteFiltersState { status?: string; }

function SiteFilterDropdown({
  isOpen, onClose, filters, onApply,
}: {
  isOpen: boolean; onClose: () => void;
  filters: SiteFiltersState; onApply: (f: SiteFiltersState) => void;
}) {
  const [local, setLocal] = useState<SiteFiltersState>(filters);
  useEffect(() => { setLocal(filters); }, [filters]);
  if (!isOpen) return null;

  const Pill = ({ val, current, onClick, label }: { val: string; current?: string; onClick: () => void; label: string }) => (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-2 rounded-xl text-sm font-semibold transition ${
        (current ?? "") === val ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="absolute right-0 top-full mt-2 z-50 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <span className="text-sm font-black text-slate-900 uppercase tracking-widest">Filtres</span>
        <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition">
          <X size={16} className="text-slate-500" />
        </button>
      </div>
      <div className="p-5 space-y-3">
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Statut</p>
        <div className="flex flex-col gap-1.5">
          {[
            { val: "",         label: "Tous les sites" },
            { val: "active",   label: "Actif"          },
            { val: "inactive", label: "Inactif"        },
          ].map(o => (
            <Pill key={o.val} val={o.val} current={local.status ?? ""} label={o.label}
              onClick={() => setLocal({ ...local, status: o.val || undefined })} />
          ))}
        </div>
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

export default function SitesPage() {
  const [isModalOpen,   setIsModalOpen]   = useState(false);
  const [search,        setSearch]        = useState("");
  const [filters,       setFilters]       = useState<SiteFiltersState>({});
  const [filtersOpen,   setFiltersOpen]   = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [flash, setFlash] = useState<{ type: "success"|"error"; msg: string } | null>(null);

  const filterRef = useRef<HTMLDivElement>(null);

  const {
    sites, stats, managers, loading,
    page, totalPages, totalItems, setPage,
    fetchSites, fetchStats, fetchManagers, addSite,
  } = useSites();

  // Ferme dropdown au clic extérieur
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node))
        setFiltersOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    setPage(1);
    fetchSites(search, filters.status, 1);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchStats();
    fetchManagers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 5000);
    return () => clearTimeout(t);
  }, [flash]);

  const showFlash = (type: "success"|"error", msg: string) => setFlash({ type, msg });

  const handleApplyFilters = (f: SiteFiltersState) => {
    setFilters(f);
    setPage(1);
    fetchSites(search, f.status, 1);
  };

  const activeCount = [filters.status].filter(Boolean).length;

  // ── Formulaire
  const handleFormSubmit = async (formData: any) => {
    try {
      await addSite({
        ...formData,
        manager_id: formData.manager_id ? Number(formData.manager_id) : undefined,
      });
      setIsModalOpen(false);
      fetchSites(search, filters.status);
      showFlash("success", "Site créé avec succès.");
    } catch (err: any) {
      showFlash("error", err?.response?.data?.message ?? "Erreur lors de la création.");
    }
  };

  // ── Export
  const handleExport = async () => {
    if (exportLoading) return;
    setExportLoading(true);
    try {
      const response = await exportSites(filters.status ? { status: filters.status } : {});
      const blob = new Blob([response.data], {
        type: response.headers["content-type"] ??
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url  = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href  = url;
      const cd   = (response.headers["content-disposition"] as string) ?? "";
      const m    = cd.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      link.download = m?.[1]?.replace(/['"]/g, "") ??
        `sites_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      showFlash("success", "Export téléchargé avec succès.");
    } catch {
      showFlash("error", "Erreur lors de l'exportation.");
    } finally {
      setExportLoading(false);
    }
  };

  // ── Import
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImportLoading(true);
    try {
      await importSites(file);
      await fetchSites(search);
      showFlash("success", `"${file.name}" importé avec succès.`);
    } catch (err: any) {
      showFlash("error", err?.response?.data?.message ?? "Erreur lors de l'import.");
    } finally {
      setImportLoading(false);
    }
  };

  // ── Champs formulaire
  const siteFields: FieldConfig[] = [
    { name: "nom",               label: "Nom du site",            type: "text",   required: true },
    { name: "ref_contrat",       label: "Référence contrat",      type: "text",   required: true },
    {
      name: "manager_id", label: "Gestionnaire", type: "select",
      options: managers.map((m: any) => ({
        label: m.first_name ?? m.name ?? m.email ?? `Manager #${m.id}`,
        value: String(m.id),
      })),
    },
    { name: "phone_responsable", label: "Téléphone responsable", type: "text" },
    { name: "email",             label: "Email du site",          type: "email" },
    {
      name: "status", label: "Statut", type: "select", required: true,
      options: [{ label: "Actif", value: "active" }, { label: "Inactif", value: "inactive" }],
    },
    { name: "effectifs",        label: "Effectifs",                type: "number" },
    { name: "loyer",            label: "Loyer mensuel (FCFA)",     type: "number" },
    { name: "localisation",     label: "Localisation",             type: "text", gridSpan: 2 },
    { name: "superficie",       label: "Superficie (m²)",          type: "number" },
    { name: "date_deb_contrat", label: "Date de début de contrat", type: "date" },
    { name: "date_fin_contrat", label: "Date de fin de contrat",   type: "date" },
  ];

  // ── KPIs
  const ticketsEnCours = stats?.tickets_par_site?.reduce(
    (acc: number, s: any) => acc + (s.tickets_en_cours ?? 0), 0
  ) ?? 0;
  const ticketsClos = stats?.tickets_par_site?.reduce(
    (acc: number, s: any) => acc + (s.tickets_clos ?? 0), 0
  ) ?? 0;

  const kpis1 = [
    { label: "Sites actifs",       value: stats?.nombre_sites_actifs   ?? 0, delta: "+0%", trend: "up"   as const },
    { label: "Sites inactifs",     value: stats?.nombre_sites_inactifs ?? 0, delta: "+0%", trend: "down" as const },
    { label: "Délai moyen / site", value: "1 semaine",                        delta: "+0%", trend: "up"   as const },
    { label: "Total sites",        value: stats?.nombre_total_sites    ?? 0, delta: "+0%", trend: "up"   as const },
  ];
  const kpis2 = [
    {
      label: "Coût moyen / site",
      value: formatMontant(stats?.cout_loyer_moyen_par_site) + " FCFA",
      delta: "+0%", trend: "up" as const,
    },
    { label: "Tickets en cours",    value: ticketsEnCours, delta: "+0%", trend: "up" as const },
    { label: "Tickets clôturés",    value: ticketsClos,    delta: "+0%", trend: "up" as const },
    { label: "Site le plus visité", value: stats?.site_le_plus_visite?.nom ?? "—", delta: "", trend: "up" as const },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar />

        <main className="ml-64 mt-20 p-6 space-y-8 overflow-y-auto h-[calc(100vh-80px)]">

          <PageHeader title="Sites" subtitle="Suivi et gestion de tous les sites" />

          {/* Flash */}
          {flash && (
            <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-xl shadow-lg text-sm font-semibold border ${
              flash.type === "success"
                ? "text-green-700 bg-green-50 border-green-200"
                : "text-red-600 bg-red-100 border-red-300"
            }`}>
              {flash.msg}
            </div>
          )}

          {/* KPIs row 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis1.map((k, i) => <StatsCard key={i} {...k} />)}
          </div>

          {/* KPIs row 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis2.map((k, i) => <StatsCard key={i} {...k} />)}
          </div>

          {/* ── Barre d'actions ── */}
          <div className="flex items-center justify-between gap-3">

            {/* Gauche : badges filtres actifs */}
            <div className="flex items-center gap-2 flex-wrap min-h-[36px]">
              {activeCount === 0 && (
                <p className="text-xs text-slate-400 font-medium">Aucun filtre actif</p>
              )}
              {filters.status && (
                <span className="flex items-center gap-1.5 bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded-full">
                  {filters.status === "active" ? "Actif" : "Inactif"}
                  <button onClick={() => handleApplyFilters({ ...filters, status: undefined })} className="hover:opacity-70">
                    <X size={11} />
                  </button>
                </span>
              )}
            </div>

            {/* Droite : boutons */}
            <div className="flex items-center gap-3 shrink-0">

              {/* Template import */}
              <button
                onClick={downloadSiteImportTemplate}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 text-sm font-medium hover:bg-slate-50 transition"
                title="Télécharger le modèle d'import"
              >
                <Download size={14} />
                Modèle
              </button>

              {/* Importer */}
              <label className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-bold cursor-pointer hover:bg-slate-50 transition ${importLoading ? "opacity-60 cursor-wait" : ""}`}>
                {importLoading
                  ? <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
                  : <Download size={16} />
                }
                Importer
                <input
                  type="file" accept=".xlsx,.xls,.csv"
                  className="hidden" disabled={importLoading}
                  onChange={handleImport}
                />
              </label>

              {/* Exporter */}
              <button
                onClick={handleExport} disabled={exportLoading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-bold hover:bg-slate-50 transition disabled:opacity-60 disabled:cursor-wait"
              >
                {exportLoading
                  ? <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
                  : <Upload size={16} />
                }
                Exporter
              </button>

              {/* Filtrer */}
              <div className="relative" ref={filterRef}>
                <button
                  onClick={() => setFiltersOpen(!filtersOpen)}
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
                <SiteFilterDropdown
                  isOpen={filtersOpen}
                  onClose={() => setFiltersOpen(false)}
                  filters={filters}
                  onApply={handleApplyFilters}
                />
              </div>

              {/* Ajouter */}
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition shadow-sm"
              >
                <Globe size={16} /> Ajouter un site
              </button>
            </div>
          </div>

          {/* ── Grille sites ── */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
            <div className="w-80">
              <SearchInput
                onSearch={(v) => { setSearch(v); fetchSites(v, filters.status, 1); setPage(1); }}
                placeholder="Rechercher par nom, responsable..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {loading ? (
                <div className="col-span-full py-16 text-center">
                  <span className="inline-block w-6 h-6 border-2 border-slate-200 border-t-slate-700 rounded-full animate-spin mb-3" />
                  <p className="text-slate-400 text-sm">Chargement des sites...</p>
                </div>
              ) : sites.length > 0 ? (
                sites.map((site) => <SiteCard key={site.id} site={site} />)
              ) : (
                <div className="col-span-full text-center text-slate-400 italic py-10">
                  Aucun site trouvé{activeCount > 0 ? " pour ce filtre" : ""}.
                </div>
              )}
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-slate-50">
              <p className="text-xs text-slate-400">
                Page {page} sur {totalPages} · {totalItems} site{totalItems > 1 ? "s" : ""}
              </p>
              <Paginate
                currentPage={page}
                totalPages={totalPages}
                onPageChange={(p) => setPage(p)}
              />
            </div>
          </div>

        </main>
      </div>

      <ReusableForm
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Ajouter un site"
        subtitle="Créez un nouveau site avec ses informations"
        fields={siteFields}
        onSubmit={handleFormSubmit}
        submitLabel="Créer le site"
      />
    </div>
  );
}