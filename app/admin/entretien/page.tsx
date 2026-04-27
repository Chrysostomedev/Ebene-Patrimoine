"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import StatsCard from "@/components/StatsCard";
import DataTable, { ColumnConfig } from "@/components/DataTable";
import PageHeader from "@/components/PageHeader";
import ActionGroup from "@/components/ActionGroup";
import {
    Eye, ArrowUpRight, Download, Filter, X,
    FileText, CheckCircle2, XCircle, AlertCircle,
    Copy, Check, CalendarDays, ClipboardList,
    ShieldCheck, PlayCircle, CheckSquare,
    AlertTriangle, Star, Send, ThumbsUp, ThumbsDown,
    Wrench, RefreshCw,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useReports } from "../../../hooks/admin/useReports";
import { ReportService, InterventionReport } from "../../../services/admin/report.service";
import { useToast } from "@/contexts/ToastContext";
import { formatDate } from "@/lib/utils";


// ─── Types ────────────────────────────────────────────────────────────────────

type MaintenanceStatus =
    | "planifié" | "en_cours" | "rapporté" | "validé"
    | "clos" | "rejeté" | "anomalie"
    | "pending" | "validated" | "rejected" | "submitted";

type AnomalyAction = "ras" | "immediate" | "devis";

// ─── Static helpers ───────────────────────────────────────────────────────────

const ALL_STATUSES = [
    "pending", "validated", "rejected", "submitted",
    "planifié", "en_cours", "rapporté", "validé", "clos", "rejeté", "anomalie",
];

const STATUS_LABELS: Record<string, string> = {
    planifié: "Planifié", en_cours: "En cours", rapporté: "Rapporté",
    validé: "Validé", clos: "Clôturé", rejeté: "Rejeté", anomalie: "Anomalie",
    pending: "En attente", validated: "Validé", rejected: "Rejeté", submitted: "Soumis",
};

const STATUS_STYLES: Record<string, string> = {
    planifié: "border-blue-200   bg-blue-50   text-blue-700",
    en_cours: "border-amber-200  bg-amber-50  text-amber-700",
    rapporté: "border-violet-200 bg-violet-50 text-violet-700",
    validé: "border-emerald-200 bg-emerald-50 text-emerald-700",
    clos: "border-slate-200  bg-slate-50  text-slate-500",
    rejeté: "border-red-200    bg-red-50    text-red-700",
    anomalie: "border-orange-200 bg-orange-50 text-orange-700",
    pending: "border-amber-200  bg-amber-50  text-amber-700",
    validated: "border-emerald-200 bg-emerald-50 text-emerald-700",
    rejected: "border-red-200    bg-red-50    text-red-700",
    submitted: "border-violet-200 bg-violet-50 text-violet-700",
};

const STATUS_DOT: Record<string, string> = {
    planifié: "#3b82f6", en_cours: "#f59e0b", rapporté: "#8b5cf6",
    validé: "#10b981", clos: "#94a3b8", rejeté: "#ef4444", anomalie: "#f97316",
    pending: "#f59e0b", validated: "#10b981", rejected: "#ef4444", submitted: "#8b5cf6",
};

const WORKFLOW_STEPS = [
    { key: "planifié", icon: CalendarDays, label: "Soumis" },
    { key: "en_cours", icon: PlayCircle, label: "En cours" },
    { key: "rapporté", icon: ClipboardList, label: "Rapporté" },
    { key: "validé", icon: ShieldCheck, label: "Validé" },
    { key: "clos", icon: CheckSquare, label: "Clôturé" },
];

// local formatDate removed - using global formatDate from @/lib/utils


// ─── Toast ────────────────────────────────────────────────────────────────────


// ─── StatusBadge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold
      ${STATUS_STYLES[status] ?? "border-slate-200 bg-slate-50 text-slate-500"}`}>
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: STATUS_DOT[status] ?? "#94a3b8" }} />
            {STATUS_LABELS[status] ?? status}
        </span>
    );
}

// ─── WorkflowProgress ─────────────────────────────────────────────────────────

function WorkflowProgress({ status }: { status: string }) {
    const effectiveIdx = status === "rejected" || status === "anomalie"
        ? WORKFLOW_STEPS.findIndex(s => s.key === "rapporté")
        : WORKFLOW_STEPS.findIndex(s => s.key === status || STATUS_LABELS[s.key] === status);

    return (
        <div className="flex items-start gap-0 w-full">
            {WORKFLOW_STEPS.map((step, i) => {
                const Icon = step.icon;
                const done = i < effectiveIdx;
                const current = i === effectiveIdx;
                const future = i > effectiveIdx;
                return (
                    <div key={step.key} className="flex-1 flex flex-col items-center gap-1.5 relative">
                        {i < WORKFLOW_STEPS.length - 1 && (
                            <div className="absolute top-3.5 left-1/2 w-full h-0.5 z-0"
                                style={{ backgroundColor: done ? "#0f172a" : "#e2e8f0" }} />
                        )}
                        <div className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center border-2 transition
              ${done ? "bg-slate-900 border-slate-900" : ""}
              ${current ? "bg-slate-900 border-slate-900 ring-4 ring-slate-200" : ""}
              ${future ? "bg-white border-slate-200" : ""}`}>
                            <Icon size={12} className={done || current ? "text-white" : "text-slate-300"} />
                        </div>
                        <p className={`text-[9px] font-bold text-center leading-tight
              ${done || current ? "text-slate-800" : "text-slate-300"}`}>
                            {step.label}
                        </p>
                    </div>
                );
            })}
        </div>
    );
}

// ─── StarRating ───────────────────────────────────────────────────────────────

function StarRating({
    value, onChange, readonly = false,
}: {
    value: number;
    onChange?: (v: number) => void;
    readonly?: boolean;
}) {
    const [hovered, setHovered] = useState(0);
    const display = readonly ? value : (hovered || value);

    const labels = ["", "Insuffisant", "Passable", "Correct", "Bien", "Excellent"];

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map(i => (
                    <button
                        key={i}
                        type="button"
                        disabled={readonly}
                        onClick={() => !readonly && onChange?.(i)}
                        onMouseEnter={() => !readonly && setHovered(i)}
                        onMouseLeave={() => !readonly && setHovered(0)}
                        className={`transition-all duration-100 ${readonly ? "cursor-default" : "cursor-pointer hover:scale-110 active:scale-95"}`}
                    >
                        <Star
                            size={readonly ? 16 : 28}
                            className={`transition-colors duration-100
                ${i <= display ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"}`}
                        />
                    </button>
                ))}
                {!readonly && display > 0 && (
                    <span className="text-sm font-bold text-amber-600 ml-1">{labels[display]}</span>
                )}
                {readonly && value > 0 && (
                    <span className="text-xs font-bold text-amber-600 ml-1">{labels[value]}</span>
                )}
            </div>
        </div>
    );
}

// ─── Modale Validation Rapport (centre) ──────────────────────────────────────

function ValidationModal({
    ticket, onClose, onValidate, onReject, submitting,
}: {
    ticket: InterventionReport;
    onClose: () => void;
    onValidate: (data: { rating: number; comment: string }) => void;
    onReject: (reason: string) => void;
    submitting: boolean;
}) {
    const [mode, setMode] = useState<"review" | "reject">("review");
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");
    const [rejectReason, setRejectReason] = useState("");

    const canValidate = rating > 0;
    const canReject = rejectReason.trim().length > 10;

    return (
        <>
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200]" onClick={onClose} />
            <div className="fixed inset-0 z-[201] flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">

                    {/* Header */}
                    <div className="flex items-start justify-between px-6 pt-6 pb-5 shrink-0 border-b border-slate-50">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-7 h-7 rounded-xl bg-violet-100 flex items-center justify-center">
                                    <ShieldCheck size={14} className="text-violet-600" />
                                </div>
                                <span className="text-xs font-black text-violet-600 uppercase tracking-widest">
                                    Validation du rapport
                                </span>
                            </div>
                            <h2 className="text-xl font-black text-slate-900">{(ticket as any).reference || `#${ticket.id}`}</h2>
                            <p className="text-slate-400 text-xs mt-0.5">
                                {ticket.provider?.company_name ?? ticket.provider?.name ?? "-"} · {ticket.site?.nom ?? "-"} · {formatDate(ticket.start_date)}
                            </p>
                        </div>
                        <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-xl transition mt-1">
                            <X size={18} className="text-slate-500" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                        {/* Rapport à relire */}
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Rapport soumis par le prestataire
                            </p>
                            <div
                                className="prose prose-sm max-w-none text-sm text-slate-700 leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: ticket.description ?? "Aucune observation." }}
                            />
                        </div>

                        {/* Toggle Valider / Rejeter */}
                        {/* <div className="flex bg-slate-100 rounded-2xl p-1 gap-1">
                            <button
                                type="button"
                                onClick={() => setMode("review")}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition
                  ${mode === "review" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
                            >
                                <ThumbsUp size={15} /> Valider
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode("reject")}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition
                  ${mode === "reject" ? "bg-white shadow-sm text-red-600" : "text-slate-500 hover:text-slate-700"}`}
                            >
                                <ThumbsDown size={15} /> Rejeter
                            </button>
                        </div> */}

                        {/* Mode VALIDER */}
                        {mode === "review" && (
                            <div className="space-y-4">
                                {/* Notation étoiles */}
                                <div className="flex flex-col gap-3">
                                    <label className="text-sm font-bold text-slate-900">
                                        Notation du rapport <span className="text-red-500">*</span>
                                    </label>
                                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col items-center gap-2">
                                        <StarRating value={rating} onChange={setRating} />
                                        {rating === 0 && (
                                            <p className="text-xs text-slate-400 mt-1">
                                                Cliquez sur une étoile pour noter le rapport
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Commentaire */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-bold text-slate-900">
                                        Commentaire <span className="text-slate-400 font-normal">(optionnel)</span>
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={comment}
                                        onChange={e => setComment(e.target.value)}
                                        placeholder="Observations sur la qualité du rapport, points à améliorer…"
                                        className="w-full bg-slate-50 rounded-2xl p-4 text-sm text-slate-700 placeholder:text-slate-400
                       outline-none focus:ring-2 focus:ring-slate-900 transition resize-none"
                                    />
                                </div>

                                <button
                                    type="button"
                                    disabled={!canValidate || submitting}
                                    onClick={() => onValidate({ rating, comment })}
                                    className="w-full py-4 rounded-2xl bg-emerald-600 text-white text-sm font-black
                    hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed
                    flex items-center justify-center gap-2"
                                >
                                    {submitting
                                        ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        : <CheckCircle2 size={16} />}
                                    {submitting ? "Validation en cours…" : "Valider et envoyer "}
                                </button>

                                {!canValidate && (
                                    <p className="text-center text-xs text-slate-400 -mt-2">
                                        Une note est requise pour valider
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Mode REJETER
                        {mode === "reject" && (
                            <div className="space-y-4">
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-bold text-slate-900">
                                        Motif de rejet <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        rows={4}
                                        value={rejectReason}
                                        onChange={e => setRejectReason(e.target.value)}
                                        placeholder="Expliquez précisément pourquoi ce rapport est incomplet ou inexact…"
                                        className="w-full bg-red-50 rounded-2xl p-4 text-sm text-slate-700 placeholder:text-red-300
                       outline-none focus:ring-2 focus:ring-red-400 transition resize-none border border-red-100"
                                    />
                                    <p className="text-[10px] text-slate-400">
                                        Minimum 10 caractères · {rejectReason.length} / 500
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    disabled={!canReject || submitting}
                                    onClick={() => onReject(rejectReason)}
                                    className="w-full py-4 rounded-2xl bg-red-600 text-white text-sm font-black
                    hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed
                    flex items-center justify-center gap-2"
                                >
                                    {submitting
                                        ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        : <XCircle size={16} />}
                                    {submitting ? "Rejet en cours…" : "Rejeter le rapport"}
                                </button>
                            </div>
                        )} */}
                    </div>
                </div>
            </div>
        </>
    );
}

// ─── Side Panel aperçu (lecture seule) ───────────────────────────────────────

function MaintenancePreviewPanel({
    ticket, onClose, onOpenValidation,
}: {
    ticket: InterventionReport;
    onClose: () => void;
    onOpenValidation: (t: InterventionReport) => void;
}) {
    const [copied, setCopied] = useState(false);
    const reference = (ticket as any).reference || `#${ticket.id}`;
    const copyRef = () => {
        navigator.clipboard.writeText(reference);
        setCopied(true); setTimeout(() => setCopied(false), 2000);
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={onClose} />
            <div className="fixed right-0 top-0 h-full w-[440px] bg-white z-50 shadow-2xl flex flex-col rounded-l-3xl overflow-hidden">

                <div className="flex items-start px-6 pt-6 pb-0 shrink-0">
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-xl transition -ml-1">
                        <X size={18} className="text-slate-500" />
                    </button>
                </div>
                <div className="px-6 pt-4 pb-5 shrink-0">
                    <h2 className="text-2xl font-black text-slate-900">Entretien #{ticket.id}</h2>
                    <p className="text-slate-400 text-xs mt-0.5">Détails de la visite · lecture seule</p>
                </div>

                <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-5">



                    {/* Champs */}
                    <div className="space-y-0">
                        {[
                            {
                                label: "Référence", render: () => (
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-900 text-sm">{reference}</span>
                                        <button onClick={copyRef} className="p-1 hover:bg-slate-100 rounded-md transition">
                                            {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} className="text-slate-400" />}
                                        </button>
                                    </div>
                                )
                            },
                            { label: "Prestataire", value: ticket.provider?.company_name ?? ticket.provider?.name ?? "-" },
                            { label: "Site", value: ticket.site?.nom ?? ticket.site?.name ?? "-" },
                            { label: "Date soumise", value: formatDate(ticket.start_date) },
                            ...(ticket.validated_at ? [{ label: "Date réalisée", value: formatDate(ticket.validated_at) }] : []),
                        ].map((f, i) => (
                            <div key={i} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                                <p className="text-xs text-slate-400 font-medium">{f.label}</p>
                                {(f as any).render ? (f as any).render()
                                    : <p className="text-sm font-bold text-slate-900">{(f as any).value}</p>}
                            </div>
                        ))}
                        <div className="flex items-center justify-between py-3">
                            <p className="text-xs text-slate-400 font-medium">Statut</p>
                            <StatusBadge status={ticket.status ?? "pending"} />
                        </div>
                    </div>

                    {/* Rapport */}
                    <div>
                        <p className="text-xs text-slate-400 font-medium mb-2">Observations du rapport</p>
                        <div
                            className="prose prose-sm max-w-none text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-xl p-4 border border-slate-100"
                            dangerouslySetInnerHTML={{ __html: ticket.description ?? "Aucune observation." }}
                        />
                    </div>

                    {/* Note si déjà évaluée */}
                    {ticket.rating && (
                        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2">Évaluation</p>
                            <StarRating value={ticket.rating} readonly />
                            {ticket.manager_comment && (
                                <p className="text-xs text-amber-700 mt-2 leading-relaxed">
                                    "{ticket.manager_comment}"
                                </p>
                            )}
                        </div>
                    )}

                    {/* Motif rejet */}
                    {(ticket.status === "rejected") && ticket.rejection_reason && (
                        <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                            <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Motif de rejet</p>
                            <p className="text-sm text-red-700 leading-relaxed">{ticket.rejection_reason}</p>
                        </div>
                    )}

                    {/* CTA Valider si rapporté */}
                    {(ticket.status === "submitted" || ticket.status === "pending") && (
                        <button
                            onClick={() => onOpenValidation(ticket)}
                            className="w-full py-3.5 rounded-2xl bg-slate-900 text-white text-sm font-black
                hover:bg-black transition flex items-center justify-center gap-2"
                        >
                            <ShieldCheck size={16} />
                            Valider le rapport
                        </button>
                    )}

                    {ticket.status === "validated" && (
                        <div className="flex items-center gap-2 py-3.5 px-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-bold">
                            <CheckCircle2 size={16} />
                            Clôturé le {formatDate(ticket.validated_at)}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

// ─── Page principale Admin/Super-Admin ───────────────────────────────────────

export default function ManagerEntretienPage() {
    const router = useRouter();

    const {
        reports,
        stats,
        isLoading,
        error: apiError,
        fetchReports,
        fetchStats,
        validateReport: validateReportHook,
        rejectReport: rejectReportHook,
    } = useReports();

    const [statusFilter, setStatusFilter] = useState("");
    const [selectedTicket, setSelectedTicket] = useState<InterventionReport | null>(null);
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [isValidationOpen, setIsValidationOpen] = useState(false);
    const [validationTarget, setValidationTarget] = useState<InterventionReport | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        fetchReports();
        fetchStats();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const openPanel = (t: InterventionReport) => { setSelectedTicket(t); setIsPanelOpen(true); };
    const closePanel = () => setIsPanelOpen(false);
    const openValidation = (t: InterventionReport) => {
        setValidationTarget(t); setIsPanelOpen(false); setIsValidationOpen(true);
    };
    const closeValidation = () => { setIsValidationOpen(false); setValidationTarget(null); };

    const [dateRange, setDateRange] = useState<import("react-day-picker").DateRange | undefined>(undefined);

    const filtered = reports
        .filter(t => t.intervention_type === "preventif")
        .filter(t => statusFilter ? t.status === statusFilter : true)
        .filter(t => {
            if (!dateRange?.from) return true;
            const d = new Date(t.created_at ?? "");
            if (isNaN(d.getTime())) return true;
            const to = dateRange.to ?? dateRange.from;
            const toEnd = new Date(to); toEnd.setHours(23, 59, 59, 999);
            return d >= dateRange.from && d <= toEnd;
        });

    const pendingCount = reports.filter(t => t.status === "submitted" || t.status === "pending").length;

    const kpis = [
        { label: "Total entretiens", value: stats?.total_reports ?? reports.length, delta: "", trend: "up" as const },
        { label: "À valider", value: pendingCount, delta: "", trend: "up" as const },
        { label: "Validés", value: stats?.validated_reports ?? reports.filter(t => t.status === "validated").length, delta: "", trend: "up" as const },
        { label: "Note moyenne", value: stats?.average_rating ? `${Number(stats.average_rating).toFixed(1)}/5` : "-", delta: "", trend: "up" as const },
    ];

    const handleValidate = async (data: { rating: number; comment: string }) => {
        if (!validationTarget) return;
        setSubmitting(true);
        try {
            await validateReportHook(validationTarget.id, {
                result: "RAS",
                rating: data.rating,
                comment: data.comment,
            });
            closeValidation();
            toast.success("Rapport validé avec succès !");
            fetchReports();
            fetchStats();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Erreur lors de la validation");
        } finally {
            setSubmitting(false);
        }
    };

    const handleReject = async (reason: string) => {
        if (!validationTarget) return;
        setSubmitting(true);
        try {
            await rejectReportHook(validationTarget.id, { reason });
            closeValidation();
            toast.success("Rapport rejeté. Le prestataire sera notifié.");
            fetchReports();
            fetchStats();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Erreur lors du rejet");
        } finally {
            setSubmitting(false);
        }
    };

    const columns: ColumnConfig<InterventionReport>[] = [
        {
            header: "Référence", key: "id",
            render: (_: any, row: InterventionReport) => (
                <span className="font-black text-slate-900 text-sm">
                    {(row as any).reference || `#${row.id}`}
                </span>
            ),
        },
        {
            header: "Prestataire", key: "provider",
            render: (_: any, row: InterventionReport) => (
                <span className="text-xs text-slate-600 font-medium">
                    {row.provider?.company_name ?? row.provider?.name ?? "-"}
                </span>
            ),
        },
        {
            header: "Site", key: "site",
            render: (_: any, row: InterventionReport) => (
                <span className="text-xs text-slate-600 font-medium">
                    {row.site?.nom ?? row.site?.name ?? "-"}
                </span>
            ),
        },
        {
            header: "Date", key: "start_date",
            render: (_: any, row: InterventionReport) => (
                <span className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
                    <CalendarDays size={12} className="text-slate-400" />
                    {formatDate(row.start_date ?? row.created_at)}
                </span>
            ),
        },
        {
            header: "Statut", key: "status",
            render: (_: any, row: InterventionReport) => <StatusBadge status={row.status ?? "pending"} />,
        },
        {
            header: "Note", key: "rating",
            render: (_: any, row: InterventionReport) => (
                row.rating
                    ? <StarRating value={Number(row.rating)} readonly />
                    : <span className="text-xs text-slate-300 font-medium">-</span>
            ),
        },
        {
            header: "Actions", key: "actions",
            render: (_: any, row: InterventionReport) => (
                <div className="flex items-center gap-2">
                    <Link
                        href={`/admin/entretien/${row.id}`}
                        className="group p-2 rounded-xl bg-white hover:bg-gray-50 transition flex items-center justify-center"
                        aria-label={`Aller au détail de l'entretien`}
                    >
                        <Eye size={16} className="group-hover:rotate-45 transition-transform" />
                    </Link>


                    {(row.status === "submitted" || row.status === "pending") && (
                        <button
                            onClick={() => openValidation(row)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600
                text-white text-xs font-bold hover:bg-violet-700 transition"
                        >
                            <ShieldCheck size={13} /> Valider
                        </button>
                    )}

                </div>
            ),
        },
    ];

    return (
        <>
            <div className="flex-1 flex flex-col">
                <Navbar />
                <main className="mt-20 p-6 space-y-8">

                    <PageHeader
                        title="Entretiens"
                        subtitle="Consultez et validez les rapports d'entretien préventif soumis par les prestataires"
                    />

                    {apiError && (
                        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl text-sm font-medium">
                            <AlertCircle size={15} className="shrink-0" /> {apiError}
                        </div>
                    )}

                    {/* Bandeau "À valider"
                    {pendingCount > 0 && (
                        <div className="flex items-center gap-3 bg-violet-50 border border-violet-200 text-violet-800
              px-5 py-4 rounded-2xl text-sm font-semibold">
                            <ClipboardList size={16} className="shrink-0 text-violet-600" />
                            <span>
                                <strong>{pendingCount} rapport{pendingCount > 1 ? "s" : ""}</strong>
                                {" "}en attente de validation
                            </span>
                            <button
                                onClick={() => setStatusFilter("submitted")}
                                className="ml-auto text-xs font-black text-violet-600 hover:text-violet-800 underline underline-offset-2"
                            >
                                Voir ...
                            </button>
                        </div>
                    )} */}

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {kpis.map((k, i) => <StatsCard key={i} {...k} />)}
                    </div>

                    <div className="shrink-0 flex justify-between items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Filter size={15} className="text-slate-400 shrink-0" />
                            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                                className="border border-slate-200 bg-white text-slate-700 text-sm font-semibold
                  rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900 transition cursor-pointer">
                                <option value="">Tous les statuts</option>
                                {["pending", "submitted", "validated", "rejected"].map(s => (
                                    <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
                                ))}
                            </select>
                            {statusFilter && (
                                <button onClick={() => setStatusFilter("")}
                                    className="p-1.5 hover:bg-slate-100 rounded-lg transition text-slate-400">
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                        <ActionGroup actions={[
                            { label: "Actualiser", icon: RefreshCw, onClick: () => { fetchReports(); fetchStats(); }, variant: "secondary" as const },
                        ]} />
                    </div>

                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
                            <span className="text-xs text-slate-400">{filtered.length} entretien{filtered.length > 1 ? "s" : ""}</span>
                        </div>
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center p-20 gap-4">
                                <div className="w-8 h-8 border-4 border-slate-100 border-t-slate-900 rounded-full animate-spin" />
                            </div>
                        ) : (
                            <div className="px-6 py-4">
                                <DataTable title="Rapports des visites préventives" columns={columns} data={filtered} onViewAll={() => { }} />
                            </div>
                        )}
                    </div>

                </main>
            </div>


            {isPanelOpen && selectedTicket && (
                <MaintenancePreviewPanel
                    ticket={selectedTicket}
                    onClose={closePanel}
                    onOpenValidation={openValidation}
                />
            )}

            {isValidationOpen && validationTarget && (
                <ValidationModal
                    ticket={validationTarget}
                    onClose={closeValidation}
                    onValidate={handleValidate}
                    onReject={handleReject}
                    submitting={submitting}
                />
            )}
        </>
    );
}