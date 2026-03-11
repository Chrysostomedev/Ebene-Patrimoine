"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import StatsCard from "@/components/StatsCard";
import {
  ChevronLeft, CheckCircle2, XCircle, Clock,
  FileText, Eye, Download, X, User, AlertCircle,
  RefreshCw, MapPin, Tag,
} from "lucide-react";

import {
  providerQuoteService, Quote, QuoteHistory,
  STATUS_LABELS, STATUS_STYLES, STATUS_DOT,
  formatCurrency, formatDate, getPdfUrl,
} from "@services/providerQuoteService";

// ─── StatusBadge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-bold
      ${STATUS_STYLES[status] ?? "border-slate-200 bg-slate-50 text-slate-500"}`}>
      <span className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: STATUS_DOT[status] ?? "#94a3b8" }} />
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ─── PDF Preview Modal ────────────────────────────────────────────────────────

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
          <a href={url} download target="_blank" rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition">
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

// ─── Timeline event ───────────────────────────────────────────────────────────

function TimelineItem({ event, isLast }: { event: QuoteHistory; isLast: boolean }) {
  const actionLabels: Record<string, { label: string; color: string; bg: string }> = {
    created:            { label: "Devis créé",             color: "text-blue-500",   bg: "bg-blue-50 border-blue-200" },
    submitted:          { label: "Soumis pour validation", color: "text-cyan-500",   bg: "bg-cyan-50 border-cyan-200" },
    approved:           { label: "Approuvé",               color: "text-green-500",  bg: "bg-green-50 border-green-200" },
    rejected:           { label: "Rejeté",                 color: "text-red-500",    bg: "bg-red-50 border-red-200" },
    revision_requested: { label: "Révision demandée",      color: "text-orange-500", bg: "bg-orange-50 border-orange-200" },
    updated:            { label: "Mis à jour",             color: "text-purple-500", bg: "bg-purple-50 border-purple-200" },
  };

  const cfg = actionLabels[event.action] ?? {
    label: event.action,
    color: "text-slate-500",
    bg:    "bg-slate-50 border-slate-200",
  };

  return (
    <div className="flex gap-4 group">
      <div className="flex flex-col items-center">
        <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center shrink-0 ${cfg.bg}`}>
          <Clock size={14} className={cfg.color} />
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-slate-100 mt-2" />}
      </div>
      <div className="flex-1 pb-6">
        <div className="flex items-start justify-between gap-3 mb-1">
          <h4 className="text-sm font-bold text-slate-900">{cfg.label}</h4>
          <span className="text-xs text-slate-400 shrink-0">{formatDate(event.created_at)}</span>
        </div>
        {event.performed_by_name && (
          <div className="flex items-center gap-1.5 mb-1">
            <User size={11} className="text-slate-300" />
            <span className="text-xs text-slate-500 font-medium">{event.performed_by_name}</span>
          </div>
        )}
        {(event.reason ?? event.comment) && (
          <div className="mt-1.5 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-xs text-slate-600 italic">"{event.reason ?? event.comment}"</p>
          </div>
        )}
        {event.from_status && event.to_status && (
          <p className="text-xs text-slate-400 mt-1">
            {STATUS_LABELS[event.from_status] ?? event.from_status}
            {" → "}
            <span className="font-bold text-slate-600">{STATUS_LABELS[event.to_status] ?? event.to_status}</span>
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProviderQuoteDetailPage() {
  const params   = useParams();
  const router   = useRouter();
  const quoteId  = Number(params?.id);

  const [quote,      setQuote]      = useState<Quote | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [pdfPreview, setPdfPreview] = useState<{ url: string; name: string } | null>(null);

  useEffect(() => {
    if (!quoteId) return;
    const load = async () => {
      setLoading(true); setError("");
      try {
        const data = await providerQuoteService.getQuoteById(quoteId);
        setQuote(data);
      } catch (e: any) {
        setError(
          e.response?.data?.message ??
          e.response?.data?.error   ??
          "Impossible de charger ce devis."
        );
      } finally { setLoading(false); }
    };
    load();
  }, [quoteId]);

  // ── Calculs ────────────────────────────────────────────────────────────────
  const totalHT   = quote?.amount_ht    ?? 0;
  const taxAmount = quote?.tax_amount   ?? 0;
  const totalTTC  = quote?.amount_ttc   ?? 0;
  const pdfFiles  = (quote?.pdf_paths ?? []).map(p => ({
    name: p.split("/").pop() ?? "devis.pdf",
    url:  getPdfUrl(p),
  }));
  const history = quote?.history ?? [];

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const kpis = [
    { label: "Ticket",        value: quote?.ticket?.subject ?? `#${quote?.ticket_id}`,  delta: "", trend: "up" as const },
    { label: "Site",          value: quote?.site?.nom ?? quote?.site?.name ?? "—",             delta: "", trend: "up" as const },
    { label: "Nb. articles",  value: quote?.items?.length ?? 0,                                delta: "", trend: "up" as const },
    { label: "Montant TTC",   value: formatCurrency(totalTTC),                                 delta: "", trend: "up" as const },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="ml-64 mt-20 p-8 space-y-8">

          {/* Retour */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-500 hover:text-black transition-colors bg-white px-4 py-2 rounded-xl border border-slate-100 w-fit text-sm font-medium"
          >
            <ChevronLeft size={16} /> Retour
          </button>

          {/* Erreur */}
          {error && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl text-sm">
              <AlertCircle size={15} className="shrink-0" /> {error}
            </div>
          )}

          {/* Skeleton */}
          {loading && (
            <div className="space-y-4 animate-pulse">
              <div className="h-10 w-64 bg-slate-100 rounded-2xl" />
              <div className="h-36 bg-slate-100 rounded-3xl" />
              <div className="grid grid-cols-4 gap-6">
                {[0,1,2,3].map(i => <div key={i} className="h-28 bg-slate-100 rounded-3xl" />)}
              </div>
              <div className="h-64 bg-slate-100 rounded-3xl" />
            </div>
          )}

          {quote && (
            <>
              {/* ── Header ──────────────────────────────────────────── */}
              <div className="bg-white flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">
                      {quote.reference}
                    </h1>
                    <StatusBadge status={quote.status} />
                  </div>
                  {quote.ticket?.subject && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <Tag size={14} />
                      <span className="text-sm font-medium">{quote.ticket.subject}</span>
                    </div>
                  )}
                  {(quote.site?.nom ?? quote.site?.name) && (
                    <div className="flex items-center gap-2 text-slate-400">
                      <MapPin size={13} />
                      <span className="text-xs font-medium">{quote.site?.nom ?? quote.site?.name}</span>
                    </div>
                  )}
                </div>

                {/* Dates */}
                <div className="bg-slate-50 p-5 rounded-[24px] border border-slate-100 min-w-[260px] space-y-2.5">
                  {[
                    { label: "Créé le",     value: formatDate(quote.created_at),  show: true },
                    { label: "Approuvé le", value: formatDate(quote.approved_at), show: !!quote.approved_at },
                    { label: "Rejeté le",   value: formatDate(quote.rejected_at), show: !!quote.rejected_at },
                  ].filter(r => r.show).map((r, i) => (
                    <div key={i} className="flex justify-between items-center text-sm">
                      <span className="text-slate-400 font-medium">{r.label}</span>
                      <span className="font-bold text-slate-900">{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── KPIs ────────────────────────────────────────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpis.map((k, i) => <StatsCard key={i} {...k} />)}
              </div>

              {/* ── Contenu ─────────────────────────────────────────── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Colonne gauche */}
                <div className="lg:col-span-2 space-y-6">

                  {/* Description */}
                  <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Description</h3>
                    {quote.description
                      ? <p className="text-sm text-slate-700 leading-relaxed">{quote.description}</p>
                      : <p className="text-slate-400 text-sm italic">Aucune description renseignée.</p>
                    }
                  </div>

                  {/* Articles */}
                  {quote.items && quote.items.length > 0 && (
                    <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                        Articles ({quote.items.length})
                      </h3>
                      <div className="border border-slate-100 rounded-2xl overflow-hidden">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                              <th className="text-left px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Désignation</th>
                              <th className="text-center px-2 py-2.5 text-[10px] font-black text-slate-400 uppercase">Qté</th>
                              <th className="text-right px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase">P.U. HT</th>
                              <th className="text-right px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {quote.items.map((item, i) => (
                              <tr key={i} className="border-b border-slate-50 last:border-0">
                                <td className="px-4 py-3 text-xs font-medium text-slate-900">{item.designation}</td>
                                <td className="px-2 py-3 text-center text-xs text-slate-500">{item.quantity}</td>
                                <td className="px-4 py-3 text-right text-xs text-slate-600">{formatCurrency(item.unit_price)}</td>
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
                            <span className="text-slate-500">TVA ({quote.tax_rate}%)</span>
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

                  {/* Motif rejet */}
                  {quote.status === "rejeté" && quote.rejection_reason && (
                    <div className="bg-red-50 border border-red-200 rounded-[24px] p-6">
                      <h3 className="text-xs font-black text-red-800 uppercase tracking-widest mb-3">Motif de rejet</h3>
                      <p className="text-sm text-red-700 leading-relaxed">{quote.rejection_reason}</p>
                    </div>
                  )}
                </div>

                {/* Colonne droite */}
                <div className="space-y-6">

                  {/* Documents PDF */}
                  <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Documents</h3>
                    {pdfFiles.length > 0
                      ? <div className="space-y-3">
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
                                <a href={file.url} download target="_blank" rel="noreferrer"
                                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-black transition">
                                  <Download size={13} /> Télécharger
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      : <div className="border border-dashed border-slate-200 rounded-xl px-4 py-5 flex items-center gap-3 text-slate-400">
                          <FileText size={16} className="shrink-0" />
                          <p className="text-sm font-medium">Aucun document attaché</p>
                        </div>
                    }
                  </div>

                  {/* Statut actuel */}
                  <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Statut actuel</h3>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                        style={{ backgroundColor: `${STATUS_DOT[quote.status] ?? "#94a3b8"}18` }}>
                        {quote.status === "approuvé"
                          ? <CheckCircle2 size={18} style={{ color: STATUS_DOT[quote.status] }} />
                          : quote.status === "rejeté"
                            ? <XCircle size={18} style={{ color: STATUS_DOT[quote.status] }} />
                            : <Clock size={18} style={{ color: STATUS_DOT[quote.status] ?? "#94a3b8" }} />
                        }
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900">{STATUS_LABELS[quote.status] ?? quote.status}</p>
                        <p className="text-xs text-slate-400 mt-0.5">Màj : {formatDate(quote.updated_at)}</p>
                      </div>
                    </div>

                    {quote.status === "en attente" && (
                      <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 font-medium">
                        ⏳ En attente de validation par l'administrateur.
                      </p>
                    )}
                    {quote.status === "approuvé" && (
                      <p className="text-xs text-green-600 bg-green-50 border border-green-100 rounded-xl px-4 py-3 font-medium">
                        ✅ Devis approuvé. L'intervention peut démarrer.
                      </p>
                    )}
                    {quote.status === "rejeté" && (
                      <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 font-medium">
                        ❌ Devis rejeté. Vous pouvez en soumettre un nouveau.
                      </p>
                    )}
                    {quote.status === "en révision" && (
                      <p className="text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 font-medium">
                        🔄 Une révision a été demandée. Veuillez mettre à jour votre devis.
                      </p>
                    )}
                  </div>

                  {/* Timeline historique */}
                  <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">
                      Historique ({history.length})
                    </h3>
                    {history.length === 0
                      ? <div className="flex flex-col items-center py-8 text-center">
                          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mb-3">
                            <Clock size={20} className="text-slate-300" />
                          </div>
                          <p className="text-sm font-bold text-slate-500">Aucun mouvement</p>
                          <p className="text-xs text-slate-400 mt-1">L'historique s'affichera ici</p>
                        </div>
                      : <div>
                          {history.map((event, i) => (
                            <TimelineItem key={event.id} event={event} isLast={i === history.length - 1} />
                          ))}
                        </div>
                    }
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* PDF Preview Modal — centre */}
      {pdfPreview && (
        <PdfPreviewModal url={pdfPreview.url} name={pdfPreview.name} onClose={() => setPdfPreview(null)} />
      )}
    </div>
  );
}