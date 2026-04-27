"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  Filter, Download, Upload, Plus, Eye,
  ChevronRight, X, CalendarClock,
  CheckCircle2, AlertTriangle, AlertCircle,
  FileSpreadsheet, ChevronLeft, Loader2, ShieldCheck,
} from "lucide-react";

import Navbar from "@/components/Navbar";

import PageHeader from "@/components/PageHeader";
import StatsCard from "@/components/StatsCard";
import DataTable, { ColumnConfig } from "@/components/DataTable";
import ReusableForm from "@/components/ReusableForm";
import Paginate from "@/components/Paginate";
import { FieldConfig } from "@/components/ReusableForm";

import { useAssets } from "../../../hooks/admin/useAssets";
import { useTypes } from "../../../hooks/admin/useTypes";
import { useSubTypeAssets } from "../../../hooks/admin/useSubTypeAssets";
import { useSites } from "../../../hooks/admin/useSites";
import { AssetService, CompanyAsset } from "../../../services/admin/asset.service";
import { useToast } from "@/contexts/ToastContext";
import { parseApiError } from "@/core/error";
import { formatDate, formatCurrency } from "@/lib/utils";


// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

// local fmt helpers removed - using @/lib/utils


/**
 * Formate une date ISO pour l'attribut 'value' d'un <input type="date">
 * Format attendu : YYYY-MM-DD
 */
const fmtDateForInput = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10); // Extrait YYYY-MM-DD
};

// ─────────────────────────────────────────────────────────────
// STATUTS
// ─────────────────────────────────────────────────────────────

const ST_STYLE: Record<string, string> = {
  actif: "bg-green-50  border-green-400  text-green-700",
  inactif: "bg-red-50    border-red-400    text-red-600",
  hors_usage: "bg-slate-100 border-slate-400  text-slate-600",
};
const ST_LABEL: Record<string, string> = {
  actif: "Actif", inactif: "Inactif", hors_usage: "Hors usage",
};
const ST_DOT: Record<string, string> = {
  actif: "#22c55e", inactif: "#ef4444", hors_usage: "#94a3b8",
};

// ─────────────────────────────────────────────────────────────
// EXPORT EXCEL
// ─────────────────────────────────────────────────────────────

const exportToExcel = (assets: CompanyAsset[]) => {
  const wb = XLSX.utils.book_new();
  const brandRow = ["▶  CANAL+  |  Export Patrimoine  - " + formatDate(new Date())];
  const headers = [
    "ID", "Codification", "Désignation", "N° de Série", "Code Produit", "Famille / Type",
    "Sous-type", "Site", "Statut", "Criticité",
    "Valeur entrée (FCFA)", "Date entrée",
  ];
  const rows = assets.map(a => [
    a.id, a.codification, a.designation,
    a.serial_number ?? "-",
    a.product_type_code ?? "-",
    a.type?.name ?? "-",
    (a as any).sub_type?.name ?? a.subType?.name ?? "-",
    a.site?.nom ?? "-",
    ST_LABEL[a.status] ?? a.status,
    a.criticite === "critique" ? "Critique" : a.criticite === "non_critique" ? "Non critique" : "-",
    a.valeur_entree ?? "-",
    formatDate(a.date_entree),
  ]);
  const wsData = [brandRow, [], headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws["!cols"] = [
    { wch: 6 }, { wch: 18 }, { wch: 32 }, { wch: 18 }, { wch: 12 }, { wch: 20 }, { wch: 20 },
    { wch: 24 }, { wch: 12 }, { wch: 14 }, { wch: 20 }, { wch: 14 },
  ];
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }];
  const brandCell = ws["A1"];
  if (brandCell) {
    brandCell.s = {
      font: { bold: true, sz: 13, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "E40613" } },
      alignment: { vertical: "center", horizontal: "left" },
    };
  }
  headers.forEach((_, ci) => {
    const ref = XLSX.utils.encode_cell({ r: 2, c: ci });
    if (!ws[ref]) ws[ref] = {};
    ws[ref].s = {
      font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "1A1A1A" } },
      alignment: { vertical: "center", horizontal: "center", wrapText: false },
      border: { bottom: { style: "medium", color: { rgb: "E40613" } } },
    };
  });
  rows.forEach((row, ri) => {
    const bg = ri % 2 === 0 ? "F5F5F5" : "FFFFFF";
    row.forEach((_, ci) => {
      const ref = XLSX.utils.encode_cell({ r: ri + 3, c: ci });
      if (!ws[ref]) ws[ref] = {};
      ws[ref].s = {
        font: { sz: 10, color: { rgb: "2D2D2D" } },
        fill: { fgColor: { rgb: bg } },
        alignment: { vertical: "center" },
        border: { bottom: { style: "hair", color: { rgb: "E5E5E5" } } },
      };
    });
    const statusVal = String(row[6]).toLowerCase();
    const statusRef = XLSX.utils.encode_cell({ r: ri + 3, c: 6 });
    if (ws[statusRef]) {
      const color = statusVal === "actif" ? "16A34A" : statusVal === "inactif" ? "E40613" : "6B7280";
      ws[statusRef].s = { ...ws[statusRef].s, font: { bold: true, sz: 10, color: { rgb: color } } };
    }
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
  search?: string;
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
            {[{ v: "", l: "Tous" }, { v: "actif", l: "Actif" }, { v: "inactif", l: "Inactif" }, { v: "hors_usage", l: "Hors usage" }]
              .map(o => <Pill key={o.v} active={(local.status ?? "") === o.v} label={o.l} onClick={() => setLocal({ ...local, status: o.v || undefined })} />)}
          </div>
        </div>
        {types.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Famille / Type</p>
            <div className="flex flex-col gap-1">
              <Pill active={!local.type_id} label="Tous" onClick={() => setLocal({ ...local, type_id: undefined, sub_type_id: undefined })} />
              {types.map((t: any) => (
                <Pill key={t.id} active={local.type_id === t.id} label={t.name}
                  onClick={() => setLocal({ ...local, type_id: t.id, sub_type_id: undefined })} />
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
              <Pill active={!local.sub_type_id} label="Tous" onClick={() => setLocal({ ...local, sub_type_id: undefined })} />
              {filteredSubs.map((st: any) => (
                <Pill key={st.id} active={local.sub_type_id === st.id} label={st.name}
                  onClick={() => setLocal({ ...local, sub_type_id: st.id })} />
              ))}
            </div>
          </div>
        )}
        {sites.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Site</p>
            <div className="flex flex-col gap-1">
              <Pill active={!local.site_id} label="Tous les sites" onClick={() => setLocal({ ...local, site_id: undefined })} />
              {sites.map((s: any) => (
                <Pill key={s.id} active={local.site_id === s.id} label={s.nom}
                  onClick={() => setLocal({ ...local, site_id: s.id })} />
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
              { l: "Type", v: asset.type?.name ?? "-" },
              { l: "Sous-type", v: (asset as any).sub_type?.name ?? asset.subType?.name ?? "-" },
              { l: "Site", v: asset.site?.nom ?? "-" },
              { l: "Code Produit", v: asset.product_type_code ?? "-" },
              { l: "Valeur entrée", v: formatCurrency(asset.valeur_entree) },
              { l: "Date entrée", v: formatDate(asset.date_entree) },
              { l: "Criticité", v: asset.criticite === "critique" ? "Critique" : asset.criticite === "non_critique" ? "Non critique" : "-" },
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
// PREVIEW IMPORT MODAL - PATRIMOINE
// ─────────────────────────────────────────────────────────────

type ValidationStatus = "ok" | "warning" | "error";

interface CellValidation { status: ValidationStatus; message?: string; }
interface RowValidation { rowIndex: number; cells: Record<string, CellValidation>; status: ValidationStatus; }
interface ParsedPreview {
  headers: string[];
  rows: Record<string, any>[];
  validations: RowValidation[];
  summary: { total: number; valid: number; warnings: number; errors: number };
}

type ValidatorFn = (value: any, row: Record<string, any>) => { status: "warning" | "error"; message: string } | null;
interface ColumnRule { required?: boolean; validators?: ValidatorFn[]; }

const PATRIMOINE_RULES: Record<string, ColumnRule> = {
  designation: { required: true },
  site: { required: true },
  site_id: { required: true },
  status: {
    validators: [(v) => {
      if (!v) return null;
      const allowed = ["actif", "inactif", "hors_usage", "active", "inactive"];
      if (v && !allowed.includes(String(v).toLowerCase().trim()))
        return { status: "warning", message: `Valeur inhabituelle. Sera mis à 'actif' par défaut.` };
      return null;
    }],
  },
  criticite: {
    validators: [(v) => {
      if (!v) return null;
      if (!["critique", "non_critique"].includes(String(v).toLowerCase().trim()))
        return { status: "warning", message: "Attendu : critique ou non_critique. Valeur par défaut : non_critique" };
      return null;
    }],
  },
  valeur_entree: {
    validators: [(v) => {
      if (!v || v === "-") return null;
      if (isNaN(Number(v))) return { status: "warning", message: "Doit être un nombre. Valeur par défaut : 0" };
      if (Number(v) < 0) return { status: "warning", message: "Valeur négative" };
      return null;
    }],
  },
  date_entree: {
    validators: [(v) => {
      if (!v || v === "-") return null;
      if (isNaN(new Date(v).getTime())) return { status: "warning", message: "Format de date invalide. Date du jour utilisée par défaut." };
      return null;
    }],
  },
};

// Colonnes connues et alias supportés (Backend flexible)
const PATRIMOINE_KNOWN_COLS = new Set([
  "designation", "status", "statut", "criticite", "valeur_entree", "date_entree",
  "type_company_asset_id", "type_asset", "type",
  "sub_type_company_asset_id", "sous_type_asset", "sous_type",
  "site_id", "site",
  "code_unique", "codification", "code_type_produit", "product_type_code",
  "description", "dimension", "images", "serial_number", "n°_de_série",
]);

// Colonnes OBLIGATOIRES au front pour validation minimale
const PATRIMOINE_REQUIRED_COLS = ["designation", "site"];

const PRIORITY_PATRIMOINE = ["designation", "site", "status", "type", "codification", "criticite", "valeur_entree", "date_entree"];

const CELL_STYLE: Record<ValidationStatus, string> = {
  ok: "bg-emerald-50 text-emerald-800 border-emerald-200",
  warning: "bg-amber-50   text-amber-800   border-amber-200",
  error: "bg-red-50     text-red-700     border-red-200",
};
const ROW_BG: Record<ValidationStatus, string> = {
  ok: "hover:bg-emerald-50/30",
  warning: "bg-amber-50/20  hover:bg-amber-50/40",
  error: "bg-red-50/20    hover:bg-red-50/40",
};
const BADGE: Record<ValidationStatus, { bg: string; text: string; icon: React.ReactNode }> = {
  ok: { bg: "bg-emerald-100 text-emerald-700", text: "OK", icon: <CheckCircle2 size={12} /> },
  warning: { bg: "bg-amber-100  text-amber-700", text: "Attention", icon: <AlertTriangle size={12} /> },
  error: { bg: "bg-red-100    text-red-600", text: "Erreur", icon: <AlertCircle size={12} /> },
};

function fmtCell(v: any): string {
  if (v == null || v === "") return "-";
  if (v instanceof Date || (typeof v === "string" && !isNaN(Date.parse(v)))) return formatDate(v);
  return String(v);
}

function parsePatrimoine(file: File): Promise<ParsedPreview> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });
        if (!raw.length) {
          resolve({ headers: [], rows: [], validations: [], summary: { total: 0, valid: 0, warnings: 0, errors: 0 } });
          return;
        }

        // Normalise les clés (snake_case + suppression accents)
        const rows = raw.map(r =>
          Object.fromEntries(Object.entries(r).map(([k, v]) => [
            k.toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .trim()
              .replace(/\s+/g, "_"),
            v
          ]))
        );

        const fileKeys = Object.keys(rows[0]);

        // ── VÉRIFICATION STRUCTURELLE ──────────────────────────────
        const missingRequired = PATRIMOINE_REQUIRED_COLS.filter(c => !fileKeys.includes(c));
        const unknownCols = fileKeys.filter(c => !PATRIMOINE_KNOWN_COLS.has(c));
        const knownColsInFile = fileKeys.filter(c => PATRIMOINE_KNOWN_COLS.has(c));

        // Headers : colonnes manquantes requises visibles en premier
        const priority = PRIORITY_PATRIMOINE.filter(c => fileKeys.includes(c));
        const rest = fileKeys.filter(c => !priority.includes(c));
        const missingHeaders = missingRequired.filter(c => !fileKeys.includes(c));
        const headers = [...missingHeaders, ...priority, ...rest];

        const validations: RowValidation[] = rows.map((row, ri) => {
          const cells: Record<string, CellValidation> = {};
          let rowStatus: ValidationStatus = "ok";

          headers.forEach(col => {
            // ── Colonne requise ABSENTE du fichier (colonne fantôme)
            if (missingRequired.includes(col) && !fileKeys.includes(col)) {
              cells[col] = { status: "error", message: `Colonne "${col}" absente du fichier - obligatoire` };
              rowStatus = "error";
              return;
            }

            // ── Colonne INCONNUE (hors schéma Patrimoines)
            if (!PATRIMOINE_KNOWN_COLS.has(col)) {
              cells[col] = { status: "warning", message: `Colonne inconnue - ignorée à l'import` };
              if (rowStatus !== "error") rowStatus = "warning";
              return;
            }

            const rule = PATRIMOINE_RULES[col];
            const val = row[col];

            // ── Champ requis vide
            if (rule?.required && (val === "" || val == null)) {
              cells[col] = { status: "error", message: "Champ obligatoire manquant" };
              rowStatus = "error";
              return;
            }

            // ── Validators métier
            if (rule?.validators) {
              for (const fn of rule.validators) {
                const r = fn(val, row);
                if (r) {
                  cells[col] = r;
                  if (r.status === "error") rowStatus = "error";
                  else if (r.status === "warning" && rowStatus !== "error") rowStatus = "warning";
                  return;
                }
              }
            }

            cells[col] = { status: "ok" };
          });

          return { rowIndex: ri, cells, status: rowStatus };
        });

        const summary = {
          total: rows.length,
          valid: validations.filter(v => v.status === "ok").length,
          warnings: validations.filter(v => v.status === "warning").length,
          errors: validations.filter(v => v.status === "error").length,
        };

        resolve({ headers, rows, validations, summary });
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

const PREVIEW_PAGE = 10;

function PatrimoinePreviewModal({
  isOpen, onClose, onConfirmImport, file,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirmImport: (file: File) => Promise<void>;
  file: File | null;
}) {
  const [parsed, setParsed] = useState<ParsedPreview | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseErr, setParseErr] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [confirming, setConfirming] = useState(false);
  const [filter, setFilter] = useState<"all" | ValidationStatus>("all");

  useEffect(() => {
    if (!isOpen || !file) return;
    setParsed(null); setParseErr(null); setPage(1); setFilter("all"); setParsing(true);
    parsePatrimoine(file).then(setParsed).catch(e => setParseErr(e?.message ?? "Erreur")).finally(() => setParsing(false));
  }, [file, isOpen]);

  const handleConfirm = useCallback(async () => {
    if (!file || confirming) return;
    setConfirming(true);
    try {
      const success = await onConfirmImport(file);
      if (success) onClose();
    } finally {
      setConfirming(false);
    }
  }, [file, onConfirmImport, onClose, confirming]);

  if (!isOpen) return null;

  const allRows = parsed?.rows ?? [];
  const allValids = parsed?.validations ?? [];
  const filteredIdx = filter === "all"
    ? allValids.map((_, i) => i)
    : allValids.filter(v => v.status === filter).map(v => v.rowIndex);
  const totalPages = Math.max(1, Math.ceil(filteredIdx.length / PREVIEW_PAGE));
  const pageIdxs = filteredIdx.slice((page - 1) * PREVIEW_PAGE, page * PREVIEW_PAGE);
  const hasErrors = (parsed?.summary.errors ?? 0) > 0;
  const hasWarnings = (parsed?.summary.warnings ?? 0) > 0;

  // Analyse structurelle du fichier vs schéma Patrimoines
  const fileKeys = parsed && parsed.rows.length > 0 ? Object.keys(parsed.rows[0]) : [];
  const missingRequired = PATRIMOINE_REQUIRED_COLS.filter(c => !fileKeys.includes(c));
  const unknownCols = fileKeys.filter(c => !PATRIMOINE_KNOWN_COLS.has(c));
  const knownInFile = fileKeys.filter(c => PATRIMOINE_KNOWN_COLS.has(c));
  const totallyIncompat = parsed ? (knownInFile.length === 0 || missingRequired.length === PATRIMOINE_REQUIRED_COLS.length) : false;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70]" onClick={onClose} />
      <div className="fixed inset-4 md:inset-8 xl:inset-12 z-[80] flex flex-col bg-white rounded-3xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
              <FileSpreadsheet size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 leading-tight">Prévisualisation - Import Patrimoine</h2>
              {file && <p className="text-xs text-slate-400 font-mono mt-0.5 truncate max-w-[320px]">{file.name}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition">
            <X size={16} className="text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col">

          {parsing && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-400">
              <Loader2 size={32} className="animate-spin text-slate-300" />
              <p className="text-sm font-medium">Analyse du fichier en cours…</p>
            </div>
          )}

          {!parsing && parseErr && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 px-8 text-center">
              <AlertCircle size={36} className="text-red-400" />
              <p className="text-sm font-bold text-red-600">Impossible de lire le fichier</p>
              <p className="text-xs text-slate-400">{parseErr}</p>
            </div>
          )}

          {!parsing && !parseErr && parsed && parsed.rows.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
              <Eye size={32} className="text-slate-200" />
              <p className="text-sm text-slate-400">Le fichier ne contient aucune donnée.</p>
            </div>
          )}

          {!parsing && !parseErr && parsed && parsed.rows.length > 0 && (
            <>
              {/* Bande résumé */}
              <div className="px-6 py-3 border-b border-slate-100 bg-slate-50 shrink-0">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
                      {parsed.summary.total} ligne{parsed.summary.total > 1 ? "s" : ""}
                    </span>
                    {[
                      { key: "all", label: "Toutes", count: parsed.summary.total, color: "bg-slate-100 text-slate-700 hover:bg-slate-200" },
                      { key: "ok", label: "Valides", count: parsed.summary.valid, color: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" },
                      { key: "warning", label: "Avertissements", count: parsed.summary.warnings, color: "bg-amber-50 text-amber-700 hover:bg-amber-100" },
                      { key: "error", label: "Erreurs", count: parsed.summary.errors, color: "bg-red-50 text-red-600 hover:bg-red-100" },
                    ].map(f => (f.count > 0 || f.key === "all") ? (
                      <button key={f.key}
                        onClick={() => { setFilter(f.key as any); setPage(1); }}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition border border-transparent ${f.color} ${filter === f.key ? "ring-2 ring-offset-1 ring-slate-400" : ""}`}>
                        {f.label} <span className="font-black">{f.count}</span>
                      </button>
                    ) : null)}
                  </div>
                  {totallyIncompat ? (
                    <div className="flex flex-col gap-1">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-red-700 bg-red-50 border border-red-300 px-3 py-1.5 rounded-lg">
                        <AlertCircle size={12} /> Fichier incompatible - ce n'est pas un fichier Patrimoines
                      </span>
                      {missingRequired.length > 0 && (
                        <span className="text-[10px] text-red-500 font-semibold pl-1">
                          Colonnes obligatoires manquantes : {missingRequired.join(", ")}
                        </span>
                      )}
                      {unknownCols.length > 0 && (
                        <span className="text-[10px] text-amber-600 font-semibold pl-1">
                          Colonnes inconnues ({unknownCols.length}) : {unknownCols.slice(0, 4).join(", ")}{unknownCols.length > 4 ? `… +${unknownCols.length - 4}` : ""}
                        </span>
                      )}
                    </div>
                  ) : hasErrors ? (
                    <div className="flex flex-col gap-1">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-1 rounded-lg">
                        <AlertCircle size={12} /> {parsed.summary.errors} ligne{parsed.summary.errors > 1 ? "s" : ""} bloquante{parsed.summary.errors > 1 ? "s" : ""} - à corriger
                      </span>
                      {missingRequired.length > 0 && (
                        <span className="text-[10px] text-red-500 font-semibold pl-1">
                          Colonnes manquantes : {missingRequired.join(", ")}
                        </span>
                      )}
                    </div>
                  ) : hasWarnings ? (
                    <div className="flex flex-col gap-1">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-lg">
                        <AlertTriangle size={12} /> Importable avec avertissements
                      </span>
                      {unknownCols.length > 0 && (
                        <span className="text-[10px] text-amber-500 font-semibold pl-1">
                          {unknownCols.length} colonne{unknownCols.length > 1 ? "s" : ""} inconnue{unknownCols.length > 1 ? "s" : ""} (ignorée{unknownCols.length > 1 ? "s" : ""}) : {unknownCols.slice(0, 3).join(", ")}{unknownCols.length > 3 ? `…` : ""}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
                      <ShieldCheck size={12} /> Fichier compatible - prêt à importer
                    </span>
                  )}
                </div>
              </div>

              {/* Tableau */}
              <div className="flex-1 overflow-auto">
                <table className="min-w-full text-xs border-separate border-spacing-0">
                  <thead className="sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest whitespace-nowrap border-b border-slate-100 bg-slate-50 w-10">#</th>
                      <th className="px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest whitespace-nowrap border-b border-slate-100 bg-slate-50">État</th>
                      {parsed.headers.map(h => (
                        <th key={h} className="px-3 py-3 text-left font-black text-slate-500 uppercase tracking-widest whitespace-nowrap border-b border-slate-100 bg-slate-50">
                          {h}{PATRIMOINE_RULES[h]?.required && <span className="ml-0.5 text-red-400">*</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageIdxs.length === 0 ? (
                      <tr><td colSpan={parsed.headers.length + 2} className="text-center text-slate-400 py-12 italic">Aucune ligne pour ce filtre.</td></tr>
                    ) : pageIdxs.map(ri => {
                      const row = allRows[ri];
                      const vld = allValids[ri];
                      return (
                        <tr key={ri} className={`border-b border-slate-50 transition ${ROW_BG[vld.status]}`}>
                          <td className="px-3 py-2.5 text-slate-300 font-mono font-bold">{ri + 1}</td>
                          <td className="px-3 py-2.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg font-bold text-[10px] ${BADGE[vld.status].bg}`}>
                              {BADGE[vld.status].icon} {BADGE[vld.status].text}
                            </span>
                          </td>
                          {parsed.headers.map(col => {
                            const cell = vld.cells[col];
                            const val = row[col];
                            const cSt = cell?.status ?? "ok";
                            return (
                              <td key={col} className="px-2 py-2">
                                <div className="relative group">
                                  <div className={`inline-flex items-center px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold max-w-[180px] truncate ${CELL_STYLE[cSt]}`} title={fmtCell(val)}>
                                    {cSt === "error" && <AlertCircle size={10} className="text-red-500   mr-1.5 shrink-0" />}
                                    {cSt === "warning" && <AlertTriangle size={10} className="text-amber-500 mr-1.5 shrink-0" />}
                                    {cSt === "ok" && val !== "" && val != null && <CheckCircle2 size={10} className="text-emerald-500 mr-1.5 shrink-0" />}
                                    <span className="truncate">{fmtCell(val)}</span>
                                  </div>
                                  {cell?.message && (
                                    <div className="absolute bottom-full left-0 mb-1.5 z-20 hidden group-hover:block pointer-events-none">
                                      <div className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold shadow-lg whitespace-nowrap ${cSt === "error" ? "bg-red-600 text-white" : "bg-amber-500 text-white"}`}>
                                        {cell.message}
                                        <div className={`absolute top-full left-3 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent ${cSt === "error" ? "border-t-red-600" : "border-t-amber-500"}`} />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination interne */}
              {totalPages > 1 && (
                <div className="px-6 py-3 border-t border-slate-100 bg-white shrink-0 flex items-center justify-between">
                  <p className="text-xs text-slate-400">Page {page}/{totalPages} · {filteredIdx.length} ligne{filteredIdx.length > 1 ? "s" : ""}</p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-slate-100 transition disabled:opacity-30"><ChevronLeft size={14} /></button>
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(pg => (
                      <button key={pg} onClick={() => setPage(pg)} className={`w-7 h-7 rounded-lg text-xs font-bold transition ${pg === page ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"}`}>{pg}</button>
                    ))}
                    {totalPages > 7 && <span className="text-xs text-slate-300 px-1">…</span>}
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-slate-100 transition disabled:opacity-30"><ChevronRight size={14} /></button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 shrink-0 flex items-center justify-between gap-4 bg-white">
          <div className="flex items-center gap-4 text-[11px] text-slate-400 font-medium">
            <span className="flex items-center gap-1"><CheckCircle2 size={11} className="text-emerald-500" /> Compatible</span>
            <span className="flex items-center gap-1"><AlertTriangle size={11} className="text-amber-500" /> Avertissement</span>
            <span className="flex items-center gap-1"><AlertCircle size={11} className="text-red-500" /> Bloquant</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition">Annuler</button>
            <button
              onClick={handleConfirm}
              disabled={confirming || parsing || !!parseErr || !parsed || parsed.rows.length === 0 || hasErrors}
              title={hasErrors ? "Corrigez les erreurs avant d'importer" : undefined}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-sm ${hasErrors ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-slate-900 text-white hover:bg-black"}`}
            >
              {confirming ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {confirming ? "Import en cours…" : hasErrors ? "Import bloqué - erreurs à corriger" : "Confirmer l'import"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// PAGE PRINCIPALE
// ─────────────────────────────────────────────────────────────

export default function PatrimoinesPage() {
  const { toast } = useToast();
  const { assets, isLoading, fetchAssets, meta, page, setPage, applyFilters } = useAssets();
  const { types } = useTypes();
  const { subTypes } = useSubTypeAssets();
  const { sites } = useSites();

  const [stats, setStats] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingData, setEditingData] = useState<CompanyAsset | null>(null);
  const [panelAsset, setPanelAsset] = useState<CompanyAsset | null>(null);
  const [filters, setFilters] = useState<AssetFilters>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Sous-types filtrés dynamiquement selon le type sélectionné dans le formulaire
  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const [importLoading, setImportLoading] = useState(false);

  // ── Preview import states ──
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    AssetService.getStats().then(setStats).catch(() => setStats(null));
  }, []);


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
        toast.success("Patrimoine mis à jour.");
      } else {
        await AssetService.createAsset(formData);
        toast.success("Patrimoine créé avec succès.");
      }
      fetchAssets();
      setIsModalOpen(false);
      setEditingData(null);
    } catch (err: any) {
      toast.error(parseApiError(err));
    }
  };

  // ── Intercepte la sélection de fichier - ouvre la preview au lieu d'importer direct
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // reset pour re-sélectionner le même fichier si besoin
    setPreviewFile(file);
    setPreviewOpen(true);
  };

  // ── Appelé par la modale preview après confirmation de l'utilisateur
  const handleConfirmedImport = async (file: File): Promise<boolean> => {
    setImportLoading(true);
    try {
      await AssetService.importAssets(file);
      fetchAssets();
      toast.success(`"${file.name}" importé avec succès.`);
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? parseApiError(err);
      toast.error(msg);
      return false;
    } finally {
      setImportLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      await AssetService.exportAssets({
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.type_id ? { type_id: filters.type_id } : {}),
        ...(filters.site_id ? { site_id: filters.site_id } : {}),
      });
      setFlash({ type: "success", msg: "Export téléchargé avec succès." });
    } catch {
      // Fallback vers export local si le backend échoue
      exportToExcel(assets);
    }
  };

  const activeFiltersCount = [filters.status, filters.type_id, filters.sub_type_id, filters.site_id, filters.search]
    .filter(Boolean).length;

  // Sous-types filtrés selon le type sélectionné dans le formulaire
  const filteredSubTypesForForm = selectedTypeId
    ? subTypes.filter((st: any) => String(st.type_company_asset_id) === selectedTypeId)
    : subTypes;

  const assetFields: FieldConfig[] = [
    {
      name: "type_company_asset_id", label: "Famille / Type", type: "select", required: true,
      options: types.map((t: any) => ({ label: t.name, value: String(t.id) })),
    },
    {
      name: "sub_type_company_asset_id", label: "Sous-type", type: "select", required: true,
      options: filteredSubTypesForForm.map((st: any) => ({ label: st.name, value: String(st.id) })),
    },
    {
      name: "site_id", label: "Site", type: "select", required: true,
      options: sites.map((s: any) => ({ label: s.nom, value: String(s.id) })),
    },
    { name: "designation", label: "Désignation", type: "text", required: true, placeholder: "Que designe ce patrimoine....." },
    // { name: "serial_number", label: "N° de Série", type: "text", placeholder: "Ex: SN123456789" },
    // { name: "product_type_code", label: "Code Produit", type: "text", placeholder: "Ex: 03 (2 chiffres)", minLength: 2, maxLength: 2 },
    {
      name: "status", label: "Statut", type: "select", required: true,
      options: [
        { label: "Actif", value: "actif" },
        { label: "Inactif", value: "inactif" },
        { label: "Hors usage", value: "hors_usage" },
      ],
    },
    {
      name: "criticite", label: "Criticité", type: "select",
      options: [
        { label: "Non critique", value: "non_critique" },
        { label: "Critique", value: "critique" },
      ],
    },
    { name: "date_entree", label: "Date d'entrée", type: "date", required: true, icon: CalendarClock },
    { name: "valeur_entree", label: "Valeur d'entrée", type: "number", required: true, placeholder: "200000" },
    { name: "dimension", label: "Dimension", type: "text", required: false, placeholder: "22 m " },
    { name: "description", label: "Description", type: "rich-text", gridSpan: 2, placeholder: "Donnez plus de details sur ce equipement" },
    { name: "images", label: "Photos", type: "image-upload", gridSpan: 2, maxImages: 3 },
  ];


  const columns: ColumnConfig<CompanyAsset>[] = [
    {
      header: "Code Article", key: "codification",
      render: (_: any, row: CompanyAsset) => (
        <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg whitespace-nowrap">{row.codification}</span>
      ),
    },
    {
      header: "Code unique", key: "article_code",
      render: (v: any) => <span className="text-xs font-mono bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{v ?? "00"}</span>,
    },
    {
      header: "Désignation", key: "designation",
      render: (_: any, row: CompanyAsset) => (
        <span className="font-semibold text-slate-900 text-sm">{row.designation}</span>
      ),
    },
    // {
    //   header: "N° de Série", key: "serial_number",
    //   render: (v: any) => <span className="text-sm text-slate-600">{v ?? "-"}</span>,
    // },

    {
      header: "Type", key: "type",
      render: (_: any, row: CompanyAsset) => (
        <span className="text-sm text-slate-600">{row.type?.name ?? "-"}</span>
      ),
    },

    {
      header: "Sous-type", key: "sub_type_company_asset_id" as keyof CompanyAsset,
      render: (_: any, row: CompanyAsset) => (
        <span className="text-sm text-slate-600">{(row as any).sub_type?.name ?? row.subType?.name ?? "-"}</span>
      ),
    },
    {
      header: "Site", key: "site",
      render: (_: any, row: CompanyAsset) => (
        <span className="text-sm text-slate-600">{row.site?.nom ?? "-"}</span>
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
        <span className="text-sm font-bold text-slate-900 whitespace-nowrap">{formatCurrency(row.valeur_entree)}</span>
      ),
    },
    {
      header: "Date", key: "date_entree",
      render: (_: any, row: CompanyAsset) => (
        <span className="text-xs text-slate-500 whitespace-nowrap">{formatDate(row.date_entree)}</span>
      ),
    },
    {
      header: "Actions", key: "actions",
      render: (_: any, row: CompanyAsset) => (
        <div className="flex items-center gap-1">
          {/* <button onClick={() => setPanelAsset(row)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition">
            <Eye size={14} /> Aperçu
          </button> */}
          {/* <span className="w-px h-4 bg-slate-200 mx-0.5" /> */}
          <Link href={`/admin/patrimoines/${row.id}`} className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition" title="Voir les détails">
            <Eye size={16} />Aperçu
          </Link>
        </div>
      ),
    },
  ];

  const totalPages = meta?.last_page ?? 1;

  return (
    <>
      <div className="flex flex-col flex-1">
        <Navbar />
        <main className="mt-20 p-8 space-y-8">


          <PageHeader title="Patrimoine" subtitle="Inventaire centralisé de tous les équipements " />

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
            <StatsCard label="Total actifs" value={stats?.total_actifs ?? 0} delta="+10%" trend="up" />
            <StatsCard label="Total patrimoines inactifs" value={stats?.actifs_inactifs ?? 0} delta="+15%" trend="up" />
            <StatsCard label="Actifs critiques" value={stats?.total_actifs_critiques ?? 0} delta="-2%" trend="down" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            <StatsCard label="Nombre total de tickets" value={stats?.nombre_total_tickets ?? 0} delta="+0%" trend="up" />
            <StatsCard label="nombre Actifs non critiques" value={stats?.total_actifs_non_critiques ?? 0} delta="+0%" trend="down" />
            <StatsCard label="Coût actif critique" value={formatCurrency(stats?.cout_actifs_critiques ?? 0)} delta="+3%" trend="up" />
            <StatsCard label="délai moyen d'intervention" value={formatDate(stats?.delai_intervention_critique_heures ?? "0h")} delta="+0%" trend="up" />
          </div>

          {/* Barre d'actions */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              {activeFiltersCount > 0 && (
                <button onClick={() => handleApplyFilters({})}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-bold border border-slate-200 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 transition">
                  <X size={11} /> Effacer filtres ({activeFiltersCount})
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">

              {/* Import - ouvre la prévisualisation */}
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
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition ${filtersOpen || activeFiltersCount > 0 ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
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
                onClick={() => { setEditingData(null); setSelectedTypeId(""); setIsModalOpen(true); }}
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
                onViewAll={() => { }}
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

      {/* Side panel aperçu rapide */}
      <AssetSidePanel
        asset={panelAsset}
        onClose={() => setPanelAsset(null)}
        onEdit={() => { setEditingData(panelAsset); setSelectedTypeId(String(panelAsset?.type_company_asset_id ?? "")); setPanelAsset(null); setIsModalOpen(true); }}
      />

      {/* Formulaire création / édition */}
      <ReusableForm
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingData(null); setSelectedTypeId(""); }}
        title={editingData ? "Modifier le patrimoine" : "Ajouter un patrimoine"}
        subtitle="La codification est générée automatiquement"
        fields={assetFields}
        initialValues={editingData ? {
          type_company_asset_id: String(editingData.type_company_asset_id ?? ""),
          sub_type_company_asset_id: String(editingData.sub_type_company_asset_id ?? ""),
          site_id: String(editingData.site_id ?? (editingData.site as any)?.id ?? ""),
          designation: editingData.designation,
          serial_number: editingData.serial_number ?? "",
          product_type_code: editingData.article_code ?? "",
          status: editingData.status,
          criticite: editingData.criticite ?? "non_critique",
          date_entree: fmtDateForInput(editingData.date_entree),
          valeur_entree: editingData.valeur_entree ?? "",
          description: editingData.description ?? "",
          images: editingData.images ?? [],
        } : {}}
        onFieldChange={(name, value, setter) => {
          if (name === "type_company_asset_id") {
            setSelectedTypeId(String(value));
            // Réinitialiser le sous-type quand le type change pour éviter les incohérences
            setter("sub_type_company_asset_id", "");
          }
        }}
        onSubmit={handleCreateOrUpdate}
        submitLabel={editingData ? "Mettre à jour" : "Enregistrer"}
      />

      {/* ── MODALE PRÉVISUALISATION IMPORT ── */}
      <PatrimoinePreviewModal
        isOpen={previewOpen}
        onClose={() => { setPreviewOpen(false); setPreviewFile(null); }}
        onConfirmImport={handleConfirmedImport}
        file={previewFile}
      />
    </>
  );
}