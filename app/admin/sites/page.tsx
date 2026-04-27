"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import {
    Filter, Download, Upload, Globe, X,
    CheckCircle2, AlertTriangle, AlertCircle,
    FileSpreadsheet, ChevronLeft, ChevronRight,
    Eye, Loader2, ShieldCheck,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import SiteCard from "@/components/SiteCard";
import StatsCard from "@/components/StatsCard";
import Paginate from "@/components/Paginate";
import { useToast } from "@/contexts/ToastContext";
import ReusableForm from "@/components/ReusableForm";
import PageHeader from "@/components/PageHeader";
import SearchInput from "@/components/SearchInput";
import { FieldConfig } from "@/components/ReusableForm";

import { useSites } from "../../../hooks/admin/useSites";
import { useLanguage } from "../../../contexts/LanguageContext";
import {
    exportSites,
    importSites,
    downloadSiteImportTemplate,
    resolveManagerName,
} from "../../../services/admin/site.service";
import { formatDate, formatCurrency } from "@/lib/utils";

// ══════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════

const formatMontant = (v: number | null | undefined): string => {
    if (!v) return "0";
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v % 1_000_000 !== 0 ? 1 : 0)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(v % 1_000 !== 0 ? 1 : 0)}K`;
    return String(v);
};

// ══════════════════════════════════════════════
// FILTER DROPDOWN
// ══════════════════════════════════════════════

interface SiteFiltersState { status?: string; }

function SiteFilterDropdown({
    isOpen, onClose, filters, onApply,
}: {
    isOpen: boolean;
    onClose: () => void;
    filters: SiteFiltersState;
    onApply: (f: SiteFiltersState) => void;
}) {
    const [local, setLocal] = useState<SiteFiltersState>(filters);
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
                        { val: "", label: "Tous les sites" },
                        { val: "active", label: "Actif" },
                        { val: "inactive", label: "Inactif" },
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

// ══════════════════════════════════════════════
// PREVIEW IMPORT MODAL - SITE
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

const SITE_RULES: Record<string, ColumnRule> = {
    nom: { required: true },
    status: {
        required: true,
        validators: [(v) => {
            const allowed = ["active", "inactive"];
            if (v && !allowed.includes(String(v).toLowerCase().trim()))
                return { status: "error", message: "Attendu : active ou inactive" };
            return null;
        }],
    },
    email: {
        validators: [(v) => {
            if (!v) return null;
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v)))
                return { status: "warning", message: "Format email suspect" };
            return null;
        }],
    },
    loyer: {
        validators: [(v) => {
            if (!v) return null;
            if (isNaN(Number(v))) return { status: "error", message: "Doit être un nombre" };
            return null;
        }],
    },
    effectifs: {
        validators: [(v) => {
            if (!v) return null;
            if (!Number.isInteger(Number(v)) || Number(v) < 0)
                return { status: "warning", message: "Doit être un entier positif" };
            return null;
        }],
    },
    date_deb_contrat: {
        validators: [(v) => {
            if (!v) return null;
            if (isNaN(new Date(v).getTime())) return { status: "error", message: "Date invalide" };
            return null;
        }],
    },
    date_fin_contrat: {
        validators: [(v, row) => {
            if (!v) return null;
            if (isNaN(new Date(v).getTime())) return { status: "error", message: "Date invalide" };
            if (row.date_deb_contrat && new Date(v) < new Date(row.date_deb_contrat))
                return { status: "error", message: "Doit être après la date de début" };
            return null;
        }],
    },
};

const SITE_KNOWN_COLS = new Set([
    "nom", "ref_contrat", "status", "email", "loyer", "effectifs",
    "superficie", "localisation", "date_deb_contrat", "date_fin_contrat",
    "manager_id", "responsable_name", "phone_responsable",
]);
const SITE_REQUIRED_COLS = ["nom", "status"];
const PRIORITY_SITE = [
    "nom", "ref_contrat", "status", "email", "loyer",
    "effectifs", "localisation", "date_deb_contrat", "date_fin_contrat",
];

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

function parseSite(file: File): Promise<ParsedPreview> {
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
                    Object.fromEntries(
                        Object.entries(r).map(([k, v]) => [k.toLowerCase().trim().replace(/\s+/g, "_"), v])
                    )
                );

                const fileKeys = Object.keys(rows[0]);

                const missingRequired = SITE_REQUIRED_COLS.filter(c => !fileKeys.includes(c));
                const knownColsInFile = fileKeys.filter(c => SITE_KNOWN_COLS.has(c));

                const priority = PRIORITY_SITE.filter(c => fileKeys.includes(c));
                const rest = fileKeys.filter(c => !priority.includes(c));
                const missingHeaders = missingRequired.filter(c => !fileKeys.includes(c));
                const headers = [...missingHeaders, ...priority, ...rest];

                const validations: RowValidation[] = rows.map((row, ri) => {
                    const cells: Record<string, CellValidation> = {};
                    let rowStatus: ValidationStatus = "ok";

                    headers.forEach(col => {
                        if (missingRequired.includes(col) && !fileKeys.includes(col)) {
                            cells[col] = { status: "error", message: `Colonne "${col}" absente du fichier - obligatoire` };
                            rowStatus = "error";
                            return;
                        }

                        if (!SITE_KNOWN_COLS.has(col)) {
                            cells[col] = { status: "warning", message: "Colonne inconnue - ignorée à l'import" };
                            if (rowStatus !== "error") rowStatus = "warning";
                            return;
                        }

                        const rule = SITE_RULES[col];
                        const val = row[col];

                        if (rule?.required && (val === "" || val == null)) {
                            cells[col] = { status: "error", message: "Champ obligatoire manquant" };
                            rowStatus = "error";
                            return;
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

const PREVIEW_PAGE = 10;

function SitePreviewModal({
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
        setParsed(null);
        setParseErr(null);
        setPage(1);
        setFilter("all");
        setParsing(true);
        parseSite(file)
            .then(setParsed)
            .catch(e => setParseErr(e?.message ?? "Erreur"))
            .finally(() => setParsing(false));
    }, [file, isOpen]);

    const handleConfirm = useCallback(async () => {
        if (!file || confirming) return;
        setConfirming(true);
        try {
            await onConfirmImport(file);
            onClose();
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

    const fileKeys = parsed && parsed.rows.length > 0 ? Object.keys(parsed.rows[0]) : [];
    const missingRequired = SITE_REQUIRED_COLS.filter(c => !fileKeys.includes(c));
    const unknownCols = fileKeys.filter(c => !SITE_KNOWN_COLS.has(c));
    const knownInFile = fileKeys.filter(c => SITE_KNOWN_COLS.has(c));
    const totallyIncompat = parsed
        ? (knownInFile.length === 0 || missingRequired.length === SITE_REQUIRED_COLS.length)
        : false;

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
                            <h2 className="text-base font-black text-slate-900 leading-tight">Prévisualisation - Import Sites</h2>
                            {file && (
                                <p className="text-xs text-slate-400 font-mono mt-0.5 truncate max-w-[320px]">{file.name}</p>
                            )}
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
                                            <button
                                                key={f.key}
                                                onClick={() => { setFilter(f.key as any); setPage(1); }}
                                                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition border border-transparent ${f.color} ${filter === f.key ? "ring-2 ring-offset-1 ring-slate-400" : ""}`}
                                            >
                                                {f.label} <span className="font-black">{f.count}</span>
                                            </button>
                                        ) : null)}
                                    </div>

                                    {totallyIncompat ? (
                                        <div className="flex flex-col gap-1">
                                            <span className="flex items-center gap-1.5 text-xs font-bold text-red-700 bg-red-50 border border-red-300 px-3 py-1.5 rounded-lg">
                                                <AlertCircle size={12} /> Fichier incompatible - ce n'est pas un fichier Sites
                                            </span>
                                            {missingRequired.length > 0 && (
                                                <span className="text-[10px] text-red-500 font-semibold pl-1">
                                                    Colonnes obligatoires manquantes : {missingRequired.join(", ")}
                                                </span>
                                            )}
                                            {unknownCols.length > 0 && (
                                                <span className="text-[10px] text-amber-600 font-semibold pl-1">
                                                    Colonnes inconnues ({unknownCols.length}) : {unknownCols.slice(0, 4).join(", ")}
                                                    {unknownCols.length > 4 ? `… +${unknownCols.length - 4}` : ""}
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
                                                    {unknownCols.length} colonne{unknownCols.length > 1 ? "s" : ""} inconnue{unknownCols.length > 1 ? "s" : ""} (ignorée{unknownCols.length > 1 ? "s" : ""}) : {unknownCols.slice(0, 3).join(", ")}{unknownCols.length > 3 ? "…" : ""}
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
                                                    {h}{SITE_RULES[h]?.required && <span className="ml-0.5 text-red-400">*</span>}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pageIdxs.length === 0 ? (
                                            <tr>
                                                <td colSpan={parsed.headers.length + 2} className="text-center text-slate-400 py-12 italic">
                                                    Aucune ligne pour ce filtre.
                                                </td>
                                            </tr>
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
                                                                    <div
                                                                        className={`inline-flex items-center px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold max-w-[180px] truncate ${CELL_STYLE[cSt]}`}
                                                                        title={fmtCell(val)}
                                                                    >
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
                                    <p className="text-xs text-slate-400">
                                        Page {page}/{totalPages} · {filteredIdx.length} ligne{filteredIdx.length > 1 ? "s" : ""}
                                    </p>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                            className="p-1.5 rounded-lg hover:bg-slate-100 transition disabled:opacity-30"
                                        >
                                            <ChevronLeft size={14} />
                                        </button>
                                        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(pg => (
                                            <button
                                                key={pg}
                                                onClick={() => setPage(pg)}
                                                className={`w-7 h-7 rounded-lg text-xs font-bold transition ${pg === page ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"}`}
                                            >
                                                {pg}
                                            </button>
                                        ))}
                                        {totalPages > 7 && <span className="text-xs text-slate-300 px-1">…</span>}
                                        <button
                                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                            disabled={page === totalPages}
                                            className="p-1.5 rounded-lg hover:bg-slate-100 transition disabled:opacity-30"
                                        >
                                            <ChevronRight size={14} />
                                        </button>
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
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={confirming || parsing || !!parseErr || !parsed || parsed.rows.length === 0 || hasErrors}
                            title={hasErrors ? "Corrigez les erreurs avant d'importer" : undefined}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-sm ${hasErrors
                                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                                : "bg-slate-900 text-white hover:bg-black"
                                }`}
                        >
                            {confirming ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                            {confirming
                                ? "Import en cours…"
                                : hasErrors
                                    ? "Import bloqué - erreurs à corriger"
                                    : "Confirmer l'import"}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

// ══════════════════════════════════════════════
// PAGE PRINCIPALE
// ══════════════════════════════════════════════

export default function SitesPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [filters, setFilters] = useState<SiteFiltersState>({});
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [importLoading, setImportLoading] = useState(false);
    const [exportLoading, setExportLoading] = useState(false);
    const { toast } = useToast();

    // ── Preview import states ──
    const [previewFile, setPreviewFile] = useState<File | null>(null);
    const [previewOpen, setPreviewOpen] = useState(false);

    // ── Form values pour auto-fill manager ──
    const [siteFormValues, setSiteFormValues] = useState<Record<string, any>>({});

    const filterRef = useRef<HTMLDivElement>(null);

    const {
        sites, stats, managers, managersLoading, loading,
        page, totalPages, totalItems, setPage,
        fetchSites, fetchStats, fetchManagers, addSite,
    } = useSites();

    // ── Close filter dropdown on outside click ──
    useEffect(() => {
        const h = (e: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(e.target as Node))
                setFiltersOpen(false);
        };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);

    // ── Fetch on search change ──
    useEffect(() => {
        setPage(1);
        fetchSites(search, filters.status, 1);
    }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Initial fetch stats + managers ──
    useEffect(() => {
        fetchStats();
        fetchManagers();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps


    const handleApplyFilters = (f: SiteFiltersState) => {
        setFilters(f);
        setPage(1);
        fetchSites(search, f.status, 1);
    };

    const activeCount = [filters.status].filter(Boolean).length;

    // ── Création d'un site ──
    const handleFormSubmit = async (formData: any) => {
        try {
            const payload: any = {};

            // Champs requis
            if (formData.nom?.trim()) payload.nom = formData.nom.trim();
            if (formData.status) payload.status = formData.status;

            // Champs string nullable — n'envoyer que si non vide
            const strFields = ["responsable_name", "phone_responsable", "ville", "localisation", "ref_contrat"];
            for (const f of strFields) {
                const v = formData[f]?.toString().trim();
                if (v) payload[f] = v;
            }

            // superficie — le backend requiert une string
            if (formData.superficie?.toString().trim()) {
                payload.superficie = formData.superficie.toString().trim();
            }

            // Champs numériques
            if (formData.effectifs?.toString().trim()) {
                const n = parseInt(formData.effectifs, 10);
                if (!isNaN(n) && n >= 0) payload.effectifs = n;
            }
            if (formData.loyer?.toString().trim()) {
                const n = parseFloat(formData.loyer);
                if (!isNaN(n) && n >= 0) payload.loyer = n;
            }

            // Dates
            if (formData.date_deb_contrat?.trim()) payload.date_deb_contrat = formData.date_deb_contrat.trim();
            if (formData.date_fin_contrat?.trim()) payload.date_fin_contrat = formData.date_fin_contrat.trim();

            // manager_id nullable
            if (formData.manager_id) payload.manager_id = Number(formData.manager_id);

            await addSite(payload);
            setIsModalOpen(false);
            setSiteFormValues({});
            fetchSites(search, filters.status);
            toast.success("Site créé avec succès.");
        } catch (err: any) {
            const apiErrors = err?.response?.data?.errors;
            let msg = "Erreur lors de la sauvegarde.";

            if (apiErrors) {
                msg = Object.values(apiErrors)
                    .flat()
                    .map(e => {
                        const s = String(e);
                        if (s.includes("The selected manager id is invalid")) return "Le gestionnaire sélectionné n'existe pas ou est invalide.";
                        if (s.includes("superficie field must be a string")) return "La superficie doit être un texte valide.";
                        if (s.includes("has already been taken")) return "Cette information ou référence existe déjà et doit être unique.";
                        if (s.includes("The format is invalid")) return "Le format est invalide.";
                        return s;
                    })
                    .join(" | ");
            } else if (err?.response?.data?.message) {
                msg = err.response.data.message;
            }
            toast.error(msg);
        }
    };

    // ── Export ──
    const handleExport = async () => {
        if (exportLoading) return;
        setExportLoading(true);
        try {
            const response = await exportSites(filters.status ? { status: filters.status } : {});
            const blob = new Blob([response.data], {
                type: response.headers["content-type"] ??
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            const cd = (response.headers["content-disposition"] as string) ?? "";
            const m = cd.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            link.download = m?.[1]?.replace(/['"]/g, "") ??
                `sites_${new Date().toISOString().slice(0, 10)}.xlsx`;
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

    // ── Intercepte la sélection de fichier → ouvre la preview ──
    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = "";
        setPreviewFile(file);
        setPreviewOpen(true);
    };

    // ── Appelé par la modale preview après confirmation ──
    const handleConfirmedImport = async (file: File) => {
        setImportLoading(true);
        try {
            await importSites(file);
            await fetchSites(search);
            toast.success(`"${file.name}" importé avec succès.`);
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? "Erreur lors de l'import.");
        } finally {
            setImportLoading(false);
        }
    };

    // ── Auto-fill responsable_name + phone_responsable quand manager sélectionné ──
    const handleManagerFieldChange = useCallback((name: string, value: any) => {
        if (name === "manager_id" && value) {
            const manager = managers.find(m => String(m.id) === String(value));
            if (manager) {
                const fullName = resolveManagerName(manager);
                const phone = (manager as any).phone_number ?? (manager as any).phone ?? "";
                setSiteFormValues(prev => ({
                    ...prev,
                    manager_id: value,
                    responsable_name: fullName !== "—" ? fullName : prev.responsable_name,
                    phone_responsable: phone || prev.phone_responsable,
                }));
                return;
            }
        }
        setSiteFormValues(prev => ({ ...prev, [name]: value }));
    }, [managers]);

    // ── Fields config ──
    const siteFields: FieldConfig[] = [
        { name: "nom", label: "Nom du site", type: "text", required: true, placeholder: "CANAL COCODY" },
        {
            name: "manager_id",
            label: managersLoading ? "Gestionnaire (chargement...)" : "Gestionnaire",
            type: "select",
            disabled: managersLoading,
            options: managers.map(m => ({
                label: resolveManagerName(m) || `Manager ${m.id}`,
                value: String(m.id),
            })),
        },
        {
            name: "status",
            label: "Statut",
            type: "select",
            required: true,
            options: [
                { label: "Actif", value: "active" },
                { label: "Inactif", value: "inactive" },
            ],
        },
        { name: "responsable_name", label: "Nom du responsable", type: "text" },
        { name: "phone_responsable", label: "Tél. responsable", type: "tel", placeholder: "+225 07 00 00 00" },
        { name: "effectifs", label: "Effectifs", type: "number", placeholder: "22" },
        { name: "loyer", label: "Loyer mensuel (FCFA)", type: "number", placeholder: "22500" },
        { name: "superficie", label: "Superficie (m²)", type: "number", placeholder: "250" },
        { name: "ville", label: "Ville", type: "text", placeholder: "Bouaké......" },
        { name: "localisation", label: "Localisation", type: "text", placeholder: "Abidjan......" },
        { name: "ref_contrat", label: "Référence contrat", type: "text", placeholder: "CONT-01-CAN" },
        { name: "date_deb_contrat", label: "Date début contrat", type: "date" },
        { name: "date_fin_contrat", label: "Date fin contrat", type: "date" },
    ];

    // ── KPIs ──
    const ticketsEnCours = stats?.tickets_par_site?.reduce(
        (acc: number, s: any) => acc + (s.tickets_en_cours ?? 0), 0
    ) ?? 0;
    const ticketsClos = stats?.tickets_par_site?.reduce(
        (acc: number, s: any) => acc + (s.tickets_clos ?? 0), 0
    ) ?? 0;

    const kpis1 = [
        { label: "Sites actifs", value: stats?.nombre_sites_actifs ?? 0, delta: "+0%", trend: "up" as const },
        { label: "Sites inactifs", value: stats?.nombre_sites_inactifs ?? 0, delta: "+0%", trend: "down" as const },
        { label: "Délai moyen / site", value: "1 semaine", delta: "+0%", trend: "up" as const },
        { label: "Total sites", value: stats?.nombre_total_sites ?? 0, delta: "+0%", trend: "up" as const },
    ];
    const kpis2 = [
        {
            label: "Coût moyen / site",
            value: formatCurrency(stats?.cout_loyer_moyen_par_site),
            delta: "+0%", trend: "up" as const,
        },
        { label: "Tickets en cours", value: ticketsEnCours, delta: "+0%", trend: "up" as const },
        { label: "Tickets clôturés", value: ticketsClos, delta: "+0%", trend: "up" as const },
        { label: "Site le plus visité", value: stats?.site_le_plus_visite?.nom ?? "-", delta: "", trend: "up" as const },
    ];

    return (
        <>
            <div className="flex flex-col flex-1 overflow-hidden">
                <Navbar />

                <main className="mt-20 p-6 space-y-8 overflow-y-auto h-[calc(100vh-80px)]">

                    <PageHeader title="Sites" subtitle="Suivi et gestion de tous les sites" />


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

                        {/* Filtres actifs */}
                        <div className="flex items-center gap-2 flex-wrap min-h-[36px]">
                            {activeCount === 0 && (
                                <p className="text-xs text-slate-400 font-medium">Aucun filtre actif</p>
                            )}
                            {filters.status && (
                                <span className="flex items-center gap-1.5 bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded-full">
                                    {filters.status === "active" ? "Actif" : "Inactif"}
                                    <button
                                        onClick={() => handleApplyFilters({ ...filters, status: undefined })}
                                        className="hover:opacity-70"
                                    >
                                        <X size={11} />
                                    </button>
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-3 shrink-0">

                            {/* Importer */}
                            <label className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-bold cursor-pointer hover:bg-slate-50 transition ${importLoading ? "opacity-60 cursor-wait" : ""}`}>
                                {importLoading
                                    ? <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
                                    : <Download size={16} />}
                                Importer
                                <input
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    className="hidden"
                                    disabled={importLoading}
                                    onChange={handleImport}
                                />
                            </label>

                            {/* Exporter */}
                            <button
                                onClick={handleExport}
                                disabled={exportLoading}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-bold hover:bg-slate-50 transition disabled:opacity-60 disabled:cursor-wait"
                            >
                                {exportLoading
                                    ? <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
                                    : <Upload size={16} />}
                                Exporter
                            </button>

                            {/* Filtrer */}
                            <div className="relative" ref={filterRef}>
                                <button
                                    onClick={() => setFiltersOpen(!filtersOpen)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition ${filtersOpen || activeCount > 0
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
                                disabled={managersLoading}
                                title={managersLoading ? "Chargement des gestionnaires..." : undefined}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition shadow-sm disabled:opacity-60 disabled:cursor-wait"
                            >
                                {managersLoading
                                    ? <span className="w-4 h-4 border-2 border-slate-600 border-t-white rounded-full animate-spin" />
                                    : <Globe size={16} />}
                                Ajouter un site
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

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                            {loading ? (
                                <div className="col-span-full py-16 text-center">
                                    <span className="inline-block w-6 h-6 border-2 border-slate-200 border-t-slate-700 rounded-full animate-spin mb-3" />
                                    <p className="text-slate-400 text-sm">Chargement des sites...</p>
                                </div>
                            ) : sites.length > 0 ? (
                                sites.map(site => <SiteCard key={site.id} site={site} />)
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
                            <Paginate currentPage={page} totalPages={totalPages} onPageChange={p => setPage(p)} />
                        </div>
                    </div>

                </main>
            </div>

            {/* Formulaire création site */}
            <ReusableForm
                key={siteFormValues.id ? `site-${siteFormValues.id}-${siteFormValues.manager_id || ""}` : `site-new-${siteFormValues.manager_id || ""}`}
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setSiteFormValues({}); }}
                title="Ajouter un site"
                subtitle="Créez un nouveau site avec ses informations"
                fields={siteFields}
                onSubmit={(data) => { handleFormSubmit(data); setSiteFormValues({}); }}
                submitLabel="Créer le site"
                initialValues={siteFormValues}
                onFieldChange={handleManagerFieldChange}
            />

            {/* ── Modale prévisualisation import ── */}
            <SitePreviewModal
                isOpen={previewOpen}
                onClose={() => { setPreviewOpen(false); setPreviewFile(null); }}
                onConfirmImport={handleConfirmedImport}
                file={previewFile}
            />
        </>
    );
}