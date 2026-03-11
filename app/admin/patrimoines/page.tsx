"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  Filter, Download, Upload, Plus, Eye,
  ChevronRight, X, CalendarClock,
} from "lucide-react";

import Navbar       from "@/components/Navbar";
import Sidebar      from "@/components/Sidebar";
import PageHeader   from "@/components/PageHeader";
import StatsCard    from "@/components/StatsCard";
import DataTable    from "@/components/DataTable";
import ReusableForm from "@/components/ReusableForm";
import Paginate     from "@/components/Paginate";
import { FieldConfig } from "@/components/ReusableForm";

import { useAssets }        from "../../../hooks/admin/useAssets";
import { useTypes }         from "../../../hooks/admin/useTypes";
import { useSubTypeAssets } from "../../../hooks/admin/useSubTypeAssets";
import { useSites }         from "../../../hooks/admin/useSites";
import { AssetService, CompanyAsset } from "../../../services/admin/asset.service";


// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

const fmtMontant = (v?: number | null) => {
  if (v == null) return "—";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M FCFA`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}K FCFA`;
  return `${v} FCFA`;
};

const fmtDate = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString("fr-FR");
};

// ─────────────────────────────────────────────────────────────
// STATUTS
// ─────────────────────────────────────────────────────────────

const ST_STYLE: Record<string, string> = {
  actif:      "bg-green-50  border-green-400  text-green-700",
  inactif:    "bg-red-50    border-red-400    text-red-600",
  hors_usage: "bg-slate-100 border-slate-400  text-slate-600",
};
const ST_LABEL: Record<string, string> = {
  actif: "Actif", inactif: "Inactif", hors_usage: "Hors usage",
};
const ST_DOT: Record<string, string> = {
  actif: "#22c55e", inactif: "#ef4444", hors_usage: "#94a3b8",
};

// ─────────────────────────────────────────────────────────────
// EXPORT EXCEL (côté client — xlsx)
// Design : en-tête rouge Canal+, zébrage, colonnes calibrées
// ─────────────────────────────────────────────────────────────

const exportToExcel = (assets: CompanyAsset[]) => {
  const wb = XLSX.utils.book_new();

  // ── Ligne branding ──
  const brandRow = ["▶  CANAL+  |  Export Patrimoine  —  " + new Date().toLocaleDateString("fr-FR")];

  // ── En-têtes ──
  const headers = [
    "ID", "Codification", "Désignation", "Famille / Type",
    "Sous-type", "Site", "Statut", "Criticité",
    "Valeur entrée (FCFA)", "Date entrée",
  ];

  // ── Données ──
  const rows = assets.map(a => [
    a.id,
    a.codification,
    a.designation,
    a.type?.name    ?? "—",
    a.sub_type?.name ?? "—",
    a.site?.nom     ?? "—",
    ST_LABEL[a.status]          ?? a.status,
    a.criticite === "critique" ? "Critique" : a.criticite === "non_critique" ? "Non critique" : "—",
    a.valeur_entree ?? "—",
    fmtDate(a.date_entree),
  ]);

  const wsData = [brandRow, [], headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // ── Largeurs colonnes ──
  ws["!cols"] = [
    { wch: 6  },  // ID
    { wch: 18 },  // Codification
    { wch: 32 },  // Désignation
    { wch: 20 },  // Type
    { wch: 20 },  // Sous-type
    { wch: 24 },  // Site
    { wch: 12 },  // Statut
    { wch: 14 },  // Criticité
    { wch: 20 },  // Valeur
    { wch: 14 },  // Date
  ];

  // ── Merge ligne branding sur toutes les colonnes ──
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }];

  // ── Styles branding + en-têtes ──
  // Ligne 0 (branding) — rouge Canal+
  const brandCell = ws["A1"];
  if (brandCell) {
    brandCell.s = {
      font:      { bold: true, sz: 13, color: { rgb: "FFFFFF" } },
      fill:      { fgColor: { rgb: "E40613" } },
      alignment: { vertical: "center", horizontal: "left" },
    };
  }

  // Ligne 2 (vide spacer) — rien à faire

  // Ligne 3 (en-têtes, index 2 en aoa) — fond noir, texte blanc
  headers.forEach((_, ci) => {
    const ref = XLSX.utils.encode_cell({ r: 2, c: ci });
    if (!ws[ref]) ws[ref] = {};
    ws[ref].s = {
      font:      { bold: true, sz: 10, color: { rgb: "FFFFFF" } },
      fill:      { fgColor: { rgb: "1A1A1A" } },
      alignment: { vertical: "center", horizontal: "center", wrapText: false },
      border: {
        bottom: { style: "medium", color: { rgb: "E40613" } },
      },
    };
  });

  // Lignes données — zébrage
  rows.forEach((row, ri) => {
    const bg = ri % 2 === 0 ? "F5F5F5" : "FFFFFF";
    row.forEach((_, ci) => {
      const ref = XLSX.utils.encode_cell({ r: ri + 3, c: ci });
      if (!ws[ref]) ws[ref] = {};
      ws[ref].s = {
        font:      { sz: 10, color: { rgb: "2D2D2D" } },
        fill:      { fgColor: { rgb: bg } },
        alignment: { vertical: "center" },
        border: {
          bottom: { style: "hair", color: { rgb: "E5E5E5" } },
        },
      };
    });

    // Colonne Statut (6) — colorée
    const statusVal = String(row[6]).toLowerCase();
    const statusRef = XLSX.utils.encode_cell({ r: ri + 3, c: 6 });
    if (ws[statusRef]) {
      const color = statusVal === "actif" ? "16A34A" : statusVal === "inactif" ? "E40613" : "6B7280";
      ws[statusRef].s = { ...ws[statusRef].s, font: { bold: true, sz: 10, color: { rgb: color } } };
    }

    // Colonne Criticité (7) — colorée
    const critRef = XLSX.utils.encode_cell({ r: ri + 3, c: 7 });
    if (ws[critRef] && String(row[7]).toLowerCase() === "critique") {
      ws[critRef].s = { ...ws[critRef].s, font: { bold: true, sz: 10, color: { rgb: "EA580C" } } };
    }
  });

  XLSX.utils.book_append_sheet(wb, ws, "Patrimoine Canal+");
  XLSX.writeFile(wb, `patrimoines_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

// ─────────────────────────────────────────────────────────────
// FILTER DROPDOWN
// ─────────────────────────────────────────────────────────────

interface AssetFilters {
 
  type_id?: number;
  sub_type_id?: number;
  status?: string;
  site_id?: number;
}

function FilterDropdown({
  isOpen, onClose, filters, onApply, types, subTypes, sites,
}: {
  isOpen: boolean; onClose: () => void;
  filters: AssetFilters; onApply: (f: AssetFilters) => void;
  types: any[]; subTypes: any[]; sites: any[];
}) {
  const [local, setLocal] = useState<AssetFilters>(filters);
  useEffect(() => setLocal(filters), [filters]);
  if (!isOpen) return null;

  const filteredSubs = local.type_id
    ? subTypes.filter((st: any) => st.type_company_asset_id === local.type_id)
    : subTypes;

  const Pill = ({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) => (
    <button onClick={onClick} className={`w-full text-left px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${active ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}>
      {label}
    </button>
  );

  return (
    <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <span className="text-xs font-black text-slate-900 uppercase tracking-widest">Filtres</span>
        <button onClick={onClose}><X size={14} className="text-slate-500" /></button>
      </div>
      <div className="p-4 space-y-4 max-h-[65vh] overflow-y-auto">

        <div className="space-y-1.5">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Statut</p>
          <div className="flex flex-col gap-1">
            {[{v:"",l:"Tous"},{v:"actif",l:"Actif"},{v:"inactif",l:"Inactif"},{v:"hors_usage",l:"Hors usage"}]
              .map(o => <Pill key={o.v} active={(local.status ?? "") === o.v} label={o.l} onClick={() => setLocal({...local, status: o.v || undefined})} />)}
          </div>
        </div>

        {types.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Famille / Type</p>
            <div className="flex flex-col gap-1">
              <Pill active={!local.type_id} label="Tous" onClick={() => setLocal({...local, type_id: undefined, sub_type_id: undefined})} />
              {types.map((t: any) => (
                <Pill key={t.id} active={local.type_id === t.id} label={t.name}
                  onClick={() => setLocal({...local, type_id: t.id, sub_type_id: undefined})} />
              ))}
            </div>
          </div>
        )}

        {filteredSubs.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Sous-type {local.type_id ? <span className="text-slate-300 font-normal normal-case text-[9px] ml-1">(filtrés)</span> : ""}
            </p>
            <div className="flex flex-col gap-1">
              <Pill active={!local.sub_type_id} label="Tous" onClick={() => setLocal({...local, sub_type_id: undefined})} />
              {filteredSubs.map((st: any) => (
                <Pill key={st.id} active={local.sub_type_id === st.id} label={st.name}
                  onClick={() => setLocal({...local, sub_type_id: st.id})} />
              ))}
            </div>
          </div>
        )}

        {sites.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Site</p>
            <div className="flex flex-col gap-1">
              <Pill active={!local.site_id} label="Tous les sites" onClick={() => setLocal({...local, site_id: undefined})} />
              {sites.map((s: any) => (
                <Pill key={s.id} active={local.site_id === s.id} label={s.nom}
                  onClick={() => setLocal({...local, site_id: s.id})} />
              ))}
            </div>
          </div>
        )}

      </div>
      <div className="px-5 py-4 border-t border-slate-100 flex gap-3">
        <button onClick={() => { setLocal({}); onApply({}); onClose(); }}
          className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition">
          Réinitialiser
        </button>
        <button onClick={() => { onApply(local); onClose(); }}
          className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition">
          Appliquer
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SIDE PANEL APERÇU RAPIDE
// ─────────────────────────────────────────────────────────────

function AssetSidePanel({ asset, onClose, onEdit }: {
  asset: CompanyAsset | null; onClose: () => void; onEdit: () => void;
}) {
  if (!asset) return null;
  return (
    <>
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[400px] bg-white z-50 shadow-2xl flex flex-col rounded-l-3xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-xl transition">
            <X size={16} className="text-slate-500" />
          </button>
          <Link href={`/admin/patrimoines/${asset.id}`}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-900 transition">
            Page détails <ChevronRight size={13} />
          </Link>
        </div>

        <div className="px-6 py-5 shrink-0">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">#{asset.id}</p>
          <h2 className="text-xl font-black text-slate-900 leading-tight">{asset.designation}</h2>
          <p className="font-mono text-sm text-slate-400 mt-1">{asset.codification}</p>
          <div className="mt-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black border ${ST_STYLE[asset.status] ?? ""}`}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ST_DOT[asset.status] }} />
              {ST_LABEL[asset.status] ?? asset.status}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="divide-y divide-slate-50">
            {[
              { l: "Type",           v: asset.type?.name    ?? "—" },
              { l: "Sous-type",      v: asset.subType?.name ?? "—" },
              { l: "Site",           v: asset.site?.nom     ?? "—" },
              { l: "Valeur entrée",  v: fmtMontant(asset.valeur_entree) },
              { l: "Date entrée",    v: fmtDate(asset.date_entree) },
              { l: "Criticité",      v: asset.criticite === "critique" ? "Critique" : asset.criticite === "non_critique" ? "Non critique" : "—" },
            ].map((r, i) => (
              <div key={i} className="flex items-center justify-between py-3">
                <p className="text-xs text-slate-400 font-medium">{r.l}</p>
                <p className="text-sm font-bold text-slate-900">{r.v}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-5 border-t border-slate-100 shrink-0 flex gap-3">
          <button onClick={onEdit}
            className="flex-1 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition">
            Modifier
          </button>
          <Link href={`/admin/patrimoines/${asset.id}`}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition">
            Détails <ChevronRight size={14} />
          </Link>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// PAGE PRINCIPALE
// ─────────────────────────────────────────────────────────────

export default function PatrimoinesPage() {
  const { assets, isLoading, fetchAssets, meta, page, setPage, applyFilters } = useAssets();
  const { types }    = useTypes();
  const { subTypes } = useSubTypeAssets();
  const { sites }    = useSites();

  const [stats,       setStats]      = useState<any>(null);
  const [isModalOpen, setIsModalOpen]= useState(false);
  const [editingData, setEditingData]= useState<CompanyAsset | null>(null);
  const [panelAsset,  setPanelAsset] = useState<CompanyAsset | null>(null);
  const [filters,     setFilters]    = useState<AssetFilters>({});
  const [filtersOpen, setFiltersOpen]= useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [flash, setFlash] = useState<{ type: "success"|"error"; msg: string } | null>(null);

  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    AssetService.getStats().then(setStats).catch(() => setStats(null));
  }, []);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 5000);
    return () => clearTimeout(t);
  }, [flash]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node))
        setFiltersOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleApplyFilters = (f: AssetFilters) => {
    setFilters(f);
    applyFilters(f);
    setFiltersOpen(false);
  };

  
  const handleCreateOrUpdate = async (formData: any) => {
    try {
      if (editingData) {
        await AssetService.updateAsset(editingData.id, formData);
        setFlash({ type: "success", msg: "Patrimoine mis à jour." });
      } else {
        await AssetService.createAsset({ product_type_code: "00", ...formData });
        setFlash({ type: "success", msg: "Patrimoine créé avec succès." });
      }
      fetchAssets();
      setIsModalOpen(false);
      setEditingData(null);
    } catch (err: any) {
      setFlash({ type: "error", msg: err?.response?.data?.message ?? "Erreur serveur." });
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImportLoading(true);
    try {
      await AssetService.importAssets(file);
      fetchAssets();
      setFlash({ type: "success", msg: `"${file.name}" importé avec succès.` });
    } catch (err: any) {
      setFlash({ type: "error", msg: err?.response?.data?.message ?? "Erreur d'import." });
    } finally {
      setImportLoading(false);
    }
  };

  // Export Excel côté client
  const handleExport = () => exportToExcel(assets);

  // Compteur filtres actifs
  const activeFiltersCount = [filters.status, filters.type_id, filters.sub_type_id, filters.site_id, filters.search]
    .filter(Boolean).length;

  // Champs formulaire (codification absente — générée auto)
  const assetFields: FieldConfig[] = [
    {
      name: "type_company_asset_id", label: "Famille / Type", type: "select", required: true,
      options: types.map((t: any) => ({ label: t.name, value: String(t.id) })),
    },
    {
      name: "sub_type_company_asset_id", label: "Sous-type", type: "select", required: true,
      options: subTypes.map((st: any) => ({ label: st.name, value: String(st.id) })),
    },
    {
      name: "site_id", label: "Site", type: "select", required: true,
      options: sites.map((s: any) => ({ label: s.nom, value: String(s.id) })),
    },
    { name: "designation", label: "Désignation", type: "text", required: true },
    {
      name: "status", label: "Statut", type: "select", required: true,
      options: [
        { label: "Actif",      value: "actif" },
        { label: "Inactif",    value: "inactif" },
        { label: "Hors usage", value: "hors_usage" },
      ],
    },
    {
      name: "criticite", label: "Criticité", type: "select",
      options: [
        { label: "Non critique", value: "non_critique" },
        { label: "Critique",     value: "critique" },
      ],
    },
    { name: "date_entree",   label: "Date d'entrée",   type: "date",   required: true, icon: CalendarClock },
    { name: "valeur_entree", label: "Valeur d'entrée", type: "number", required: true },
     { name: "dimension", label: "Dimension", type: "number", required: false },
    { name: "description",   label: "Description",     type: "rich-text", gridSpan: 2 },
  ];

  // ── COLONNES — Eye aperçu + ChevronRight vers détails ──────
  const columns = [
    {
      header: "ID", key: "id",
      render: (_: any, row: CompanyAsset) => (
        <span className="font-black text-slate-900 text-sm">#{row.id}</span>
      ),
    },
    {
      header: "Codification", key: "codification",
      render: (_: any, row: CompanyAsset) => (
        <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg whitespace-nowrap">
          {row.codification}
        </span>
      ),
    },
    {
      header: "Désignation", key: "designation",
      render: (_: any, row: CompanyAsset) => (
        <span className="font-semibold text-slate-900 text-sm">{row.designation}</span>
      ),
    },
    {
      header: "Type", key: "type",
      render: (_: any, row: CompanyAsset) => (
        <span className="text-sm text-slate-600">{row.type?.name ?? "—"}</span>
      ),
    },
    {
      header: "Sous-type", key: "subType",
      render: (_: any, row: CompanyAsset) => (
        <span className="text-sm text-slate-600">{row.sub_type?.name ?? row.subType?.name ?? "-"}</span>
      ),
    },
    {
      header: "Site", key: "site",
      render: (_: any, row: CompanyAsset) => (
        <span className="text-sm text-slate-600">{row.site?.nom ?? "—"}</span>
      ),
    },
    {
      header: "Statut", key: "status",
      render: (_: any, row: CompanyAsset) => (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold whitespace-nowrap ${ST_STYLE[row.status] ?? ""}`}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ST_DOT[row.status] }} />
          {ST_LABEL[row.status] ?? row.status}
        </span>
      ),
    },
    {
      header: "Valeur", key: "valeur_entree",
      render: (_: any, row: CompanyAsset) => (
        <span className="text-sm font-bold text-slate-900 whitespace-nowrap">{fmtMontant(row.valeur_entree)}</span>
      ),
    },
    {
      header: "Date", key: "date_entree",
      render: (_: any, row: CompanyAsset) => (
        <span className="text-xs text-slate-500 whitespace-nowrap">{fmtDate(row.date_entree)}</span>
      ),
    },
    // ── COLONNE ACTIONS : Aperçu + ChevronRight détails ────────
    {
      header: "Actions", key: "actions",
      render: (_: any, row: CompanyAsset) => (
        <div className="flex items-center gap-1">
          {/* Bouton aperçu side panel */}
          <button
            onClick={() => setPanelAsset(row)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
          >
            <Eye size={14} /> Aperçu
          </button>

          {/* Séparateur */}
          <span className="w-px h-4 bg-slate-200 mx-0.5" />

          {/* ChevronRight → page détails patrimoine */}
          <Link
            href={`/admin/patrimoines/${row.id}`}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition"
            title="Voir les détails"
          >
            <ChevronRight size={16} />
          </Link>
        </div>
      ),
    },
  ];

  const totalPages = meta?.last_page ?? 1;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-col flex-1 pl-64">
        <Navbar />
        <main className="mt-20 p-8 space-y-8">

          {/* Flash */}
          {flash && (
            <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-xl shadow-lg text-sm font-semibold border ${
              flash.type === "success" ? "text-green-700 bg-green-50 border-green-200" : "text-red-600 bg-red-100 border-red-300"
            }`}>
              {flash.msg}
            </div>
          )}

          <PageHeader title="Patrimoine" subtitle="Inventaire centralisé de tous les équipements sur les 22 sites" />

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
            <StatsCard label="Total actifs"     value={stats?.total_actifs               ?? 0}  delta="+10%" trend="up" />
            <StatsCard label="Total patrimoines inactifs"     value={stats?.actifs_inactifs               ?? 0}  delta="+15%" trend="up" />

            <StatsCard label="Actifs critiques"    value={stats?.total_actifs_critiques    ?? 0}  delta="-2%" trend="down" />
          {/* <StatsCard label="Coût moyen entretien" value={fmtMontant(stats?.cout_moyen_entretien)} delta="" trend="up" /> */}
            {/* <StatsCard label="Délai moyen d'intervention"   value={fmtDate(stats?.delai_moyen_global_heures)} delta="" trend="up" /> */}
            
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <StatsCard label="Nombre total de tickets"    value={stats?.nombre_total_tickets    ?? 0}  delta="+0%" trend="up" />
            <StatsCard label="nombre Actifs non critiques"        value={stats?.total_actifs_non_critiques          ?? 0}  delta="+0%" trend="down" />
            <StatsCard label="Coût actif critique"    value={fmtMontant(stats?.cout_actifs_critiques    ?? 0)}  delta="+3%" trend="up" />            
            <StatsCard label="délai moyen d'intervention" value={fmtDate(stats?.delai_intervention_critique_heures              ?? "0h")}  delta="+0%" trend="up" />
          </div>

          {/* Barre d'actions */}
          <div className="flex items-center justify-between gap-3 flex-wrap">

            {/*  badges selecteurs*/}
            <div className="flex items-center gap-3 flex-wrap">
           
              {activeFiltersCount > 0 && (
                <button onClick={() => handleApplyFilters({})}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-bold border border-slate-200 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 transition">
                  <X size={11} /> Effacer filtres ({activeFiltersCount})
                </button>
              )}
            </div>

            {/* Droite — boutons */}
            <div className="flex items-center gap-2 shrink-0">

              {/* Import */}
              <label className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-bold cursor-pointer hover:bg-slate-50 transition ${importLoading ? "opacity-60 cursor-wait" : ""}`}>
                {importLoading
                  ? <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
                  : <Download size={14} />}
                Importer
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" disabled={importLoading} onChange={handleImport} />
              </label>

              {/* Export */}
              <button onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-bold hover:bg-slate-50 transition">
                <Upload size={14} /> Exporter
              </button>

              {/* Filtrer */}
              <div className="relative" ref={filterRef}>
                <button
                  onClick={() => setFiltersOpen(!filtersOpen)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition ${
                    filtersOpen || activeFiltersCount > 0 ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Filter size={14} /> Filtrer
                  {activeFiltersCount > 0 && (
                    <span className="ml-1 bg-white text-slate-900 text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
                <FilterDropdown
                  isOpen={filtersOpen} onClose={() => setFiltersOpen(false)}
                  filters={filters} onApply={handleApplyFilters}
                  types={types} subTypes={subTypes} sites={sites}
                />
              </div>

              {/* Ajouter */}
              <button
                onClick={() => { setEditingData(null); setIsModalOpen(true); }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition shadow-sm"
              >
                <Plus size={14} /> Ajouter un patrimoine
              </button>
            </div>
          </div>

          {/* DataTable */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="py-16 flex flex-col items-center gap-3">
                <span className="w-6 h-6 border-2 border-slate-200 border-t-slate-700 rounded-full animate-spin" />
                <p className="text-slate-400 text-sm">Chargement des patrimoines...</p>
              </div>
            ) : assets.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm">
                Aucun patrimoine{activeFiltersCount > 0 ? " pour ces filtres" : ""}.
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={assets}
                title={`${meta?.total ?? assets.length} patrimoine${(meta?.total ?? assets.length) > 1 ? "s" : ""}`}
                onViewAll={() => {}}
              />
            )}
            <div className="px-6 py-4 border-t border-slate-50 flex items-center justify-between">
              <p className="text-xs text-slate-400">
                Page {page} sur {totalPages} · {meta?.total ?? 0} résultat{(meta?.total ?? 0) > 1 ? "s" : ""}
              </p>
              <Paginate currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </div>

        </main>
      </div>

      <AssetSidePanel
        asset={panelAsset}
        onClose={() => setPanelAsset(null)}
        onEdit={() => { setEditingData(panelAsset); setPanelAsset(null); setIsModalOpen(true); }}
      />

      <ReusableForm
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingData(null); }}
        title={editingData ? "Modifier le patrimoine" : "Ajouter un patrimoine"}
        subtitle="La codification est générée automatiquement"
        fields={assetFields}
        initialValues={editingData ? {
          type_company_asset_id:     String(editingData.type_company_asset_id     ?? ""),
          sub_type_company_asset_id: String(editingData.sub_type_company_asset_id ?? ""),
          site_id:     String((editingData.site as any)?.id ?? ""),
          designation: editingData.designation,
          status:      editingData.status,
          criticite:   editingData.criticite ?? "non_critique",
          date_entree:   editingData.date_entree   ?? "",
          valeur_entree: editingData.valeur_entree  ?? "",
          description:   editingData.description    ?? "",
        } : {}}
        onSubmit={handleCreateOrUpdate}
        submitLabel={editingData ? "Mettre à jour" : "Enregistrer"}
      />
    </div>
  );
}