"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import StatsCard from "@/components/StatsCard";

import {
  ChevronLeft, CheckCircle2, Clock, XCircle, FileText,
  Eye, Download, Star, X, MapPin, Briefcase, RefreshCw,
  Calendar, User, DollarSign, AlertCircle, ThumbsUp, ThumbsDown, MessageSquare
} from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { useToast } from "@/contexts/ToastContext";


// ═══════════════════════════════════════════════════════════════════════════
// ACTION MODAL (Inlined to avoid build errors)
// ═══════════════════════════════════════════════════════════════════════════

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant?: "primary" | "danger" | "warning";
  placeholder?: string;
  required?: boolean;
}

function ActionModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  confirmVariant = "primary",
  placeholder = "Saisissez un motif...",
  required = true
}: ActionModalProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (required && !reason.trim()) {
      setError(true);
      return;
    }
    onConfirm(reason);
    setReason("");
    setError(false);
  };

  const variantStyles = {
    primary: "bg-slate-900 text-white hover:bg-black shadow-slate-200",
    danger: "bg-red-600 text-white hover:bg-red-700 shadow-red-100",
    warning: "bg-amber-500 text-white hover:bg-amber-600 shadow-amber-100",
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${confirmVariant === 'danger' ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-black'}`}>
                <MessageSquare size={20} />
              </div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{title}</h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-xl transition text-slate-400 hover:text-slate-900"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-6">
            <p className="text-slate-500 text-sm leading-relaxed whitespace-pre-line">
              {description}
            </p>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-black px-1">
                {required ? "Motif obligatoire" : "Commentaire (Optionnel)"}
              </label>
              <textarea
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (error) setError(false);
                }}
                placeholder={placeholder}
                rows={4}
                className={`w-full px-5 py-4 bg-slate-50 border rounded-2xl text-black transition focus:ring-4 focus:ring-slate-900/5 focus:outline-none resize-none
                  ${error ? 'border-red-200 focus:border-red-500' : 'border-slate-100 focus:border-slate-900/20'}
                `}
              />
              {error && (
                <div className="flex items-center gap-1.5 text-red-900 text-[10px] font-bold uppercase tracking-wide px-1">
                  <AlertCircle size={10} />
                  Saisie requise pour continuer
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 py-4 px-6 rounded-2xl bg-white border border-slate-100 text-slate-600 text-sm font-black uppercase tracking-widest hover:bg-slate-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirm}
                className={`flex-1 py-4 px-6 rounded-2xl text-sm font-black uppercase tracking-widest transition shadow-xl ${variantStyles[confirmVariant]}`}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { QuoteService, Quote, QuoteHistory } from "../../../../../services/admin/quote.service";

// ═══════════════════════════════════════════════════════════════════════════
// Using centralized formatDate and formatCurrency from @/lib/utils


// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANTS LOCAUX
// ═══════════════════════════════════════════════════════════════════════════

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "border-amber-200 bg-amber-50 text-amber-600",
    approved: "border-emerald-200 bg-emerald-50 text-emerald-600",
    rejected: "border-rose-200 bg-rose-50 text-rose-600",
    revision: "border-sky-200 bg-sky-50 text-sky-600",
  };
  const labels: Record<string, string> = {
    pending: "En attente",
    approved: "Approuvé",
    rejected: "Rejeté",
    revision: "En révision",
  };
  const icons: Record<string, React.ReactNode> = {
    pending: <Clock size={14} />,
    approved: <CheckCircle2 size={14} />,
    rejected: <XCircle size={14} />,
    revision: <RefreshCw size={14} />,
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-bold ${styles[status] ?? "border-slate-200 bg-slate-50 text-slate-500"
        }`}
    >
      {icons[status]}
      {labels[status] ?? status}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TIMELINE HISTORIQUE - Actions sur le devis
// ═══════════════════════════════════════════════════════════════════════════

interface TimelineItemProps {
  action: string;
  performedBy?: string;
  date: string;
  reason?: string | null;
}

function TimelineItem({ action, performedBy, date, reason }: TimelineItemProps) {
  const actionLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    created: {
      label: "Devis créé",
      icon: <FileText size={16} className="text-blue-500" />,
      color: "border-blue-200 bg-blue-50",
    },
    submitted: {
      label: "Soumis pour validation",
      icon: <CheckCircle2 size={16} className="text-cyan-500" />,
      color: "border-cyan-200 bg-cyan-50",
    },
    approved: {
      label: "Approuvé",
      icon: <CheckCircle2 size={16} className="text-green-500" />,
      color: "border-green-200 bg-green-50",
    },
    rejected: {
      label: "Rejeté",
      icon: <XCircle size={16} className="text-red-500" />,
      color: "border-red-200 bg-red-50",
    },
    revision_requested: {
      label: "Révision demandée",
      icon: <RefreshCw size={16} className="text-orange-500" />,
      color: "border-orange-200 bg-orange-50",
    },
    updated: {
      label: "Mis à jour",
      icon: <RefreshCw size={16} className="text-purple-500" />,
      color: "border-purple-200 bg-purple-50",
    },
  };

  const config = actionLabels[action] ?? {
    label: action,
    icon: <AlertCircle size={16} className="text-slate-500" />,
    color: "border-slate-200 bg-slate-50",
  };

  return (
    <div className="flex gap-4 group">
      {/* Icône + ligne verticale */}
      <div className="flex flex-col items-center">
        <div
          className={`w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 ${config.color}`}
        >
          {config.icon}
        </div>
        <div className="w-0.5 flex-1 bg-slate-200 group-last:bg-transparent mt-2" />
      </div>

      {/* Contenu */}
      <div className="flex-1 pb-6">
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-sm font-bold text-slate-900">{config.label}</h4>
          <span className="text-xs text-slate-400">{formatDate(date)}</span>
        </div>
        {performedBy && (
          <p className="text-xs text-slate-500 mb-1">
            Par <span className="font-semibold">{performedBy}</span>
          </p>
        )}
        {reason && (
          <div className="mt-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-xs text-slate-600 italic">"{reason}"</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// LISTE DEVIS LIÉS AU TICKET - Historique complet
// ═══════════════════════════════════════════════════════════════════════════

interface RelatedQuotesListProps {
  quotes: Quote[];
  currentQuoteId: number;
}

function RelatedQuotesList({ quotes, currentQuoteId }: RelatedQuotesListProps) {
  if (quotes.length <= 1) return null;

  return (
    <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">

    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PDF PREVIEW MODAL
// ═══════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════
// PAGE DÉTAIL DEVIS
// ═══════════════════════════════════════════════════════════════════════════

export default function DevisDetailsPage() {
  const params = useParams();
  const quoteId = Number(params.id);

  const [quote, setQuote] = useState<Quote | null>(null);
  const [relatedQuotes, setRelatedQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<{ url: string; name: string } | null>(null);
  const [modalMode, setModalMode] = useState<"approve" | "reject" | "revision" | null>(null);
  const { toast } = useToast();

  // ── Chargement du devis ─────────────────────────────────────────────────────
  const fetchQuote = async () => {
    setIsLoading(true);
    try {
      const data = await QuoteService.getQuote(quoteId);
      setQuote(data);

      // Charger les devis liés au même ticket
      if (data.ticket_id) {
        const related = await QuoteService.getQuotesByTicket(data.ticket_id);
        setRelatedQuotes(related);
      }
    } catch (err) {
      console.error("Erreur chargement devis", err);
      toast.error("Impossible de charger le devis.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (quoteId) fetchQuote();
  }, [quoteId]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleApprove = async () => {
    setModalMode("approve");
  };

  const handleApproveConfirm = async (comment: string) => {
    setActionLoading(true);
    try {
      await QuoteService.approveQuote(quoteId);
      toast.success("Devis approuvé avec succès.");
      setModalMode(null);
      fetchQuote();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Erreur lors de l'approbation.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleActionConfirm = async (reason: string) => {
    if (!modalMode) return;
    setActionLoading(true);
    try {
      if (modalMode === "reject") {
        await QuoteService.rejectQuote(quoteId, reason);
        toast.success("Devis rejeté.");
      } else {
        await QuoteService.requestRevision(quoteId, reason);
        toast.success("Révision demandée au prestataire.");
      }
      setModalMode(null);
      fetchQuote();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Une erreur est survenue.");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Calculs dynamiques ──────────────────────────────────────────────────────
  const isPending = quote?.status === "pending";
  const isApproved = quote?.status === "approved";
  const isRejected = quote?.status === "rejected";
  const isRevision = quote?.status === "revision";

  const totalHT = quote?.amount_ht ?? quote?.items?.reduce((s, i) => s + i.quantity * i.unit_price, 0) ?? 0;
  const taxAmount = quote?.tax_amount ?? totalHT * 0.18;
  const totalTTC = quote?.amount_ttc ?? totalHT + taxAmount;

  const providerName = quote?.provider?.name ?? quote?.provider?.company_name ?? "-";
  const siteName = quote?.site?.nom ?? quote?.site?.name ?? "-";
  const ticketRef = quote?.ticket?.code_ticket ?? quote?.ticket?.title ?? `Ticket ${quote?.ticket_code_ticket}`;

  // Pièces jointes PDF — priorité à attachments (avec url pré-construite), fallback sur pdf_paths
  const pdfFiles = (quote?.attachments ?? []).length > 0
    ? (quote!.attachments!).map((a) => ({
      name: a.url.split("/").pop() ?? "document.pdf",
      url: a.url,
    }))
    : (quote?.pdf_paths ?? []).map((path) => ({
      name: path.split("/").pop() ?? "devis.pdf",
      url: QuoteService.getPdfUrl(path),
    }));

  // Historique
  const history = quote?.history ?? [];

  // KPIs
  const kpis = [
    { label: "Prestataire", value: providerName, delta: "", trend: "up" as const },
    { label: "Site", value: siteName, delta: "", trend: "up" as const },
    { label: "Nombre d'articles", value: quote?.items?.length ?? 0, delta: "", trend: "up" as const },
    { label: "Montant TTC", value: formatCurrency(totalTTC), delta: "", trend: "up" as const },
  ];


  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="mt-20 p-8 space-y-8">

          {/* ── Header ────────────────────────────────────────────────────── */}
          <div className="bg-white flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="space-y-4">
              <Link
                href="/admin/devis"
                className="flex items-center gap-2 text-slate-500 hover:text-black transition-colors bg-white px-4 py-2 rounded-xl border border-slate-100 w-fit text-sm font-medium"
              >
                <ChevronLeft size={18} /> Retour
              </Link>
              <div>
                <div className="flex items-center gap-4 mb-1">
                  <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase">
                    {isLoading ? "Chargement..." : quote?.reference ?? `Devis #${quoteId}`}
                  </h1>
                  {quote && <StatusBadge status={quote.status} />}
                </div>
                <div className="flex items-center gap-2 text-slate-400 mt-1">
                  <Briefcase size={18} />
                  <span className="font-medium text-lg">{ticketRef}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500 mt-1">
                  <MapPin size={15} />
                  <span className="text-sm font-medium">{siteName}</span>
                </div>
              </div>
            </div>

            {/* Bloc droit - info dates */}
            <div className="flex flex-col gap-4">
              <div className="bg-slate-50/50 p-6 rounded-[24px] border border-slate-100 flex flex-col gap-4 min-w-[300px]">
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Créé le</span>
                    <span className="font-bold text-slate-900">{formatDate(quote?.created_at)}</span>
                  </div>
                  {isApproved && quote?.approved_at && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-medium">Approuvé le</span>
                      <span className="font-bold text-emerald-700">{formatDate(quote.approved_at)}</span>
                    </div>
                  )}
                  {isRejected && quote?.rejected_at && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-medium">Rejeté le</span>
                      <span className="font-bold text-red-700">{formatDate(quote.rejected_at)}</span>
                    </div>
                  )}
                  {isRevision && quote?.revision_requested_at && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-medium">Révision le</span>
                      <span className="font-bold text-blue-700">
                        {formatDate(quote.revision_requested_at)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions Admin */}
            {isPending && (
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setModalMode("reject")}
                  disabled={actionLoading}
                  className="px-6 py-3 rounded-2xl bg-white border border-red-100 text-red-600 text-sm font-black hover:bg-red-50 transition flex items-center gap-2 disabled:opacity-50"
                >
                  <ThumbsDown size={16} /> Rejeter
                </button>
                <button
                  onClick={() => setModalMode("revision")}
                  disabled={actionLoading}
                  className="px-6 py-3 rounded-2xl bg-white border border-amber-100 text-amber-600 text-sm font-black hover:bg-amber-50 transition flex items-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw size={16} /> Révision
                </button>
                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="px-6 py-3 rounded-2xl bg-slate-900 text-white text-sm font-black hover:bg-black transition flex items-center gap-2 shadow-xl shadow-slate-200 disabled:opacity-50"
                >
                  <ThumbsUp size={16} /> Valider le devis
                </button>
              </div>
            )}
          </div>

          {/* ── KPIs ──────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis.map((k, i) => (
              <StatsCard key={i} {...k} />
            ))}
          </div>

          {/* ── Contenu principal ─────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Colonne gauche : Description + Items + Motif rejet */}
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">
                  Description
                </h3>
                {quote?.description ? (
                  <p className="text-sm text-slate-700 leading-relaxed">{quote.description}</p>
                ) : (
                  <p className="text-slate-400 text-sm italic">Aucune description renseignée.</p>
                )}
              </div>

              {/* Articles du devis */}
              {quote?.items && quote.items.length > 0 && (
                <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">
                    Details
                    {/* ({quote.items.length}) */}
                  </h3>
                  <div className="border border-slate-100 rounded-2xl overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="text-left px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Désignation
                          </th>
                          <th className="text-center px-2 py-2.5 text-[10px] font-black text-slate-400 uppercase">
                            Qté
                          </th>
                          <th className="text-right px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase">
                            P.U. HT
                          </th>
                          <th className="text-right px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {quote.items.map((item, i) => (
                          <tr key={i} className="border-b border-slate-50 last:border-0">
                            <td className="px-4 py-3 text-xs font-medium text-slate-900">{item.designation}</td>
                            <td className="px-2 py-3 text-center text-xs text-slate-500">{item.quantity}</td>
                            <td className="px-4 py-3 text-right text-xs text-slate-600">
                              {formatCurrency(item.unit_price)}
                            </td>

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

              {/* Motif de rejet */}
              {isRejected && quote?.rejection_reason && (
                <div className="bg-red-50 border border-red-200 rounded-[24px] p-6">
                  <h3 className="text-sm font-black text-red-800 uppercase tracking-widest mb-3">
                    Motif de rejet
                  </h3>
                  <p className="text-sm text-red-700 leading-relaxed">{quote.rejection_reason}</p>
                </div>
              )}

              {/* Motif révision */}
              {isRevision && quote?.revision_reason && (
                <div className="bg-blue-50 border border-blue-200 rounded-[24px] p-6">
                  <h3 className="text-sm font-black text-blue-800 uppercase tracking-widest mb-3">
                    Motif de révision
                  </h3>
                  <p className="text-sm text-blue-700 leading-relaxed">{quote.revision_reason}</p>
                </div>
              )}

              {/* Timeline historique */}
              {history.length > 0 && (
                <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">
                    Historique ({history.length})
                  </h3>
                  <div className="space-y-0">
                    {history.map((h) => (
                      <TimelineItem
                        key={h.id}
                        action={h.action}
                        performedBy={h.performed_by_name}
                        date={h.created_at}
                        reason={h.reason}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Colonne droite : Documents + Devis liés */}
            <div className="space-y-6">
              {/* Pièces jointes PDF */}
              <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Documents</h3>
                {pdfFiles.length > 0 ? (
                  <div className="space-y-3">
                    {pdfFiles.map((file, i) => (
                      <div key={i} className="flex flex-col gap-2 p-3 rounded-xl border border-slate-100 bg-slate-50">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                            <FileText size={16} className="text-red-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">{file.name}</p>
                            <p className="text-[10px] text-slate-400">PDF</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setPdfPreview({ url: file.url, name: file.name })}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-bold hover:bg-white transition"
                          >
                            <Eye size={13} /> Aperçu
                          </button>
                          <a
                            href={file.url}
                            download
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-black transition"
                          >
                            <Download size={13} /> Télécharger
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border border-dashed border-slate-200 rounded-xl px-4 py-5 flex items-center gap-3 text-slate-400">
                    <FileText size={16} className="shrink-0" />
                    <p className="text-sm font-medium">Aucun document attaché</p>
                  </div>
                )}
              </div>

              {/* Devis liés au ticket */}
              <RelatedQuotesList quotes={relatedQuotes} currentQuoteId={quoteId} />

              {/* Informations ticket */}
              {quote?.ticket && (
                <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Ticket lié</h3>
                  <div className="space-y-2.5">
                    {[
                      { label: "Référence", value: quote.ticket.code_ticket ?? "-" },
                      { label: "Sujet", value: quote.ticket.subject ?? quote.ticket.title ?? "-" },
                      { label: "Type", value: quote.ticket.type ?? "-" },
                      { label: "Statut", value: quote.ticket.status ?? "-" },
                    ].map((f, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0"
                      >
                        <span className="text-xs text-slate-400 font-medium">{f.label}</span>
                        <span className="text-xs font-bold text-slate-900">{f.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* PDF fullscreen */}
      {pdfPreview && (
        <PdfPreviewModal url={pdfPreview.url} name={pdfPreview.name} onClose={() => setPdfPreview(null)} />
      )}

      {/* Action Modals */}
      <ActionModal
        isOpen={modalMode === "approve"}
        onClose={() => setModalMode(null)}
        onConfirm={handleApproveConfirm}
        title="Approuver le devis"
        description="Êtes-vous sûr de vouloir approuver ce devis ? Cette action déclenchera la suite du processus d'intervention."
        confirmLabel="Approuver"
        confirmVariant="primary"
        placeholder="Ajouter un commentaire (optionnel)..."
        required={false}
      />

      <ActionModal
        isOpen={modalMode === "reject"}
        onClose={() => setModalMode(null)}
        onConfirm={handleActionConfirm}
        title="Rejeter le devis"
        description="Veuillez indiquer le motif du rejet. Le prestataire en sera notifié."
        confirmLabel="Rejeter"
        confirmVariant="danger"
        required={true}
      />

      <ActionModal
        isOpen={modalMode === "revision"}
        onClose={() => setModalMode(null)}
        onConfirm={handleActionConfirm}
        title="Demander une révision"
        description="Indiquez les modifications souhaitées sur ce devis."
        confirmLabel="Demander la révision"
        confirmVariant="warning"
        required={true}
      />
    </div>
  );
}