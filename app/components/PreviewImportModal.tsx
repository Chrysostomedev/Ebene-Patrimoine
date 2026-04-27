"use client";

/**
 * PreviewImportModal
 * ─────────────────────────────────────────────────────────────────────────────
 * Modale centrale de prévisualisation d'import Excel/CSV.
 * Réutilisable pour PATRIMOINES et SITES (et tout autre entité future).
 *
 * Usage - Patrimoines :
 *   <PreviewImportModal
 *     isOpen={previewOpen}
 *     onClose={() => setPreviewOpen(false)}
 *     onConfirmImport={handleConfirmedImport}
 *     file={selectedFile}
 *     mode="patrimoine"
 *   />
 *
 * Usage - Sites :
 *   <PreviewImportModal
 *     isOpen={previewOpen}
 *     onClose={() => setPreviewOpen(false)}
 *     onConfirmImport={handleConfirmedImport}
 *     file={selectedFile}
 *     mode="site"
 *   />
 *
 * Intégration dans PatrimoinesPage :
 *   1. Remplace le <input type="file"> existant par handlePreviewOpen
 *   2. Ajoute le state : const [previewFile, setPreviewFile] = useState<File|null>(null);
 *   3. handlePreviewOpen : setPreviewFile(file); setPreviewOpen(true);
 *   4. handleConfirmedImport : appelle AssetService.importAssets(file)
 *
 * Intégration dans SitesPage :
 *   Même principe avec importSites(file)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  X, CheckCircle2, AlertTriangle, AlertCircle,
  FileSpreadsheet, Upload, ChevronLeft, ChevronRight,
  Eye, Loader2, ShieldCheck,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export type ImportMode = "patrimoine" | "site";

export interface PreviewImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Appelé uniquement si l'utilisateur clique "Confirmer l'import" */
  onConfirmImport: (file: File) => Promise<void>;
  file: File | null;
  mode: ImportMode;
}

type ValidationStatus = "ok" | "warning" | "error";

interface CellValidation {
  status: ValidationStatus;
  message?: string;
}

interface RowValidation {
  rowIndex: number;
  cells: Record<string, CellValidation>;
  /** Statut global de la ligne (worst case) */
  status: ValidationStatus;
}

interface ParsedPreview {
  headers: string[];
  rows: Record<string, any>[];
  validations: RowValidation[];
  summary: {
    total: number;
    valid: number;
    warnings: number;
    errors: number;
  };
}

// ─────────────────────────────────────────────────────────────
// RÈGLES DE VALIDATION PAR MODE
// ─────────────────────────────────────────────────────────────

/**
 * Chaque règle retourne null si OK, ou { status, message } si problème.
 */
type ValidatorFn = (
  value: any,
  row: Record<string, any>
) => { status: "warning" | "error"; message: string } | null;

interface ColumnRule {
  required?: boolean;
  validators?: ValidatorFn[];
}

const PATRIMOINE_RULES: Record<string, ColumnRule> = {
  designation:             { required: true },
  status: {
    required: true,
    validators: [
      (v) => {
        const allowed = ["actif", "inactif", "hors_usage"];
        if (v && !allowed.includes(String(v).toLowerCase().trim())) {
          return { status: "error", message: `Valeur invalide. Attendu : ${allowed.join(", ")}` };
        }
        return null;
      },
    ],
  },
  criticite: {
    validators: [
      (v) => {
        if (!v) return null;
        const allowed = ["critique", "non_critique"];
        if (!allowed.includes(String(v).toLowerCase().trim())) {
          return { status: "warning", message: `Attendu : critique ou non_critique` };
        }
        return null;
      },
    ],
  },
  valeur_entree: {
    validators: [
      (v) => {
        if (!v) return null;
        if (isNaN(Number(v))) return { status: "error", message: "Doit être un nombre" };
        if (Number(v) < 0)    return { status: "warning", message: "Valeur négative" };
        return null;
      },
    ],
  },
  date_entree: {
    validators: [
      (v) => {
        if (!v) return null;
        const d = new Date(v);
        if (isNaN(d.getTime())) return { status: "error", message: "Format de date invalide" };
        return null;
      },
    ],
  },
};

const SITE_RULES: Record<string, ColumnRule> = {
  nom:         { required: true },
  ref_contrat: { required: true },
  status: {
    required: true,
    validators: [
      (v) => {
        const allowed = ["active", "inactive"];
        if (v && !allowed.includes(String(v).toLowerCase().trim())) {
          return { status: "error", message: `Attendu : active ou inactive` };
        }
        return null;
      },
    ],
  },
  email: {
    validators: [
      (v) => {
        if (!v) return null;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v))) {
          return { status: "warning", message: "Format email suspect" };
        }
        return null;
      },
    ],
  },
  loyer: {
    validators: [
      (v) => {
        if (!v) return null;
        if (isNaN(Number(v))) return { status: "error", message: "Doit être un nombre" };
        return null;
      },
    ],
  },
  effectifs: {
    validators: [
      (v) => {
        if (!v) return null;
        if (!Number.isInteger(Number(v)) || Number(v) < 0)
          return { status: "warning", message: "Doit être un entier positif" };
        return null;
      },
    ],
  },
  date_deb_contrat: {
    validators: [
      (v) => {
        if (!v) return null;
        if (isNaN(new Date(v).getTime())) return { status: "error", message: "Date invalide" };
        return null;
      },
    ],
  },
  date_fin_contrat: {
    validators: [
      (v, row) => {
        if (!v) return null;
        if (isNaN(new Date(v).getTime())) return { status: "error", message: "Date invalide" };
        if (row.date_deb_contrat && new Date(v) < new Date(row.date_deb_contrat))
          return { status: "error", message: "Doit être après la date de début" };
        return null;
      },
    ],
  },
};

const RULES_MAP: Record<ImportMode, Record<string, ColumnRule>> = {
  patrimoine: PATRIMOINE_RULES,
  site:       SITE_RULES,
};

// Colonnes à afficher en priorité dans la preview (les autres passent à la fin)
const PRIORITY_COLS: Record<ImportMode, string[]> = {
  patrimoine: ["designation", "status", "criticite", "valeur_entree", "date_entree", "type_company_asset_id", "sub_type_company_asset_id", "site_id"],
  site:       ["nom", "ref_contrat", "status", "email", "loyer", "effectifs", "localisation", "date_deb_contrat", "date_fin_contrat"],
};

// ─────────────────────────────────────────────────────────────
// PARSER + VALIDATEUR
// ─────────────────────────────────────────────────────────────

function parseAndValidate(file: File, mode: ImportMode): Promise<ParsedPreview> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data   = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb     = XLSX.read(data, { type: "array", cellDates: true });
        const ws     = wb.Sheets[wb.SheetNames[0]];
        const raw    = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });

        if (!raw.length) {
          resolve({ headers: [], rows: [], validations: [], summary: { total: 0, valid: 0, warnings: 0, errors: 0 } });
          return;
        }

        // Normalise les clés (lowercase + trim)
        const rows = raw.map((r) =>
          Object.fromEntries(
            Object.entries(r).map(([k, v]) => [k.toLowerCase().trim().replace(/\s+/g, "_"), v])
          )
        );

        // Ordonne les headers : priorité d'abord
        const allKeys    = Object.keys(rows[0]);
        const priority   = PRIORITY_COLS[mode].filter((c) => allKeys.includes(c));
        const rest       = allKeys.filter((c) => !priority.includes(c));
        const headers    = [...priority, ...rest];

        const rules = RULES_MAP[mode];
        const validations: RowValidation[] = rows.map((row, ri) => {
          const cells: Record<string, CellValidation> = {};
          let rowStatus: ValidationStatus = "ok";

          headers.forEach((col) => {
            const rule = rules[col];
            const val  = row[col];

            // Champ requis vide
            if (rule?.required && (val === "" || val == null)) {
              cells[col] = { status: "error", message: "Champ obligatoire manquant" };
              rowStatus  = "error";
              return;
            }

            // Validators
            if (rule?.validators) {
              for (const validator of rule.validators) {
                const result = validator(val, row);
                if (result) {
                  cells[col]  = result;
                  if (result.status === "error") rowStatus = "error";
                  else if (result.status === "warning" && rowStatus !== "error") rowStatus = "warning";
                  return;
                }
              }
            }

            cells[col] = { status: "ok" };
          });

          return { rowIndex: ri, cells, status: rowStatus };
        });

        const summary = {
          total:    rows.length,
          valid:    validations.filter((v) => v.status === "ok").length,
          warnings: validations.filter((v) => v.status === "warning").length,
          errors:   validations.filter((v) => v.status === "error").length,
        };

        resolve({ headers, rows, validations, summary });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// ─────────────────────────────────────────────────────────────
// HELPERS UI
// ─────────────────────────────────────────────────────────────

const fmtCellValue = (v: any): string => {
  if (v == null || v === "") return "-";
  if (v instanceof Date) return v.toLocaleDateString("fr-FR");
  return String(v);
};

const STATUS_CELL: Record<ValidationStatus, string> = {
  ok:      "bg-emerald-50 text-emerald-800 border-emerald-200",
  warning: "bg-amber-50   text-amber-800   border-amber-200",
  error:   "bg-red-50     text-red-700     border-red-200",
};

const STATUS_ROW_BG: Record<ValidationStatus, string> = {
  ok:      "hover:bg-emerald-50/30",
  warning: "bg-amber-50/20  hover:bg-amber-50/40",
  error:   "bg-red-50/20    hover:bg-red-50/40",
};

const STATUS_BADGE: Record<ValidationStatus, { bg: string; text: string; icon: React.ReactNode }> = {
  ok:      { bg: "bg-emerald-100 text-emerald-700", text: "OK",       icon: <CheckCircle2 size={12} /> },
  warning: { bg: "bg-amber-100  text-amber-700",   text: "Attention", icon: <AlertTriangle size={12} /> },
  error:   { bg: "bg-red-100    text-red-600",      text: "Erreur",    icon: <AlertCircle size={12} /> },
};

// ─────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

export default function PreviewImportModal({
  isOpen,
  onClose,
  onConfirmImport,
  file,
  mode,
}: PreviewImportModalProps) {

  const [parsed,    setParsed]    = useState<ParsedPreview | null>(null);
  const [parsing,   setParsing]   = useState(false);
  const [parseError,setParseError]= useState<string | null>(null);
  const [page,      setPage]      = useState(1);
  const [confirming,setConfirming]= useState(false);
  const [filter,    setFilter]    = useState<"all" | ValidationStatus>("all");

  // Parse dès que le fichier ou le mode change
  useEffect(() => {
    if (!isOpen || !file) return;
    setParsed(null);
    setParseError(null);
    setPage(1);
    setParsing(true);

    parseAndValidate(file, mode)
      .then((result) => setParsed(result))
      .catch((err)   => setParseError(err?.message ?? "Erreur de lecture du fichier"))
      .finally(()    => setParsing(false));
  }, [file, mode, isOpen]);

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

  // ── Filtrage des lignes ──
  const allRows    = parsed?.rows       ?? [];
  const allValids  = parsed?.validations ?? [];
  const filteredIdx = filter === "all"
    ? allValids.map((_, i) => i)
    : allValids.filter((v) => v.status === filter).map((v) => v.rowIndex);

  const totalPages  = Math.max(1, Math.ceil(filteredIdx.length / PAGE_SIZE));
  const pageIdxs    = filteredIdx.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hasErrors   = (parsed?.summary.errors   ?? 0) > 0;
  const hasWarnings = (parsed?.summary.warnings  ?? 0) > 0;

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70]"
        onClick={onClose}
      />

      {/* Modale */}
      <div className="fixed inset-4 md:inset-8 xl:inset-12 z-[80] flex flex-col bg-white rounded-3xl shadow-2xl overflow-hidden">

        {/* ── HEADER ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
              <FileSpreadsheet size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 leading-tight">
                Prévisualisation de l'import
              </h2>
              {file && (
                <p className="text-xs text-slate-400 font-mono mt-0.5 truncate max-w-[280px]">
                  {file.name}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition"
          >
            <X size={16} className="text-slate-500" />
          </button>
        </div>

        {/* ── BODY ── */}
        <div className="flex-1 overflow-hidden flex flex-col">

          {/* ÉTAT : PARSING */}
          {parsing && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-400">
              <Loader2 size={32} className="animate-spin text-slate-300" />
              <p className="text-sm font-medium">Analyse du fichier en cours…</p>
            </div>
          )}

          {/* ÉTAT : ERREUR DE PARSE */}
          {!parsing && parseError && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 px-8 text-center">
              <AlertCircle size={36} className="text-red-400" />
              <p className="text-sm font-bold text-red-600">Impossible de lire le fichier</p>
              <p className="text-xs text-slate-400">{parseError}</p>
            </div>
          )}

          {/* ÉTAT : FICHIER VIDE */}
          {!parsing && !parseError && parsed && parsed.rows.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
              <Eye size={32} className="text-slate-200" />
              <p className="text-sm text-slate-400">Le fichier ne contient aucune donnée.</p>
            </div>
          )}

          {/* ÉTAT : DONNÉES OK */}
          {!parsing && !parseError && parsed && parsed.rows.length > 0 && (
            <>
              {/* ── Bande résumé ── */}
              <div className="px-6 py-3 border-b border-slate-100 bg-slate-50 shrink-0">
                <div className="flex items-center justify-between flex-wrap gap-3">

                  {/* Compteurs */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
                      {parsed.summary.total} ligne{parsed.summary.total > 1 ? "s" : ""}
                    </span>

                    {/* Boutons filtre rapide */}
                    {[
                      { key: "all",     label: "Toutes",      count: parsed.summary.total,    color: "bg-slate-100 text-slate-700 hover:bg-slate-200" },
                      { key: "ok",      label: "Valides",     count: parsed.summary.valid,     color: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" },
                      { key: "warning", label: "Avertissements", count: parsed.summary.warnings, color: "bg-amber-50 text-amber-700 hover:bg-amber-100" },
                      { key: "error",   label: "Erreurs",     count: parsed.summary.errors,    color: "bg-red-50 text-red-600 hover:bg-red-100" },
                    ].map((f) => (
                      f.count > 0 || f.key === "all" ? (
                        <button
                          key={f.key}
                          onClick={() => { setFilter(f.key as any); setPage(1); }}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition border ${
                            filter === f.key ? "ring-2 ring-offset-1 ring-slate-400" : ""
                          } ${f.color} border-transparent`}
                        >
                          {f.label}
                          <span className="font-black">{f.count}</span>
                        </button>
                      ) : null
                    ))}
                  </div>

                  {/* Badge compatibilité global */}
                  {hasErrors ? (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-1 rounded-lg">
                      <AlertCircle size={12} />
                      {parsed.summary.errors} ligne{parsed.summary.errors > 1 ? "s" : ""} bloquante{parsed.summary.errors > 1 ? "s" : ""}
                    </span>
                  ) : hasWarnings ? (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-lg">
                      <AlertTriangle size={12} />
                      Importable avec avertissements
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
                      <ShieldCheck size={12} />
                      Fichier compatible - prêt à importer
                    </span>
                  )}
                </div>
              </div>

              {/* ── Tableau ── */}
              <div className="flex-1 overflow-auto">
                <table className="min-w-full text-xs border-separate border-spacing-0">
                  <thead className="sticky top-0 z-10 bg-white">
                    <tr>
                      {/* N° ligne */}
                      <th className="px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest whitespace-nowrap border-b border-slate-100 bg-slate-50 w-10">
                        #
                      </th>
                      {/* Statut ligne */}
                      <th className="px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest whitespace-nowrap border-b border-slate-100 bg-slate-50">
                        État
                      </th>
                      {/* Colonnes données */}
                      {parsed.headers.map((h) => (
                        <th
                          key={h}
                          className="px-3 py-3 text-left font-black text-slate-500 uppercase tracking-widest whitespace-nowrap border-b border-slate-100 bg-slate-50"
                        >
                          {h}
                          {RULES_MAP[mode][h]?.required && (
                            <span className="ml-0.5 text-red-400">*</span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageIdxs.length === 0 ? (
                      <tr>
                        <td
                          colSpan={parsed.headers.length + 2}
                          className="text-center text-slate-400 py-12 italic"
                        >
                          Aucune ligne pour ce filtre.
                        </td>
                      </tr>
                    ) : (
                      pageIdxs.map((ri) => {
                        const row       = allRows[ri];
                        const validation = allValids[ri];
                        return (
                          <tr
                            key={ri}
                            className={`border-b border-slate-50 transition ${STATUS_ROW_BG[validation.status]}`}
                          >
                            {/* N° */}
                            <td className="px-3 py-2.5 text-slate-300 font-mono font-bold">
                              {ri + 1}
                            </td>

                            {/* Badge statut ligne */}
                            <td className="px-3 py-2.5">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg font-bold text-[10px] ${STATUS_BADGE[validation.status].bg}`}
                              >
                                {STATUS_BADGE[validation.status].icon}
                                {STATUS_BADGE[validation.status].text}
                              </span>
                            </td>

                            {/* Cellules */}
                            {parsed.headers.map((col) => {
                              const cell   = validation.cells[col];
                              const val    = row[col];
                              const cellSt = cell?.status ?? "ok";

                              return (
                                <td key={col} className="px-2 py-2">
                                  <div className="relative group">
                                    <div
                                      className={`inline-flex items-center px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold max-w-[180px] truncate ${STATUS_CELL[cellSt]}`}
                                      title={fmtCellValue(val)}
                                    >
                                      {cellSt !== "ok" && (
                                        <span className="mr-1.5 shrink-0">
                                          {cellSt === "error"
                                            ? <AlertCircle size={10} className="text-red-500" />
                                            : <AlertTriangle size={10} className="text-amber-500" />
                                          }
                                        </span>
                                      )}
                                      {cellSt === "ok" && val !== "" && val != null && (
                                        <span className="mr-1.5 shrink-0">
                                          <CheckCircle2 size={10} className="text-emerald-500" />
                                        </span>
                                      )}
                                      <span className="truncate">{fmtCellValue(val)}</span>
                                    </div>

                                    {/* Tooltip message d'erreur */}
                                    {cell?.message && (
                                      <div className="absolute bottom-full left-0 mb-1.5 z-20 hidden group-hover:block">
                                        <div className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold shadow-lg whitespace-nowrap ${
                                          cellSt === "error"
                                            ? "bg-red-600 text-white"
                                            : "bg-amber-500 text-white"
                                        }`}>
                                          {cell.message}
                                          {/* Flèche */}
                                          <div className={`absolute top-full left-3 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent ${
                                            cellSt === "error" ? "border-t-red-600" : "border-t-amber-500"
                                          }`} />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* ── Pagination interne ── */}
              {totalPages > 1 && (
                <div className="px-6 py-3 border-t border-slate-100 bg-white shrink-0 flex items-center justify-between">
                  <p className="text-xs text-slate-400">
                    Page {page}/{totalPages} · {filteredIdx.length} ligne{filteredIdx.length > 1 ? "s" : ""}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-1.5 rounded-lg hover:bg-slate-100 transition disabled:opacity-30"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                      const pg = i + 1;
                      return (
                        <button
                          key={pg}
                          onClick={() => setPage(pg)}
                          className={`w-7 h-7 rounded-lg text-xs font-bold transition ${
                            pg === page
                              ? "bg-slate-900 text-white"
                              : "text-slate-500 hover:bg-slate-100"
                          }`}
                        >
                          {pg}
                        </button>
                      );
                    })}
                    {totalPages > 7 && <span className="text-xs text-slate-300 px-1">…</span>}
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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

        {/* ── FOOTER ── */}
        <div className="px-6 py-4 border-t border-slate-100 shrink-0 flex items-center justify-between gap-4 bg-white">

          {/* Légende */}
          <div className="flex items-center gap-4 text-[11px] text-slate-400 font-medium">
            <span className="flex items-center gap-1">
              <CheckCircle2 size={11} className="text-emerald-500" /> Compatible
            </span>
            <span className="flex items-center gap-1">
              <AlertTriangle size={11} className="text-amber-500" /> Avertissement
            </span>
            <span className="flex items-center gap-1">
              <AlertCircle size={11} className="text-red-500" /> Bloquant
            </span>
          </div>

          {/* Boutons action */}
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition"
            >
              Annuler
            </button>

            <button
              onClick={handleConfirm}
              disabled={confirming || parsing || !!parseError || !parsed || parsed.rows.length === 0 || hasErrors}
              title={hasErrors ? "Corrigez les erreurs avant d'importer" : undefined}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-sm ${
                hasErrors
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                  : "bg-slate-900 text-white hover:bg-black"
              }`}
            >
              {confirming
                ? <Loader2 size={14} className="animate-spin" />
                : <Upload size={14} />
              }
              {confirming ? "Import en cours…" : hasErrors ? "Import bloqué - erreurs à corriger" : "Confirmer l'import"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}