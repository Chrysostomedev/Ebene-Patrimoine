"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import { TicketService } from "@/services/admin/ticket.service";
import { QuoteService, Quote } from "@/services/admin/quote.service";
import { InvoiceService, Invoice } from "@/services/admin/invoice.service";
import { ReportService, ValidateReportPayload } from "@/services/admin/report.service";
import {
    ChevronLeft, MapPin, Calendar,
    User, CheckCircle2, AlertCircle, Loader2,
    FileText, Wrench, Clock, Eye, X, Star, Info,
    ShieldCheck, Shield, Tag, Download, ArrowUpRight
} from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { useToast } from "@/contexts/ToastContext";
import Link from "next/link";
import { resolveUrl } from "@/components/AttachmentViewer";

const getUrl = resolveUrl;

const STATUS_STYLE: Record<string, string> = {
    "SIGNALÉ": "bg-slate-100 border-slate-300 text-slate-700",
    "VALIDÉ": "bg-blue-50 border-blue-400 text-blue-700",
    "ASSIGNÉ": "bg-violet-50 border-violet-400 text-violet-700",
    "PLANIFIÉ": "bg-sky-50 border-sky-400 text-sky-700",
    "EN_COURS": "bg-orange-50 border-orange-400 text-orange-600",
    "EN_TRAITEMENT": "bg-orange-50 border-orange-400 text-orange-600",
    "DEVIS_EN_ATTENTE": "bg-yellow-50 border-yellow-400 text-yellow-700",
    "DEVIS_APPROUVÉ": "bg-teal-50 border-teal-400 text-teal-700",
    "RAPPORTÉ": "bg-amber-50 border-amber-400 text-amber-700",
    "ÉVALUÉ": "bg-emerald-50 border-emerald-400 text-emerald-700",
    "CLOS": "bg-black border-black text-white",
};

// ─── Validate Modal ────────────────────────────────────────────────────────────
function ValidateModal({
    ticketRef, onClose, onConfirm, loading,
}: {
    ticketRef: string;
    onClose: () => void;
    onConfirm: (data: ValidateReportPayload) => Promise<void>;
    loading: boolean;
}) {
    const [rating, setRating] = useState(0);
    const [hovered, setHovered] = useState(0);
    const [comment, setComment] = useState("");

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-7 py-6 border-b border-slate-100">
                    <div>
                        <h2 className="text-xl font-black text-slate-900">Valider le rapport</h2>
                        <p className="text-xs text-slate-400 mt-0.5">{ticketRef}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition">
                        <X size={18} className="text-slate-500" />
                    </button>
                </div>
                <div className="px-7 py-6 space-y-6">
                    <div>
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-3">
                            Note de satisfaction
                        </label>
                        <div className="flex gap-2 items-center">
                            {Array.from({ length: 5 }, (_, i) => {
                                const val = i + 1;
                                const active = val <= (hovered || rating);
                                return (
                                    <button key={i}
                                        onMouseEnter={() => setHovered(val)}
                                        onMouseLeave={() => setHovered(0)}
                                        onClick={() => setRating(rating === val ? 0 : val)}
                                        className="transition-transform hover:scale-110">
                                        <Star size={32} className={`transition-colors ${active ? "fill-yellow-400 text-yellow-400" : "fill-slate-200 text-slate-200"}`} />
                                    </button>
                                );
                            })}
                            {rating > 0 && <span className="ml-2 text-sm font-bold text-slate-600">{rating}/5</span>}
                        </div>
                    </div>
                    <div>
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                            Commentaire
                        </label>
                        <textarea
                            value={comment}
                            onChange={e => setComment(e.target.value)}
                            rows={4}
                            placeholder="Ajouter un commentaire de validation..."
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 placeholder-slate-300 resize-none focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition"
                        />
                    </div>
                </div>
                <div className="px-7 py-5 border-t border-slate-100 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition">
                        Annuler
                    </button>
                    <button
                        onClick={() => onConfirm({ result: "RAS", rating: rating || null, comment: comment.trim() || "" })}
                        disabled={loading}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition disabled:opacity-60">
                        {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle2 size={15} />}
                        Confirmer
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── PDF Preview ──────────────────────────────────────────────────────────────
function PdfModal({ url, name, onClose }: { url: string; name: string; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-[300] flex flex-col bg-black/95">
            <div className="flex items-center justify-between px-6 py-4 bg-black border-b border-white/10 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-red-600 flex items-center justify-center shrink-0">
                        <FileText size={14} className="text-white" />
                    </div>
                    <p className="text-white font-bold text-sm truncate max-w-[400px]">{name}</p>
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

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function AdminPreventiveTicketDetailPage() {
    const router = useRouter();
    const params = useParams();
    const id = Number(params.id);
    const { toast } = useToast();

    const [ticket, setTicket] = useState<any>(null);
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [isValidModalOpen, setIsValidModalOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [pdfPreview, setPdfPreview] = useState<{ url: string; name: string } | null>(null);

    const loadData = async () => {
        try {
            setLoading(true);
            const [core, info] = await Promise.all([
                TicketService.getTicket(id),
                TicketService.getTicketInfo(id),
            ]);
            const merged = {
                ...core,
                ...info,
                reports: info?.reports || core?.reports || [],
            };
            setTicket(merged);

            const tId = Number(id);

            // ─── Devis ──────────────────────────────────────────────────────
            let currentQuotes: Quote[] = [];
            if (Array.isArray(info?.quotes)) currentQuotes = info.quotes;
            else if (info?.devis && typeof info.devis === "object") currentQuotes = [info.devis];

            if (currentQuotes.length === 0) {
                try {
                    const qs = await QuoteService.getQuotesByTicket(tId);
                    currentQuotes = qs.filter(q => !q.ticket_id || Number(q.ticket_id) === tId);
                } catch { currentQuotes = []; }
            }
            setQuotes(currentQuotes);

            // ─── Factures : RÉCUPÉRATION MANUELLE (Solution robuste) ────────
            try {
                const globalInvoices = await InvoiceService.getInvoices({ per_page: 100 });

                const approvedQuote = currentQuotes.find((q: any) =>
                    ["approved", "approuvé", "validé", "validated"].includes(String(q?.status || "").toLowerCase())
                );

                const filteredInvoices = globalInvoices.filter((inv: any) => {
                    const matchTicket = (inv.ticket_id && Number(inv.ticket_id) === Number(id)) ||
                        (inv.intervention_report?.ticket_id && Number(inv.intervention_report.ticket_id) === Number(id)) ||
                        (inv.interventionReport?.ticket_id && Number(inv.interventionReport.ticket_id) === Number(id));

                    const matchQuote = approvedQuote && inv.quote_id && Number(inv.quote_id) === Number(approvedQuote.id);
                    return matchTicket || matchQuote;
                });

                if (filteredInvoices.length > 0) {
                    setInvoices(filteredInvoices);
                } else {
                    const infoInvoices: Invoice[] = [];
                    if (Array.isArray(info?.invoices)) infoInvoices.push(...info.invoices);
                    else if (Array.isArray(info?.factures)) infoInvoices.push(...info.factures);
                    else if (info?.facture && typeof info.facture === "object") infoInvoices.push(info.facture);
                    else if (info?.invoice && typeof info.invoice === "object") infoInvoices.push(info.invoice);
                    setInvoices(infoInvoices);
                }
            } catch (err) {
                console.error("[AdminPreventifDetail] Erreur fetch invoices:", err);
                setInvoices([]);
            }

        } catch {
            toast.error("Erreur lors du chargement du ticket");
            router.push("/admin/preventif");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [id]);

    const handleValidate = async (data: ValidateReportPayload) => {
        setActionLoading(true);
        try {
            const reports = ticket?.reports || [];
            const reportToValidate = reports.find((r: any) => r.status !== "validated") || reports[0];
            if (reportToValidate?.id) {
                await ReportService.validateReport(reportToValidate.id, data);
            }
            toast.success("Rapport validé avec succès.");
            setIsValidModalOpen(false);
            loadData();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Erreur lors de la validation.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleClose = async () => {
        if (!confirm("Êtes-vous sûr de vouloir clôturer ce ticket ?")) return;
        setActionLoading(true);
        try {
            await TicketService.closeTicket(id);
            toast.success("Ticket clôturé avec succès.");
            loadData();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Erreur lors de la clôture.");
        } finally { setActionLoading(false); }
    };

    // ─── Helpers ───────────────────────────────────────────────────────────────
    const getAssetData = (t: any) => {
        const directAsset = t.asset || t.company_asset || t.patrimoine || t.equipment;
        if (directAsset && typeof directAsset === "object" && (directAsset.designation || directAsset.nom || directAsset.name)) {
            return {
                designation: directAsset.designation || directAsset.nom || directAsset.name,
                codification: directAsset.codification || directAsset.code || "N/A",
            };
        }

        const flatDesignation = t.asset_designation || t.company_asset_designation
            || t.asset_name || t.patrimoine_nom || t.designation;
        if (flatDesignation) {
            return {
                designation: flatDesignation,
                codification: t.asset_codification || t.codification || "N/A",
            };
        }

        if (t.planning) {
            const planningAsset = t.planning.patrimoine
                || t.planning.asset
                || t.planning.company_asset
                || t.planning.assets?.[0]
                || t.planning.patrimoines?.[0]
                || t.planning.company_assets?.[0];

            if (planningAsset && typeof planningAsset === "object" && (planningAsset.designation || planningAsset.nom)) {
                return {
                    designation: planningAsset.designation || planningAsset.nom || planningAsset.name,
                    codification: planningAsset.codification || planningAsset.code || "N/A",
                };
            }

            const planningFlat = t.planning.asset_designation || t.planning.patrimoine_nom || t.planning.designation;
            if (planningFlat) {
                return {
                    designation: planningFlat,
                    codification: t.planning.asset_codification || t.planning.codification || "N/A",
                };
            }
        }

        const firstReport = (t.reports || [])[0];
        if (firstReport) {
            const reportAsset = firstReport.asset || firstReport.company_asset || firstReport.patrimoine;
            if (reportAsset && typeof reportAsset === "object" && (reportAsset.designation || reportAsset.nom)) {
                return {
                    designation: reportAsset.designation || reportAsset.nom,
                    codification: reportAsset.codification || reportAsset.code || "N/A",
                };
            }
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

    return (
        <div className="min-h-screen bg-slate-50/50 pb-20">
            <Navbar />
            <main className="mt-20 p-8 max-w-7xl mx-auto space-y-8">
                <div className="flex items-center gap-4">
                    <PageHeader
                        title={`Ticket Préventif ${ticket.code_ticket || `#${ticket.id}`}`}
                        subtitle="Détails et suivi de l'intervention de maintenance préventive."
                    />
                    <button onClick={() => router.push("/admin/preventif")}
                        className="p-2 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition text-slate-400 hover:text-slate-900 shadow-sm">
                        <ChevronLeft size={20} />
                    </button>
                </div>

                <div className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                        <div className="space-y-4 flex-1">
                            <div className="flex items-center gap-3 flex-wrap">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${STATUS_STYLE[ticket.status] || "bg-slate-50 border-slate-200 text-slate-500"}`}>
                                    {ticket.status}
                                </span>
                                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 uppercase tracking-widest">
                                    Préventif
                                </span>
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">{ticket.subject || "Maintenance Préventive"}</h2>
                            <div className="flex flex-wrap gap-4 text-sm text-slate-500 font-medium">
                                <div className="flex items-center gap-2"><MapPin size={16} className="text-slate-400" />{ticket.site?.nom || ticket.site?.name || "—"}</div>
                                <div className="flex items-center gap-2">
                                    <Wrench size={16} className="text-slate-400" />
                                    <span className="font-bold">{assetData.designation}</span>
                                    <span className="text-slate-400">({assetData.codification})</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 flex-wrap pt-2">
                                {ticket.status === "RAPPORTÉ" && (
                                    <button onClick={() => setIsValidModalOpen(true)}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition">
                                        <CheckCircle2 size={14} /> Valider le rapport
                                    </button>
                                )}
                                {ticket.status === "ÉVALUÉ" && (
                                    <button onClick={handleClose} disabled={actionLoading}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition disabled:opacity-60">
                                        <Shield size={14} /> Clôturer le ticket
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-2xl border border-slate-100 p-5 space-y-3 min-w-[220px]">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400 font-medium">Prévu le</span>
                                <span className="font-bold text-slate-900">{formatDate(ticket.planned_at)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400 font-medium">Échéance</span>
                                <span className="font-bold text-slate-900">{formatDate(ticket.due_at)}</span>
                            </div>
                            {ticket.closed_at && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400 font-medium">Clôturé le</span>
                                    <span className="font-bold text-slate-900">{formatDate(ticket.closed_at)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        {(ticket.nature_observation || ticket.commentaire_observation) && (
                            <div className={`rounded-3xl border p-6 shadow-sm flex flex-col gap-4 ${String(ticket.nature_observation).toUpperCase() === "ANOMALIE"
                                ? "bg-red-50/50 border-red-100"
                                : "bg-amber-50/50 border-amber-100"
                                }`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${String(ticket.nature_observation).toUpperCase() === "ANOMALIE"
                                        ? "bg-red-500 text-white"
                                        : "bg-amber-500 text-white"
                                        }`}>
                                        {String(ticket.nature_observation).toUpperCase() === "ANOMALIE" ? <AlertCircle size={20} /> : <Info size={20} />}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Origine du ticket</p>
                                        <p className={`text-sm font-black uppercase tracking-tight ${String(ticket.nature_observation).toUpperCase() === "ANOMALIE" ? "text-red-700" : "text-amber-700"
                                            }`}>
                                            {ticket.nature_observation || "Observation"}
                                        </p>
                                    </div>
                                </div>
                                {ticket.commentaire_observation && (
                                    <div className="bg-white/60 rounded-2xl p-4 border border-white/40">
                                        <p className="text-sm text-slate-700 font-bold leading-relaxed italic">
                                            "{ticket.commentaire_observation}"
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {ticket.description && (
                            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Description</h3>
                                <p className="text-sm text-slate-600 leading-relaxed">{ticket.description}</p>
                            </div>
                        )}

                        {reports.length > 0 && (
                            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                                    Rapports d'intervention ({reports.length})
                                </h3>
                                <div className="space-y-3">
                                    {reports.map((r: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50">
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">{r.reference ?? `Rapport #${r.id}`}</p>
                                                <p className="text-xs text-slate-400 mt-0.5">Préventif · {formatDate(r.created_at)}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${r.status === "validated" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                                                    {r.status === "validated" ? "Validé" : "En attente"}
                                                </span>
                                                <Link href={`/admin/entretien/${r.id}`}
                                                    className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-black hover:border-black hover:text-white transition">
                                                    <Eye size={14} />
                                                </Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {quotes.length > 0 && (
                            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                                    Devis associés ({quotes.length})
                                </h3>
                                <div className="space-y-3">
                                    {quotes.map((q: any, i: number) => {
                                        const st = (q.status || "").toLowerCase();
                                        const isApproved = ["approved", "approuvé", "validé", "validated"].includes(st);
                                        const isRejected = ["rejected", "rejeté"].includes(st);
                                        return (
                                            <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50">
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900">{q.reference ?? `Devis #${q.id}`}</p>
                                                    <p className="text-xs text-slate-500 font-medium">{q.amount_ttc ? formatCurrency(Number(q.amount_ttc)) : "—"}</p>
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

                        {invoices.length > 0 && (
                            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                                    Factures ({invoices.length})
                                </h3>
                                <div className="space-y-3">
                                    {invoices.map((inv: any, i: number) => (
                                        <div key={i} className="group flex items-center justify-between p-5 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 transition-all duration-300">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 shadow-sm group-hover:text-slate-900 transition-colors">
                                                    <FileText size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-900 leading-none mb-1">{inv.reference ?? `Facture #${inv.id}`}</p>
                                                    <p className="text-xs text-slate-500 font-medium">{inv.amount_ttc ? formatCurrency(Number(inv.amount_ttc)) : "—"}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-widest ${inv.payment_status === "paid" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                                                    {inv.payment_status === "paid" ? "validée" : "En attente"}
                                                </span>
                                                <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3 ml-1">
                                                    {inv.pdf_path && (
                                                        <button
                                                            onClick={() => setPdfPreview({ url: getUrl(inv.pdf_path), name: inv.reference ?? "Facture" })}
                                                            title="Aperçu PDF"
                                                            className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-indigo-600 hover:border-indigo-600 hover:text-white transition-all shadow-sm"
                                                        >
                                                            <Eye size={14} />
                                                        </button>
                                                    )}
                                                    <Link
                                                        href={`/admin/factures/details/${inv.id}`}
                                                        title="Détails de la facture"
                                                        className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-black hover:border-black hover:text-white transition-all shadow-sm"
                                                    >
                                                        <ArrowUpRight size={14} />
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-6">
                        <div className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Prestataire Assigné</h3>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black text-lg">
                                    {(ticket.provider?.company_name || ticket.provider?.name || "P")[0]}
                                </div>
                                <div>
                                    <p className="text-sm font-black text-slate-900">{ticket.provider?.company_name || ticket.provider?.name || "Non assigné"}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Intervenant Maintenance</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Wrench size={14} /> Patrimoine Concerné
                            </h3>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                                    <ShieldCheck size={24} />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-slate-900">{assetData.designation}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{assetData.codification}</p>
                                </div>
                            </div>
                        </div>

                        {ticket.site?.manager && (
                            <div className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 text-blue-600">Responsable Site</h3>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <User size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">{ticket.site.manager.first_name} {ticket.site.manager.last_name}</p>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                                            {ticket.site.manager.phone_number || ticket.site.manager.phone || "—"}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {isValidModalOpen && (
                <ValidateModal
                    ticketRef={ticket.code_ticket || `#${ticket.id}`}
                    onClose={() => setIsValidModalOpen(false)}
                    onConfirm={handleValidate}
                    loading={actionLoading}
                />
            )}

            {pdfPreview && (
                <PdfModal
                    url={pdfPreview.url}
                    name={pdfPreview.name}
                    onClose={() => setPdfPreview(null)}
                />
            )}
        </div>
    );
}
