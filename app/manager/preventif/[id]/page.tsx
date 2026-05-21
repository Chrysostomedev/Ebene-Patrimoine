"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import { TicketService } from "@/services/manager/ticket.service";
import { QuoteService, Quote } from "@/services/admin/quote.service";
import { InvoiceService, Invoice } from "@/services/admin/invoice.service";
import { ReportService, ValidateReportPayload } from "@/services/admin/report.service";
import {
    ChevronLeft, MapPin, Calendar,
    CheckCircle2, Loader2,
    FileText, Wrench, Clock, Eye, Star, Send,
    ShieldCheck, User,
    AlertCircle,
} from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { useToast } from "@/contexts/ToastContext";
import Link from "next/link";

const STATUS_STYLE: Record<string, string> = {
    "SIGNALÉ": "bg-slate-100 border-slate-300 text-slate-700",
    "VALIDÉ": "bg-blue-50 border-blue-400 text-blue-700",
    "ASSIGNÉ": "bg-violet-50 border-violet-400 text-violet-700",
    "PLANIFIÉ": "bg-sky-50 border-sky-400 text-sky-700",
    "EN_COURS": "bg-orange-50 border-orange-400 text-orange-600",
    "DEVIS_EN_ATTENTE": "bg-yellow-50 border-yellow-400 text-yellow-700",
    "DEVIS_APPROUVÉ": "bg-teal-50 border-teal-400 text-teal-700",
    "RAPPORTÉ": "bg-amber-50 border-amber-400 text-amber-700",
    "ÉVALUÉ": "bg-emerald-50 border-emerald-400 text-emerald-700",
    "CLOS": "bg-black border-black text-white",
};

export default function ManagerPreventiveTicketDetailPage() {
    const router = useRouter();
    const params = useParams();
    const id = Number(params.id);
    const { toast } = useToast();

    const [ticket, setTicket] = useState<any>(null);
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState("");

    const fetchTicket = async () => {
        try {
            setLoading(true);
            const [core, info] = await Promise.all([
                TicketService.getTicket(id),
                TicketService.getTicketInfo(id),
            ]);
            setTicket({ ...core, ...info, reports: info?.reports || core?.reports || [] });

            try {
                const [qs, invs] = await Promise.all([
                    QuoteService.getQuotesByTicket(id),
                    InvoiceService.getInvoicesByTicket(id),
                ]);
                setQuotes(qs);
                setInvoices(invs);
            } catch { /* silently ignore */ }

            if (info?.devis) setQuotes([info.devis]);
            else if (info?.quotes) setQuotes(info.quotes);
        } catch {
            toast.error("Erreur lors du chargement du ticket");
            router.push("/manager/preventif");
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchTicket(); }, [id]);

    const handleValidate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const reports = ticket?.reports || [];
            const reportToValidate = reports.find((r: any) => r.status !== "validated") || reports[0];
            if (reportToValidate?.id) {
                await ReportService.validateReport(reportToValidate.id, {
                    result: "RAS",
                    rating,
                    comment: comment || "Validé par le gestionnaire",
                });
            } else {
                await TicketService.validateReport(id, { result: "RAS", rating, comment: comment || "Validé" });
            }
            toast.success("Rapport validé avec succès !");
            fetchTicket();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Erreur lors de la validation");
        } finally { setSubmitting(false); }
    };

    const getAssetData = (t: any) => {
        const a = t.asset || t.company_asset || t.patrimoine || t.equipment;
        if (a && typeof a === "object") return { designation: a.designation || a.nom || a.name || "Équipement", codification: a.codification || a.code || "N/A" };
        if (t.planning) {
            const p = t.planning.patrimoine || t.planning.asset || t.planning.company_asset;
            if (p) return { designation: p.designation || p.nom || "Équipement (Planning)", codification: p.codification || "N/A" };
        }
        return { designation: "Équipement", codification: "N/A" };
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
            <Loader2 className="w-10 h-10 text-slate-900 animate-spin" />
            <p className="text-slate-500 font-medium">Chargement...</p>
        </div>
    );
    if (!ticket) return null;

    const assetData = getAssetData(ticket);
    const reports = ticket.reports || [];
    const report = reports[0];
    const isPendingValidation = ticket.status === "RAPPORTÉ";

    return (
        <div className="min-h-screen bg-slate-50/50 pb-20">
            <Navbar />
            <main className="mt-20 p-8 max-w-7xl mx-auto space-y-8">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push("/manager/preventif")}
                        className="p-2 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition text-slate-400 hover:text-slate-900 shadow-sm">
                        <ChevronLeft size={20} />
                    </button>
                    <PageHeader
                        title={`Ticket ${ticket.code_ticket || `#${ticket.id}`}`}
                        subtitle="Vérifiez l'intervention préventive et validez le rapport."
                    />
                </div>

                {/* Header */}
                <div className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                        <div className="space-y-4 flex-1">
                            <div className="flex items-center gap-3">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${STATUS_STYLE[ticket.status] || "bg-slate-50 border-slate-200 text-slate-500"}`}>
                                    {ticket.status}
                                </span>
                                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 uppercase tracking-widest">Préventif</span>
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">{ticket.subject || "Maintenance Préventive"}</h2>
                            <div className="flex flex-wrap gap-4 text-sm text-slate-500 font-medium">
                                <div className="flex items-center gap-2"><MapPin size={16} className="text-slate-400" />{ticket.site?.nom || "—"}</div>
                                <div className="flex items-center gap-2">
                                    <Wrench size={16} className="text-slate-400" />
                                    <span className="font-bold">{assetData.designation}</span>
                                    <span className="text-slate-400">({assetData.codification})</span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-50 rounded-2xl border border-slate-100 p-5 space-y-3 min-w-[200px]">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400 font-medium">Prévu le</span>
                                <span className="font-bold text-slate-900">{formatDate(ticket.planned_at)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400 font-medium">Échéance</span>
                                <span className="font-bold text-slate-900">{formatDate(ticket.due_at)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">

                        {/* Source du ticket (si issu d'une visite) */}
                        {((ticket as any).nature_observation || (ticket as any).commentaire_observation) && (
                            <div className="bg-amber-50 rounded-3xl border border-amber-100 shadow-sm p-6 space-y-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center text-white">
                                        <AlertCircle size={16} />
                                    </div>
                                    <h3 className="text-sm font-black text-amber-900 uppercase tracking-widest">Origine : {(ticket as any).nature_observation === 'anomalie' ? 'Anomalie détectée' : 'Observation lors d\'une visite'}</h3>
                                </div>
                                <div className="p-4 bg-white/50 rounded-2xl border border-amber-200/50 text-sm text-amber-900 leading-relaxed italic font-bold">
                                    {((ticket as any).commentaire_observation || "Aucun commentaire laissé lors de la visite.")}
                                </div>
                            </div>
                        )}

                        {/* Rapport */}
                        {reports.length > 0 && (
                            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-6">
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                    <FileText size={18} className="text-slate-400" /> Rapport d'intervention
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Observations</p>
                                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm text-slate-600 italic min-h-[80px]">
                                            "{report?.findings || "Aucune observation."}"
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Actions menées</p>
                                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm text-slate-600 italic min-h-[80px]">
                                            "{report?.action_taken || "Aucune action."}"
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-slate-50">
                                    <Link href={`/manager/entretien/${report?.id}`}
                                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black transition w-fit">
                                        <Eye size={14} /> Voir le rapport complet
                                    </Link>
                                </div>
                            </div>
                        )}

                        {/* Devis */}
                        {quotes.length > 0 && (
                            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Devis associés ({quotes.length})</h3>
                                <div className="space-y-3">
                                    {quotes.map((q: any, i: number) => {
                                        const st = (q.status || "").toLowerCase();
                                        const isApproved = ["approved", "approuvé", "validé"].includes(st);
                                        const isRejected = ["rejected", "rejeté"].includes(st);
                                        return (
                                            <div key={i} className="space-y-3 p-4 rounded-2xl border border-slate-100 bg-slate-50">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900">{q.reference ?? `Devis #${q.id}`}</p>
                                                        <p className="text-xs text-slate-500 font-bold">{q.amount_ttc ? formatCurrency(Number(q.amount_ttc)) : "—"}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${isApproved ? "bg-emerald-50 border-emerald-200 text-emerald-700" : isRejected ? "bg-red-50 border-red-200 text-red-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                                                            {isApproved ? "Approuvé" : isRejected ? "Rejeté" : "En attente"}
                                                        </span>
                                                        <Link href={`/manager/devis/${q.id}`}
                                                            className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-black hover:border-black hover:text-white transition">
                                                            <Eye size={14} />
                                                        </Link>
                                                    </div>
                                                </div>
                                                {q.description && (
                                                    <div className="text-[11px] text-slate-500 bg-white/50 p-2 rounded-xl border border-slate-100 italic" dangerouslySetInnerHTML={{ __html: q.description }} />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Factures */}
                        {invoices.length > 0 && (
                            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Factures ({invoices.length})</h3>
                                <div className="space-y-3">
                                    {invoices.map((inv: any, i: number) => (
                                        <div key={i} className="space-y-3 p-4 rounded-2xl border border-slate-100 bg-slate-50">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900">{inv.reference ?? `Facture #${inv.id}`}</p>
                                                    <p className="text-xs text-slate-500 font-bold">{inv.amount_ttc ? formatCurrency(Number(inv.amount_ttc)) : "—"}</p>
                                                </div>
                                                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${inv.payment_status === "paid" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                                                    {inv.payment_status === "paid" ? "Payée" : "En attente"}
                                                </span>
                                            </div>
                                            {inv.comment && (
                                                <div className="text-[11px] text-slate-500 bg-white/50 p-2 rounded-xl border border-slate-100 italic">
                                                    {inv.comment}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>


                </div>
            </main>
        </div>
    );
}
