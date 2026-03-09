"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowRightLeft, Building2, Filter,
  X, Eye, ChevronRight,
  Info, Search, RotateCcw,
  Calendar, User, Hash,
} from "lucide-react";

import Navbar       from "@/components/Navbar";
import Sidebar      from "@/components/Sidebar";
import PageHeader   from "@/components/PageHeader";
import StatsCard    from "@/components/StatsCard";
import ReusableForm from "@/components/ReusableForm";
import Paginate     from "@/components/Paginate";
import { FieldConfig } from "@/components/ReusableForm";

import { getSites, Site } from "../../../services/site.service";

// ─────────────────────────────────────────────────────────────
// TYPES & DONNÉES STATIQUES
// ─────────────────────────────────────────────────────────────

interface TransferRecord {
  id: number;
  asset_id: number;
  asset_designation: string;
  asset_codification: string;
  asset_type: string;
  site_from_id: number;
  site_from: string;
  site_to_id: number;
  site_to: string;
  date: string;
  motif: string;
  initiateur: string;
  statut: "effectué" | "en_cours" | "annulé";
}

const FAKE_TRANSFERS: TransferRecord[] = [
  {
    id: 1, asset_id: 14,
    asset_designation: "Climatiseur split 24 000 BTU", asset_codification: "CLI-SP-03014", asset_type: "Climatisation",
    site_from_id: 3, site_from: "Boutique Quartier 1", site_to_id: 1, site_to: "Siège Canal+",
    date: "2025-11-12T09:30:00Z", motif: "Panne sur le site source, équipement inutilisé", initiateur: "Moussa K.", statut: "effectué",
  },
  {
    id: 2, asset_id: 7,
    asset_designation: "Serveur Rack Dell PowerEdge R750", asset_codification: "INF-SR-02007", asset_type: "Informatique",
    site_from_id: 1, site_from: "Siège Canal+", site_to_id: 2, site_to: "Entrepôt Zone 4",
    date: "2025-12-03T14:15:00Z", motif: "Mise à disposition pour stockage temporaire avant déploiement", initiateur: "Fatou D.", statut: "effectué",
  },
  {
    id: 3, asset_id: 22,
    asset_designation: "Groupe électrogène 20 kVA", asset_codification: "ENE-GE-01022", asset_type: "Énergie",
    site_from_id: 5, site_from: "Boutique Quartier 3", site_to_id: 6, site_to: "Boutique Quartier 4",
    date: "2026-01-08T11:00:00Z", motif: "Besoin urgent suite à coupure fréquente sur le site de destination", initiateur: "Zénab K.", statut: "effectué",
  },
  {
    id: 4, asset_id: 31,
    asset_designation: "Imprimante multifonction Canon MF", asset_codification: "INF-IM-04031", asset_type: "Informatique",
    site_from_id: 2, site_from: "Entrepôt Zone 4", site_to_id: 9, site_to: "Boutique Quartier 7",
    date: "2026-01-20T10:45:00Z", motif: "Redistribution équipements neufs reçus en entrepôt", initiateur: "Awa T.", statut: "en_cours",
  },
  {
    id: 5, asset_id: 9,
    asset_designation: "Onduleur APC Smart-UPS 3000VA", asset_codification: "ENE-ON-02009", asset_type: "Énergie",
    site_from_id: 4, site_from: "Boutique Quartier 2", site_to_id: 1, site_to: "Siège Canal+",
    date: "2026-02-05T08:00:00Z", motif: "Remplacement onduleur défaillant au siège", initiateur: "Amadou D.", statut: "annulé",
  },
  {
    id: 6, asset_id: 45,
    asset_designation: "Switch réseau Cisco Catalyst 2960", asset_codification: "INF-SW-05045", asset_type: "Réseau",
    site_from_id: 1, site_from: "Siège Canal+", site_to_id: 11, site_to: "Boutique Quartier 9",
    date: "2026-02-18T16:00:00Z", motif: "Extension réseau boutique suite rénovation", initiateur: "Cissé I.", statut: "effectué",
  },
  {
    id: 7, asset_id: 58,
    asset_designation: "Caméra de surveillance IP Hikvision", asset_codification: "SEC-CA-06058", asset_type: "Sécurité",
    site_from_id: 7, site_from: "Boutique Quartier 5", site_to_id: 8, site_to: "Boutique Quartier 8",
    date: "2026-03-01T09:15:00Z", motif: "Installation système vidéosurveillance complet", initiateur: "Koffi Y.", statut: "en_cours",
  },
];

// ─────────────────────────────────────────────────────────────
// HELPERS & STYLES STATUTS
// (statuts gardent leurs couleurs sémantiques : vert/bleu/rouge)
// ─────────────────────────────────────────────────────────────

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
  + " à " + new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

// Statuts : couleurs sémantiques conservées (vert = effectué, bleu = en cours, rouge = annulé)
const STATUT_STYLES: Record<string, string> = {
  effectué: "bg-green-50 text-green-700 border-green-200",
  en_cours: "bg-blue-50  text-blue-700  border-blue-200",
  annulé:   "bg-red-50   text-red-600   border-red-200",
};
const STATUT_LABELS: Record<string, string> = {
  effectué: "Effectué", en_cours: "En cours", annulé: "Annulé",
};
const STATUT_DOT: Record<string, string> = {
  effectué: "#22c55e", en_cours: "#3b82f6", annulé: "#ef4444",
};

// ─────────────────────────────────────────────────────────────
// CARTE TRANSFERT
// ─────────────────────────────────────────────────────────────

function TransferCard({ record, onView }: { record: TransferRecord; onView: (r: TransferRecord) => void }) {
  // La destination active utilise bg-theme-primary au lieu de bg-slate-900
  const destActive = record.statut !== "annulé";

  return (
    <div className="bg-white rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition p-5 space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black text-slate-400 font-mono">#{record.id}</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${STATUT_STYLES[record.statut]}`}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STATUT_DOT[record.statut] }} />
              {STATUT_LABELS[record.statut]}
            </span>
          </div>
          <p className="text-sm font-black text-slate-900 truncate">{record.asset_designation}</p>
          <p className="text-xs font-mono text-slate-400 mt-0.5">{record.asset_codification}</p>
        </div>
        <button
          onClick={() => onView(record)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:text-slate-900 hover:border-slate-400 transition shrink-0"
        >
          <Eye size={12} /> Détails
        </button>
      </div>

      {/* Sites : origine → destination */}
      <div className="flex items-center gap-3">
        {/* Origine */}
        <div className="flex-1 min-w-0 bg-slate-50 rounded-xl p-3 border border-slate-100">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Origine</p>
          <div className="flex items-center gap-1.5">
            <Building2 size={12} className="text-slate-500 shrink-0" />
            <p className="text-xs font-black text-slate-700 truncate">{record.site_from}</p>
          </div>
        </div>

        {/* Icône flèche — couleur sémantique du statut */}
        <div className="flex flex-col items-center shrink-0">
          <div className={`p-2 rounded-full border-2 ${
            record.statut === "effectué" ? "border-green-400 bg-green-50" :
            record.statut === "en_cours" ? "border-blue-400 bg-blue-50" :
            "border-slate-300 bg-slate-50"
          }`}>
            <ArrowRightLeft size={14} className={
              record.statut === "effectué" ? "text-green-600" :
              record.statut === "en_cours" ? "text-blue-600" :
              "text-slate-400"
            } />
          </div>
        </div>

        {/* Destination — bg-theme-primary si actif */}
        <div className={`flex-1 min-w-0 rounded-xl p-3 border ${
          destActive
            ? "bg-theme-primary border-theme-primary"
            : "bg-slate-100 border-slate-200"
        }`}>
          <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${destActive ? "text-white/50" : "text-slate-400"}`}>
            Destination
          </p>
          <div className="flex items-center gap-1.5">
            <Building2 size={12} className={destActive ? "text-white/70 shrink-0" : "text-slate-400 shrink-0"} />
            <p className={`text-xs font-black truncate ${destActive ? "text-white" : "text-slate-500"}`}>
              {record.site_to}
            </p>
          </div>
        </div>
      </div>

      {/* Métadonnées */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium pt-1 border-t border-slate-50">
        <div className="flex items-center gap-1.5"><Calendar size={11} />{formatDate(record.date)}</div>
        <div className="flex items-center gap-1.5"><User size={11} />{record.initiateur}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SIDE PANEL DÉTAILS
// ─────────────────────────────────────────────────────────────

function TransferDetailPanel({ record, onClose }: { record: TransferRecord | null; onClose: () => void }) {
  if (!record) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/25 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[420px] bg-white z-50 shadow-2xl flex flex-col rounded-l-3xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="text-base font-black text-slate-900">Détails du transfert</h3>
            <p className="text-xs text-slate-400 mt-0.5">Transfert #{record.id}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-xl transition">
            <X size={16} className="text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Statut (sémantique conservée) */}
          <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl border ${STATUT_STYLES[record.statut]}`}>
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUT_DOT[record.statut] }} />
            <span className="text-sm font-black">{STATUT_LABELS[record.statut]}</span>
          </div>

          {/* Équipement */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Équipement transféré</p>
            <p className="text-base font-black text-slate-900">{record.asset_designation}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                {record.asset_codification}
              </span>
              <span className="text-xs text-slate-400 font-medium">{record.asset_type}</span>
            </div>
            <Link
              href={`/admin/patrimoines/${record.asset_id}`}
              className="flex items-center gap-1.5 text-xs font-bold text-theme-primary hover:opacity-70 transition mt-1"
            >
              Voir le patrimoine <ChevronRight size={12} />
            </Link>
          </div>

          {/* Trajet */}
          <div className="space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trajet</p>
            <div className="flex items-stretch gap-3">
              {/* Origine */}
              <div className="flex-1 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Origine</p>
                <div className="flex items-center gap-2 mb-1">
                  <Building2 size={14} className="text-slate-500" />
                  <p className="text-sm font-black text-slate-800">{record.site_from}</p>
                </div>
                <p className="text-[10px] text-slate-400">Site #{record.site_from_id}</p>
              </div>

              {/* Icône */}
              <div className="flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-theme-primary flex items-center justify-center shadow-sm">
                  <ArrowRightLeft size={14} className="text-white" />
                </div>
              </div>

              {/* Destination */}
              <div className="flex-1 bg-theme-primary rounded-2xl p-4">
                <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-2">Destination</p>
                <div className="flex items-center gap-2 mb-1">
                  <Building2 size={14} className="text-white/70" />
                  <p className="text-sm font-black text-white">{record.site_to}</p>
                </div>
                <p className="text-[10px] text-white/40">Site #{record.site_to_id}</p>
              </div>
            </div>
          </div>

          {/* Détails ligne par ligne */}
          <div className="divide-y divide-slate-50">
            {[
              { label: "Date",       value: formatDateTime(record.date), icon: <Calendar size={13} /> },
              { label: "Initié par", value: record.initiateur,           icon: <User size={13} />     },
              { label: "ID Actif",   value: `#${record.asset_id}`,       icon: <Hash size={13} />     },
            ].map((row, i) => (
              <div key={i} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">{row.icon} {row.label}</div>
                <p className="text-sm font-bold text-slate-900">{row.value}</p>
              </div>
            ))}
          </div>

          {/* Motif */}
          {record.motif && (
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Motif</p>
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <p className="text-sm text-slate-700 italic leading-relaxed">"{record.motif}"</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// MODAL NOUVEAU TRANSFERT
// ─────────────────────────────────────────────────────────────

function NewTransferModal({ isOpen, onClose, sites }: { isOpen: boolean; onClose: () => void; sites: Site[] }) {
  if (!isOpen) return null;

  const siteOptions = sites
    .filter(s => s.status === "active")
    .map(s => ({ label: s.nom, value: String(s.id) }));

  const transferFields: FieldConfig[] = [
    {
      name: "asset_id", label: "ID ou codification de l'équipement",
      type: "text", required: true, placeholder: "Ex: 14 ou CLI-SP-03014",
    },
    {
      name: "site_destination_id", label: "Site de destination",
      type: "select", required: true,
      options: siteOptions.length > 0 ? siteOptions : [{ label: "Chargement...", value: "" }],
    },
    {
      name: "motif", label: "Motif du transfert",
      type: "rich-text", gridSpan: 2, placeholder: "Décrivez la raison du transfert (optionnel)",
    },
  ];

  const handleSubmit = (formData: any) => {
    console.log("Transfert soumis (simulation) :", formData);
    onClose();
  };

  return (
    <ReusableForm
      isOpen={isOpen} onClose={onClose}
      title="Nouveau transfert" subtitle="Déplacez un équipement vers un autre site"
      fields={transferFields} initialValues={{}}
      onSubmit={handleSubmit} submitLabel="Initier le transfert"
    />
  );
}

// ─────────────────────────────────────────────────────────────
// FILTRE DROPDOWN
// ─────────────────────────────────────────────────────────────

interface TransferFilters { statut?: string; }

function TransferFilterDropdown({
  isOpen, onClose, filters, onApply, sites,
}: {
  isOpen: boolean; onClose: () => void;
  filters: TransferFilters; onApply: (f: TransferFilters) => void;
  sites: Site[];
}) {
  const [local, setLocal] = useState<TransferFilters>(filters);
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
      <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
        <div className="space-y-1.5">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Statut</p>
          <div className="flex flex-col gap-1">
            {[
              { val: "",         label: "Tous"     },
              { val: "effectué", label: "Effectué" },
              { val: "en_cours", label: "En cours" },
              { val: "annulé",   label: "Annulé"   },
            ].map(o => (
              <Pill key={o.val} active={(local.statut ?? "") === o.val} label={o.label}
                onClick={() => setLocal({ ...local, statut: o.val || undefined })} />
            ))}
          </div>
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
          className="flex-1 py-2.5 rounded-xl bg-theme-primary text-white text-sm font-bold hover:opacity-90 transition"
        >
          Appliquer
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PAGE PRINCIPALE
// ─────────────────────────────────────────────────────────────

const PER_PAGE = 6;

export default function TransfertPage() {
  const [sites,        setSites]        = useState<Site[]>([]);
  const [search,       setSearch]       = useState("");
  const [filters,      setFilters]      = useState<TransferFilters>({});
  const [filtersOpen,  setFiltersOpen]  = useState(false);
  const [modalOpen,    setModalOpen]    = useState(false);
  const [detailRecord, setDetailRecord] = useState<TransferRecord | null>(null);
  const [isPanelOpen,  setIsPanelOpen]  = useState(false);
  const [currentPage,  setCurrentPage]  = useState(1);
  const [transfers]                     = useState<TransferRecord[]>(FAKE_TRANSFERS);

  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getSites(undefined, 1, 200).then(d => setSites(d.items)).catch(() => setSites([]));
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node))
        setFiltersOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = transfers.filter(t => {
    const matchSearch = !search || [
      t.asset_designation, t.asset_codification, t.site_from, t.site_to, t.initiateur,
    ].some(v => v.toLowerCase().includes(search.toLowerCase()));
    const matchStatut = !filters.statut || t.statut === filters.statut;
    return matchSearch && matchStatut;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE) || 1;
  const paginated  = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);
  const activeFilters = [filters.statut].filter(Boolean).length;

  const kpis = [
    { label: "Total transferts", value: transfers.length,                                            delta: "+0%", trend: "up" as const },
    { label: "Effectués",        value: transfers.filter(t => t.statut === "effectué").length,       delta: "+0%", trend: "up" as const },
    { label: "En cours",         value: transfers.filter(t => t.statut === "en_cours").length,       delta: "+0%", trend: "up" as const },
    { label: "Sites impliqués",  value: new Set([...transfers.map(t => t.site_from), ...transfers.map(t => t.site_to)]).size, delta: "+0%", trend: "up" as const },
  ];

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

          {/* Bandeau info */}
          <div className="flex items-start gap-3 px-5 py-4 rounded-2xl bg-theme-light border border-theme-primary/20">
            <Info size={16} className="text-theme-primary shrink-0 mt-0.5" />
            <p className="text-sm font-medium" style={{ color: "rgb(var(--color-text-primary))" }}>
              Les données affichées ne sont pas encore dynamiques.
              L'endpoint{" "}
              <code className="font-mono text-xs bg-white/60 px-1.5 py-0.5 rounded">
                POST /admin/asset/{"{id}"}/transfer
              </code>{" "}
              sera branché dès disponibilité côté serveur.
            </p>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis.map((k, i) => <StatsCard key={i} {...k} />)}
          </div>

          {/* Barre d'actions */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Recherche */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text" value={search}
                  onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                  placeholder="Rechercher un transfert..."
                  className="pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary w-64 transition"
                />
              </div>

              {/* Badge filtre actif */}
              {filters.statut && (
                <span className="flex items-center gap-1.5 bg-theme-primary text-white text-xs font-bold px-3 py-1.5 rounded-full">
                  {STATUT_LABELS[filters.statut]}
                  <button onClick={() => { setFilters({}); setCurrentPage(1); }}><X size={10} /></button>
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
                  isOpen={filtersOpen} onClose={() => setFiltersOpen(false)}
                  filters={filters}
                  onApply={f => { setFilters(f); setCurrentPage(1); setFiltersOpen(false); }}
                  sites={sites}
                />
              </div>

              {/* Nouveau transfert */}
              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-theme-primary text-white text-sm font-bold hover:opacity-90 transition shadow-sm"
              >
                <ArrowRightLeft size={15} /> Nouveau transfert
              </button>
            </div>
          </div>

          {/* Grille */}
          <div className="space-y-4">
            {paginated.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-100 py-16 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto">
                  <RotateCcw size={20} className="text-slate-400" />
                </div>
                <p className="text-slate-400 text-sm font-medium">Aucun transfert trouvé</p>
                {(search || activeFilters > 0) && (
                  <button
                    onClick={() => { setSearch(""); setFilters({}); setCurrentPage(1); }}
                    className="text-xs text-theme-primary font-bold underline hover:opacity-70"
                  >
                    Réinitialiser les filtres
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {paginated.map(record => (
                  <TransferCard
                    key={record.id} record={record}
                    onView={r => { setDetailRecord(r); setIsPanelOpen(true); }}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {filtered.length > PER_PAGE && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-slate-400">
                  Page {currentPage} sur {totalPages} · {filtered.length} transfert{filtered.length > 1 ? "s" : ""}
                </p>
                <Paginate currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
              </div>
            )}
          </div>

        </main>
      </div>

      {/* Side panel détails */}
      <TransferDetailPanel
        record={isPanelOpen ? detailRecord : null}
        onClose={() => { setIsPanelOpen(false); setDetailRecord(null); }}
      />

      {/* Modal nouveau transfert */}
      <NewTransferModal isOpen={modalOpen} onClose={() => setModalOpen(false)} sites={sites} />
    </div>
  );
}