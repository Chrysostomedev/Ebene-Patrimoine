"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import {
  Check, Copy, Eye, Filter, Download, Upload, TicketPlus, X,
  CalendarCheck, CalendarDays, Clock, MapPin, ArrowUpRight,
  Wrench, User, Tag, AlertTriangle, CheckCircle2, Plus,
  FileSpreadsheet, ChevronLeft, ChevronRight, Loader2, ShieldCheck, AlertCircle,
} from "lucide-react";
import Link from "next/link";
import ReusableForm from "@/components/ReusableForm";
import Navbar from "@/components/Navbar";
import DataTable from "@/components/DataTable";
import StatsCard from "@/components/StatsCard";
import Paginate from "@/components/Paginate";
import PageHeader from "@/components/PageHeader";
import Sidebar from "@/components/Sidebar";
import { FieldConfig } from "@/components/ReusableForm";

import { useTickets } from "../../../hooks/admin/useTickets";
import { useProviders } from "../../../hooks/admin/useProviders";
import { useServices } from "../../../hooks/admin/useServices";
import { useSites } from "../../../hooks/admin/useSites";
import { useAssets } from "../../../hooks/admin/useAssets";
import { useToast } from "@/contexts/ToastContext";
import { TicketService, Ticket } from "../../../services/admin/ticket.service";
import { resolveManagerName, resolveManagerPhone } from "../../../services/admin/site.service";
import * as PlanningService from "../../../services/admin/planningService";
import axiosInstance from "../../../core/axios";
import { formatDate, formatCurrency, formatHeures as sharedFormatHeures, formatNumber } from "../../../lib/utils";

const formatHeures = sharedFormatHeures;

// ══════════════════════════════════════════════

// HELPERS
// ══════════════════════════════════════════════

// ══════════════════════════════════════════════
// STATUTS
// ══════════════════════════════════════════════

const STATUS_LABELS: Record<string, string> = {
  SIGNALÉ: "Signalé",
  VALIDÉ: "Validé",
  ASSIGNÉ: "Assigné",
  EN_COURS: "En cours",
  RAPPORTÉ: "Rapporté",
  ÉVALUÉ: "Évalué",
  CLOS: "Clôturé",
};

const STATUS_STYLES: Record<string, string> = {
  SIGNALÉ: "border-slate-300 bg-slate-100 text-slate-700",
  VALIDÉ: "border-blue-400 bg-blue-50 text-blue-700",
  ASSIGNÉ: "border-violet-400 bg-violet-50 text-violet-700",
  EN_COURS: "border-orange-400 bg-orange-50 text-orange-600",
  RAPPORTÉ: "border-amber-400 bg-amber-50 text-amber-700",
  ÉVALUÉ: "border-green-500 bg-green-50 text-green-700",
  CLOS: "border-emerald-300 bg-emerald-50 text-emerald-700",
};

const STATUS_DOT_COLORS: Record<string, string> = {
  SIGNALÉ: "#94a3b8",
  VALIDÉ: "#3b82f6",
  ASSIGNÉ: "#8b5cf6",
  EN_COURS: "#f97316",
  RAPPORTÉ: "#f59e0b",
  ÉVALUÉ: "#22c55e",
  CLOS: "#000000",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center justify-center min-w-[90px] px-3 py-1.5 rounded-xl border text-xs font-bold ${STATUS_STYLES[status] ?? ""}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ══════════════════════════════════════════════
// PRIORITÉ
// ══════════════════════════════════════════════

const PRIORITY_STYLES: Record<string, string> = {
  faible: "bg-slate-100 text-slate-600",
  moyenne: "bg-blue-50 text-blue-700",
  haute: "bg-orange-50 text-orange-700",
  critique: "bg-red-100 text-red-700",
};

const PRIORITY_LABELS: Record<string, string> = {
  faible: "Faible", moyenne: "Moyenne", haute: "Haute", critique: "Critique",
};

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${PRIORITY_STYLES[priority] ?? ""}`}>
      {PRIORITY_LABELS[priority] ?? priority}
    </span>
  );
}

// ══════════════════════════════════════════════
// FILTER DROPDOWN
// ══════════════════════════════════════════════

interface TicketFilters { status?: string; type?: string; priority?: string; }

function FilterDropdown({
  isOpen, onClose, filters, onApply,
}: {
  isOpen: boolean; onClose: () => void;
  filters: TicketFilters; onApply: (f: TicketFilters) => void;
}) {
  const [local, setLocal] = useState<TicketFilters>(filters);
  useEffect(() => { setLocal(filters); }, [filters]);
  if (!isOpen) return null;

  const Pill = ({ val, current, onClick, label }: { val: string; current?: string; onClick: () => void; label: string }) => (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-2 rounded-xl text-sm font-semibold transition ${(current ?? "") === val ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
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

      <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
        {/* Statut */}
        <div className="space-y-1.5">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Statut</p>
          <div className="flex flex-col gap-1.5">
            {[
              { val: "", label: "Tous les statuts" },
              { val: "SIGNALÉ", label: "Signalé" },
              { val: "VALIDÉ", label: "Validé" },
              { val: "ASSIGNÉ", label: "Assigné" },
              { val: "EN_COURS", label: "En cours" },
              { val: "RAPPORTÉ", label: "Rapporté" },
              { val: "ÉVALUÉ", label: "Évalué" },
              { val: "CLOS", label: "Clôturé" },
            ].map(o => (
              <Pill key={o.val} val={o.val} current={local.status ?? ""} label={o.label}
                onClick={() => setLocal({ ...local, status: o.val || undefined })} />
            ))}
          </div>
        </div>

        {/* Type */}
        <div className="space-y-1.5">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Type</p>
          <div className="flex flex-col gap-1.5">
            {[
              { val: "", label: "Tous les types" },
              { val: "curatif", label: "Curatif" },
              { val: "preventif", label: "Préventif" },
            ].map(o => (
              <Pill key={o.val} val={o.val} current={local.type ?? ""} label={o.label}
                onClick={() => setLocal({ ...local, type: o.val || undefined })} />
            ))}
          </div>
        </div>

        {/* Priorité */}
        <div className="space-y-1.5">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Priorité</p>
          <div className="flex flex-col gap-1.5">
            {[
              { val: "", label: "Toutes" },
              { val: "faible", label: "Faible" },
              { val: "moyenne", label: "Moyenne" },
              { val: "haute", label: "Haute" },
              { val: "critique", label: "Critique" },
            ].map(o => (
              <Pill key={o.val} val={o.val} current={local.priority ?? ""} label={o.label}
                onClick={() => setLocal({ ...local, priority: o.val || undefined })} />
            ))}
          </div>
        </div>
      </div>

      <div className="px-5 py-4 border-t border-slate-100 flex gap-3">
        <button
          onClick={() => { setLocal({}); onApply({}); onClose(); }}
          className="flex-1 py-1.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition"
        >
          Réinitialiser
        </button>
        <button
          onClick={() => { onApply(local); onClose(); }}
          className="flex-1 py-1.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition"
        >
          Appliquer
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// TICKET PREVIEW IMPORT MODAL
// ══════════════════════════════════════════════

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

const TICKET_KNOWN_COLS = new Set([
  "sujet", "site", "type", "priorite", "statut",
  "equipement", "service", "prestataire",
  "date_de_creation", "date_decheance", "description",
]);
const TICKET_REQUIRED_COLS = ["sujet", "site"];
const TICKET_PRIORITY_COLS = ["sujet", "site", "type", "priorite", "statut", "equipement", "service", "prestataire", "date_de_creation", "date_decheance"];

const TICKET_RULES: Record<string, ColumnRule> = {
  sujet: { required: true },
  site: { required: true },
  type: {
    validators: [(v) => {
      if (!v) return null;
      if (!["curatif", "preventif"].includes(String(v).toLowerCase().trim()))
        return { status: "error", message: "Attendu : curatif ou preventif" };
      return null;
    }],
  },
  priorite: {
    validators: [(v) => {
      if (!v) return null;
      if (!["faible", "moyenne", "haute", "critique"].includes(String(v).toLowerCase().trim()))
        return { status: "warning", message: "Attendu : faible, moyenne, haute ou critique" };
      return null;
    }],
  },
  statut: {
    validators: [(v) => {
      if (!v) return null;
      const allowed = ["signalé", "validé", "assigné", "en_cours", "rapporté", "évalué", "clos", "signalez"];
      if (!allowed.includes(String(v).toLowerCase().trim()))
        return { status: "warning", message: `Statut inconnu` };
      return null;
    }],
  },
  date_de_creation: {
    validators: [(v) => {
      if (!v) return null;
      if (isNaN(new Date(String(v)).getTime())) return { status: "error", message: "Date invalide" };
      return null;
    }],
  },
  date_decheance: {
    validators: [(v, row) => {
      if (!v) return null;
      if (isNaN(new Date(String(v)).getTime())) return { status: "error", message: "Date invalide" };
      if (row.date_de_creation && new Date(String(v)) < new Date(String(row.date_de_creation)))
        return { status: "warning", message: "Doit être après la date de création" };
      return null;
    }],
  },
};

const CELL_STYLE_T: Record<ValidationStatus, string> = {
  ok: "bg-emerald-50 text-emerald-800 border-emerald-200",
  warning: "bg-amber-50   text-amber-800   border-amber-200",
  error: "bg-red-50     text-red-700     border-red-200",
};
const ROW_BG_T: Record<ValidationStatus, string> = {
  ok: "hover:bg-emerald-50/30",
  warning: "bg-amber-50/20  hover:bg-amber-50/40",
  error: "bg-red-50/20    hover:bg-red-50/40",
};
const BADGE_T: Record<ValidationStatus, { bg: string; text: string; icon: React.ReactNode }> = {
  ok: { bg: "bg-emerald-100 text-emerald-700", text: "OK", icon: <CheckCircle2 size={12} /> },
  warning: { bg: "bg-amber-100  text-amber-700", text: "Attention", icon: <AlertTriangle size={12} /> },
  error: { bg: "bg-red-100    text-red-600", text: "Erreur", icon: <AlertCircle size={12} /> },
};

function fmtCellT(v: any): string {
  if (v == null || v === "") return "-";
  if (v instanceof Date) return formatDate(v);
  return String(v);
}


function parseTicketFile(file: File): Promise<ParsedPreview> {
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
        const rows = raw.map(r =>
          Object.fromEntries(Object.entries(r).map(([k, v]) => [k.toLowerCase().trim().replace(/\s+/g, "_"), v]))
        );
        const fileKeys = Object.keys(rows[0]);
        const missingRequired = TICKET_REQUIRED_COLS.filter(c => !fileKeys.includes(c));
        const unknownCols = fileKeys.filter(c => !TICKET_KNOWN_COLS.has(c));
        const priority = TICKET_PRIORITY_COLS.filter(c => fileKeys.includes(c));
        const rest = fileKeys.filter(c => !priority.includes(c));
        const missingHeaders = missingRequired.filter(c => !fileKeys.includes(c));
        const headers = [...missingHeaders, ...priority, ...rest];

        const validations: RowValidation[] = rows.map((row, ri) => {
          const cells: Record<string, CellValidation> = {};
          let rowStatus: ValidationStatus = "ok";
          headers.forEach(col => {
            if (missingRequired.includes(col) && !fileKeys.includes(col)) {
              cells[col] = { status: "error", message: `Colonne "${col}" absente - obligatoire` };
              rowStatus = "error"; return;
            }
            if (!TICKET_KNOWN_COLS.has(col)) {
              cells[col] = { status: "warning", message: "Colonne inconnue - ignorée" };
              if (rowStatus !== "error") rowStatus = "warning"; return;
            }
            const rule = TICKET_RULES[col];
            const val = row[col];
            if (rule?.required && (val === "" || val == null)) {
              cells[col] = { status: "error", message: "Champ obligatoire manquant" };
              rowStatus = "error"; return;
            }
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

const PREVIEW_PAGE_T = 10;

function TicketPreviewModal({
  isOpen, onClose, onConfirmImport, file,
}: {
  isOpen: boolean; onClose: () => void;
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
    parseTicketFile(file).then(setParsed).catch(e => setParseErr(e?.message ?? "Erreur")).finally(() => setParsing(false));
  }, [file, isOpen]);

  const handleConfirm = useCallback(async () => {
    if (!file || confirming) return;
    setConfirming(true);
    try { await onConfirmImport(file); onClose(); } finally { setConfirming(false); }
  }, [file, onConfirmImport, onClose, confirming]);

  if (!isOpen) return null;

  const allRows = parsed?.rows ?? [];
  const allValids = parsed?.validations ?? [];
  const filteredIdx = filter === "all"
    ? allValids.map((_, i) => i)
    : allValids.filter(v => v.status === filter).map(v => v.rowIndex);
  const totalPages = Math.max(1, Math.ceil(filteredIdx.length / PREVIEW_PAGE_T));
  const pageIdxs = filteredIdx.slice((page - 1) * PREVIEW_PAGE_T, page * PREVIEW_PAGE_T);
  const hasErrors = (parsed?.summary.errors ?? 0) > 0;
  const hasWarnings = (parsed?.summary.warnings ?? 0) > 0;

  const fileKeys = parsed && parsed.rows.length > 0 ? Object.keys(parsed.rows[0]) : [];
  const missingRequired = TICKET_REQUIRED_COLS.filter(c => !fileKeys.includes(c));
  const unknownCols = fileKeys.filter(c => !TICKET_KNOWN_COLS.has(c));
  const knownInFile = fileKeys.filter(c => TICKET_KNOWN_COLS.has(c));
  const totallyIncompat = parsed ? (knownInFile.length === 0 || missingRequired.length === TICKET_REQUIRED_COLS.length) : false;

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
              <h2 className="text-base font-black text-slate-900 leading-tight">Prévisualisation - Import Tickets</h2>
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
                    <span className="flex items-center gap-1.5 text-xs font-bold text-red-700 bg-red-50 border border-red-300 px-3 py-1.5 rounded-lg">
                      <AlertCircle size={12} /> Fichier incompatible - ce n'est pas un fichier Tickets
                    </span>
                  ) : hasErrors ? (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-1 rounded-lg">
                      <AlertCircle size={12} /> {parsed.summary.errors} ligne{parsed.summary.errors > 1 ? "s" : ""} bloquante{parsed.summary.errors > 1 ? "s" : ""}
                    </span>
                  ) : hasWarnings ? (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-lg">
                      <AlertTriangle size={12} /> Importable avec avertissements
                    </span>
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
                          {h}{TICKET_RULES[h]?.required && <span className="ml-0.5 text-red-400">*</span>}
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
                        <tr key={ri} className={`border-b border-slate-50 transition ${ROW_BG_T[vld.status]}`}>
                          <td className="px-3 py-2.5 text-slate-300 font-mono font-bold">{ri + 1}</td>
                          <td className="px-3 py-2.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg font-bold text-[10px] ${BADGE_T[vld.status].bg}`}>
                              {BADGE_T[vld.status].icon} {BADGE_T[vld.status].text}
                            </span>
                          </td>
                          {parsed.headers.map(col => {
                            const cell = vld.cells[col];
                            const val = row[col];
                            const cSt = cell?.status ?? "ok";
                            return (
                              <td key={col} className="px-2 py-2">
                                <div className="relative group">
                                  <div className={`inline-flex items-center px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold max-w-[180px] truncate ${CELL_STYLE_T[cSt]}`} title={fmtCellT(val)}>
                                    {cSt === "error" && <AlertCircle size={10} className="text-red-500   mr-1.5 shrink-0" />}
                                    {cSt === "warning" && <AlertTriangle size={10} className="text-amber-500 mr-1.5 shrink-0" />}
                                    {cSt === "ok" && val !== "" && val != null && <CheckCircle2 size={10} className="text-emerald-500 mr-1.5 shrink-0" />}
                                    <span className="truncate">{fmtCellT(val)}</span>
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

// ══════════════════════════════════════════════
// TICKET SIDE PANEL
// ══════════════════════════════════════════════

import { QuoteService, Quote } from "../../../services/admin/quote.service";
import { InvoiceService, Invoice } from "../../../services/admin/invoice.service";

function TicketSidePanel({
  ticket, onClose, onEdit, onWorkflowAction,
}: {
  ticket: Ticket | null; onClose: () => void; onEdit: () => void;
  onWorkflowAction?: (action: string, ticket: Ticket) => void;
}) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingLinked, setLoadingLinked] = useState(false);

  useEffect(() => {
    if (ticket) {
      setQuotes([]);
      setInvoices([]);
      setLoadingLinked(true);

      const loadLinked = async () => {
        try {
          const [q, i] = await Promise.all([
            QuoteService.getQuotesByTicket(ticket.id),
            InvoiceService.getInvoicesByTicket(ticket.id)
          ]);
          setQuotes(q);
          setInvoices(i);
        } catch (err) {
          console.error("Error loading linked data", err);
        } finally {
          setLoadingLinked(false);
        }
      };
      loadLinked();
    }
  }, [ticket]);

  if (!ticket) return null;

  const statusColor = STATUS_DOT_COLORS[ticket.status] ?? "#94a3b8";
  const statusLabel = STATUS_LABELS[ticket.status] ?? ticket.status;

  const [copied, setCopied] = useState(false);

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const providerName =
    (ticket as any).provider?.company_name ??
    (ticket as any).provider?.user?.name ??
    (ticket as any).provider?.name ??
    (ticket.provider_id ? `Prestataire #${ticket.provider_id}` : "");

  const siteName = ticket.site?.nom ?? "";
  const assetLabel = ticket.asset
    ? `${ticket.asset.designation}${ticket.asset.codification ? ` · ${ticket.asset.codification}` : ""}`
    : "";
  const serviceName = ticket.service?.name ?? "";

  const infoRows: Array<{ Icon: any; label: string; value?: string | null; custom?: React.ReactNode }> = [
    {
      Icon: Tag,
      label: "Référence",
      custom: (
        <div className="flex items-center gap-2 group/id">
          <span className="text-sm font-black text-slate-900">#{ticket.id}</span>
          <button
            onClick={() => handleCopyId(ticket.id.toString())}
            className={`p-1.5 rounded-lg border transition-all ${copied
              ? "bg-green-50 border-green-200 text-green-600"
              : "bg-slate-50 border-slate-100 text-slate-400 opacity-0 group-hover/id:opacity-100 hover:text-slate-600 hover:border-slate-300"
              }`}
            title="Copier l'identifiant"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
        </div>
      ),
    },
    { Icon: MapPin, label: "Site", value: siteName },
    { Icon: Wrench, label: "Patrimoine", value: assetLabel },
    { Icon: CheckCircle2, label: "Service", value: serviceName },
    { Icon: User, label: "Prestataire", value: providerName },
    { Icon: AlertTriangle, label: "Priorité", custom: <PriorityBadge priority={ticket.priority} /> },
    { Icon: CalendarDays, label: "Date ", value: formatDate(ticket.planned_at) },
    { Icon: CalendarCheck, label: "Date limite", value: formatDate(ticket.due_at) },
    ...(ticket.resolved_at ? [{ Icon: CheckCircle2, label: "Résolu le", value: formatDate(ticket.resolved_at) }] : []),
    ...(ticket.closed_at ? [{ Icon: Clock, label: "Clôturé le", value: formatDate(ticket.closed_at) }] : []),
    ...(ticket.created_at ? [{ Icon: Clock, label: "Créé le", value: formatDate(ticket.created_at) }] : []),
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[460px] bg-white z-50 shadow-2xl flex flex-col rounded-l-3xl overflow-hidden">

        <div className="flex items-start px-6 pt-6 pb-0 shrink-0">
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-xl transition -ml-1">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        <div className="px-7 pt-4 pb-5 shrink-0">
          <h2 className="text-2xl font-black text-slate-900 leading-tight">
            {ticket.subject ?? `Ticket #${ticket.id}`}
          </h2>
          <div className="flex flex-wrap items-center gap-2 mt-2.5">
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${ticket.type === "curatif"
              ? "bg-orange-50 text-orange-700 border-orange-200"
              : "bg-blue-50 text-blue-700 border-blue-200"
              }`}>
              {ticket.type === "curatif" ? "Curatif" : "Préventif"}
            </span>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black border ${STATUS_STYLES[ticket.status] ?? ""}`}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
              {statusLabel}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-7 pb-7 space-y-6">
          <div className="space-y-0">
            {infoRows.map((row, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0 gap-4">
                <div className="flex items-center gap-2 text-slate-400 shrink-0">
                  <row.Icon size={13} />
                  <p className="text-xs font-medium whitespace-nowrap">{row.label}</p>
                </div>
                {row.custom
                  ? row.custom
                  : <p className="text-sm font-bold text-slate-900 text-right truncate max-w-[60%]">{row.value ?? ""}</p>
                }
              </div>
            ))}
            {ticket.cout !== undefined && ticket.cout !== null && (
              <div className="flex items-center justify-between py-3">
                <p className="text-xs text-slate-400 font-medium">Coût</p>
                <p className="text-sm font-bold text-slate-900">
                  {formatCurrency(ticket.cout)}
                </p>
              </div>
            )}

          </div>

          {ticket.description && (
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Description</p>
              <div
                className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-sm text-slate-700 leading-relaxed prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: ticket.description }}
              />
            </div>
          )}

          {/* Devis liés */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Devis liés</h3>
            {loadingLinked ? (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Loader2 size={12} className="animate-spin" /> Chargement...
              </div>
            ) : quotes.length === 0 ? (
              <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-100">Aucun devis lié.</p>
            ) : (
              <div className="space-y-2">
                {quotes.map(q => (
                  <Link
                    key={q.id}
                    href={`/admin/devis/details/${q.id}`}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white hover:border-slate-300 transition-all shadow-sm"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-slate-900">{q.reference}</span>
                      <span className="text-[10px] text-slate-400">{formatDate(q.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{formatCurrency(q.amount_ttc)}</span>
                      <ChevronRight size={14} className="text-slate-300" />
                    </div>

                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Factures liées */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Factures liées</h3>
            {loadingLinked ? (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Loader2 size={12} className="animate-spin" /> Chargement...
              </div>
            ) : invoices.length === 0 ? (
              <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-100">Aucune facture liée.</p>
            ) : (
              <div className="space-y-2">
                {invoices.map(inv => (
                  <div
                    key={inv.id}
                    className="flex flex-col p-3 rounded-xl border border-slate-100 bg-white shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-900">{inv.reference}</span>
                        <span className="text-[10px] text-slate-400">{formatDate(inv.invoice_date)}</span>
                      </div>
                      <span className="text-xs font-bold text-slate-900">{formatCurrency(inv.amount_ttc)}</span>
                    </div>
                    {inv.pdf_path && (
                      <a
                        href={InvoiceService.getPdfUrl(inv.pdf_path)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-wider hover:bg-red-100 transition"
                      >
                        <Download size={10} /> Voir PDF
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-7 py-5 border-t border-slate-100 shrink-0 space-y-3">
          {ticket.status === "SIGNALÉ" && (
            <button
              onClick={() => onWorkflowAction?.("assign", ticket)}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 transition"
            >
              Assigner un prestataire
            </button>
          )}

          {ticket.status === "RAPPORTÉ" && (
            <button
              onClick={() => onWorkflowAction?.("validate", ticket)}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 transition"
            >
              Valider le rapport
            </button>
          )}

          {ticket.status === "ÉVALUÉ" && (
            <button
              onClick={() => onWorkflowAction?.("close", ticket)}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-black text-white text-sm font-bold hover:bg-gray-900 transition"
            >
              Clôturer le ticket
            </button>
          )}

          {ticket.type === "curatif" && (
            <button
              onClick={() => onWorkflowAction?.("create_planning", ticket)}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-bold hover:bg-slate-50 transition"
            >
              <CalendarCheck size={16} /> Créer un planning
            </button>
          )}

          <button
            onClick={onEdit}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold hover:bg-slate-200 transition"
          >
            Modifier les infos
          </button>
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════
// PAGE PRINCIPALE
// ══════════════════════════════════════════════

export default function TicketsPage() {
  const {
    tickets, stats, isLoading, meta, page,
    filters, fetchTickets, setPage, applyFilters,
    assignTicket, closeTicket, validateReport, error,
  } = useTickets();

  const { providers } = useProviders();
  const { services } = useServices();
  const { assets } = useAssets();
  const { sites, fetchSites } = useSites();

  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (sites.length === 0) fetchSites(); }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { toast } = useToast();
  const [importLoading, setImportLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [isPlanningModalOpen, setIsPlanningModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isValidModalOpen, setIsValidModalOpen] = useState(false);
  const [workflowActionLoading, setWorkflowActionLoading] = useState(false);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<number | null>(null);
  const [ticketFormType, setTicketFormType] = useState<string>("");
  const [ticketFormPlanned, setTicketFormPlanned] = useState<string>("");

  const computedDueAt = (() => {
    if (!ticketFormPlanned) return "";
    const planned = new Date(ticketFormPlanned);
    if (isNaN(planned.getTime())) return "";
    const hours = ticketFormType === "curatif" ? 72 : 7 * 24;
    const due = new Date(planned.getTime() + hours * 60 * 60 * 1000);
    return formatDate(due);
  })();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node))
        setFiltersOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);


  const activeCount = [filters.status, filters.type, filters.priority].filter(Boolean).length;

  const handleOpenDetails = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setIsDetailsOpen(true);
  };

  const handleEdit = () => {
    if (!selectedTicket) return;
    setEditingTicket(selectedTicket);
    setIsDetailsOpen(false);
    setIsModalOpen(true);
  };

  const handleSubmit = async (formData: any) => {
    try {
      if (editingTicket) {
        await TicketService.updateTicket(editingTicket.id, formData);
        toast.success("Ticket mis à jour avec succès.");
      } else {
        const payload: any = {
          site_id: Number(formData.site_id),
          company_asset_id: Number(formData.company_asset_id),
          type: formData.type,
          priority: formData.priority,
          planned_at: formData.planned_at,
          subject: formData.subject || undefined,
          description: formData.description || undefined,
        };

        if (formData.service_id) payload.service_id = Number(formData.service_id);
        if (formData.provider_id) payload.provider_id = Number(formData.provider_id);

        if (payload.planned_at && !payload.planned_at.includes("T") && !payload.planned_at.includes(" ")) {
          payload.planned_at = payload.planned_at + " 00:00:00";
        }

        if (!formData.due_at || formData.due_at === "") {
          const planned = new Date(payload.planned_at);
          if (!isNaN(planned.getTime())) {
            const hoursToAdd = payload.type === "curatif" ? 72 : 7 * 24;
            const due = new Date(planned.getTime() + hoursToAdd * 60 * 60 * 1000);
            payload.due_at = due.toISOString().slice(0, 19).replace("T", " ");
          }
        } else {
          payload.due_at = formData.due_at.includes(" ") || formData.due_at.includes("T")
            ? formData.due_at
            : formData.due_at + " 00:00:00";
        }

        let created: any = null;
        try {
          created = await TicketService.createTicket(payload);
        } catch (createErr: any) {
          const status = createErr?.response?.status;
          const msg: string = createErr?.response?.data?.message ?? "";
          const isNotifyBug = status === 500 && (
            msg.includes("notify") || msg.includes("Notifiable") || msg.includes("undefined method")
          );
          if (!isNotifyBug) throw createErr;
        }

        toast.success("Ticket créé avec succès.");
      }
      await fetchTickets();
      setIsModalOpen(false);
      setEditingTicket(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? err?.message ?? "Erreur serveur.");
    }
  };

  const handleWorkflowAction = async (action: string, ticket: Ticket) => {
    setSelectedTicket(ticket);
    if (action === "assign") {
      setIsAssignModalOpen(true);
    } else if (action === "close") {
      if (confirm("Êtes-vous sûr de vouloir clôturer ce ticket ?")) {
        setWorkflowActionLoading(true);
        const ok = await closeTicket(ticket.id);
        if (ok) {
          toast.success("Ticket clôturé avec succès.");
          setIsDetailsOpen(false);
        }
        setWorkflowActionLoading(false);
      }
    } else if (action === "validate") {
      setIsValidModalOpen(true);
    } else if (action === "create_planning") {
      setIsPlanningModalOpen(true);
    }
  };

  const handleAssignSubmit = async (formData: any) => {
    if (!selectedTicket) return;
    setWorkflowActionLoading(true);
    const ok = await assignTicket(selectedTicket.id, Number(formData.provider_id));
    if (ok) {
      toast.success("Prestataire assigné avec succès.");
      setIsAssignModalOpen(false);
      // Met à jour selectedTicket immédiatement → bouton "Assigner" disparaît du SidePanel
      const updated = { ...selectedTicket, status: "ASSIGNÉ" as const, provider_id: Number(formData.provider_id) };
      setSelectedTicket(updated);
      // Garde le SidePanel ouvert pour voir le nouveau statut
    } else {
      toast.error(error || "Erreur lors de l'assignation du prestataire.");
    }
    setWorkflowActionLoading(false);
  };

  const handleValidateSubmit = async (formData: any) => {
    if (!selectedTicket) return;
    setWorkflowActionLoading(true);
    const ok = await validateReport(selectedTicket.id, {
      result: formData.result,
      rating: Number(formData.rating),
      comment: formData.comment,
    });
    if (ok) {
      toast.success("Rapport validé avec succès.");
      setIsValidModalOpen(false);
      setIsDetailsOpen(false);
    }
    setWorkflowActionLoading(false);
  };

  const handlePlanningSubmit = async (formData: any) => {
    if (!selectedTicket) return;
    setWorkflowActionLoading(true);
    try {
      const payload: PlanningService.CreatePlanningPayload = {
        date_debut: formData.date_debut,
        date_fin: formData.date_fin,
        description: formData.description,
        site_id: Number(formData.site_id),
        provider_id: Number(formData.provider_id),
        company_asset_id: selectedTicket.company_asset_id,
      };
      await PlanningService.createPlanning(payload);
      toast.success("Planning créé avec succès.");
      setIsPlanningModalOpen(false);
      setIsDetailsOpen(false);
      await fetchTickets();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Erreur lors de la création du planning.");
    } finally {
      setWorkflowActionLoading(false);
    }
  };

  const handleExport = async () => {
    if (exportLoading) return;
    setExportLoading(true);
    try {
      const response = await axiosInstance.get("/admin/ticket/export", {
        params: {
          ...(filters.status ? { status: filters.status } : {}),
          ...(filters.type ? { type: filters.type } : {}),
          ...(filters.priority ? { priority: filters.priority } : {}),
        },
        responseType: "blob",
      });

      const blob = new Blob([response.data], {
        type: response.headers["content-type"] ?? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const cd = (response.headers["content-disposition"] as string) ?? "";
      const match = cd.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      link.download = match?.[1]?.replace(/['"]/g, "") ?? `tickets_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("Export téléchargé avec succès.");
    } catch {
      toast.error("Erreur lors de l'exportation.");
    } finally {
      setExportLoading(false);
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setPreviewFile(file);
    setPreviewOpen(true);
  };

  const handleConfirmedImport = async (file: File) => {
    setImportLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      await axiosInstance.post("/admin/ticket/import", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await fetchTickets();
      toast.success(`"${file.name}" importé avec succès.`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Erreur lors de l'import.");
    } finally {
      setImportLoading(false);
    }
  };

  // ── Logique SLA ─────────────────────────────────────────────────────────────
  const now = Date.now();
  const GRACE_MS = 3 * 60 * 60 * 1000;

  const getTicketSlaState = (ticket: Ticket): "ok" | "grace" | "expired" => {
    if (ticket.type !== "curatif") return "ok";
    const dueAt = (ticket as any).due_at;
    if (!dueAt) return "ok";
    const dueMs = new Date(dueAt).getTime();
    if (isNaN(dueMs)) return "ok";
    const overdue = now - dueMs;
    if (overdue <= 0) return "ok";
    if (overdue < GRACE_MS) return "grace";
    return "expired";
  };

  const visibleTickets = tickets.filter(t => getTicketSlaState(t) !== "expired");

  // ── Colonnes du tableau ──────────────────────────────────────────────────────
  const columns = [
    /* {
      header: "Photos",
      key: "images",
      ...
    }, */
    {
      header: "Codification", key: "code",
      render: (_: any, row: Ticket) => {
        const sla = getTicketSlaState(row);
        return (
          <span className={`font-mono text-xs font-bold px-2 py-1 rounded-lg whitespace-nowrap inline-flex items-center gap-1 ${sla === "grace" ? "bg-slate-100 text-slate-400 opacity-50" : "bg-slate-100 text-slate-700"
            }`}>
            {(row as any).ticket?.code_ticket ?? `${row.code_ticket}`}
            {sla === "grace" && <span className="text-[9px] text-orange-500 font-black">SLA!</span>}
          </span>
        );
      },
    },
    {
      header: "Sujet", key: "subject",
      render: (_: any, row: Ticket) => {
        const sla = getTicketSlaState(row);
        return (
          <span className={`font-medium text-sm max-w-[200px] truncate block ${sla === "grace" ? "text-slate-400 line-through" : "text-slate-900"}`}>
            {row.subject ?? ""}
          </span>
        );
      },
    },
    {
      header: "Site", key: "site",
      render: (_: any, row: Ticket) => row.site?.nom ?? "",
    },
    {
      header: "Prestataire", key: "provider",
      render: (_: any, row: Ticket) => {
        const name = (row as any).provider?.company_name ?? (row as any).provider?.user?.name ?? (row as any).provider?.name ?? (row.provider_id ? `Prestataire #${row.provider_id}` : "-");
        return <span className="text-sm text-slate-700">{name}</span>;
      },
    },
    {
      header: "Type", key: "type",
      render: (_: any, row: Ticket) => (
        <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold ${row.type === "curatif" ? "bg-orange-50 text-orange-700" : "bg-blue-50 text-blue-700"
          }`}>
          {row.type === "curatif" ? "Curatif" : "Préventif"}
        </span>
      ),
    },
    {
      header: "Priorité", key: "priority",
      render: (_: any, row: Ticket) => <PriorityBadge priority={row.priority} />,
    },
    {
      header: "Statut", key: "status",
      render: (_: any, row: Ticket) => <StatusBadge status={row.status} />,
    },
    {
      header: "Actions", key: "actions",
      render: (_: any, row: Ticket) => (
        <div className="flex items-center gap-1">
          {/* <button
          onClick={() => handleOpenDetails(row)}
          className="flex items-center gap-2 font-bold text-slate-800 hover:text-gray-500 transition"
        >
          <Eye size={18} /> Aperçu
        </button> */}


          <Link href={`/admin/tickets/${row.id}`} className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition" title="Voir les détails">
            <Eye size={16} />
          </Link>
        </div>
      ),
    },
  ];

  const ticketFields: FieldConfig[] = [
    {
      name: "site_id", label: "Site", type: "select", required: true,
      options: sites.map((s: any) => ({ label: s.nom, value: String(s.id) })),
    },
    {
      name: "company_asset_id", label: "Patrimoine", type: "select", required: true,
      options: (selectedSiteId
        ? assets.filter((a: any) => a.site_id === selectedSiteId)
        : assets
      ).map((a: any) => ({ label: `${a.designation} (${a.codification})`, value: String(a.id) })),
    },
    {
      name: "service_id", label: "Service", type: "select", required: false,
      options: services.map((s: any) => ({ label: s.name, value: String(s.id) })),
    },
    {
      name: "provider_id", label: "Prestataire", type: "select", required: true,

      options: providers.map((p: any) => ({
        label: p.company_name ?? p.user?.name ?? p.name ?? `Prestataire #${p.id}`,
        value: String(p.id),
      })),
    },
    {
      name: "type", label: "Type", type: "select", required: true,
      defaultValue: "curatif",
      options: [
        { label: "Curatif", value: "curatif" },
        { label: "Préventif", value: "preventif" },
      ],
    },
    {
      name: "priority", label: "Priorité", type: "select", required: true,
      options: [
        { label: "Faible", value: "faible" }, { label: "Moyenne", value: "moyenne" },
        { label: "Haute", value: "haute" }, { label: "Critique", value: "critique" },
      ],
    },
    { name: "subject", label: "Sujet", type: "text", placeholder: "Decrivez ce probleme rencontré", },
    { name: "planned_at", label: "Date", type: "date", required: true, disablePastDates: true, icon: CalendarDays },

    {
      name: "description", label: "Description", type: "rich-text", gridSpan: 2,
    },
    {
      name: "images", label: "Photos", type: "image-upload", gridSpan: 2, maxImages: 3,
    },
  ];

  const editFields: FieldConfig[] = [
    {
      name: "status", label: "Statut", type: "select", required: true,
      options: Object.entries(STATUS_LABELS).map(([v, l]) => ({ label: l, value: v })),
    },
    {
      name: "priority", label: "Priorité", type: "select",
      options: [
        { label: "Faible", value: "faible" }, { label: "Moyenne", value: "moyenne" },
        { label: "Haute", value: "haute" }, { label: "Critique", value: "critique" },
      ],
    },
    { name: "description", label: "Commentaire", type: "rich-text", gridSpan: 2 },
    { name: "images", label: "Photos", type: "image-upload", gridSpan: 2, maxImages: 3 },
  ];

  const planningFields: FieldConfig[] = [
    {
      name: "site_id", label: "Site", type: "select", required: true,
      disabled: !!selectedTicket,
      options: sites.map((s: any) => ({ label: s.nom, value: String(s.id) })),
    },
    {
      name: "provider_id", label: "Prestataire", type: "select", required: true,
      options: providers.map((p: any) => ({
        label: p.company_name ?? p.user?.name ?? p.name ?? `Prestataire #${p.id}`,
        value: String(p.id),
      })),
    },
    { name: "date_debut", label: "Date de début", type: "date", required: true, disablePastDates: true },
    { name: "date_fin", label: "Date de fin", type: "date", required: true, disablePastDates: true },
    { name: "description", label: "Description", type: "rich-text", gridSpan: 2 },
  ];

  const assignFields: FieldConfig[] = [
    {
      name: "provider_id", label: "Sélectionner un prestataire", type: "select", required: true,
      options: providers.map((p: any) => ({
        label: p.company_name ?? p.user?.name ?? p.name ?? `Prestataire #${p.id}`,
        value: String(p.id),
      })),
    },
  ];

  const validateFields: FieldConfig[] = [
    {
      name: "result", label: "Résultat", type: "select", required: true,
      options: [
        { label: "Réalisé avec succès", value: "SUCCESS" },
        { label: "Partiellement réalisé", value: "PARTIAL" },
        { label: "Échec", value: "FAILURE" },
      ],
    },
    { name: "rating", label: "Note (1-5)", type: "number", required: true },
    { name: "comment", label: "Commentaire", type: "rich-text", gridSpan: 2 },
  ];

  const kpis1 = [
    { label: "Coût moyen / ticket", value: stats?.cout_moyen_par_ticket ?? 0, isCurrency: true, delta: "+0%", trend: "up" as const },
    { label: "Total tickets", value: stats?.nombre_total_tickets ?? 0, delta: "+0%", trend: "up" as const },
    { label: "Tickets en cours", value: stats?.nombre_total_tickets_en_cours ?? 0, delta: "+0%", trend: "up" as const },
    { label: "Tickets clôturés", value: stats?.nombre_total_tickets_clotures ?? 0, delta: "+0%", trend: "up" as const },
  ];
  const kpis2 = [
    { label: "Tickets ce mois", value: stats?.nombre_tickets_par_mois ?? 0, delta: "+0%", trend: "up" as const },
    { label: "Délai moyen", value: formatHeures(stats?.delais_moyen_traitement_heures), delta: "+0%", trend: "up" as const },
    { label: "Délai minimal", value: formatHeures(stats?.delais_minimal_traitement_heures), delta: "+0%", trend: "up" as const },
    { label: "Délai maximal", value: formatHeures(stats?.delais_maximal_traitement_heures), delta: "+0%", trend: "up" as const },
  ];

  return (
    <>
      <div className="flex-1 flex flex-col min-h-screen">
        <Navbar />

        <main className="mt-20 p-6 space-y-8">
          <PageHeader title="Tickets" subtitle="Suivez et gérez tous vos tickets d'intervention" />


          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis1.map((k, i) => <StatsCard key={i} {...k} />)}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis2.map((k, i) => <StatsCard key={i} {...k} />)}
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap min-h-[36px]">
              {activeCount === 0 && (
                <p className="text-xs text-slate-400 font-medium">Aucun filtre actif</p>
              )}
              {filters.status && (
                <span className="flex items-center gap-1.5 bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded-full">
                  {STATUS_LABELS[filters.status]}
                  <button onClick={() => applyFilters({ ...filters, status: undefined })} className="hover:opacity-70 transition"><X size={11} /></button>
                </span>
              )}
              {filters.type && (
                <span className="flex items-center gap-1.5 bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded-full">
                  {filters.type === "curatif" ? "Curatif" : "Préventif"}
                  <button onClick={() => applyFilters({ ...filters, type: undefined })} className="hover:opacity-70 transition"><X size={11} /></button>
                </span>
              )}
              {filters.priority && (
                <span className="flex items-center gap-1.5 bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded-full">
                  {PRIORITY_LABELS[filters.priority]}
                  <button onClick={() => applyFilters({ ...filters, priority: undefined })} className="hover:opacity-70 transition"><X size={11} /></button>
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <label className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-bold cursor-pointer hover:bg-slate-50 transition ${importLoading ? "opacity-60 cursor-wait" : ""}`}>
                {importLoading
                  ? <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
                  : <Download size={16} />
                }
                Importer
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" disabled={importLoading} onChange={handleImport} />
              </label>

              <button
                onClick={handleExport}
                disabled={exportLoading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-bold hover:bg-slate-50 transition disabled:opacity-60 disabled:cursor-wait"
              >
                {exportLoading
                  ? <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
                  : <Upload size={16} />
                }
                Exporter
              </button>

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
                <FilterDropdown
                  isOpen={filtersOpen}
                  onClose={() => setFiltersOpen(false)}
                  filters={filters}
                  onApply={(f) => { applyFilters(f); setFiltersOpen(false); }}
                />
              </div>

              <button
                onClick={() => { setEditingTicket(null); setIsModalOpen(true); }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition shadow-sm"
              >
                <TicketPlus size={16} /> Nouveau Ticket
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="py-16 text-center text-slate-400 text-sm">
                <span className="inline-block w-6 h-6 border-2 border-slate-200 border-t-slate-700 rounded-full animate-spin mb-3" />
                <p>Chargement des tickets...</p>
              </div>
            ) : tickets.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm">
                Aucun ticket{activeCount > 0 ? " correspondant aux filtres" : ""}.
              </div>
            ) : (
              <DataTable title="Liste des tickets" columns={columns} data={visibleTickets} onViewAll={() => { }} />
            )}
            <div className="p-6 border-t border-slate-50 flex items-center justify-between bg-slate-50/30">
              <p className="text-xs text-slate-400">
                Page {page} sur {meta?.last_page ?? 1} · {meta?.total ?? 0} tickets
              </p>
              <Paginate currentPage={page} totalPages={meta?.last_page ?? 1} onPageChange={setPage} />
            </div>
          </div>
        </main>
      </div>

      <TicketSidePanel
        ticket={isDetailsOpen ? selectedTicket : null}
        onClose={() => { setIsDetailsOpen(false); setSelectedTicket(null); }}
        onEdit={handleEdit}
        onWorkflowAction={handleWorkflowAction}
      />

      <ReusableForm
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingTicket(null); setSelectedSiteId(null); setTicketFormType(""); setTicketFormPlanned(""); }}
        title={editingTicket ? "Modifier le ticket" : "Nouveau ticket"}
        subtitle={
          !editingTicket && computedDueAt
            ? `Date limite calculée automatiquement : ${computedDueAt} (${ticketFormType === "curatif" ? "SLA 72h" : "7 jours préventif"})`
            : editingTicket
              ? "Modifiez le statut ou les informations du ticket"
              : "Remplissez les informations pour créer un ticket"
        }
        fields={editingTicket ? editFields : ticketFields}
        initialValues={editingTicket ? {
          status: editingTicket.status,
          priority: editingTicket.priority,
          description: editingTicket.description ?? "",
        } : {
          due_at_display: computedDueAt || "",
        }}
        onSubmit={handleSubmit}
        onFieldChange={(name, value) => {
          if (name === "site_id") setSelectedSiteId(value ? Number(value) : null);
          if (name === "type") setTicketFormType(value ?? "");
          if (name === "planned_at") setTicketFormPlanned(value ?? "");
        }}
        submitLabel={editingTicket ? "Mettre à jour" : "Créer le ticket"}
      />

      <ReusableForm
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Assigner un prestataire"
        subtitle="Sélectionnez un prestataire pour ce ticket"
        fields={assignFields}
        onSubmit={handleAssignSubmit}
        submitLabel="Assigner"
      />

      <ReusableForm
        isOpen={isValidModalOpen}
        onClose={() => setIsValidModalOpen(false)}
        title="Valider l'intervention"
        subtitle="Vérifiez le travail effectué et évaluez la prestation"
        fields={validateFields}
        onSubmit={handleValidateSubmit}
        submitLabel="Valider"
      />

      <ReusableForm
        isOpen={isPlanningModalOpen}
        onClose={() => setIsPlanningModalOpen(false)}
        title="Créer un Planning (Maintenance Préventive)"
        subtitle="Un planning créera automatiquement un ticket préventif récurent"
        fields={planningFields}
        initialValues={selectedTicket ? (() => {
          const site = sites.find(s => s.id === selectedTicket.site_id);
          return {
            site_id: String(selectedTicket.site_id),
            provider_id: String(selectedTicket.provider_id),
            description: `Maintenance préventive issue du ticket #${selectedTicket.id}`,
          };
        })() : {}}
        onSubmit={handlePlanningSubmit}
        submitLabel="Créer le planning"
      />

      <TicketPreviewModal
        isOpen={previewOpen}
        onClose={() => { setPreviewOpen(false); setPreviewFile(null); }}
        onConfirmImport={handleConfirmedImport}
        file={previewFile}
      />
    </>
  );
}