"use client";

/**
 * UniversalImportPreview
 * ─────────────────────────────────────────────────────────────────────────────
 * Composant de prévisualisation d'import Excel/CSV réutilisable.
 *
 * Fonctionnalités :
 *  - Lecture du fichier côté client (XLSX)
 *  - Validation des colonnes requises
 *  - Détection des doublons (via dedupeKey)
 *  - Édition des cellules dans le tableau
 *  - Import permissif : skip les doublons, envoie les nouvelles lignes
 *  - Affichage du résultat (importées / skippées / erreurs)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  X, FileSpreadsheet, Upload, Loader2, CheckCircle2,
  AlertTriangle, AlertCircle, ShieldCheck, ChevronLeft, ChevronRight,
  Pencil, Check,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ColumnDef {
  /** Clé dans le fichier Excel (heading normalisé) */
  key: string;
  /** Label affiché dans le tableau */
  label: string;
  /** Champ obligatoire */
  required?: boolean;
  /** Valeur par défaut si absente */
  defaultValue?: string;
}

export interface ImportResult {
  imported: number;
  skipped:  number;
  errors:   { row: number; message: string }[];
}

interface Props {
  isOpen:       boolean;
  onClose:      () => void;
  file:         File | null;
  /** Définition des colonnes attendues */
  columns:      ColumnDef[];
  /**
   * Clé(s) de déduplication — si une ligne a la même valeur sur ces colonnes
   * qu'une ligne existante, elle est marquée "doublon".
   * Peut être une string (clé unique) ou un tableau (clé composite).
   */
  dedupeKey:    string | string[];
  /** Données existantes pour détecter les doublons côté front */
  existingData?: Record<string, any>[];
  /** Appelé avec les lignes nouvelles (non-doublons) à envoyer au back */
  onConfirm:    (rows: Record<string, any>[]) => Promise<ImportResult | void>;
  /** Titre de la modale */
  title?:       string;
}

type RowStatus = "new" | "duplicate" | "error";

interface ParsedRow {
  data:    Record<string, any>;
  status:  RowStatus;
  message: string;
}

const PAGE_SIZE = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeKey(k: string): string {
  return k.toLowerCase().trim().replace(/\s+/g, "_");
}

function getDedupeValue(row: Record<string, any>, key: string | string[]): string {
  if (Array.isArray(key)) return key.map(k => String(row[k] ?? "")).join("|");
  return String(row[key] ?? "");
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function UniversalImportPreview({
  isOpen, onClose, file, columns, dedupeKey, existingData = [], onConfirm, title = "Prévisualisation de l'import",
}: Props) {
  const [rows,       setRows]       = useState<ParsedRow[]>([]);
  const [parsing,    setParsing]    = useState(false);
  const [parseErr,   setParseErr]   = useState<string | null>(null);
  const [page,       setPage]       = useState(1);
  const [filter,     setFilter]     = useState<"all" | RowStatus>("all");
  const [confirming, setConfirming] = useState(false);
  const [result,     setResult]     = useState<ImportResult | null>(null);
  // Édition inline
  const [editCell,   setEditCell]   = useState<{ rowIdx: number; col: string } | null>(null);
  const [editValue,  setEditValue]  = useState("");

  // ── Parse le fichier ────────────────────────────────────────────────────────
  const parseFile = useCallback(async (f: File) => {
    setParsing(true);
    setParseErr(null);
    setRows([]);
    setResult(null);
    setPage(1);
    setFilter("all");

    try {
      const buf  = await f.arrayBuffer();
      const wb   = XLSX.read(buf, { type: "array", cellDates: true });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const raw  = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });

      if (!raw.length) {
        setParseErr("Le fichier ne contient aucune donnée.");
        return;
      }

      // Normalise les clés
      const normalized = raw.map(r =>
        Object.fromEntries(Object.entries(r).map(([k, v]) => [normalizeKey(k), v]))
      );

      // Construit le set des valeurs existantes pour déduplication
      const existingSet = new Set(existingData.map(e => getDedupeValue(e, dedupeKey)));

      const parsed: ParsedRow[] = normalized.map((row) => {
        // Vérification colonnes requises
        const missing = columns.filter(c => c.required && (row[c.key] === "" || row[c.key] == null));
        if (missing.length > 0) {
          return { data: row, status: "error", message: `Champs manquants : ${missing.map(c => c.label).join(", ")}` };
        }

        // Appliquer les valeurs par défaut
        const enriched = { ...row };
        columns.forEach(c => {
          if ((enriched[c.key] === "" || enriched[c.key] == null) && c.defaultValue !== undefined) {
            enriched[c.key] = c.defaultValue;
          }
        });

        // Déduplication
        const val = getDedupeValue(enriched, dedupeKey);
        if (existingSet.has(val)) {
          return { data: enriched, status: "duplicate", message: "Doublon détecté — sera ignoré" };
        }

        return { data: enriched, status: "new", message: "" };
      });

      setRows(parsed);
    } catch (e: any) {
      setParseErr(e?.message ?? "Erreur lors de la lecture du fichier.");
    } finally {
      setParsing(false);
    }
  }, [columns, dedupeKey, existingData]);

  useEffect(() => {
    if (isOpen && file) parseFile(file);
  }, [isOpen, file, parseFile]);

  // ── Édition inline ──────────────────────────────────────────────────────────
  const startEdit = (rowIdx: number, col: string, val: any) => {
    setEditCell({ rowIdx, col });
    setEditValue(String(val ?? ""));
  };

  const commitEdit = () => {
    if (!editCell) return;
    setRows(prev => prev.map((r, i) => {
      if (i !== editCell.rowIdx) return r;
      const newData = { ...r.data, [editCell.col]: editValue };
      // Re-valider la ligne après édition
      const missing = columns.filter(c => c.required && (newData[c.key] === "" || newData[c.key] == null));
      const existingSet = new Set(existingData.map(e => getDedupeValue(e, dedupeKey)));
      const val = getDedupeValue(newData, dedupeKey);
      let status: RowStatus = "new";
      let message = "";
      if (missing.length > 0) { status = "error"; message = `Champs manquants : ${missing.map(c => c.label).join(", ")}`; }
      else if (existingSet.has(val)) { status = "duplicate"; message = "Doublon détecté — sera ignoré"; }
      return { data: newData, status, message };
    }));
    setEditCell(null);
  };

  // ── Confirm import ──────────────────────────────────────────────────────────
  const handleConfirm = async () => {
    const newRows = rows.filter(r => r.status === "new").map(r => r.data);
    if (newRows.length === 0) return;
    setConfirming(true);
    try {
      const res = await onConfirm(newRows);
      setResult(res ?? {
        imported: newRows.length,
        skipped:  rows.filter(r => r.status === "duplicate").length,
        errors:   [],
      });
    } catch (e: any) {
      setResult({ imported: 0, skipped: 0, errors: [{ row: 0, message: e?.response?.data?.message ?? e?.message ?? "Erreur serveur" }] });
    } finally {
      setConfirming(false);
    }
  };

  if (!isOpen) return null;

  // ── Stats ───────────────────────────────────────────────────────────────────
  const newCount  = rows.filter(r => r.status === "new").length;
  const dupCount  = rows.filter(r => r.status === "duplicate").length;
  const errCount  = rows.filter(r => r.status === "error").length;

  const filtered  = filter === "all" ? rows : rows.filter(r => r.status === filter);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const STATUS_STYLE: Record<RowStatus, string> = {
    new:       "bg-emerald-50 text-emerald-700 border-emerald-200",
    duplicate: "bg-amber-50 text-amber-700 border-amber-200",
    error:     "bg-red-50 text-red-700 border-red-200",
  };
  const STATUS_LABEL: Record<RowStatus, string> = {
    new:       "Nouvelle",
    duplicate: "Doublon",
    error:     "Erreur",
  };

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
              <h2 className="text-base font-black text-slate-900">{title}</h2>
              {file && <p className="text-xs text-slate-400 font-mono mt-0.5 truncate max-w-[320px]">{file.name}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition">
            <X size={16} className="text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col">

          {/* Résultat final */}
          {result && (
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="flex items-center gap-1.5 text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                  <CheckCircle2 size={14} /> {result.imported} importée{result.imported > 1 ? "s" : ""}
                </span>
                <span className="flex items-center gap-1.5 text-sm font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
                  <AlertTriangle size={14} /> {result.skipped} ignorée{result.skipped > 1 ? "s" : ""}
                </span>
                {result.errors.length > 0 && (
                  <span className="flex items-center gap-1.5 text-sm font-bold text-red-700 bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl">
                    <AlertCircle size={14} /> {result.errors.length} erreur{result.errors.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              {result.errors.map((e, i) => (
                <p key={i} className="text-xs text-red-600 mt-1 font-medium">Ligne {e.row} : {e.message}</p>
              ))}
            </div>
          )}

          {/* Loading */}
          {parsing && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-400">
              <Loader2 size={32} className="animate-spin text-slate-300" />
              <p className="text-sm font-medium">Analyse du fichier en cours…</p>
            </div>
          )}

          {/* Erreur parse */}
          {!parsing && parseErr && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 px-8 text-center">
              <AlertCircle size={36} className="text-red-400" />
              <p className="text-sm font-bold text-red-600">Impossible de lire le fichier</p>
              <p className="text-xs text-slate-400">{parseErr}</p>
            </div>
          )}

          {/* Tableau */}
          {!parsing && !parseErr && rows.length > 0 && (
            <>
              {/* Bande résumé + filtres */}
              <div className="px-6 py-3 border-b border-slate-100 bg-slate-50 shrink-0">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{rows.length} ligne{rows.length > 1 ? "s" : ""}</span>
                    {[
                      { key: "all",       label: "Toutes",    count: rows.length, color: "bg-slate-100 text-slate-700 hover:bg-slate-200" },
                      { key: "new",       label: "Nouvelles", count: newCount,    color: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" },
                      { key: "duplicate", label: "Doublons",  count: dupCount,    color: "bg-amber-50 text-amber-700 hover:bg-amber-100" },
                      { key: "error",     label: "Erreurs",   count: errCount,    color: "bg-red-50 text-red-600 hover:bg-red-100" },
                    ].map(f => (f.count > 0 || f.key === "all") ? (
                      <button key={f.key}
                        onClick={() => { setFilter(f.key as any); setPage(1); }}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition border border-transparent ${f.color} ${filter === f.key ? "ring-2 ring-offset-1 ring-slate-400" : ""}`}>
                        {f.label} <span className="font-black">{f.count}</span>
                      </button>
                    ) : null)}
                  </div>
                  {newCount > 0 && !result && (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
                      <ShieldCheck size={12} /> {newCount} ligne{newCount > 1 ? "s" : ""} à importer
                    </span>
                  )}
                  {newCount === 0 && !result && (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-lg">
                      <AlertTriangle size={12} /> Aucune nouvelle ligne
                    </span>
                  )}
                </div>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto">
                <table className="min-w-full text-xs border-separate border-spacing-0">
                  <thead className="sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest whitespace-nowrap border-b border-slate-100 bg-slate-50 w-10">#</th>
                      <th className="px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest whitespace-nowrap border-b border-slate-100 bg-slate-50">État</th>
                      {columns.map(c => (
                        <th key={c.key} className="px-3 py-3 text-left font-black text-slate-500 uppercase tracking-widest whitespace-nowrap border-b border-slate-100 bg-slate-50">
                          {c.label}{c.required && <span className="ml-0.5 text-red-400">*</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((row, pi) => {
                      const globalIdx = (page - 1) * PAGE_SIZE + pi;
                      const realIdx   = rows.indexOf(row);
                      return (
                        <tr key={realIdx} className={`border-b border-slate-50 transition ${
                          row.status === "new"       ? "hover:bg-emerald-50/30" :
                          row.status === "duplicate" ? "bg-amber-50/20 hover:bg-amber-50/40" :
                          "bg-red-50/20 hover:bg-red-50/40"
                        }`}>
                          <td className="px-3 py-2.5 text-slate-300 font-mono font-bold">{realIdx + 1}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex flex-col gap-0.5">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-bold text-[10px] border ${STATUS_STYLE[row.status]}`}>
                                {row.status === "new"       && <CheckCircle2 size={10} />}
                                {row.status === "duplicate" && <AlertTriangle size={10} />}
                                {row.status === "error"     && <AlertCircle size={10} />}
                                {STATUS_LABEL[row.status]}
                              </span>
                              {row.message && <span className="text-[9px] text-slate-400 max-w-[120px] truncate">{row.message}</span>}
                            </div>
                          </td>
                          {columns.map(c => {
                            const isEditing = editCell?.rowIdx === realIdx && editCell?.col === c.key;
                            const val = row.data[c.key];
                            return (
                              <td key={c.key} className="px-2 py-2">
                                {isEditing ? (
                                  <div className="flex items-center gap-1">
                                    <input
                                      autoFocus
                                      value={editValue}
                                      onChange={e => setEditValue(e.target.value)}
                                      onKeyDown={e => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditCell(null); }}
                                      className="px-2 py-1 rounded-lg border border-slate-900 text-[11px] font-semibold text-slate-900 bg-white focus:outline-none w-32"
                                    />
                                    <button onClick={commitEdit} className="p-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition">
                                      <Check size={11} className="text-emerald-600" />
                                    </button>
                                    <button onClick={() => setEditCell(null)} className="p-1 rounded-lg bg-slate-50 hover:bg-slate-100 transition">
                                      <X size={11} className="text-slate-400" />
                                    </button>
                                  </div>
                                ) : (
                                  <div
                                    className="group flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-transparent hover:border-slate-200 hover:bg-slate-50 cursor-pointer transition max-w-[180px]"
                                    onClick={() => !result && startEdit(realIdx, c.key, val)}
                                    title={result ? undefined : "Cliquer pour modifier"}
                                  >
                                    <span className="text-[11px] font-semibold text-slate-700 truncate">
                                      {val === "" || val == null ? <span className="text-slate-300 italic">—</span> : String(val)}
                                    </span>
                                    {!result && <Pencil size={9} className="text-slate-300 group-hover:text-slate-500 shrink-0 transition" />}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-3 border-t border-slate-100 bg-white shrink-0 flex items-center justify-between">
                  <p className="text-xs text-slate-400">Page {page}/{totalPages} · {filtered.length} ligne{filtered.length > 1 ? "s" : ""}</p>
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
            <span className="flex items-center gap-1"><CheckCircle2 size={11} className="text-emerald-500" /> Nouvelle</span>
            <span className="flex items-center gap-1"><AlertTriangle size={11} className="text-amber-500" /> Doublon (ignoré)</span>
            <span className="flex items-center gap-1"><AlertCircle size={11} className="text-red-500" /> Erreur (ignorée)</span>
            {!result && <span className="flex items-center gap-1"><Pencil size={11} className="text-slate-400" /> Cliquer une cellule pour modifier</span>}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition">
              {result ? "Fermer" : "Annuler"}
            </button>
            {!result && (
              <button
                onClick={handleConfirm}
                disabled={confirming || parsing || newCount === 0}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-sm ${
                  newCount === 0 ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-slate-900 text-white hover:bg-black"
                }`}
              >
                {confirming ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {confirming ? "Import en cours…" : `Importer ${newCount} ligne${newCount > 1 ? "s" : ""}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
