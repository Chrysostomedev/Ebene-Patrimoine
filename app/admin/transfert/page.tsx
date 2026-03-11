/**
 * app/admin/transfert/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Page transferts inter-sites — version DYNAMIQUE.
 * Branchée sur transfertService + useTransferts.
 *
 * Fonctionnalités :
 *   - KPIs depuis /admin/asset-transfers/stats
 *   - Liste paginée côté serveur depuis /admin/asset-transfers
 *   - Filtres (statut) + recherche (debounce 400ms)
 *   - Export Excel via /admin/asset-transfers/export
 *   - Modal nouveau transfert → POST /admin/asset/{id}/transfer
 *   - Actions "Terminer" / "Annuler" depuis la carte → PUT /admin/asset-transfers/{id}/status
 *   - Lien vers la page détail /admin/transfert/{id}
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRightLeft, Building2, Filter, X, Eye,
  Info, Search, RotateCcw, Calendar, User, Hash,
  Upload, CheckCircle2, XCircle, ChevronRight, RefreshCw, AlertCircle,
} from "lucide-react";

import Navbar       from "@/components/Navbar";
import Sidebar      from "@/components/Sidebar";
import PageHeader   from "@/components/PageHeader";
import StatsCard    from "@/components/StatsCard";
import ReusableForm from "@/components/ReusableForm";
import Paginate     from "@/components/Paginate";
import { FieldConfig } from "@/components/ReusableForm";

import { getSites, Site } from "../../../services/admin/site.service";
import { transfertService, TransferRecord, TransferStatus, formatTransferDate, getActorName } from "../../../services/admin/transfertService";
import { useTransferts } from "../../../hooks/admin/useTransferts";

// ─── Statuts — styles sémantiques conservés ───────────────────────────────────
const STATUT_STYLES: Record<string, string> = {
  effectué: "bg-green-50 text-green-700 border-green-200",
  en_cours: "bg-blue-50  text-blue-700  border-blue-200",
  annulé:   "bg-red-50   text-red-600   border-red-200",
};
const STATUT_LABELS: Record<string, string> = {
  effectué: "Effectué",
  en_cours: "En cours",
  annulé:   "Annulé",
};
const STATUT_DOT: Record<string, string> = {
  effectué: "#22c55e",
  en_cours: "#3b82f6",
  annulé:   "#ef4444",
};

// ─── Carte transfert ──────────────────────────────────────────────────────────
function TransferCard({
  record,
  onUpdateStatus,
  actionLoading,
}: {
  record: TransferRecord;
  onUpdateStatus: (id: number, status: "effectué" | "annulé") => Promise<void>;
  actionLoading: boolean;
}) {
  const destActive = record.status !== "annulé";
  const assetDesig = record.asset?.designation ?? `Actif #${record.company_asset_id}`;
  const assetCode  = record.asset?.codification ?? "";
  const siteFrom   = record.fromSite?.nom       ?? `Site #${record.from_site_id}`;
  const siteTo     = record.toSite?.nom         ?? `Site #${record.to_site_id}`;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition p-5 space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black text-slate-400 font-mono">#{record.id}</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${STATUT_STYLES[record.status]}`}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STATUT_DOT[record.status] }} />
              {STATUT_LABELS[record.status]}
            </span>
          </div>
          <p className="text-sm font-black text-slate-900 truncate">{assetDesig}</p>
          {assetCode && <p className="text-xs font-mono text-slate-400 mt-0.5">{assetCode}</p>}
        </div>

        {/* Actions rapides */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Terminer — uniquement si en_cours */}
          {record.status === "en_cours" && (
            <button
              onClick={() => onUpdateStatus(record.id, "effectué")}
              disabled={actionLoading}
              title="Marquer comme effectué"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-green-200 bg-green-50 text-green-700 text-xs font-bold hover:bg-green-100 transition disabled:opacity-50"
            >
              <CheckCircle2 size={12} />
              <span className="hidden xl:inline">Terminer</span>
            </button>
          )}
          {/* Annuler — uniquement si en_cours */}
          {record.status === "en_cours" && (
            <button
              onClick={() => onUpdateStatus(record.id, "annulé")}
              disabled={actionLoading}
              title="Annuler le transfert"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-red-200 bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition disabled:opacity-50"
            >
              <XCircle size={12} />
              <span className="hidden xl:inline">Annuler</span>
            </button>
          )}
          {/* Détail */}
          <Link
            href={`/admin/transfert/${record.id}`}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:text-slate-900 hover:border-slate-400 transition"
          >
            <Eye size={12} /> Détails
          </Link>
        </div>
      </div>

      {/* Trajet Origine → Destination */}
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0 bg-slate-50 rounded-xl p-3 border border-slate-100">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Origine</p>
          <div className="flex items-center gap-1.5">
            <Building2 size={12} className="text-slate-500 shrink-0" />
            <p className="text-xs font-black text-slate-700 truncate">{siteFrom}</p>
          </div>
        </div>

        <div className="flex flex-col items-center shrink-0">
          <div className={`p-2 rounded-full border-2 ${
            record.status === "effectué" ? "border-green-400 bg-green-50" :
            record.status === "en_cours" ? "border-blue-400 bg-blue-50" :
            "border-slate-300 bg-slate-50"
          }`}>
            <ArrowRightLeft size={14} className={
              record.status === "effectué" ? "text-green-600" :
              record.status === "en_cours" ? "text-blue-600" :
              "text-slate-400"
            } />
          </div>
        </div>

        <div className={`flex-1 min-w-0 rounded-xl p-3 border ${
          destActive ? "bg-theme-primary border-theme-primary" : "bg-slate-100 border-slate-200"
        }`}>
          <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${destActive ? "text-white/50" : "text-slate-400"}`}>
            Destination
          </p>
          <div className="flex items-center gap-1.5">
            <Building2 size={12} className={destActive ? "text-white/70 shrink-0" : "text-slate-400 shrink-0"} />
            <p className={`text-xs font-black truncate ${destActive ? "text-white" : "text-slate-500"}`}>
              {siteTo}
            </p>
          </div>
        </div>
      </div>

      {/* Métadonnées */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium pt-1 border-t border-slate-50">
        <div className="flex items-center gap-1.5">
          <Calendar size={11} />
          {formatTransferDate(record.transfer_date)}
        </div>
        <div className="flex items-center gap-1.5">
          <User size={11} />
          {getActorName(record.actor)}
        </div>
      </div>
    </div>
  );
}

// ─── Filtre dropdown ──────────────────────────────────────────────────────────
interface TransferFiltersUI { status?: TransferStatus | ""; }

function TransferFilterDropdown({
  isOpen, onClose, filters, onApply,
}: {
  isOpen: boolean; onClose: () => void;
  filters: TransferFiltersUI;
  onApply: (f: TransferFiltersUI) => void;
}) {
  const [local, setLocal] = useState<TransferFiltersUI>(filters);
  useEffect(() => { setLocal(filters); }, [filters]);
  if (!isOpen) return null;

  const Pill = ({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) => (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-2 rounded-xl text-sm font-semibold transition ${
        active ? "bg-theme-primary text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <span className="text-xs font-black text-slate-900 uppercase tracking-widest">Filtres</span>
        <button onClick={onClose}><X size={14} className="text-slate-500" /></button>
      </div>
      <div className="p-5 space-y-2">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Statut</p>
        {[
          { val: "",         label: "Tous"     },
          { val: "effectué", label: "Effectué" },
          { val: "en_cours", label: "En cours" },
          { val: "annulé",   label: "Annulé"   },
        ].map(o => (
          <Pill key={o.val} active={(local.status ?? "") === o.val} label={o.label}
            onClick={() => setLocal({ ...local, status: (o.val as TransferStatus) || undefined })} />
        ))}
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
          className="flex-1 py-2.5 rounded-xl bg-theme-primary text-white text-sm font-bold hover:opacity-90 transition"
        >
          Appliquer
        </button>
      </div>
    </div>
  );
}

// ─── Modal nouveau transfert ──────────────────────────────────────────────────
function NewTransferModal({
  isOpen, onClose, sites, onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  sites: Site[];
  onSuccess: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  if (!isOpen) return null;

  const siteOptions = sites
    .filter(s => s.status === "active")
    .map(s => ({ label: s.nom, value: String(s.id) }));

  const transferFields: FieldConfig[] = [
    {
      name: "company_asset_id",
      label: "ID de l'équipement",
      type: "text",
      required: true,
      placeholder: "Ex: 14",
    },
    {
      name: "to_site_id",
      label: "Site de destination",
      type: "select",
      required: true,
      options: siteOptions.length > 0 ? siteOptions : [{ label: "Chargement...", value: "" }],
    },
    {
      name: "reason",
      label: "Motif du transfert",
      type: "rich-text",
      gridSpan: 2,
      placeholder: "Décrivez la raison du transfert (optionnel)",
    },
  ];

  const handleSubmit = async (formData: Record<string, string>) => {
    const assetId = Number(formData.company_asset_id);
    if (!assetId) return;
    setSubmitting(true);
    try {
      await transfertService.initiate(assetId, {
        to_site_id: Number(formData.to_site_id),
        reason: formData.reason || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error("Erreur initiation transfert:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ReusableForm
      isOpen={isOpen}
      onClose={onClose}
      title="Nouveau transfert"
      subtitle="Déplacez un équipement vers un autre site"
      fields={transferFields}
      initialValues={{}}
      onSubmit={handleSubmit}
      submitLabel={submitting ? "Initiation en cours..." : "Initier le transfert"}
    />
  );
}

// ─── Skeleton KPIs ────────────────────────────────────────────────────────────
function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 animate-pulse">
          <div className="h-3 w-28 bg-gray-200 rounded-full mb-4" />
          <div className="h-7 w-16 bg-gray-200 rounded-lg mb-2" />
          <div className="h-3 w-12 bg-gray-100 rounded-full" />
        </div>
      ))}
    </>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function TransfertPage() {
  const {
    transfers, stats,
    loading, statsLoading, actionLoading, exportLoading, error,
    filters, setFilters,
    search, setSearch,
    currentPage, setCurrentPage, totalPages, total,
    handleExport, handleUpdateStatus, refresh,
  } = useTransferts();

  const [sites,       setSites]       = useState<Site[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [modalOpen,   setModalOpen]   = useState(false);

  const filterRef = useRef<HTMLDivElement>(null);

  // Chargement sites pour la modal
  useEffect(() => {
    getSites(undefined, 1, 200).then(d => setSites(d.items)).catch(() => setSites([]));
  }, []);

  // Fermeture filtre au clic extérieur
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node))
        setFiltersOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const activeFilters = [filters.status].filter(Boolean).length;

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      <Sidebar />
      <div className="flex flex-col flex-1 pl-64">
        <Navbar />

        <main className="mt-20 p-8 space-y-8">

          <PageHeader
            title="Transferts inter-sites"
            subtitle="Historique et gestion des relocalisations d'équipements entre sites"
          />

          {/* Erreur globale */}
          {error && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl text-sm">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
              <button
                onClick={refresh}
                className="ml-auto flex items-center gap-1.5 text-xs font-bold underline hover:no-underline"
              >
                <RefreshCw size={12} /> Réessayer
              </button>
            </div>
          )}

          {/* KPIs — depuis /stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {statsLoading ? <StatsSkeleton count={4} /> : (
              <>
                <StatsCard label="Total transferts"  value={stats?.total_transfers      ?? 0} delta="+0%" trend="up" />
                <StatsCard label="Effectués"         value={stats?.completed_transfers  ?? 0} delta="+0%" trend="up" />
                <StatsCard label="En cours"          value={stats?.pending_transfers    ?? 0} delta="+0%" trend="up" />
                <StatsCard label="Sites impliqués"   value={stats?.involved_sites_count ?? 0} delta="+0%" trend="up" />
              </>
            )}
          </div>

          {/* Barre d'actions */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Recherche */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher un transfert..."
                  className="pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary w-64 transition"
                />
              </div>

              {/* Badge filtre actif */}
              {filters.status && (
                <span className="flex items-center gap-1.5 bg-theme-primary text-white text-xs font-bold px-3 py-1.5 rounded-full">
                  {STATUT_LABELS[filters.status]}
                  <button onClick={() => { setFilters({}); }}><X size={10} /></button>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Filtre dropdown */}
              <div className="relative" ref={filterRef}>
                <button
                  onClick={() => setFiltersOpen(!filtersOpen)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition ${
                    filtersOpen || activeFilters > 0
                      ? "bg-theme-primary text-white border-theme-primary"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Filter size={14} /> Filtrer
                  {activeFilters > 0 && (
                    <span className="ml-1 bg-white text-theme-primary text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                      {activeFilters}
                    </span>
                  )}
                </button>
                <TransferFilterDropdown
                  isOpen={filtersOpen}
                  onClose={() => setFiltersOpen(false)}
                  filters={{ status: filters.status as TransferStatus | "" }}
                  onApply={f => { setFilters({ ...filters, status: f.status }); setFiltersOpen(false); }}
                />
              </div>

              {/* Export */}
              <button
                onClick={handleExport}
                disabled={exportLoading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-bold hover:bg-slate-50 transition disabled:opacity-50"
              >
                <Upload size={14} />
                {exportLoading ? "Export..." : "Exporter"}
              </button>

              {/* Nouveau transfert */}
              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-theme-primary text-white text-sm font-bold hover:opacity-90 transition shadow-sm"
              >
                <ArrowRightLeft size={15} /> Nouveau transfert
              </button>
            </div>
          </div>

          {/* Grille de cartes */}
          <div className="space-y-4">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 h-48 animate-pulse">
                    <div className="h-4 w-32 bg-gray-200 rounded mb-3" />
                    <div className="h-3 w-48 bg-gray-100 rounded mb-5" />
                    <div className="flex gap-3">
                      <div className="flex-1 h-16 bg-gray-100 rounded-xl" />
                      <div className="w-8 h-8 bg-gray-200 rounded-full self-center" />
                      <div className="flex-1 h-16 bg-gray-200 rounded-xl" />
                    </div>
                  </div>
                ))}
              </div>
            ) : transfers.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-100 py-16 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto">
                  <RotateCcw size={20} className="text-slate-400" />
                </div>
                <p className="text-slate-400 text-sm font-medium">Aucun transfert trouvé</p>
                {(search || activeFilters > 0) && (
                  <button
                    onClick={() => { setSearch(""); setFilters({}); }}
                    className="text-xs text-theme-primary font-bold underline hover:opacity-70"
                  >
                    Réinitialiser les filtres
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {transfers.map(record => (
                    <TransferCard
                      key={record.id}
                      record={record}
                      onUpdateStatus={handleUpdateStatus}
                      actionLoading={actionLoading}
                    />
                  ))}
                </div>

                {/* Pagination côté serveur */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-slate-400">
                      Page {currentPage} sur {totalPages} · {total} transfert{total > 1 ? "s" : ""}
                    </p>
                    <Paginate
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                )}
              </>
            )}
          </div>

        </main>
      </div>

      {/* Modal nouveau transfert */}
      <NewTransferModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        sites={sites}
        onSuccess={() => { refresh(); }}
      />
    </div>
  );
}