"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import {
  Eye, Filter, Download, Upload, X, CheckCircle2,
  XCircle, Clock, Copy, FileText, ExternalLink,
  PlusCircle,
  CalendarDays,
  ArrowUpRight,
} from "lucide-react";

import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import StatsCard from "@/components/StatsCard";
import DataTable from "@/components/DataTable";
import Paginate from "@/components/Paginate";
import PageHeader from "@/components/PageHeader";
import ReusableForm from "@/components/ReusableForm";

import { useQuotes } from "../../../hooks/useQuotes";
import { Quote } from "../../../services/quote.service";

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

const formatMontant = (v?: number): string => {
  if (!v && v !== 0) return "—";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M FCFA`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}K FCFA`;
  return `${v.toLocaleString("fr-FR")} FCFA`;
};

const formatDate = (iso?: string): string => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
};

// ═══════════════════════════════════════════════
// STATUTS
// ═══════════════════════════════════════════════

const STATUS_STYLES: Record<string, string> = {
  pending:  "border-slate-300 bg-slate-100 text-slate-700",
  approved: "border-green-600 bg-green-50 text-green-700",
  rejected: "border-red-500 bg-red-100 text-red-600",
  revision: "border-blue-400 bg-blue-50 text-blue-700",
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

// ═══════════════════════════════════════════════
// PDF PREVIEW MODAL — plein écran
// ═══════════════════════════════════════════════

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

// ═══════════════════════════════════════════════
// FILTER DROPDOWN
// ═══════════════════════════════════════════════

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
              onClick={() => setLocal({ ...local, status: val || undefined })}
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

// ═══════════════════════════════════════════════
// SIDE PANEL DEVIS — exact comme la capture
// Croix haut gauche, champs label/valeur, statut
// avec boutons ✓ ✗ inline, pièces jointes PDF
// ═══════════════════════════════════════════════

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

  useEffect(() => {
    setRejectMode(false);
    setRejectReason("");
    setPdfPreview(null);
  }, [quote?.id]);

  if (!quote) return null;

  const isPending  = quote.status === "pending";
  const isApproved = quote.status === "approved";
  const isRejected = quote.status === "rejected";
  const isRevision = quote.status === "revision";

  const totalHT   = quote.amount_ht ?? quote.items?.reduce((s, i) => s + i.quantity * i.unit_price, 0) ?? 0;
  const taxAmount = quote.tax_amount ?? totalHT * 0.18;
  const totalTTC  = quote.amount_ttc ?? totalHT + taxAmount;

  const providerName = quote.provider?.name ?? "—";
  const siteName     = quote.site?.nom ?? quote.site?.name ?? "—";
  const ticketRef    = quote.ticket?.reference ?? quote.ticket?.title ?? `#${quote.ticket_id}`;

  // Fichiers PDF liés au devis (quote.pdf_paths si dispo, sinon mock vide)
  const pdfFiles: Array<{ name: string; url: string; size?: string }> =
    (quote as any).pdf_paths?.map((p: string) => ({
      name: p.split("/").pop() ?? "document.pdf",
      url:  `${process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ?? ""}/storage/${p}`,
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
              { label: "Montant HT",  value: formatMontant(totalHT) },
            ].map((f, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                <p className="text-xs text-slate-400 font-medium">{f.label}</p>
                {f.render ? f.render() : <p className="text-sm font-bold text-slate-900">{f.value}</p>}
              </div>
            ))}

            {/* Statut — avec boutons ✓ ✗ inline si pending */}
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
                      <span className="text-red-500 font-black text-sm">✗</span>
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
              <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-xl p-4 border border-slate-100">
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
                          {formatMontant(item.total_price ?? item.quantity * item.unit_price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="bg-slate-50 border-t border-slate-100 px-4 py-3 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Total HT</span>
                    <span className="font-bold text-slate-900">{formatMontant(totalHT)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">TVA (18%)</span>
                    <span className="font-bold text-slate-900">{formatMontant(taxAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-slate-200 pt-1.5">
                    <span className="font-black text-slate-900">Total TTC</span>
                    <span className="font-black text-slate-900">{formatMontant(totalTTC)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Pièce(s) jointe(s) — style exact de la capture ── */}
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

          {/* Statut final — approuvé */}
          {isApproved && (
            <div className="flex items-center gap-2 py-3.5 px-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-bold">
              <CheckCircle2 size={16} />
              Devis approuvé le {formatDate(quote.approved_at ?? "")}
            </div>
          )}
        </div>
      </div>

      {/* Preview PDF fullscreen */}
      {pdfPreview && (
        <PdfPreviewModal
          url={pdfPreview.url}
          name={pdfPreview.name}
          onClose={() => setPdfPreview(null)}
        />
      )}
    </>
  );
}


// ═══════════════════════════════════════════════
// PAGE PRINCIPALE
// ═══════════════════════════════════════════════

export default function DevisPage() {
  const filterRef = useRef<HTMLDivElement>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const {
    quotes, stats, isLoading, statsLoading,
    fetchQuotes, fetchStats, approveQuote, rejectQuote,
  } = useQuotes();

  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [filtersOpen,   setFiltersOpen]   = useState(false);
  const [filters,       setFilters]       = useState<{ status?: string }>({});
  const [currentPage,   setCurrentPage]   = useState(1);
  const [flashMessage,  setFlashMessage]  = useState<{ type: "success"|"error"; message: string } | null>(null);

  const PER_PAGE = 10;

  useEffect(() => { fetchQuotes(); fetchStats(); }, []);

  useEffect(() => {
    if (!flashMessage) return;
    const t = setTimeout(() => setFlashMessage(null), 5000);
    return () => clearTimeout(t);
  }, [flashMessage]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node))
        setFiltersOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const showFlash = (type: "success"|"error", message: string) => setFlashMessage({ type, message });

  const applyFilters = (f: { status?: string }) => { setFilters(f); setCurrentPage(1); };

  const filtered    = quotes.filter(q => !filters.status || q.status === filters.status);
  const totalPages  = Math.ceil(filtered.length / PER_PAGE);
  const paginated   = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);
  const activeCount = Object.values(filters).filter(Boolean).length;

  const handleApprove = async (id: number) => {
    try {
      await approveQuote(id);
      setSelectedQuote(prev => prev?.id === id ? { ...prev, status: "approved" as const } : prev);
      showFlash("success", "Devis approuvé avec succès.");
    } catch (err: any) {
      showFlash("error", err?.response?.data?.message ?? "Erreur lors de l'approbation.");
    }
  };

  const handleReject = async (id: number, reason: string) => {
    try {
      await rejectQuote(id, reason);
      setSelectedQuote(prev =>
        prev?.id === id ? { ...prev, status: "rejected" as const, rejection_reason: reason } : prev
      );
      showFlash("success", "Devis rejeté.");
    } catch (err: any) {
      showFlash("error", err?.response?.data?.message ?? "Erreur lors du rejet.");
    }
  };

  const kpis = [
    { label: "Total des devis",   value: statsLoading ? 0 : (stats?.total ?? 0),    delta: "+3%",  trend: "up" as const },
    { label: "Devis en attente",  value: statsLoading ? 0 : (stats?.pending ?? 0),  delta: "+0%",  trend: "up" as const },
    { label: "Devis approuvés",   value: statsLoading ? 0 : (stats?.approved ?? 0), delta: "+15%", trend: "up" as const },
    { label: "Montant approuvé",  value: statsLoading ? 0 : (stats?.total_approved_amount ?? 0), delta: "+20%", trend: "up" as const, isCurrency: true },
  ];

    // ── Champs formulaire création ─────────────────────────────────────────────
  const quoteFields = [
    { name: "ticket_id", label: "Ticket",        type: "text",  required: true },
    { name: "provider_id",  label: "Prestataire",            type: "text",  required: true },
    { name: "site_id",      label: "Site",          type: "text", required: true },
    { name: "amount_ttc",      label: "Téléphone",      type: "number"                  },
    { name: "created_at", label: "Date ", type: "date", required: true, icon: CalendarDays },
    { name: "status",   label: "Statut",   type: "select", required: true,
      options: [
       
        { label: "en attente", value: "pending" },   
        { label: "Revisé", value: "revision" },  
      ],
    },
  ];

  // ── Création ───────────────────────────────────────────────────────────────
  const handleCreate = async (formData: any) => {
    try {
      await QuoteService.createQuote({
        reference: formData.first_name,
        ticket_id:  formData.ticket_id,
        provider:      formData.provider_id,
        montant: formData.amount_ttc,
        status: formData.status,
        site:      formData.site_id,

        date:   formData.created_at || undefined,
      });
      showFlash("success", "Gestionnaire créé avec succès");
      setIsCreateModalOpen(false);
      fetchQuotes();
    } catch (err: any) {
      showFlash("error", err?.response?.data?.message || "Erreur lors de la création");
    }
  };

  
  const columns = [
    { header: "Référence",   key: "reference",  render: (_: any, row: Quote) => <span className="font-black text-slate-900 text-sm">{row.reference}</span> },
    { header: "Ticket",      key: "ticket",     render: (_: any, row: Quote) => row.ticket?.reference ?? row.ticket?.title ?? `#${row.ticket_id}` },
    { header: "Prestataire", key: "provider",   render: (_: any, row: Quote) => row.provider?.name ?? "—" },
    { header: "Site",        key: "site",       render: (_: any, row: Quote) => row.site?.nom ?? row.site?.name ?? "—" },
    { header: "Montant TTC", key: "amount_ttc", render: (_: any, row: Quote) => <span className="font-bold">{formatMontant(row.amount_ttc)}</span> },
    { header: "Date",        key: "created_at", render: (_: any, row: Quote) => formatDate(row.created_at) },
    { header: "Statut",      key: "status",     render: (_: any, row: Quote) => <StatusBadge status={row.status} /> },
   
    
    // Colonne Actions APRÈS :
    {
      header: "Actions", key: "actions",
      render: (_: any, row: Quote) => (
        <div className="flex items-center gap-3">
          {/* Aperçu side panel */}
          <button onClick={() => { setSelectedQuote(row); setIsDetailsOpen(true); }}
            className="flex items-center gap-2 font-bold text-slate-800 hover:text-gray-500 transition">
            <Eye size={18} />
          </button>
          
          {/* Redirection vers page détails */}
          <Link href={`/admin/devis/details/${row.id}`}
            className="group p-2 rounded-xl bg-white hover:bg-black transition flex items-center justify-center">
            <ArrowUpRight size={16} className="group-hover:rotate-45 transition-transform" />
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="ml-64 mt-20 p-6 space-y-8">
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
                onChange={() => showFlash("error", "Fonctionnalité d'import en cours de développement.")} />
            </label> */}
            {/* Exporter */}
            <button
              onClick={() => showFlash("error", "Fonctionnalité d'export en cours de développement.")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-bold hover:bg-slate-50 transition"
            >
              <Upload size={16} /> Exporter
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
            <DataTable columns={columns} data={isLoading ? [] : paginated} onViewAll={() => {}} />
            <div className="p-6 border-t border-slate-50 flex justify-end bg-slate-50/30">
              <Paginate currentPage={currentPage} totalPages={totalPages || 1} onPageChange={setCurrentPage} />
            </div>
          </div>
  {/* ── Modal création ─────────────────────────────────────────── */}
  <ReusableForm
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            title="Ajouter un devis"
            subtitle="Les informations ci-dessous permettront de faire un nouveau devis."
            fields={quoteFields}
            onSubmit={handleCreate}
            submitLabel="Créer le gestionnaire"
          />

          <QuoteSidePanel
            quote={isDetailsOpen ? selectedQuote : null}
            onClose={() => { setIsDetailsOpen(false); setSelectedQuote(null); }}
            onApprove={handleApprove}
            onReject={handleReject}
          />

        
        </main>
      </div>
    </div>
  );
}