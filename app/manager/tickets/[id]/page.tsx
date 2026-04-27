"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import StatsCard from "@/components/StatsCard";
import {
    ChevronLeft, MapPin, Wrench, Tag, Clock, CheckCircle2,
    FileText, Eye, Download, X, Star, Calendar,
    Shield, AlertCircle, ThumbsUp, ThumbsDown,
} from "lucide-react";
import { TicketService } from "../../../../services/manager/ticket.service";
import { useToast } from "../../../../contexts/ToastContext";
import axiosInstance from "../../../../core/axios";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (iso?: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
};
const fmtDateTime = (iso?: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};
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
    "EN_RETARD": "bg-red-50 border-red-400 text-red-700",
};
const STATUS_LABEL: Record<string, string> = {
    "SIGNALÉ": "Signalé", "VALIDÉ": "Validé", "ASSIGNÉ": "Assigné",
    "PLANIFIÉ": "Planifié", "EN_COURS": "En cours", "EN_TRAITEMENT": "En traitement",
    "DEVIS_EN_ATTENTE": "Devis en attente", "DEVIS_APPROUVÉ": "Devis approuvé",
    "RAPPORTÉ": "Rapporté", "ÉVALUÉ": "Évalué", "CLOS": "Clôturé", "EN_RETARD": "En retard",
};
const PRIORITY_LABEL: Record<string, string> = { faible: "Faible", moyenne: "Moyenne", haute: "Haute", critique: "Critique" };

// ─── Modale validation rapport ────────────────────────────────────────────────
function ValidateModal({ reportId, onClose, onDone }: { reportId: number; onClose: () => void; onDone: () => void }) {
    const { toast } = useToast();
    const [mode, setMode] = useState<"validate" | "reject">("validate");
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);

    const handleValidate = async () => {
        setLoading(true);
        try {
            await axiosInstance.post(`/manager/intervention-report/${reportId}/validate`, { result: "RAS", rating, comment: comment || "Validé" });
            toast.success("Rapport validé avec succès.");
            onDone();
        } catch (e: any) {
            toast.error(e?.response?.data?.message ?? "Erreur lors de la validation.");
        } finally { setLoading(false); }
    };

    const handleReject = async () => {
        if (reason.trim().length < 10) { toast.error("Le motif doit faire au moins 10 caractères."); return; }
        setLoading(true);
        try {
            await axiosInstance.post(`/manager/ticket/${reportId}/reject-report`, { reason });
            toast.success("Rapport rejeté.");
            onDone();
        } catch (e: any) {
            toast.error(e?.response?.data?.message ?? "Erreur lors du rejet.");
        } finally { setLoading(false); }
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200]" onClick={onClose} />
            <div className="fixed inset-0 z-[201] flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                        <h2 className="text-lg font-black text-slate-900">Valider / Rejeter le rapport</h2>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition"><X size={16} className="text-slate-500" /></button>
                    </div>
                    <div className="p-6 space-y-5">
                        <div className="flex bg-slate-100 rounded-2xl p-1 gap-1">
                            <button onClick={() => setMode("validate")} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition ${mode === "validate" ? "bg-white shadow-sm text-slate-900" : "text-slate-500"}`}>
                                <ThumbsUp size={14} /> Valider
                            </button>
                            <button onClick={() => setMode("reject")} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition ${mode === "reject" ? "bg-white shadow-sm text-red-600" : "text-slate-500"}`}>
                                <ThumbsDown size={14} /> Rejeter
                            </button>
                        </div>
                        {mode === "validate" ? (
                            <>
                                <div>
                                    <p className="text-sm font-bold text-slate-900 mb-3">Note (optionnel)</p>
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 4, 5].map(v => (
                                            <button key={v} onClick={() => setRating(v)} className="transition-transform hover:scale-110">
                                                <Star size={28} className={v <= rating ? "fill-yellow-400 text-yellow-400" : "fill-slate-200 text-slate-200"} />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} placeholder="Commentaire (optionnel)..." className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-900" />
                                <button onClick={handleValidate} disabled={loading} className="w-full py-3.5 rounded-2xl bg-emerald-600 text-white text-sm font-black hover:bg-emerald-700 disabled:opacity-50 transition flex items-center justify-center gap-2">
                                    {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle2 size={16} />}
                                    Confirmer la validation
                                </button>
                            </>
                        ) : (
                            <>
                                <textarea value={reason} onChange={e => setReason(e.target.value)} rows={4} placeholder="Motif de rejet (min 10 caractères)..." className="w-full px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400" />
                                <button onClick={handleReject} disabled={loading || reason.trim().length < 10} className="w-full py-3.5 rounded-2xl bg-red-600 text-white text-sm font-black hover:bg-red-700 disabled:opacity-50 transition flex items-center justify-center gap-2">
                                    {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <X size={16} />}
                                    Rejeter le rapport
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

function PdfModal({ url, name, onClose }: { url: string; name: string; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-[300] flex flex-col bg-black/95">
            <div className="flex items-center justify-between px-6 py-4 bg-black border-b border-white/10 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-red-600 flex items-center justify-center"><FileText size={14} className="text-white" /></div>
                    <p className="text-white font-bold text-sm">{name}</p>
                </div>
                <div className="flex items-center gap-3">
                    <a href={url} download target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition"><Download size={14} /> Télécharger</a>
                    <button onClick={onClose} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition"><X size={18} className="text-white" /></button>
                </div>
            </div>
            <div className="flex-1"><iframe src={`${url}#toolbar=0`} className="w-full h-full border-0" title={name} /></div>
        </div>
    );
}

export default function ManagerTicketDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const ticketId = Number(params?.id);

    const [ticket, setTicket] = useState<any | null>(null);
    const [devis, setDevis] = useState<any | null>(null);
    const [rapport, setRapport] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [pdfPreview, setPdfPreview] = useState<{ url: string; name: string } | null>(null);
    const [validateReportId, setValidateReportId] = useState<number | null>(null);

    const reload = async () => {
        if (!ticketId) return;
        setLoading(true); setError("");
        try {
            const data = await TicketService.getTicketInfo(ticketId);
            console.log("[ManagerTicketDetail] unified data:", data);

            const ticketData = data.ticket ?? data;
            const ticketWithData = {
                ...(ticketData ?? {}),
                site: data.site ?? ticketData?.site,
                asset: data.asset ?? data.company_asset ?? data.companyAsset ??
                    ticketData?.asset ?? ticketData?.company_asset ?? ticketData?.companyAsset,
                provider: data.provider ?? ticketData?.provider,
                reports: data.reports || (data.rapport ? [data.rapport] : ticketData?.reports || []),
                attachments: data.ticket_attachments ?? data.attachments ?? ticketData?.attachments ?? []
            };

            console.log("[ManagerTicketDetail] Final Merged Ticket:", ticketWithData);
            setTicket(ticketWithData);
            setDevis(data.devis);
            setRapport(data.rapport);
        } catch (e: any) {
            console.error("[ManagerTicketDetail] erreur:", e?.response?.data ?? e);
            setError(e?.response?.data?.message ?? "Impossible de charger ce ticket.");
        } finally { setLoading(false); }
    };

    useEffect(() => { reload(); }, [ticketId]);

    const attachments = (ticket?.attachments ?? []) as any[];
    const photos = attachments.filter((a: any) => a.file_type === "photo" || /\.(jpg|jpeg|png|gif|webp)$/i.test(a.path ?? a.file_path ?? ""));
    const docs = attachments.filter((a: any) => a.file_type === "document" || /\.pdf$/i.test(a.path ?? a.file_path ?? ""));
    const reports = (ticket?.reports ?? []) as any[];
    const pendingReport = reports.find((r: any) => r.status === "submitted" || r.status === "pending");

    const kpis = [
        { label: "Priorité", value: PRIORITY_LABEL[ticket?.priority ?? ""] ?? ticket?.priority ?? "—", delta: "", trend: "up" as const },
        { label: "Prestataire", value: ticket?.provider?.company_name ?? ticket?.provider?.name ?? "—", delta: "", trend: "up" as const },
        { label: "Pièces jointes", value: attachments.length, delta: "", trend: "up" as const },
        { label: "Rapports", value: reports.length, delta: "", trend: "up" as const },
    ];

    return (
        <div className="flex min-h-screen bg-gray-50">
            <div className="flex-1 flex flex-col">
                <Navbar />
                <main className="mt-20 p-8 space-y-8">

                    <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-black transition bg-white px-4 py-2 rounded-xl border border-slate-100 w-fit text-sm font-medium">
                        <ChevronLeft size={16} /> Retour
                    </button>

                    {error && (
                        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl text-sm">
                            <AlertCircle size={15} className="shrink-0" /> {error}
                        </div>
                    )}

                    {loading && (
                        <div className="space-y-4 animate-pulse">
                            <div className="h-10 w-80 bg-slate-100 rounded-2xl" />
                            <div className="h-44 bg-slate-100 rounded-3xl" />
                            <div className="grid grid-cols-4 gap-6">{[0, 1, 2, 3].map(i => <div key={i} className="h-28 bg-slate-100 rounded-3xl" />)}</div>
                        </div>
                    )}

                    {ticket && (
                        <>
                            {/* Header */}
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
                                    <div className="space-y-3 flex-1">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <span className="text-xs font-black text-slate-400 font-mono">{ticket.code_ticket}</span>
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black border ${STATUS_STYLE[ticket.status] ?? "bg-slate-100 border-slate-300 text-slate-600"}`}>
                                                {STATUS_LABEL[ticket.status] ?? ticket.status}
                                            </span>
                                            {/* <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-black border ${ticket.type === "curatif" ? "bg-orange-50 border-orange-200 text-orange-700" : "bg-blue-50 border-blue-200 text-blue-700"}`}>
                                                {ticket.type === "curatif" ? "Curatif" : "Préventif"}
                                            </span> */}
                                        </div>
                                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">{ticket.subject ?? `Ticket #${ticket.id}`}</h1>
                                        <div className="flex items-center gap-4 flex-wrap text-sm text-slate-500">
                                            {ticket.site && <span className="flex items-center gap-1.5"><MapPin size={13} /> {ticket.site.nom}</span>}
                                            {ticket.asset && <span className="flex items-center gap-1.5"><Wrench size={13} /> {ticket.asset.designation}</span>}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-3 min-w-[220px]">
                                        <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 space-y-2">
                                            {[
                                                { l: "Signalé le", v: fmtDateTime(ticket.created_at) },
                                                { l: "Échéance", v: fmtDateTime(ticket.due_at) },
                                            ].map((r: any, i: number) => (
                                                <div key={i} className="flex justify-between text-sm">
                                                    <span className="text-slate-400 font-medium">{r.l}</span>
                                                    <span className="font-bold text-slate-900">{r.v}</span>
                                                </div>
                                            ))}
                                        </div>
                                        {/* Action manager : valider rapport si RAPPORTÉ */}
                                        {/*{pendingReport && (
                                            <button onClick={() => setValidateReportId(pendingReport.id)} className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition">
                                                <CheckCircle2 size={14} /> Valider le rapport
                                            </button>
                                        )}*/}
                                    </div>
                                </div>
                            </div>

                            {/* KPIs */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                                {kpis.map((k: any, i: number) => <StatsCard key={i} {...k} />)}
                            </div>

                            {/* Layout */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2 space-y-6">

                                    {ticket.description && (
                                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Description</h3>
                                            <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: ticket.description }} />
                                        </div>
                                    )}

                                    {reports.length > 0 && (
                                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Rapports d'intervention ({reports.length})</h3>
                                            <div className="space-y-3">
                                                {reports.map((r: any, i: number) => (
                                                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50">
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-900">{r.reference ?? `Rapport ${r.id}`}</p>
                                                            <p className="text-xs text-slate-400 mt-0.5">{r.intervention_type === "preventif" ? "Préventif" : "Curatif"} · {fmtDate(r.created_at)}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${r.status === "validated" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : r.status === "rejected" ? "bg-red-50 border-red-200 text-red-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                                                                {r.status === "validated" ? "Validé" : r.status === "rejected" ? "Rejeté" : "En attente"}
                                                            </span>
                                                            <Link href={`/manager/rapports/details/${r.id}`} className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-black hover:border-black hover:text-white transition">
                                                                <Eye size={14} />
                                                            </Link>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Devis & Facturation */}
                                    {devis && (
                                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Devis & Facturation</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50 flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900">Devis #{devis.reference}</p>
                                                        <p className="text-xs text-slate-400 mt-0.5">{devis.total_ht?.toLocaleString()} FG HT · {fmtDate(devis.created_at)}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded border border-blue-200 bg-blue-50 text-blue-600 uppercase`}>
                                                            {devis.status}
                                                        </span>
                                                        <Link href={`/manager/devis/details/${devis.id}`} className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-black hover:border-black hover:text-white transition">
                                                            <Eye size={14} />
                                                        </Link>
                                                    </div>
                                                </div>
                                                {devis.invoice && (
                                                    <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50 flex items-center justify-between">
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-900">Facture #{devis.invoice.reference}</p>
                                                            <p className="text-xs text-slate-400 mt-0.5">{devis.invoice.total_ttc?.toLocaleString()} FG TTC · {fmtDate(devis.invoice.created_at)}</p>
                                                        </div>
                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded border border-emerald-200 bg-emerald-50 text-emerald-600 uppercase`}>
                                                            {devis.invoice.status}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Photos de l'anomalie ({photos.length})</h3>
                                        <div className="grid grid-cols-3 gap-3">
                                            {photos.map((att: any, i: number) => {
                                                const url = getUrl(att);
                                                return (
                                                    <a key={i} href={url} target="_blank" rel="noreferrer" className="aspect-square rounded-xl overflow-hidden border border-slate-100 hover:opacity-80 transition">
                                                        <img src={url} alt="photo" className="w-full h-full object-cover" onError={() => console.error("[Photo] erreur:", url)} />
                                                    </a>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Photos de l'équipement (Asset) */}
                                    {(() => {
                                        const assetImages = (ticket.asset as any)?.images ?? [];
                                        if (assetImages.length === 0) return null;
                                        return (
                                            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Photos de l'équipement ({assetImages.length})</h3>
                                                </div>
                                                <div className="grid grid-cols-4 gap-3">
                                                    {assetImages.map((img: any, i: number) => {
                                                        const url = getUrl(img);
                                                        return (
                                                            <a key={i} href={url} target="_blank" rel="noreferrer" className="aspect-square rounded-xl overflow-hidden border border-slate-100 hover:opacity-80 transition bg-slate-50">
                                                                <img src={url} alt="photo asset" className="w-full h-full object-cover" />
                                                            </a>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>

                                <div className="space-y-6">
                                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Fiche technique</h3>
                                        <div className="divide-y divide-slate-50">
                                            {[
                                                { l: "Référence", v: ticket.code_ticket },
                                                { l: "Type", v: ticket.type === "curatif" ? "Curatif" : "Préventif" },
                                                { l: "Priorité", v: PRIORITY_LABEL[ticket.priority] ?? ticket.priority },
                                                { l: "Statut", v: STATUS_LABEL[ticket.status] ?? ticket.status },
                                                { l: "Site", v: ticket.site?.nom ?? "—" },
                                                { l: "Patrimoine", v: ticket.asset ? `${(ticket.asset as any).designation ?? (ticket.asset as any).nom ?? ""} (${(ticket.asset as any).codification ?? ""})` : "—" },

                                                { l: "Prestataire", v: ticket.provider?.company_name ?? ticket.provider?.name ?? "—" },
                                                { l: "Créé le", v: fmtDateTime(ticket.created_at) },
                                            ].map((r: any, i: number) => (
                                                <div key={i} className="flex items-center justify-between py-3">
                                                    <p className="text-xs text-slate-400 font-medium">{r.l}</p>
                                                    <p className="text-sm font-bold text-slate-900 text-right max-w-[55%] truncate">{r.v}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Documents ({docs.length})</h3>
                                        {docs.length > 0 ? (
                                            <div className="space-y-3">
                                                {docs.map((att: any, i: number) => {
                                                    const url = getUrl(att);
                                                    const name = (att.path ?? att.file_path ?? "").split("/").pop() ?? "document.pdf";
                                                    return (
                                                        <div key={i} className="flex flex-col gap-2 p-3 rounded-xl border border-slate-100 bg-slate-50">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0"><FileText size={16} className="text-red-500" /></div>
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="text-xs font-bold text-slate-900 truncate">{name}</p>
                                                                    <p className="text-[10px] text-slate-400">PDF</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button onClick={() => setPdfPreview({ url, name })} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-bold hover:bg-white transition">
                                                                    <Eye size={13} /> Aperçu</button>
                                                                <a href={url} download target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-black transition"><Download size={13} /> Télécharger</a>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="border border-dashed border-slate-200 rounded-xl px-4 py-5 flex items-center gap-3 text-slate-400">
                                                <FileText size={16} className="shrink-0" />
                                                <p className="text-sm font-medium">Aucun document</p>
                                            </div>
                                        )}
                                    </div> */}
                                </div>
                            </div>
                        </>
                    )}
                </main>
            </div>
            {pdfPreview && <PdfModal url={pdfPreview.url} name={pdfPreview.name} onClose={() => setPdfPreview(null)} />}
            {validateReportId && (
                <ValidateModal
                    reportId={validateReportId}
                    onClose={() => setValidateReportId(null)}
                    onDone={() => { setValidateReportId(null); reload(); }}
                />
            )}
        </div>
    );
}
