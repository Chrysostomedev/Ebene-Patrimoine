"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import ReusableForm from "@/components/ReusableForm";
import type { FieldConfig } from "@/components/ReusableForm";
import ItemTableEditor from "@/components/form/ItemTableEditor";
import {
    ChevronLeft, MapPin, Calendar,
    CheckCircle2, AlertCircle, Loader2,
    FileText, Wrench, Clock, Eye, Tag, Plus, Info,
    ShieldCheck, ArrowUpRight,
} from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { parseApiError } from "@/core/error";
import { useToast } from "@/contexts/ToastContext";
import Link from "next/link";
import {
    providerTicketService,
    canSubmitReport, canRequestDevis, TICKET_STATUS,
} from "@/services/provider/providerTicketService";
import { providerReportService } from "@/services/provider/providerReportService";
import { providerQuoteService, QuoteItem } from "@/services/provider/providerQuoteService";
import { providerInvoiceService } from "@/services/provider/providerInvoiceService";

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

const reportFields: FieldConfig[] = [
    { name: "findings", label: "Observations / Constatations", type: "rich-text", required: true, gridSpan: 2 },
    { name: "action_taken", label: "Actions menées / Travaux effectués", type: "rich-text", required: true, gridSpan: 2 },
    { name: "attachments", label: "Photos & Documents", type: "pdf-upload", accept: "application/pdf,image/*", maxPDFs: 10, gridSpan: 2 } as any,
];

const quoteFields: FieldConfig[] = [
    { name: "description", label: "Description / Justification", type: "rich-text", required: true, gridSpan: 2 },
    { name: "quote_pdf", label: "Pièces jointes (PDF, Images)", type: "pdf-upload", accept: "application/pdf,image/*", maxPDFs: 5, gridSpan: 2 } as any,
];

const invoiceFields: FieldConfig[] = [
    { name: "comment", label: "Commentaire / Description", type: "rich-text", required: true, gridSpan: 2 },
    { name: "invoice_attachments", label: "Pièces jointes (PDF, Images)", type: "pdf-upload", accept: "application/pdf,image/*", maxPDFs: 5, gridSpan: 2 } as any,
];

export default function ProviderPreventiveTicketDetailPage() {
    const router = useRouter();
    const params = useParams();
    const id = Number(params.id);
    const { toast } = useToast();

    const [ticket, setTicket] = useState<any>(null);
    const [quotes, setQuotes] = useState<any[]>([]);
    const [invoice, setInvoice] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const [isReportOpen, setIsReportOpen] = useState(false);
    const [isQuoteOpen, setIsQuoteOpen] = useState(false);
    const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
    const [reportSubmitting, setReportSubmitting] = useState(false);
    const [quoteSubmitting, setQuoteSubmitting] = useState(false);
    const [invoiceSubmitting, setInvoiceSubmitting] = useState(false);
    const [reportError, setReportError] = useState<string | null>(null);
    const [quoteError, setQuoteError] = useState<string | null>(null);
    const [invoiceError, setInvoiceError] = useState<string | null>(null);
    const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
    const [quoteTaxRate, setQuoteTaxRate] = useState(18);

    const reload = async () => {
        try {
            setLoading(true);
            const [core, info] = await Promise.all([
                providerTicketService.getTicketById(id),
                providerTicketService.getTicketInfo(id),
            ]);
            const merged = {
                ...core,
                ...info,
                reports: info?.reports || core?.reports || [],
            };
            setTicket(merged);

            if (info?.devis) setQuotes([info.devis]);
            else if (info?.quotes) setQuotes(info.quotes);
            else setQuotes([]);

            // Chercher la facture liée
            try {
                const invRes = await providerInvoiceService.getInvoices({ per_page: 100 });
                const items = (invRes as any)?.items || invRes || [];
                const allQ = [...(info?.quotes || []), ...(info?.devis ? [info.devis] : [])];
                const approvedQ = allQ.find((q: any) => ["approved", "approuvé", "validé"].includes(String(q?.status || "").toLowerCase()));
                const found = items.find((i: any) =>
                    (i.ticket_id && Number(i.ticket_id) === Number(id)) ||
                    (approvedQ && i.quote_id && Number(i.quote_id) === Number(approvedQ.id))
                );
                setInvoice(found || null);
            } catch { setInvoice(null); }
        } catch {
            toast.error("Erreur lors du chargement du ticket");
            router.push("/provider/preventif");
        } finally { setLoading(false); }
    };

    useEffect(() => { reload(); }, [id]);

    const getAssetData = (t: any) => {
        const a = t.asset || t.company_asset || t.patrimoine || t.equipment;
        if (a && typeof a === "object") return { designation: a.designation || a.nom || a.name || "Équipement", codification: a.codification || a.code || "N/A" };
        if (t.planning) {
            const p = t.planning.patrimoine || t.planning.asset || t.planning.company_asset;
            if (p) return { designation: p.designation || p.nom || p.name || "Équipement (Planning)", codification: p.codification || p.code || "N/A" };
        }
        return { designation: "Équipement", codification: "N/A" };
    };

    const handleSubmitReport = async (formData: any) => {
        setReportError(null);
        setReportSubmitting(true);
        try {
            await providerReportService.createReport({
                ticket_id: id,
                intervention_type: "preventif",
                findings: formData.findings ?? "",
                action_taken: formData.action_taken,
                attachments: formData.attachments as File[] | undefined,
            });
            setIsReportOpen(false);
            toast.success("Rapport soumis avec succès.");
            reload();
        } catch (e: any) {
            const msg = parseApiError(e);
            setReportError(msg);
            toast.error(msg);
        } finally { setReportSubmitting(false); }
    };

    const handleCreateQuote = async (formData: any) => {
        setQuoteError(null);
        setQuoteSubmitting(true);
        try {
            const payload = {
                ticket_id: id,
                tax_rate: quoteTaxRate,
                description: formData.description,
                attachments: Array.isArray(formData.quote_pdf) ? formData.quote_pdf : (formData.quote_pdf?.files || []),
                items: quoteItems,
            };

            if (pendingQuote) {
                await providerQuoteService.updateQuote(pendingQuote.id, payload);
                toast.success("Devis mis à jour avec succès.");
            } else {
                await providerQuoteService.createQuote(payload);
                toast.success("Devis envoyé avec succès.");
            }

            setIsQuoteOpen(false);
            reload();
        } catch (e: any) {
            const msg = parseApiError(e);
            setQuoteError(msg);
            toast.error(msg);
        } finally { setQuoteSubmitting(false); }
    };

    const handleCreateInvoice = async (formData: any) => {
        setInvoiceError(null);
        setInvoiceSubmitting(true);
        try {
            const reports = ticket?.reports || [];
            const reportId = reports[0]?.id;
            const approvedQ = quotes.find((q: any) => ["approved", "approuvé", "validé"].includes(String(q?.status || "").toLowerCase()));
            const today = new Date().toISOString().split("T")[0];
            const due = new Date(); due.setDate(due.getDate() + 30);

            await providerInvoiceService.createInvoice({
                report_id: reportId,
                ticket_id: id,
                quote_id: approvedQ?.id,
                amount_ht: approvedQ?.amount_ht ? parseFloat(String(approvedQ.amount_ht)) : undefined,
                tax_amount: approvedQ?.tax_amount ? parseFloat(String(approvedQ.tax_amount)) : undefined,
                amount_ttc: approvedQ?.amount_ttc ? parseFloat(String(approvedQ.amount_ttc)) : undefined,
                invoice_date: today,
                due_date: due.toISOString().split("T")[0],
                comment: formData.comment ?? "",
                pdf_file: Array.isArray(formData.invoice_attachments) ? formData.invoice_attachments[0] : formData.invoice_attachments?.files?.[0],
                attachments: Array.isArray(formData.invoice_attachments) ? formData.invoice_attachments : (formData.invoice_attachments?.files || []),
            });
            setIsInvoiceOpen(false);
            toast.success("Facture créée avec succès.");
            reload();
        } catch (e: any) {
            const msg = parseApiError(e);
            setInvoiceError(msg);
            toast.error(msg);
        } finally { setInvoiceSubmitting(false); }
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

    const allQuotes = [...quotes, ...((ticket as any)?.quotes || [])];
    const pendingQuote = allQuotes.find((q: any) => !["approved", "approuvé", "validé", "devis_approuvé"].includes(String(q?.status || "").toLowerCase()));
    const approvedQuote = allQuotes.find((q: any) => ["approved", "approuvé", "validé", "devis_approuvé"].includes(String(q?.status || "").toLowerCase()));

    const hasApprovedQuote = !!approvedQuote || ticket.status === "DEVIS_APPROUVÉ";

    // Le rapport est possible tant que le ticket n'est pas clos ou évalué
    const canReport = !["CLOS", "ÉVALUÉ", "RAPPORTÉ"].includes(ticket.status) || reports.length === 0;

    // Le devis est possible si pas de devis approuvé ou de facture
    // Si un devis non approuvé existe, on affiche "Modifier"
    const canQuote = !hasApprovedQuote && !invoice;
    const canInvoice = hasApprovedQuote && !invoice;

    return (
        <div className="min-h-screen bg-slate-50/50 pb-20">
            <Navbar />
            <main className="mt-20 p-8 max-w-7xl mx-auto space-y-8">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push("/provider/preventif")}
                        className="p-2 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition text-slate-400 hover:text-slate-900 shadow-sm">
                        <ChevronLeft size={20} />
                    </button>
                    <PageHeader
                        title={`Ticket Préventif ${ticket.code_ticket || `#${ticket.id}`}`}
                        subtitle="Détails de l'intervention de maintenance préventive."
                    />
                </div>

                {/* Header */}
                <div className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                        <div className="space-y-4 flex-1">
                            <div className="flex items-center gap-3 flex-wrap">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${STATUS_STYLE[ticket.status] || "bg-slate-50 border-slate-200 text-slate-500"}`}>
                                    {ticket.status}
                                </span>
                                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 uppercase tracking-widest">Préventif</span>
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
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-col gap-3 min-w-[200px]">
                            {canInvoice && (
                                <button onClick={() => setIsInvoiceOpen(true)}
                                    className="flex items-center justify-center gap-3 px-6 py-4 rounded-2xl border-2 border-emerald-500 bg-emerald-50 text-emerald-900 text-sm font-black hover:border-emerald-700 hover:bg-emerald-100 transition-all">
                                    <FileText size={18} /> Créer une facture
                                </button>
                            )}
                            {canQuote && (
                                <button onClick={() => {
                                    if (pendingQuote) {
                                        // Pré-remplissage pour modification
                                        setQuoteItems(pendingQuote.items || []);
                                        setQuoteTaxRate(pendingQuote.tax_rate || 18);
                                    }
                                    setIsQuoteOpen(true);
                                }}
                                    className="flex items-center justify-center gap-3 px-6 py-4 rounded-2xl border-2 border-slate-200 bg-white text-slate-900 text-sm font-black hover:border-slate-900 transition-all">
                                    <Tag size={18} /> {pendingQuote ? "Modifier le devis" : "Créer un devis"}
                                </button>
                            )}
                            {canReport && (
                                <button onClick={() => setIsReportOpen(true)}
                                    className="flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-slate-900 text-white text-sm font-black hover:bg-black transition-all shadow-lg">
                                    <Plus size={18} /> Soumettre un rapport
                                </button>
                            )}
                            {invoice && (
                                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                                    <CheckCircle2 size={14} /> Facture soumise
                                </div>
                            )}
                        </div>

                        {/* Dates */}
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
                        {/* Source du ticket (Anomalie/Observation) */}
                        {(ticket.nature_observation || (ticket as any).commentaire_observation) && (
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
                                {(ticket as any).commentaire_observation && (
                                    <div className="bg-white/60 rounded-2xl p-4 border border-white/40">
                                        <p className="text-sm text-slate-700 font-bold leading-relaxed italic">
                                            "{(ticket as any).commentaire_observation}"
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Description */}
                        {ticket.description && (
                            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Description</h3>
                                <span><p className="text-sm text-slate-600 leading-relaxed font-bold">{ticket.description}</p> </span>
                            </div>
                        )}

                        {/* Mon rapport */}
                        {reports.length > 0 && (
                            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Mon rapport ({reports.length})</h3>
                                <div className="space-y-3">

                                    {reports.map((r: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50">
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">{r.reference ?? `Rapport #${r.id}`}</p>
                                                <p className="text-xs text-slate-400 mt-0.5">{formatDate(r.created_at)}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${r.status === "validated" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                                                    {r.status === "validated" ? "Validé" : "En attente"}
                                                </span>
                                                <Link href={`/provider/entretien/${r.id}`}
                                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition">
                                                    <Eye size={12} />
                                                </Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Devis */}
                        {allQuotes.length > 0 && (
                            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Mon devis ({allQuotes.length})</h3>
                                <div className="space-y-3">
                                    {allQuotes.map((q: any, i: number) => {
                                        const st = (q.status || "").toLowerCase();
                                        const isApproved = ["approved", "approuvé", "validé"].includes(st);
                                        const isRejected = ["rejected", "rejeté"].includes(st);
                                        const displayAmount = q.amount_ttc || q.amount_ht;
                                        return (
                                            <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50">
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900">{q.reference ?? `Devis #${q.id}`}</p>
                                                    <p className="text-xs text-slate-500 font-medium">{displayAmount ? formatCurrency(Number(displayAmount)) : "—"}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${isApproved ? "bg-emerald-50 border-emerald-200 text-emerald-700" : isRejected ? "bg-red-50 border-red-200 text-red-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                                                        {isApproved ? "Approuvé" : isRejected ? "Rejeté" : "En attente"}
                                                    </span>
                                                    <Link href={`/provider/devis/${q.id}`}
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

                        {/* Facture */}
                        {invoice && (
                            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Ma facture</h3>
                                <div className="group flex items-center justify-between p-5 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 transition-all duration-300">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 shadow-sm group-hover:text-slate-900 transition-colors">
                                            <FileText size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-slate-900 leading-none mb-1">{invoice.reference ?? `Facture #${invoice.id}`}</p>
                                            <p className="text-xs text-slate-500 font-medium">{invoice.amount_ttc ? formatCurrency(Number(invoice.amount_ttc)) : "—"}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-widest ${invoice.payment_status === "paid" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                                            {invoice.payment_status === "paid" ? "Payée" : "En attente"}
                                        </span>
                                        <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3 ml-1">
                                            <Link href={`/provider/factures/${invoice.id}`}
                                                className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-black hover:border-black hover:text-white transition-all shadow-sm">
                                                <Eye size={14} />
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <ShieldCheck size={14} /> Patrimoine
                            </h3>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400"><Wrench size={24} /></div>
                                <div>
                                    <p className="text-sm font-black text-slate-900">{assetData.designation}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{assetData.codification}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 text-blue-600">Planification</h3>
                            <div className="space-y-5">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400"><Calendar size={18} /></div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prévu le</p>
                                        <p className="text-sm font-bold text-slate-900">{formatDate(ticket.planned_at)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400"><Clock size={18} /></div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Échéance</p>
                                        <p className="text-sm font-bold text-slate-900">{formatDate(ticket.due_at)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* MODALES */}
            <ReusableForm isOpen={isReportOpen} onClose={() => { setIsReportOpen(false); setReportError(null); }}
                title={`Rapport — ${ticket.code_ticket || `#${ticket.id}`}`}
                subtitle="Renseignez les observations et actions menées."
                fields={reportFields} onSubmit={handleSubmitReport}
                isSubmitting={reportSubmitting}
                submitLabel={reportSubmitting ? "Soumission..." : "Soumettre le rapport"} error={reportError} />

            <ReusableForm isOpen={isQuoteOpen} onClose={() => { setIsQuoteOpen(false); setQuoteError(null); }}
                title={pendingQuote ? `Modifier le devis — ${ticket.code_ticket || `#${ticket.id}`}` : `Nouveau devis — ${ticket.code_ticket || `#${ticket.id}`}`}
                subtitle={pendingQuote ? "Mettez à jour les montants et les détails." : "Détaillez le montant et joignez un PDF si nécessaire."}
                fields={quoteFields}
                initialValues={pendingQuote ? {
                    description: pendingQuote.description || "",
                    tax_rate: pendingQuote.tax_rate || 18,
                    quote_pdf: pendingQuote.attachments || [],
                } : {}}
                onSubmit={handleCreateQuote}
                isSubmitting={quoteSubmitting}
                submitLabel={quoteSubmitting ? "Envoi..." : (pendingQuote ? "Mettre à jour le devis" : "Envoyer le devis")} error={quoteError}
                onFieldChange={(name, value) => { if (name === "tax_rate") setQuoteTaxRate(parseFloat(value) || 0); }}>
                <div className="col-span-2 mt-4">
                    <ItemTableEditor initialItems={pendingQuote?.items || []} onChange={setQuoteItems} taxRate={quoteTaxRate} />
                </div>
            </ReusableForm>

            <ReusableForm isOpen={isInvoiceOpen} onClose={() => { setIsInvoiceOpen(false); setInvoiceError(null); }}
                title={`Nouvelle facture — ${ticket.code_ticket || `#${ticket.id}`}`}
                subtitle="Joignez votre facture PDF et renseignez un commentaire."
                fields={invoiceFields} onSubmit={handleCreateInvoice}
                isSubmitting={invoiceSubmitting}
                submitLabel={invoiceSubmitting ? "Création..." : "Créer la facture"} error={invoiceError} />
        </div>
    );
}
