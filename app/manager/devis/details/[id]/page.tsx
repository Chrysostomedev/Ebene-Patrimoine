"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  MapPin,
  Briefcase,
  RefreshCw,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Info,
  Eye,
  Download,
  X,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import StatsCard from "@/components/StatsCard";
import { QuoteService } from "../../../../../services/manager/quote.service";
import { useToast } from "../../../../../contexts/ToastContext";
import type { Quote } from "../../../../../types/manager.types";

// ─────────────────────────────────────────
// STATUS HELPERS
// ─────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; icon: any; color: string }> = {
  pending: { label: "En attente", icon: Clock, color: "bg-orange-50 border-orange-200 text-orange-600" },
  "en attente": { label: "En attente", icon: Clock, color: "bg-orange-50 border-orange-200 text-orange-600" },
  approved: { label: "Approuvé", icon: ThumbsUp, color: "bg-green-50 border-green-200 text-green-700" },
  rejected: { label: "Rejeté", icon: ThumbsDown, color: "bg-red-50 border-red-200 text-red-600" },
  validated: { label: "Validé", icon: CheckCircle2, color: "bg-blue-50 border-blue-200 text-blue-700" },
  revision: { label: "À réviser", icon: RefreshCw, color: "bg-amber-50 border-amber-200 text-amber-700" },
  invalidated: { label: "Invalidé", icon: AlertCircle, color: "bg-rose-50 border-rose-200 text-rose-700" },
};

function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase() || "pending";
  const config = STATUS_MAP[s] || STATUS_MAP.pending;
  const Icon = config.icon;

  return (
    <span className={`flex items-center gap-2 px-4 py-1.5 border rounded-xl text-xs font-black uppercase tracking-tight ${config.color}`}>
      <Icon size={14} />
      {config.label}
    </span>
  );
}

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

const formatMontant = (v?: number | null) => {
  if (!v && v !== 0) return "-";
  return `${v.toLocaleString("fr-FR")} FCFA`;
};

const formatDate = (iso?: string | null) => {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
};

// ─────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────

export default function DevisDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const quoteId = parseInt(id);
  const { toast } = useToast();

  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfPreview, setPdfPreview] = useState<{ url: string; name: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await QuoteService.getQuote(quoteId);
      setQuote(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Impossible de charger les détails du devis.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [quoteId]);

  const handleApprove = async () => {
    if (!confirm("Voulez-vous vraiment approuver ce devis ?")) return;
    setActionLoading(true);
    try {
      await QuoteService.approveQuote(quoteId);
      toast.success("Devis approuvé avec succès");
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Erreur lors de l'approbation");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    const reason = prompt("Motif du rejet (optionnel) :");
    if (reason === null) return;
    setActionLoading(true);
    try {
      await QuoteService.rejectQuote(quoteId, reason);
      toast.success("Devis rejeté");
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Erreur lors du rejet");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col flex-1 min-h-screen bg-gray-50">
      <Navbar />
      <div className="mt-20 flex flex-col items-center justify-center flex-1 gap-4">
        <div className="w-12 h-12 border-4 border-slate-100 border-t-slate-900 rounded-full animate-spin" />
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Chargement du devis...</p>
      </div>
    </div>
  );

  if (error || !quote) return (
    <div className="flex flex-col flex-1 min-h-screen bg-gray-50">
      <Navbar />
      <div className="mt-20 flex flex-col items-center justify-center flex-1 p-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-red-50 flex items-center justify-center text-red-500">
          <AlertCircle size={32} />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-900">Erreur</h2>
          <p className="text-slate-500">{error || "Devis introuvable"}</p>
        </div>
        <Link href="/manager/devis" className="px-6 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold">
          Retour à la liste
        </Link>
      </div>
    </div>
  );

  const totalHT = quote.amount_ht || (quote.items || []).reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const totalTTC = quote.amount_ttc || quote.total_amount_ttc || totalHT * 1.18;

  const kpis = [
    { label: "Prestataire", value: quote.provider?.company_name || quote.provider?.name || "-" },
    { label: "Site", value: quote.site?.nom || quote.site?.name || "-" },
    { label: "Articles", value: quote.items?.length || 0 },
    { label: "Montant TTC", value: formatMontant(totalTTC) }
  ];

  const canAction = quote.status === "pending" || quote.status === "en attente";

  return (
    <div className="flex flex-col flex-1 min-h-screen bg-gray-50 font-sans tracking-tight">
      <Navbar />

      <main className="mt-20 p-8 space-y-8 overflow-y-auto h-[calc(100vh-80px)]">

        {/* HEADER */}
        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <Link
              href="/manager/devis"
              className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-900 transition text-xs font-black uppercase tracking-widest"
            >
              <ChevronLeft size={16} />
              Retour aux devis
            </Link>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-4 flex-wrap">
                <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                  {quote.reference}
                </h1>
                <StatusBadge status={quote.status} />
              </div>

              <div className="flex flex-wrap gap-6 text-sm">
                <div className="flex items-center gap-2 text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                  <Briefcase size={14} className="text-slate-400" />
                  <span className="font-bold text-slate-700">{quote.ticket?.reference || "Sans ticket"}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                  <MapPin size={14} className="text-slate-400" />
                  <span className="font-bold text-slate-700">{quote.site?.nom || quote.site?.name}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                  <FileText size={14} className="text-slate-400" />
                  <span className="font-bold text-slate-700">Créé le {formatDate(quote.created_at)}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 text-white p-6 rounded-3xl flex flex-col items-center justify-center min-w-[200px] shadow-2xl shadow-slate-200">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total à régler</p>
              <p className="text-2xl font-black">{formatMontant(totalTTC)}</p>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {kpis.map((k, i) => <StatsCard key={i} {...k} />)}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* ARTICLES */}
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Articles & Prestations</h3>
                <span className="px-3 py-1 rounded-full bg-slate-50 border border-slate-100 text-[10px] font-black text-slate-500 uppercase">
                  {quote.items?.length || 0} ligne(s)
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Désignation</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Qté</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">P.U</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {(quote.items || []).map((item, i) => {
                      const lineTotal = item.quantity * item.unit_price;
                      return (
                        <tr key={i} className="hover:bg-slate-50/30 transition">
                          <td className="px-8 py-5">
                            <p className="text-sm font-bold text-slate-900">{item.designation}</p>
                          </td>
                          <td className="px-8 py-5 text-center text-sm font-bold text-slate-700 bg-slate-50/20">
                            {item.quantity}
                          </td>
                          <td className="px-8 py-5 text-right text-sm font-medium text-slate-500 font-mono">
                            {formatMontant(item.unit_price)}
                          </td>
                          <td className="px-8 py-5 text-right text-sm font-black text-slate-900">
                            {formatMontant(lineTotal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="p-8 bg-slate-50/50 flex flex-col items-end space-y-2">
                <div className="flex justify-between w-full max-w-[280px]">
                  <span className="text-xs font-bold text-slate-400 uppercase">Total HT</span>
                  <span className="text-sm font-bold text-slate-700">{formatMontant(totalHT)}</span>
                </div>
                <div className="flex justify-between w-full max-w-[280px]">
                  <span className="text-xs font-bold text-slate-400 uppercase">TVA (18%)</span>
                  <span className="text-sm font-bold text-slate-700">{formatMontant(totalTTC - totalHT)}</span>
                </div>
                <div className="h-px w-full max-w-[280px] bg-slate-200 my-2" />
                <div className="flex justify-between w-full max-w-[280px]">
                  <span className="text-sm font-black text-slate-900 uppercase">Total TTC</span>
                  <span className="text-lg font-black text-slate-900">{formatMontant(totalTTC)}</span>
                </div>
              </div>
            </div>

            {/* DESCRIPTION / NOTES */}
            {quote.description && (
              <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-8">
                <div className="flex items-center gap-2 mb-4">
                  <Info size={16} className="text-slate-400" />
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Note descriptive</h3>
                </div>
                <div
                  className="prose prose-sm max-w-none text-slate-600 bg-slate-50 p-6 rounded-2xl border border-slate-100 italic"
                  dangerouslySetInnerHTML={{ __html: quote.description ?? "" }}
                />
              </div>
            )}
          </div>

          <div className="space-y-8">
            {/* DOCUMENTS (pièces jointes PDF) */}
            {(() => {
              const pdfFiles = (quote.attachments ?? []).length > 0
                ? quote.attachments!.map((a) => ({
                  name: a.url.split("/").pop() ?? "document.pdf",
                  url: a.url,
                }))
                : (quote.pdf_paths ?? []).map((path) => ({
                  name: path.split("/").pop() ?? "devis.pdf",
                  url: path,
                }));

              return (
                <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-8">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 border-b border-slate-50 pb-4">Documents</h3>
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
              );
            })()}

            {/* HISTORIQUE */}
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-8">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 border-b border-slate-50 pb-4">Historique de validation</h3>
              <div className="space-y-6">
                {(quote.history || []).length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4 italic">Aucun historique disponible</p>
                ) : (
                  quote.history?.map((h, idx) => (
                    <div key={h.id} className="relative pl-6 pb-6 last:pb-0">
                      {idx !== (quote.history || []).length - 1 && (
                        <div className="absolute left-[3px] top-6 bottom-0 w-px bg-slate-100" />
                      )}
                      <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-slate-900" />
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase text-slate-400">{h.action}</p>
                        <p className="text-sm font-bold text-slate-900">{h.performed_by_name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{formatDate(h.created_at)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* TICKET RÉFÉRENCÉ */}
            {quote.ticket && (
              <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-8 group">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Ticket de référence</h3>
                <div className="p-4 rounded-2xl border border-slate-50 bg-slate-50/50 group-hover:bg-slate-50 transition">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{quote.ticket.reference}</p>
                  <p className="text-sm font-black text-slate-900 mb-3">{quote.ticket.subject}</p>
                  <Link href={`/manager/tickets/${quote.ticket.id}`} className="inline-flex items-center gap-2 text-xs font-black text-slate-900 hover:underline">
                    Détails du ticket <RefreshCw size={10} className="animate-spin-slow" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* PDF fullscreen preview */}
      {pdfPreview && (
        <div className="fixed inset-0 z-[300] flex flex-col bg-black/95">
          <div className="flex items-center justify-between px-6 py-4 bg-black border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-red-600 flex items-center justify-center">
                <FileText size={14} className="text-white" />
              </div>
              <p className="text-white font-bold text-sm">{pdfPreview.name}</p>
            </div>
            <div className="flex items-center gap-3">
              <a
                href={pdfPreview.url}
                download
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition"
              >
                <Download size={14} /> Télécharger
              </a>
              <button
                onClick={() => setPdfPreview(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition"
              >
                <X size={18} className="text-white" />
              </button>
            </div>
          </div>
          <div className="flex-1">
            <iframe
              src={`${pdfPreview.url}#toolbar=0`}
              className="w-full h-full border-0"
              title={pdfPreview.name}
            />
          </div>
        </div>
      )}
    </div>
  );
}