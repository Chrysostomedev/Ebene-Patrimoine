"use client";

import { useRouter } from "next/navigation";
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
  Wrench,
} from "lucide-react";
import { useState } from "react";

import { useReports } from "../../../hooks/manager/useReports";
import { ReportService } from "../../../services/manager/report.service";
import type { InterventionReport, ProjectStatus } from "../../../types/manager.types";

// ─── Static helpers ───────────────────────────────────────────────────────────

const ALL_STATUSES = ["submitted", "validated", "rejected", "pending"];

const STATUS_LABELS: Record<string, string> = {
  submitted: "Soumis",
  validated: "Validé",
  pending: "En attente",
  rejected: "Rejeté",
  draft: "Brouillon",
};

const STATUS_STYLES: Record<string, string> = {
  submitted: "border-blue-200   bg-blue-50   text-blue-700",
  validated: "border-emerald-200 bg-emerald-50 text-emerald-700",
  pending: "border-amber-200  bg-amber-50  text-amber-700",
  rejected: "border-red-200    bg-red-50    text-red-700",
};

const STATUS_DOT: Record<string, string> = {
  submitted: "#3b82f6", validated: "#10b981", pending: "#f59e0b", rejected: "#ef4444",
};

const WORKFLOW_STEPS = [
  { key: "submitted", icon: CalendarDays, label: "Soumis" },
  { key: "pending", icon: PlayCircle, label: "En attente" },
  { key: "validated", icon: ShieldCheck, label: "Validé" },
  { key: "rejected", icon: XCircle, label: "Rejeté" },
];

const formatDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "-";

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div className={`fixed bottom-6 right-6 z-[99999] flex items-center gap-3 px-5 py-4
      rounded-2xl shadow-2xl border text-sm font-semibold animate-in slide-in-from-bottom-4 duration-300
      ${type === "success" ? "bg-white border-green-100 text-green-700" : "bg-white border-red-100 text-red-700"}`}>
      {type === "success"
        ? <CheckCircle2 size={18} className="text-green-500 shrink-0" />
        : <XCircle size={18} className="text-red-500 shrink-0" />}
      {msg}
    </div>
  );
}

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
  const effectiveIdx = status === "rejected"
    ? WORKFLOW_STEPS.findIndex(s => s.key === "pending")
    : WORKFLOW_STEPS.findIndex(s => s.key === status);

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
              <h2 className="text-xl font-black text-slate-900">{ticket.reference || `#${ticket.id}`}</h2>
              <p className="text-slate-400 text-xs mt-0.5">
                {ticket.provider?.name} · {ticket.site?.nom ?? "-"} · {formatDate(ticket.start_date)}
              </p>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-xl transition mt-1">
              <X size={18} className="text-slate-500" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Toggle Valider / Rejeter */}
            <div className="flex bg-slate-100 rounded-2xl p-1 gap-1">
              <button
                type="button"
                onClick={() => setMode("review")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition
                  ${mode === "review" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
              >
                <ThumbsUp size={15} /> Valider
              </button>
              {/* <button
                type="button"
                onClick={() => setMode("reject")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition
                  ${mode === "reject" ? "bg-white shadow-sm text-red-600" : "text-slate-500 hover:text-slate-700"}`}
              >
                <ThumbsDown size={15} /> Rejeter
              </button> */}
            </div>

            {/* Mode VALIDER */}
            {mode === "review" && (
              <div className="space-y-4">
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
                  {submitting ? "Validation en cours…" : "Valider le rapport"}
                </button>
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
          <p className="text-slate-400 text-xs mt-0.5">Détails du rapport d'intervention</p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-5">
          <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Progression</p>
            <WorkflowProgress status={ticket.status} />
          </div>

          <div className="space-y-0 text-sm">
            {[
              { label: "Référence", value: ticket.reference || `#${ticket.id}` },
              { label: "Prestataire", value: ticket.provider?.name ?? "-" },
              { label: "Site", value: ticket.site?.nom ?? "-" },
              { label: "Date réalisation", value: formatDate(ticket.start_date) },
            ].map((f, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-slate-50">
                <span className="text-slate-400">{f.label}</span>
                <span className="font-bold text-slate-900">{f.value}</span>
              </div>
            ))}
            <div className="flex items-center justify-between py-3 border-b border-slate-50">
              <span className="text-slate-400">Statut</span>
              <StatusBadge status={ticket.status} />
            </div>
          </div>

          {ticket.rating && (
            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
              <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2">Évaluation</p>
              <StarRating value={ticket.rating} readonly />
              {ticket.comment && <p className="text-xs text-amber-700 mt-2 leading-relaxed italic">"{ticket.comment}"</p>}
            </div>
          )}

          {ticket.status === "submitted" && (
            <button
              onClick={() => onOpenValidation(ticket)}
              className="w-full py-3.5 rounded-2xl bg-slate-900 text-white text-sm font-black hover:bg-black transition flex items-center justify-center gap-2"
            >
              <ShieldCheck size={16} /> Valider / Rejeter
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ManagerEntretienPage() {
  const router = useRouter();

  const {
    reports: tickets,
    stats: apiStats,
    meta,
    isLoading,
    error: apiError,
    setFilters,
    filters,
    refresh
  } = useReports({ intervention_type: "preventif" });

  const [selectedTicket, setSelectedTicket] = useState<InterventionReport | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isValidationOpen, setIsValidationOpen] = useState(false);
  const [validationTarget, setValidationTarget] = useState<InterventionReport | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const openPanel = (t: InterventionReport) => { setSelectedTicket(t); setIsPanelOpen(true); };
  const closePanel = () => setIsPanelOpen(false);
  const openValidation = (t: InterventionReport) => {
    setValidationTarget(t); setIsPanelOpen(false); setIsValidationOpen(true);
  };
  const closeValidation = () => { setIsValidationOpen(false); setValidationTarget(null); };

  const handleValidate = async (data: { rating: number; comment: string }) => {
    if (!validationTarget) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await ReportService.validateReport(validationTarget.id, {
        result: "RAS",
        rating: data.rating,
        comment: data.comment,
      });
      // Refresh depuis l'API pour avoir les données à jour
      refresh();
      closeValidation();
      setSubmitSuccess("Rapport validé !");
      setTimeout(() => setSubmitSuccess(null), 4000);
    } catch (err: any) {
      setSubmitError(err?.response?.data?.message || "Erreur lors de la validation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (reason: string) => {
    if (!validationTarget) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await ReportService.validateReport(validationTarget.id, {
        result: "ANOMALIE",
        comment: `REJET: ${reason}`,
      });
      // Refresh depuis l'API pour avoir les données à jour
      refresh();
      closeValidation();
      setSubmitSuccess("Rapport rejeté !");
      setTimeout(() => setSubmitSuccess(null), 4000);
    } catch (err: any) {
      setSubmitError(err?.response?.data?.message || "Erreur lors du rejet");
    } finally {
      setSubmitting(false);
    }
  };

  const kpis = [
    { label: "Total entretiens", value: meta?.total ?? apiStats?.total ?? 0, trend: "up" as const },
    { label: "À valider", value: apiStats?.pending ?? tickets?.filter(t => t.status === "submitted").length ?? 0, trend: "up" as const },
    // { label: "Validés", value: apiStats?.validated ?? 0, trend: "up" as const },
    { label: "Note moyenne", value: apiStats?.average_rating ? `${apiStats.average_rating}/5` : "-", trend: "up" as const },
  ];

  const columns: ColumnConfig<InterventionReport>[] = [
    {
      header: "Référence", key: "reference",
      render: (_: any, row: InterventionReport) => <span className="font-black text-slate-900 text-sm">{row.reference || `${row.id}`}</span>,
    },
    {
      header: "Prestataire", key: "provider",
      render: (_: any, row: InterventionReport) => <span className="text-xs text-slate-600 font-medium">{row.provider?.name ?? "-"}</span>,
    },
    // {
    //   header: "Site", key: "site",
    //   render: (_: any, row: InterventionReport) => <span className="text-xs text-slate-600 font-medium">{row.site?.nom ?? "-"}</span>,
    // },
    {
      header: "Date", key: "start_date",
      render: (_: any, row: InterventionReport) => (
        <span className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
          <CalendarDays size={12} className="text-slate-400" />
          {formatDate(row.start_date)}
        </span>
      ),
    },
    {
      header: "Statut", key: "status",
      render: (_: any, row: InterventionReport) => <StatusBadge status={row.status} />,
    },
    {
      header: "Note", key: "rating",
      render: (_: any, row: InterventionReport) => row.rating ? <StarRating value={row.rating} readonly /> : <span className="text-xs text-slate-300">-</span>,
    },
    {
      header: "Actions", key: "actions",
      render: (_: any, row: InterventionReport) => (
        <div className="flex items-center gap-2">

          {row.status === "submitted" && (
            <button onClick={() => openValidation(row)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 transition">
              <ShieldCheck size={13} /> Valider
            </button>
          )}
          <button onClick={() => router.push(`/manager/rapports/${row.id}`)} className="group p-2 rounded-xl bg-white hover:bg-black border border-slate-200 transition">
            <Eye size={15} className="group-hover:text-white group-hover:rotate-45 transition-all" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar />
        <main className="mt-20 p-8 space-y-8 overflow-y-auto h-[calc(100vh-80px)]">
          <PageHeader title="Entretiens" subtitle="Gestion des entretiens préventifs et validation des rapports." />

          {(apiError || submitError) && (
            <div className="bg-red-50 border border-red-100 text-red-700 px-6 py-4 rounded-2xl text-sm font-semibold flex items-center gap-3">
              <AlertCircle size={18} /> {apiError || submitError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {kpis.map((k, i) => <StatsCard key={i} {...k} />)}
          </div>

          <div className="flex justify-between items-center gap-4"> 
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-slate-400" />
              <select
                value={filters.status || ""}
                onChange={e => setFilters({ status: e.target.value || undefined })}
                className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm font-bold text-slate-700 shadow-sm"
              >
                <option value="">Tous les statuts</option>
                {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center p-20 gap-4">
                <div className="w-8 h-8 border-4 border-slate-100 border-t-slate-900 rounded-full animate-spin" />
              </div>
            ) : (
              <DataTable columns={columns} data={tickets || []} title="Liste des entretiens" onViewAll={() => { }} />
            )}
          </div>
        </main>
      </div>

      {isValidationOpen && validationTarget && <ValidationModal ticket={validationTarget} onClose={closeValidation} onValidate={handleValidate} onReject={handleReject} submitting={submitting} />}
      {isPanelOpen && selectedTicket && <MaintenancePreviewPanel ticket={selectedTicket} onClose={closePanel} onOpenValidation={openValidation} />}
      {submitSuccess && <Toast msg={submitSuccess} type="success" />}
    </>
  );
}