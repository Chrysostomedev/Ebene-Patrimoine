"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, MapPin, User, ShieldCheck,
  Clock, FileText, CheckCircle2, AlertTriangle,
  Eye, Wrench, ArrowUpRight, Info, MessageSquare, AlertCircle,
  Star, X, ChevronLeft,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import StatsCard from "@/components/StatsCard";
import RichContent from "@/components/RichContent";
import { ReportService, InterventionReport, ValidateReportPayload } from "../../../../services/admin/report.service";
import { QuoteService, Quote } from "../../../../services/admin/quote.service";
import { InvoiceService, Invoice } from "../../../../services/admin/invoice.service";
import { formatDate, formatCurrency } from "@/lib/utils";
import { useToast } from "@/contexts/ToastContext";

// ─── Validate Modal ────────────────────────────────────────────────────────────
function ValidateModal({
  reportRef, onClose, onConfirm, loading,
}: { reportRef: string; onClose: () => void; onConfirm: (d: ValidateReportPayload) => Promise<void>; loading: boolean }) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-7 py-6 border-b border-slate-100">
          <div><h2 className="text-xl font-black text-slate-900">Valider le rapport</h2><p className="text-xs text-slate-400 mt-0.5">{reportRef}</p></div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition"><X size={18} className="text-slate-500" /></button>
        </div>
        <div className="px-7 py-6 space-y-6">
          <div>
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-3">Note de satisfaction</label>
            <div className="flex gap-2 items-center">
              {Array.from({ length: 5 }, (_, i) => {
                const val = i + 1; const active = val <= (hovered || rating); return (
                  <button key={i} onMouseEnter={() => setHovered(val)} onMouseLeave={() => setHovered(0)} onClick={() => setRating(rating === val ? 0 : val)} className="transition-transform hover:scale-110">
                    <Star size={32} className={`transition-colors ${active ? "fill-yellow-400 text-yellow-400" : "fill-slate-200 text-slate-200"}`} />
                  </button>
                );
              })}
              {rating > 0 && <span className="ml-2 text-sm font-bold text-slate-600">{rating}/5</span>}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-2">Commentaire</label>
            <textarea value={comment} onChange={e => setComment(e.target.value)} rows={4} placeholder="Commentaire de validation..." className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-900 transition" />
          </div>
        </div>
        <div className="px-7 py-5 border-t border-slate-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition">Annuler</button>
          <button onClick={() => onConfirm({ result: "RAS", rating: rating || null, comment: comment.trim() || "" })} disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition disabled:opacity-60">
            {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle2 size={15} />} Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}

const STATUS_LABELS: Record<string, string> = {
  submitted: "Soumis",
  validated: "Validé",
  pending: "En attente",
  rejected: "Rejeté",
  draft: "Brouillon",
};

const STATUS_STYLES: Record<string, string> = {
  submitted: "bg-blue-50 text-blue-700 border-blue-100",
  validated: "bg-emerald-50 text-emerald-700 border-emerald-100",
  pending: "bg-amber-50 text-amber-700 border-amber-100",
  rejected: "bg-red-50 text-red-700 border-red-100",
};

export default function AdminReportDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [report, setReport] = useState<InterventionReport | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isValidModalOpen, setIsValidModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await ReportService.getReport(Number(id));
      setReport(data);

      // Récupérer l'ID du ticket lié depuis le rapport
      const ticketId = data.ticket_id || (data.ticket as any)?.id;
      if (ticketId) {
        const tId = Number(ticketId);

        // Priorité 1 : extraire depuis l'objet rapport (déjà scopé)
        const reportQuotes: Quote[] = Array.isArray((data as any).quotes) ? (data as any).quotes
          : (data as any).devis ? [(data as any).devis] : [];
        const reportInvoices: Invoice[] = Array.isArray((data as any).invoices) ? (data as any).invoices
          : Array.isArray((data as any).factures) ? (data as any).factures
            : (data as any).invoice ? [(data as any).invoice] : [];

        if (reportQuotes.length > 0) {
          setQuotes(reportQuotes);
        } else {
          try {
            const qs = await QuoteService.getQuotesByTicket(tId);
            // Double-vérification client-side si le backend n'a pas filtré
            const filtered = qs.filter(q => !q.ticket_id || Number(q.ticket_id) === tId);
            setQuotes(filtered);
          } catch { setQuotes([]); }
        }

        if (reportInvoices.length > 0) {
          setInvoices(reportInvoices);
        } else {
          try {
            const invs = await InvoiceService.getInvoicesByTicket(tId);
            // Double-vérification client-side : filtre sur ticket via le rapport lié
            const filtered = invs.filter(inv => {
              const rpt = (inv as any).intervention_report ?? (inv as any).interventionReport;
              if (rpt?.ticket_id) return Number(rpt.ticket_id) === tId;
              if ((inv as any).ticket_id) return Number((inv as any).ticket_id) === tId;
              // Si pas d'info ticket on exclut par sécurité
              return false;
            });
            setInvoices(filtered);
          } catch { setInvoices([]); }
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Erreur lors du chargement du rapport");
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => { load(); }, [id]);

  const handleValidate = async (data: ValidateReportPayload) => {
    if (!report) return;
    setActionLoading(true);
    try {
      await ReportService.validateReport(report.id, data);
      toast.success("Rapport validé avec succès.");
      setIsValidModalOpen(false);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Erreur lors de la validation.");
    } finally { setActionLoading(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-slate-100 border-t-slate-900 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <AlertTriangle size={48} className="text-red-400" />
          <p className="text-slate-600 font-bold">{error || "Rapport introuvable"}</p>
          <button onClick={() => router.back()} className="text-sm font-bold text-slate-900 underline underline-offset-4">
            Retourner à la liste
          </button>
        </div>
      </div>
    );
  }

  // Détermination des variables de rendu premium
  const isValidated = report.status === "validated";
  const providerName = report.provider?.company_name || report.provider?.name || "-";
  const siteName = report.site?.nom || report.site?.name || "-";

  // KPIs dynamiques uniformisés selon le modèle premium
  const kpis = [
    { label: "Prestataire", value: providerName, delta: "", trend: "up" as const },
    { label: "Site", value: siteName, delta: "", trend: "up" as const },
    // { label: "Équipements", value: report.asset_results?.length || 0, delta: "", trend: "up" as const },
    { label: "Note", value: report.rating ? `${report.rating}/5` : "N/A", delta: "", trend: "up" as const },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />
      <main className="mt-20 p-8 max-w-7xl mx-auto w-full space-y-8">

        {/* ── Header Premium Uniformisé ── */}
        <div className="bg-white flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="space-y-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-slate-500 hover:text-black transition-colors bg-white px-4 py-2 rounded-xl border border-slate-100 w-fit text-sm font-medium"
            >
              <ChevronLeft size={18} /> Retour
            </button>
            <div>
              <div className="flex items-center gap-4 mb-1">
                <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">
                  Rapport de visite préventive {report.reference || report.id}
                </h1>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${STATUS_STYLES[report.status || "pending"] || "bg-slate-50 text-slate-600 border border-slate-100"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${report.status === 'validated' ? 'bg-emerald-500' : report.status === 'submitted' ? 'bg-blue-500' : 'bg-amber-500'}`} />
                  {STATUS_LABELS[report.status || "pending"] || report.status}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-700">
                  <Wrench size={11} />
                  Préventif
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-400 mt-1">
                <MapPin size={18} />
                <span className="font-medium text-lg">{siteName}</span>
              </div>
              {(report as any).planning?.codification && (
                <div className="flex items-center gap-2 text-slate-500 mt-1">
                  <Clock size={15} />
                  <span className="text-sm font-medium">Planning : {(report as any).planning.codification}</span>
                </div>
              )}
            </div>
          </div>

          {/* Bloc droit - info validation + bouton */}
          <div className="flex flex-col gap-4">
            <div className="bg-slate-50/50 p-6 rounded-[24px] border border-slate-100 flex flex-col gap-4 min-w-[300px]">
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Effectué le</span>
                  <span className="font-bold text-slate-900">{formatDate(report.start_date)}</span>
                </div>
                {isValidated && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Rapport validé le</span>
                    <span className="font-bold text-emerald-700">
                      {formatDate(report.validated_at)}
                    </span>
                  </div>
                )}
              </div>
              {isValidated && report.rating && (
                <div className="border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star
                        key={s}
                        size={16}
                        className={s <= (report.rating || 0) ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"}
                      />
                    ))}
                    <span className="ml-1 text-sm font-bold text-slate-700">{report.rating}/5</span>
                  </div>
                </div>
              )}
            </div>

            {!isValidated && (report.status === "submitted" || report.status === "pending") && (
              <button
                onClick={() => setIsValidModalOpen(true)}
                className="flex items-center justify-center gap-2 bg-slate-900 text-white py-3 px-6 rounded-2xl font-bold hover:bg-black transition-colors"
              >
                <CheckCircle2 size={16} /> Valider le rapport
              </button>
            )}
          </div>
        </div>

        {/* ── KPIs Premium Uniformisés ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {kpis.map((k, i) => <StatsCard key={i} {...k} />)}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Side Info & Tickets */}
          <div className="space-y-8">
            {/* Tickets de Suivi */}
            {(() => {
              const ticketsFromPlanning = (report as any).planning?.tickets || [];
              const ticketsFromResults = (report.asset_results || []).filter((r: any) => r.preventive_ticket_id).map((r: any) => ({
                id: r.preventive_ticket_id,
                code_ticket: r.preventive_ticket_code || `TKP-${r.preventive_ticket_id}`,
                status: "EN_COURS",
                asset: r.asset
              }));

              const allTicketsMap = new Map();
              [...ticketsFromPlanning, ...ticketsFromResults].forEach(t => {
                const tid = t.id || t.preventive_ticket_id;
                if (tid) allTicketsMap.set(tid, t);
              });
              const allTickets = Array.from(allTicketsMap.values());

              if (allTickets.length === 0) return null;

              return (
                <div className="bg-slate-900 rounded-[32px] p-6 shadow-xl shadow-slate-200 space-y-4 border border-slate-800">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <AlertTriangle size={14} className="text-amber-500" /> Tickets de Suivi ({allTickets.length})
                  </h3>
                  <div className="space-y-2">
                    {allTickets.map((t: any, idx: number) => (
                      <Link
                        key={idx}
                        href={`/admin/preventif/${t.id || t.preventive_ticket_id}`}
                        className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/50 border border-slate-700 hover:border-white transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-slate-400 group-hover:text-white shadow-sm">
                            <Wrench size={14} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-white uppercase tracking-tight">
                              {t.code_ticket || `TKP-${t.id || t.preventive_ticket_id}`}
                            </p>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 truncate max-w-[120px]">
                              {t.asset?.designation || t.designation || "Intervention"}
                            </p>
                          </div>
                        </div>
                        <ArrowUpRight size={14} className="text-slate-500 group-hover:text-white" />
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Observations Card */}
            <div className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm space-y-8">
              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <FileText size={14} /> Observations / Constatations
                </p>
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 italic text-sm text-slate-600 min-h-[100px] leading-relaxed font-bold">
                  <RichContent html={report.description || report.findings} />
                </div>
              </div>

              {report.action_taken && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Wrench size={14} /> Actions Menées
                  </p>
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 italic text-sm text-slate-600 min-h-[100px] leading-relaxed font-bold" dangerouslySetInnerHTML={{ __html: report.action_taken }} />
                </div>
              )}

              <div className="pt-6 border-t border-slate-50 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                    <MapPin size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Site</p>
                    <p className="text-xs font-bold text-slate-900">{report.site?.nom || report.site?.name || "N/A"}</p>
                  </div>
                </div>

                {report.site?.manager && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-400">
                      <User size={16} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Gestionnaire Site</p>
                      <p className="text-xs font-bold text-slate-900">
                        {report.site.manager.first_name} {report.site.manager.last_name}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Intervenant</p>
                    <p className="text-xs font-bold text-slate-900">{report.provider?.company_name || report.provider?.name || "N/A"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Asset Checklist */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Diagnostic Technique</h3>
                  <p className="text-xs text-slate-400 font-medium">Contrôle individuel des patrimoines du site</p>
                </div>
                <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {(() => {
                      const res = (report as any).asset_results || (report as any).assets || (report as any).items || [];
                      if (res.length > 0) return res.length;
                      if (report.asset || (report as any).company_asset || report.ticket?.asset) return 1;
                      return 0;
                    })()} Équipements
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {(() => {
                  let results = (report as any).asset_results || (report as any).assets || (report as any).items || [];
                  if (results.length === 0) {
                    const singleAsset = report.asset || (report as any).company_asset || report.ticket?.asset;
                    if (singleAsset) {
                      results = [{
                        asset: singleAsset,
                        status: report.result === "anomalie" ? "ANOMALIE" : "RAS",
                        comment: report.findings || report.description
                      }];
                    }
                  }

                  return results.map((res: any, idx: number) => {
                    const status = (res.status || "RAS").toUpperCase();
                    const isAnomalie = status === "ANOMALIE";
                    const isObservation = status === "OBSERVATION";
                    const isRas = status === "RAS";

                    return (
                      <div key={idx} className={`p-5 rounded-2xl border transition-all ${isAnomalie ? "bg-red-50/30 border-red-100 shadow-sm shadow-red-50" :
                        isObservation ? "bg-amber-50/30 border-amber-100 shadow-sm shadow-amber-50" :
                          "bg-emerald-50/10 border-emerald-100 shadow-sm shadow-emerald-50"
                        }`}>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div className={`mt-1 w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isAnomalie ? "bg-red-500 text-white" :
                              isObservation ? "bg-amber-500 text-white" :
                                "bg-emerald-500 text-white"
                              }`}>
                              {isRas && <CheckCircle2 size={16} />}
                              {isObservation && <Info size={16} />}
                              {isAnomalie && <AlertCircle size={16} />}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900">{res.asset?.designation || res.designation || "Équipement"}</p>
                              <p className="text-[10px] font-medium text-slate-400 tracking-wider uppercase mt-0.5">
                                {res.asset?.codification || res.codification || "N/A"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center bg-slate-100/50 p-1 rounded-xl shrink-0 self-end md:self-auto">
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black tracking-tight transition-all ${isRas ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500/50"
                              }`}>
                              <CheckCircle2 size={12} /> RAS
                            </div>
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black tracking-tight transition-all ${isObservation ? "bg-white text-amber-600 shadow-sm" : "text-slate-500/50"
                              }`}>
                              <Info size={12} /> OBSERVATION
                            </div>
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black tracking-tight transition-all ${isAnomalie ? "bg-white text-red-600 shadow-sm" : "text-slate-500/50"
                              }`}>
                              <AlertCircle size={12} /> ANOMALIE
                            </div>
                            {res.preventive_ticket_id && (
                              <Link
                                href={`/admin/preventif/${res.preventive_ticket_id}`}
                                className="ml-2 p-1.5 bg-white rounded-lg border border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-900 transition shadow-sm"
                                title="Voir le ticket préventif"
                              >
                                <Eye size={14} />
                              </Link>
                            )}
                          </div>
                        </div>

                        {(isAnomalie || isObservation) && res.comment && (
                          <div className="mt-4 pt-4 border-t border-slate-100/50">
                            <div className="flex items-center gap-2 mb-2">
                              <MessageSquare size={12} className={isAnomalie ? "text-red-400" : "text-amber-400"} />
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                {isAnomalie ? "Description de l'anomalie" : "Commentaire / Observation"}
                              </p>
                            </div>
                            <p className={`w-full px-4 py-3 rounded-xl border text-sm font-bold transition-all min-h-[80px] ${isAnomalie ? "bg-white border-red-100 text-red-900" : "bg-white border-amber-100 text-amber-900"
                              }`}>
                              "{res.comment}"
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>

          {/* Devis liés */}
          {quotes.length > 0 && (
            <div className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm mt-6">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Devis du ticket associé ({quotes.length})</h3>
              <div className="space-y-3">
                {quotes.map((q: any, i: number) => {
                  const st = (q.status || "").toLowerCase();
                  const isApproved = ["approved", "approuvé", "validé"].includes(st);
                  const isRejected = ["rejected", "rejeté"].includes(st);
                  return (
                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{q.reference ?? `Devis #${q.id}`}</p>
                        <p className="text-xs text-slate-500">{q.amount_ttc ? formatCurrency(Number(q.amount_ttc)) : "—"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${isApproved ? "bg-emerald-50 border-emerald-200 text-emerald-700" : isRejected ? "bg-red-50 border-red-200 text-red-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                          {isApproved ? "Approuvé" : isRejected ? "Rejeté" : "En attente"}
                        </span>
                        <Link href={`/admin/devis/details/${q.id}`}
                          className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-black hover:border-black hover:text-white transition">
                          <Eye size={14} />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Factures liées */}
          {invoices.length > 0 && (
            <div className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm mt-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Factures ({invoices.length})</h3>
              <div className="space-y-3">
                {invoices.map((inv: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{inv.reference ?? `Facture #${inv.id}`}</p>
                      <p className="text-xs text-slate-500">{inv.amount_ttc ? formatCurrency(Number(inv.amount_ttc)) : "—"}</p>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${inv.payment_status === "paid" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                      {inv.payment_status === "paid" ? "Payée" : "En attente"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {isValidModalOpen && report && (
        <ValidateModal
          reportRef={String(report.reference || `#${report.id}`)}
          onClose={() => setIsValidModalOpen(false)}
          onConfirm={handleValidate}
          loading={actionLoading}
        />
      )}
    </div>
  );
}
