"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Eye, Filter, Download, Upload, X, CheckCircle2,
  XCircle, Clock, Copy, FileText, ExternalLink,
  PlusCircle,
  CalendarDays,
  ArrowUpRight,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import StatsCard from "@/components/StatsCard";
import { useToast } from "@/contexts/ToastContext";
import DataTable, { ColumnConfig } from "@/components/DataTable";
import Paginate from "@/components/Paginate";
import PageHeader from "@/components/PageHeader";
import ReusableForm, { FieldConfig } from "@/components/ReusableForm";

import { useQuotes } from "../../../hooks/admin/useQuotes";
import { Quote, QuoteService } from "../../../services/admin/quote.service";
import { exportToXlsx } from "../../../core/export";
import { resolveStorageUrl } from "../../../lib/url";
import { formatDate, formatCurrency } from "@/lib/utils";
import axiosInstance from "../../../core/axios";


// ══════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════

// local formatMontant and formatDate removed - using @/lib/utils


// ══════════════════════════════════════════════
// STATUTS
// ══════════════════════════════════════════════

const STATUS_STYLES: Record<string, string> = {
  pending:  "border-amber-200 bg-amber-50 text-amber-600",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-600",
  rejected: "border-rose-200 bg-rose-50 text-rose-600",
  revision: "border-sky-200 bg-sky-50 text-sky-600",
};

const STATUS_LABELS: Record<string, string> = {
  pending:  "En attente",
  approved: "Approuvé",
  rejected: "Rejeté",
  revision: "En révision",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center justify-center min-w-[90px] px-3 py-1.5 rounded-xl border text-xs font-bold ${STATUS_STYLES[status] ?? ""}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ══════════════════════════════════════════════
// PDF PREVIEW MODAL - plein écran
// ══════════════════════════════════════════════

function PdfPreviewModal({ url, name, onClose }: { url: string; name: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[300] flex flex-col bg-black/95">
      <div className="flex items-center justify-between px-6 py-4 bg-black border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-red-600 flex items-center justify-center">
            <FileText size={14} className="text-white" />
          </div>
          <p className="text-white font-bold text-sm">{name}</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={url}
            download
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition"
          >
            <Download size={14} /> Télécharger
          </a>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition">
            <X size={18} className="text-white" />
          </button>
        </div>
      </div>
      <div className="flex-1">
        <iframe src={`${url}#toolbar=0`} className="w-full h-full border-0" title={name} />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// FILTER DROPDOWN
// ══════════════════════════════════════════════

function FilterDropdown({
  isOpen, onClose, filters, onApply,
}: {
  isOpen: boolean; onClose: () => void;
  filters: { status?: string }; onApply: (f: { status?: string }) => void;
}) {
  const [local, setLocal] = useState(filters);
  useEffect(() => { setLocal(filters); }, [filters]);
  if (!isOpen) return null;

  const options = [
    { val: "",         label: "Tous"         },
    { val: "pending",  label: "En attente"   },
    { val: "approved", label: "Approuvé"     },
    { val: "rejected", label: "Rejeté"       },
    { val: "revision", label: "En révision"  },
  ];

  return (
    <div className="absolute right-0 top-full mt-2 z-50 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <span className="text-sm font-black text-slate-900 uppercase tracking-widest">Filtres</span>
        <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition">
          <X size={16} className="text-slate-500" />
        </button>
      </div>
      <div className="p-5">
        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Statut</label>
        <div className="flex flex-col gap-2 mt-2">
          {options.map(({ val, label }) => (
            <button
              key={val}
              onClick={() => setLocal({ ...local, status: val || "non renseigné" })}
              className={`w-full text-left px-4 py-2 rounded-xl text-sm font-semibold transition ${
                (local.status ?? "") === val
                  ? "bg-slate-900 text-white"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
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

// ══════════════════════════════════════════════
// SIDE PANEL DEVIS - exact comme la capture
// Croix haut gauche, champs label/valeur, statut
// avec boutons inline, pièces jointes PDF
// ══════════════════════════════════════════════

function QuoteSidePanel({
  quote, onClose, onApprove, onReject,
}: {
  quote: Quote | null; onClose: () => void;
  onApprove: (id: number) => void;
  onReject: (id: number, reason: string) => void;
}) {
  const [rejectMode,    setRejectMode]    = useState(false);
  const [rejectReason,  setRejectReason]  = useState("");
  const [pdfPreview,    setPdfPreview]    = useState<{ url: string; name: string } | null>(null);
  const [approveModal,  setApproveModal]  = useState(false);
  const [approving,     setApproving]     = useState(false);

  useEffect(() => {
    setRejectMode(false);
    setRejectReason("");
    setPdfPreview(null);
    setApproveModal(false);
  }, [quote?.id]);

  if (!quote) return null;

  const isPending  = quote.status === "pending";
  const isApproved = quote.status === "approved";
  const isRejected = quote.status === "rejected";
  const isRevision = quote.status === "revision";

  const totalHT   = quote.amount_ht ?? quote.items?.reduce((s, i) => s + i.quantity * i.unit_price, 0) ?? 0;
  const taxAmount = quote.tax_amount ?? totalHT * 0.18;
  const totalTTC  = quote.amount_ttc ?? totalHT + taxAmount;

  const providerName = quote.provider?.company_name ?? quote.provider?.name ?? "-";
  const siteName     = quote.site?.nom ?? quote.site?.name ?? "-";

  // Manager du site
  const siteManager  = quote.site?.manager;
  const managerName  = siteManager
    ? `${siteManager.first_name ?? ""} ${siteManager.last_name ?? ""}`.trim() || "Manager"
    : null;
  const managerPhone = siteManager?.phone_number ?? siteManager?.phone ?? null;
  const managerEmail = siteManager?.email ?? null;

  const handleConfirmApprove = async () => {
    setApproving(true);
    try { await onApprove(quote.id); setApproveModal(false); }
    finally { setApproving(false); }
  };

  // Fichiers PDF liés au devis
  const pdfFiles: Array<{ name: string; url: string; size?: string }> =
    (quote as any).pdf_paths?.map((p: string) => ({
      name: p.split("/").pop() ?? "document.pdf",
      url:  resolveStorageUrl(p),
    })) ?? [];

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-[420px] bg-white z-50 shadow-2xl flex flex-col rounded-l-3xl overflow-hidden">

        {/* ── Croix en haut à gauche (comme la capture) ── */}
        <div className="flex items-start px-6 pt-6 pb-0 shrink-0">
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-xl transition -ml-1">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        {/* ── Titre ── */}
        <div className="px-6 pt-4 pb-5 shrink-0">
          <h2 className="text-2xl font-black text-slate-900">Devis #{quote.id}</h2>
          <p className="text-slate-400 text-xs mt-0.5">Retrouvez les détails du devis en dessous</p>
        </div>

        {/* ── Contenu scrollable ── */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-5">

          {/* Champs clé/valeur */}
          <div className="space-y-0">
            {[
              {
                label: "ID Devis",
                render: () => (
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">#{quote.id}</span>
                    <button onClick={() => copyToClipboard(String(quote.id))}
                      className="p-1 hover:bg-slate-100 rounded-md transition">
                      <Copy size={12} className="text-slate-400" />
                    </button>
                  </div>
                ),
              },
              { label: "Référence",   value: quote.reference },
              { label: "Prestataire", value: providerName },
               { label: "Date",        value: formatDate(quote.created_at) },
              { label: "Site",        value: siteName },
              { label: "Montant HT",  value: formatCurrency(totalHT) },

            ].map((f, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                <p className="text-xs text-slate-400 font-medium">{f.label}</p>
                {f.render ? f.render() : <p className="text-sm font-bold text-slate-900">{f.value}</p>}
              </div>
            ))}

            {/* Statut - avec boutons inline si pending */}
            <div className="flex items-center justify-between py-3">
              <p className="text-xs text-slate-400 font-medium">Statut</p>
              <div className="flex items-center gap-2">
                <StatusBadge status={quote.status} />
                {isPending && !rejectMode && (
                  <>
                    <button
                      onClick={() => onApprove(quote.id)}
                      className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center hover:bg-emerald-100 transition"
                      title="Approuver"
                    >
                      <span className="text-emerald-600 font-black text-sm">✓</span>
                    </button>
                    <button
                      onClick={() => setRejectMode(true)}
                      className="w-8 h-8 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center hover:bg-red-100 transition"
                      title="Rejeter"
                    >
                      <span className="text-red-500 font-black text-sm">✕</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Zone motif rejet */}
          {rejectMode && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 space-y-3">
              <p className="text-xs font-black text-red-400 uppercase tracking-widest">
                Motif de rejet <span className="text-red-500">*</span>
              </p>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Expliquez la raison du rejet..."
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl border border-red-200 bg-white text-sm text-slate-900 resize-none focus:outline-none focus:border-red-400 transition"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setRejectMode(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition"
                >
                  Annuler
                </button>
                <button
                  disabled={!rejectReason.trim()}
                  onClick={() => {
                    if (rejectReason.trim()) {
                      onReject(quote.id, rejectReason.trim());
                      setRejectMode(false);
                      setRejectReason("");
                    }
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Confirmer le rejet
                </button>
              </div>
            </div>
          )}

          {/* Motif rejet affiché */}
          {isRejected && quote.rejection_reason && (
            <div className="bg-red-50 rounded-xl p-4 border border-red-100">
              <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Motif de rejet</p>
              <p className="text-sm text-red-700 leading-relaxed">{quote.rejection_reason}</p>
            </div>
          )}

          {/* Description */}
          {quote.description && (
            <div>
              <p className="text-xs text-slate-400 font-medium mb-2">Description</p>
              <p className="text-sm text-blackk leading-relaxed bg-slate-50 rounded-xl p-4 border border-slate-100">
                {quote.description}
              </p>
            </div>
          )}

          {/* Items du devis */}
          {quote.items && quote.items.length > 0 && (
            <div>
              <p className="text-xs text-slate-400 font-medium mb-3">Articles ({quote.items.length})</p>
              <div className="border border-slate-100 rounded-2xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Désignation</th>
                      <th className="text-center px-2 py-2.5 text-[10px] font-black text-slate-400 uppercase">Qté</th>
                      <th className="text-right px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quote.items.map((item, i) => (
                      <tr key={i} className="border-b border-slate-50 last:border-0">
                        <td className="px-4 py-3 text-xs font-medium text-slate-900">{item.designation}</td>
                        <td className="px-2 py-3 text-center text-xs text-slate-500">{item.quantity}</td>
                        <td className="px-4 py-3 text-right text-xs font-bold text-slate-900">
                          {formatCurrency(item.total_price ?? item.quantity * item.unit_price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="bg-slate-50 border-t border-slate-100 px-4 py-3 space-y-1">
                   <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Total HT</span>
                    <span className="font-bold text-slate-900">{formatCurrency(totalHT)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">TVA (18%)</span>
                    <span className="font-bold text-slate-900">{formatCurrency(taxAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-slate-200 pt-1.5">
                    <span className="font-black text-slate-900">Total TTC</span>
                    <span className="font-black text-slate-900">{formatCurrency(totalTTC)}</span>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* ── Pièce(s) jointe(s) - style exact de la capture ── */}
          {pdfFiles.length > 0 && (
            <div>
              <p className="text-xs text-slate-400 font-medium mb-3">Pièce jointe</p>
              <div className="space-y-2">
                {pdfFiles.map((file, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-white">
                    {/* Icône PDF rouge */}
                    <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                      <FileText size={16} className="text-red-500" />
                    </div>
                    {/* Nom + taille */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{file.name}</p>
                      {file.size && <p className="text-[10px] text-slate-400">{file.size}</p>}
                    </div>
                    {/* Aperçu + Télécharger */}
                    <button
                      onClick={() => setPdfPreview({ url: file.url, name: file.name })}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition shrink-0"
                    >
                      <Eye size={13} /> Aperçu
                    </button>
                    <a
                      href={file.url}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-black transition shrink-0"
                    >
                      <Download size={13} /> Télécharger
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Statut final - approuvé */}
          {isApproved && (
            <div className="flex items-center gap-2 py-3.5 px-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-bold">
              <CheckCircle2 size={16} />
              Devis approuvé le {formatDate(quote.approved_at ?? "")}
            </div>
          )}
        </div>

        {/* Footer CTA Valider + Rejeter + Révision */}
        {isPending && !rejectMode && (
          <div className="px-6 py-4 border-t border-slate-100 shrink-0 space-y-2">
            <button
              onClick={() => setApproveModal(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition"
            >
              <CheckCircle2 size={15} /> Valider ce devis
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setRejectMode(true)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-600 text-sm font-bold hover:bg-red-100 transition"
              >
                <XCircle size={14} /> Rejeter
              </button>
              <button
                onClick={() => {
                  const reason = prompt("Motif de révision (optionnel) :");
                  if (reason !== null) {
                    // requestRevision via onApprove workaround — handled in page
                    (window as any).__quoteRevision?.(quote.id, reason);
                  }
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-sky-200 bg-sky-50 text-sky-600 text-sm font-bold hover:bg-sky-100 transition"
              >
                <Clock size={14} /> Révision
              </button>
            </div>
          </div>
        )}
      </div>

      {/* PDF fullscreen */}
      {pdfPreview && (
        <PdfPreviewModal url={pdfPreview.url} name={pdfPreview.name} onClose={() => setPdfPreview(null)} />
      )}

      {/* Modale confirmation approbation */}
      {approveModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setApproveModal(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-7 py-6 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-black text-slate-900">Valider le devis</h2>
                <p className="text-xs text-slate-400 mt-0.5">{quote.reference}</p>
              </div>
              <button onClick={() => setApproveModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition">
                <X size={18} className="text-slate-500" />
              </button>
            </div>
            <div className="px-7 py-6 space-y-4">
              <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Prestataire</span>
                  <span className="font-bold text-slate-900">{providerName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Site</span>
                  <span className="font-bold text-slate-900">{siteName}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-slate-200 pt-2">
                  <span className="font-black text-slate-900">Montant TTC</span>
                  <span className="font-black text-slate-900">{formatCurrency(totalTTC)}</span>
                </div>
              </div>
              {managerName ? (
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Manager du site notifié</p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
                      <span className="text-white text-xs font-black">
                        {managerName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{managerName}</p>
                      {managerEmail && <a href={`mailto:${managerEmail}`} className="text-xs text-slate-500 hover:underline">{managerEmail}</a>}
                      {managerPhone && <p className="text-xs text-slate-500">{managerPhone}</p>}
                    </div>
                  </div>
                  <p className="text-xs text-blue-600 mt-2 font-medium">Une notification sera envoyée au manager lors de la validation.</p>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                  <p className="text-xs text-amber-700 font-medium">Aucun manager assigné à ce site.</p>
                </div>
              )}
            </div>
            <div className="px-7 py-5 border-t border-slate-100 flex gap-3">
              <button onClick={() => setApproveModal(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition">
                Annuler
              </button>
              <button onClick={handleConfirmApprove} disabled={approving}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition disabled:opacity-60">
                {approving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle2 size={15} />}
                Confirmer la validation
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


// ══════════════════════════════════════════════
// PAGE PRINCIPALE
// ══════════════════════════════════════════════

export default function DevisPage() {
  const filterRef = useRef<HTMLDivElement>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const {
    quotes, stats, isLoading, statsLoading,
    fetchQuotes, fetchStats, approveQuote, rejectQuote, requestRevision,
  } = useQuotes();

  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [filtersOpen,   setFiltersOpen]   = useState(false);
  const [filters,       setFilters]       = useState<{ status?: string }>({});
  const [currentPage,   setCurrentPage]   = useState(1);
  const [exportLoading, setExportLoading] = useState(false);
  const { toast } = useToast();

  // ── Données pour le formulaire de création ─────────────────────────────────
  const [tickets,   setTickets]   = useState<{ label: string; value: string; site_id?: number; provider_id?: number }[]>([]);
  const [providers, setProviders] = useState<{ label: string; value: string }[]>([]);
  const [formInitialValues, setFormInitialValues] = useState<Record<string, any>>({});

  // Charge tickets et prestataires au montage
  useEffect(() => {
    axiosInstance.get("/admin/ticket", { params: { per_page: 200 } }).then(res => {
      const d = res.data?.data ?? res.data;
      const items: any[] = d?.items ?? d?.data ?? (Array.isArray(d) ? d : []);
      setTickets(items.map((t: any) => ({
        label:       `${t.code_ticket ?? `#${t.id}`} — ${t.subject ?? t.site?.nom ?? ""}`.trim(),
        value:       String(t.id),
        site_id:     t.site_id,
        provider_id: t.provider_id,
      })));
    }).catch(() => {});

    axiosInstance.get("/admin/providers", { params: { per_page: 200 } }).then(res => {
      const d = res.data?.data ?? res.data;
      const items: any[] = d?.items ?? (Array.isArray(d) ? d : []);
      setProviders(items.map((p: any) => ({
        label: (p.company_name ?? `${p.user?.first_name ?? ""} ${p.user?.last_name ?? ""}`.trim()) || `Prestataire #${p.id}`,
        value: String(p.id),
      })));
    }).catch(() => {});
  }, []);

  const PER_PAGE = 10;

  useEffect(() => { fetchQuotes(); fetchStats(); }, []);


  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node))
        setFiltersOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);


  const applyFilters = (f: { status?: string }) => { setFilters(f); setCurrentPage(1); };

  const filtered    = quotes.filter(q => !filters.status || q.status === filters.status);
  const totalPages  = Math.ceil(filtered.length / PER_PAGE);
  const paginated   = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);
  const activeCount = Object.values(filters).filter(Boolean).length;

  const handleApprove = async (id: number) => {
    try {
      await approveQuote(id);
      setSelectedQuote(prev => prev?.id === id ? { ...prev, status: "approved" as const } : prev);
      toast.success("Devis approuvé avec succès.");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Erreur lors de l'approbation.");
    }
  };

  const handleReject = async (id: number, reason: string) => {
    try {
      await rejectQuote(id, reason);
      setSelectedQuote(prev =>
        prev?.id === id ? { ...prev, status: "rejected" as const, rejection_reason: reason } : prev
      );
      toast.success("Devis rejeté.");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Erreur lors du rejet.");
    }
  };

  const handleRevision = async (id: number, reason: string) => {
    try {
      await requestRevision(id, reason);
      setSelectedQuote(prev =>
        prev?.id === id ? { ...prev, status: "revision" as const } : prev
      );
      toast.success("Révision demandée.");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Erreur lors de la demande de révision.");
    }
  };

  // Expose handleRevision pour le SidePanel via window (workaround prop drilling)
  useEffect(() => {
    (window as any).__quoteRevision = handleRevision;
    return () => { delete (window as any).__quoteRevision; };
  }, [handleRevision]);

  const handleExport = async () => {
    if (exportLoading) return;
    setExportLoading(true);
    try {
      const dataToExport = filtered.length > 0 ? filtered : quotes;
      const rows = dataToExport.map(q => ({
        reference:   q.reference,
        ticket:      q.ticket?.reference ?? q.ticket?.title ?? `#${q.ticket_id}`,
        prestataire: q.provider?.company_name ?? q.provider?.name ?? "-",
        site:        q.site?.nom ?? q.site?.name ?? "-",
        montant_ht:  q.amount_ht  ?? 0,
        montant_ttc: q.amount_ttc ?? 0,
        statut:      { pending: "En attente", approved: "Approuvé", rejected: "Rejeté", revision: "En révision" }[q.status] ?? q.status,
        date:        formatDate(q.created_at),
      }));
      exportToXlsx(rows, [
        { header: "Référence",    key: "reference",   width: 18 },
        { header: "Ticket",       key: "ticket",      width: 20 },
        { header: "Prestataire",  key: "prestataire", width: 24 },
        { header: "Site",         key: "site",        width: 20 },
        { header: "Montant HT",   key: "montant_ht",  width: 16 },
        { header: "Montant TTC",  key: "montant_ttc", width: 16 },
        { header: "Statut",       key: "statut",      width: 14 },
        { header: "Date",         key: "date",        width: 16 },
      ], { filename: "devis", sheetName: "Devis", title: "Export Devis - CANAL+" });
      toast.success("Export téléchargé avec succès.");
    } catch {
      toast.error("Erreur lors de l'exportation.");
    } finally {
      setExportLoading(false);
    }
  };

  const kpis = [
    { label: "Total des devis",   value: statsLoading ? 0 : (stats?.total ?? 0),    delta: "+3%",  trend: "up" as const },
    { label: "Devis en attente",  value: statsLoading ? 0 : (stats?.pending ?? 0),  delta: "+0%",  trend: "up" as const },
    { label: "Devis approuvés",   value: statsLoading ? 0 : (stats?.approved ?? 0), delta: "+15%", trend: "up" as const },
    { label: "Montant approuvé",  value: statsLoading ? 0 : formatCurrency(stats?.total_approved_amount ?? 0), delta: "+20%", trend: "up" as const, isCurrency: true },
  ];

  // ── Champs formulaire création ─────────────────────────────────────────────
  const quoteFields: FieldConfig[] = [
    {
      name: "ticket_id",
      label: "Ticket (codification)",
      type: "select",
      required: true,
      options: tickets,
    },
    {
      name: "provider_id",
      label: "Prestataire",
      type: "select",
      required: true,
      options: providers,
    },
    {
      name: "site_id",
      label: "Site",
      type: "text", 
      required: false,
      disabled: true,
      placeholder: "Sélectionnez un ticket",
    },
    
    {
      name: "amount_ht",
      label: "Montant HT (FCFA)",
      type: "number",
      required: true,
      placeholder: "Ex: 150000",
    },
    {
      name: "amount_ht",
      label: "Montant TVA",
      type: "number",
      required: false,
      placeholder: "Ex: 150000",
    },
    {
      name: "description",
      label: "Description",
      type: "rich-text",
      required: true,
      placeholder: "Décrivez les prestations à réaliser...",
      gridSpan: 2,
    },
  ];

  // Quand le ticket change → auto-remplir site et prestataire
  const handleFormFieldChange = (name: string, value: any) => {
    if (name === "ticket_id") {
      const ticket = tickets.find(t => t.value === String(value));
      if (ticket) {
        setFormInitialValues(prev => ({
          ...prev,
          ticket_id:   value,
          site_id:     ticket.site_id ? String(ticket.site_id) : "",
          provider_id: ticket.provider_id ? String(ticket.provider_id) : prev.provider_id ?? "",
        }));
      }
    }
  };

  // ── Création ───────────────────────────────────────────────────────────────
  const handleCreate = async (formData: any) => {
    try {
      // Récupère site_id depuis formInitialValues si non fourni directement
      const siteId = formInitialValues.site_id
        ? Number(formInitialValues.site_id)
        : Number(formData.site_id);

      if (!siteId) {
        toast.error("Impossible de déterminer le site. Vérifiez le ticket sélectionné.");
        return;
      }

      await QuoteService.createQuote({
        ticket_id:   Number(formData.ticket_id),
        provider_id: Number(formData.provider_id),
        site_id:     siteId,
        description: formData.description,
        items: [
          {
            designation: "Prestation générale",
            quantity:    1,
            unit_price:  Number(formData.amount_ht),
          },
        ],
      });
      toast.success("Devis créé avec succès");
      setIsCreateModalOpen(false);
      setFormInitialValues({});
      fetchQuotes();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Erreur lors de la création");
    }
  };

  
  const columns: ColumnConfig<Quote>[] = [
    { header: "Référence",   key: "reference",  render: (_: any, row: Quote) => <span className="font-black text-slate-900 text-sm">{row.reference}</span> },
    // { header: "Ticket",      key: "ticket",     render: (_: any, row: Quote) => row.ticket?.reference ?? row.ticket?.title ?? `${row.ticket_code_ticket}` },
    { header: "Prestataire", key: "provider",   render: (_: any, row: Quote) => row.provider?.company_name ?? row.provider?.name ?? "-" },
    { header: "Site",        key: "site",       render: (_: any, row: Quote) => row.site?.nom ?? row.site?.name ?? "-" },
    { header: "Montant TTC", key: "amount_ttc", render: (_: any, row: Quote) => <span className="font-bold">{formatCurrency(row.amount_ttc)}</span> },
    { header: "Date",        key: "created_at", render: (_: any, row: Quote) => formatDate(row.created_at) },
    { header: "Statut",      key: "status",     render: (_: any, row: Quote) => <StatusBadge status={row.status} /> },
   
    
    // Colonne Actions APRÈS :
    {
      header: "Actions", key: "actions",
      render: (_: any, row: Quote) => (
        <div className="flex items-center gap-3">
          {/* Aperçu side panel
          <button onClick={() => { setSelectedQuote(row); setIsDetailsOpen(true); }}
            className="flex items-center gap-2 font-bold text-slate-800 hover:text-gray-500 transition">
            <Eye size={18} />
          </button> */}
          
          {/* Redirection vers page détails */}
          <Link href={`/admin/devis/details/${row.id}`}
            className="group p-2 rounded-xl bg-white transition flex items-center justify-center">
            <Eye size={16} />
          </Link>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="mt-20 p-6 space-y-8">
          <PageHeader title="Devis" subtitle="Ce menu vous permet de consulter et gérer les devis des prestataires" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis.map((k, i) => <StatsCard key={i} {...k} />)}
          </div>

          <div className="shrink-0 flex justify-end items-center gap-3">
          
            {/* Filtrer */}
            <div className="relative" ref={filterRef}>
              <button
                onClick={() => setFiltersOpen(!filtersOpen)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition ${
                  filtersOpen || activeCount > 0 ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Filter size={16} /> Filtrer par
                {activeCount > 0 && <span className="ml-1 bg-white text-slate-900 text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center">{activeCount}</span>}
              </button>
              <FilterDropdown isOpen={filtersOpen} onClose={() => setFiltersOpen(false)} filters={filters} onApply={applyFilters} />
            </div>

              {/* Importer
              <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-bold cursor-pointer hover:bg-slate-50 transition">
              <Download size={16} /> Importer
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden"
                onChange={() => toast.error("Fonctionnalité d'import en cours de développement.")} />
            </label> */}
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
            
  {/* ── Ajouter ──────────────────────────────────────────── */}
  <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition-all"
              >
                <PlusCircle size={14} />
                Ajouter
              </button>
          </div>

          {filters.status && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Filtré par :</span>
              <span className="flex items-center gap-1.5 bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded-full">
                {STATUS_LABELS[filters.status] ?? filters.status}
                <button onClick={() => applyFilters({})} className="hover:opacity-70 transition"><X size={12} /></button>
              </span>
            </div>
          )}

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <DataTable title="Liste des devis" columns={columns} data={isLoading ? [] : paginated} onViewAll={() => {}} />
            <div className="p-6 border-t border-slate-50 flex justify-end bg-slate-50/30">
              <Paginate currentPage={currentPage} totalPages={totalPages || 1} onPageChange={setCurrentPage} />
            </div>
          </div>
  {/* ── Modal création ─────────────────────────────────────────── */}
  <ReusableForm
            isOpen={isCreateModalOpen}
            onClose={() => { setIsCreateModalOpen(false); setFormInitialValues({}); }}
            title="Ajouter un devis"
            subtitle="Sélectionnez le ticket — le site sera auto-rempli."
            fields={quoteFields}
            onSubmit={handleCreate}
            onFieldChange={handleFormFieldChange}
            initialValues={formInitialValues}
            submitLabel="Créer le devis"
          />

          <QuoteSidePanel
            quote={isDetailsOpen ? selectedQuote : null}
            onClose={() => { setIsDetailsOpen(false); setSelectedQuote(null); }}
            onApprove={handleApprove}
            onReject={handleReject}
          />

        
        </main>
      </div>
    </>
  );
}