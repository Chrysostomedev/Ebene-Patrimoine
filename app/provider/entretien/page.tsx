"use client";

import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import StatsCard from "@/components/StatsCard";
import DataTable, { ColumnConfig } from "@/components/DataTable";
import PageHeader from "@/components/PageHeader";
import ActionGroup from "@/components/ActionGroup";
import ReusableForm from "@/components/ReusableForm";
import { useState, useEffect } from "react";
import { useToast } from "../../../contexts/ToastContext";
import {
  Eye, ArrowUpRight, Download, Filter, X,
  FileText, CheckCircle2, XCircle, AlertCircle,
  PlusCircle, Copy, Check, CalendarDays,
  ClipboardList, Wrench, ShieldCheck,
  PlayCircle, CheckSquare, AlertTriangle,
  RefreshCw
} from "lucide-react";

import { useProviderReports } from "../../../hooks/provider/useProviderReports";
import { formatDate, formatCurrency } from "@/lib/utils";


// ─── Types ────────────────────────────────────────────────────────────────────

type MaintenanceStatus =
  | "planifié" | "en_cours" | "rapporté" | "validé"
  | "clos" | "rejeté" | "anomalie";

type AnomalyAction = "ras" | "immediate" | "devis";

interface MaintenanceTicket {
  id: number;
  reference: string;
  site: { nom?: string; name?: string } | null;
  site_id: number;
  planning_id?: number;
  scheduled_date: string;
  completed_date?: string;
  status: MaintenanceStatus;
  equipments?: { id: number; name: string; type?: string }[];
  report?: {
    observations: string;
    anomaly_action: AnomalyAction;
    rejection_reason?: string;
    photos?: string[];
    submitted_at?: string;
    validated_at?: string;
  };
  curative_ticket_id?: number;
  created_at: string;
}

// ─── Static helpers ───────────────────────────────────────────────────────────

const ALL_STATUSES: MaintenanceStatus[] = [
  "planifié", "en_cours", "rapporté", "validé", "clos", "rejeté", "anomalie",
];

const STATUS_LABELS: Record<string, string> = {
  planifié: "Planifié", en_cours: "En cours", rapporté: "Rapporté",
  validé: "Validé", clos: "Clôturé", rejeté: "Rejeté", anomalie: "Anomalie",
};

const STATUS_STYLES: Record<string, string> = {
  planifié: "border-blue-200   bg-blue-50   text-blue-700",
  en_cours: "border-amber-200  bg-amber-50  text-amber-700",
  rapporté: "border-violet-200 bg-violet-50 text-violet-700",
  validé: "border-emerald-200 bg-emerald-50 text-emerald-700",
  clos: "border-slate-200  bg-slate-50  text-slate-500",
  rejeté: "border-red-200    bg-red-50    text-red-700",
  anomalie: "border-orange-200 bg-orange-50 text-orange-700",
};

const STATUS_DOT: Record<string, string> = {
  planifié: "#3b82f6", en_cours: "#f59e0b", rapporté: "#8b5cf6",
  validé: "#10b981", clos: "#94a3b8", rejeté: "#ef4444", anomalie: "#f97316",
};

const WORKFLOW_STEPS = [
  { key: "planifié", icon: CalendarDays, label: "Planifié" },
  { key: "en_cours", icon: PlayCircle, label: "En cours" },
  { key: "rapporté", icon: ClipboardList, label: "Rapporté" },
  { key: "validé", icon: ShieldCheck, label: "Validé" },
  { key: "clos", icon: CheckSquare, label: "Clôturé" },
];

const MOCK_TICKETS: MaintenanceTicket[] = [
  {
    id: 1, reference: "ENT-2025-001",
    site: { nom: "Siège Social Abidjan" }, site_id: 1, planning_id: 10,
    scheduled_date: "2025-07-15T08:00:00Z", status: "planifié",
    created_at: "2025-07-01T10:00:00Z",
  },
  {
    id: 2, reference: "ENT-2025-002",
    site: { nom: "Antenne Bouaké" }, site_id: 2,
    scheduled_date: "2025-07-10T09:00:00Z",
    completed_date: "2025-07-10T14:30:00Z", status: "rapporté",
    report: {
      observations: "Climatisation salle serveur défectueuse, filtre encrassé.",
      anomaly_action: "devis", submitted_at: "2025-07-10T15:00:00Z",
    },
    created_at: "2025-06-28T10:00:00Z",
  },
  {
    id: 3, reference: "ENT-2025-003",
    site: { nom: "Agence Plateau" }, site_id: 3,
    scheduled_date: "2025-07-05T08:00:00Z", status: "clos",
    report: {
      observations: "RAS. Tous les équipements sont en bon état.",
      anomaly_action: "ras",
      validated_at: "2025-07-06T09:00:00Z", submitted_at: "2025-07-05T16:00:00Z",
    },
    created_at: "2025-06-20T10:00:00Z",
  },
  {
    id: 4, reference: "ENT-2025-004",
    site: { nom: "Datacenter Yopougon" }, site_id: 4,
    scheduled_date: "2025-07-12T08:00:00Z", status: "rejeté",
    report: {
      observations: "Rapport incomplet, photos manquantes.",
      anomaly_action: "ras",
      rejection_reason: "Rapport incomplet : les photos des équipements vérifiés sont absentes.",
      submitted_at: "2025-07-12T13:00:00Z",
    },
    created_at: "2025-06-25T10:00:00Z",
  },
  {
    id: 5, reference: "ENT-2025-005",
    site: { nom: "Siège Social Abidjan" }, site_id: 1,
    scheduled_date: "2025-07-18T08:00:00Z", status: "en_cours",
    created_at: "2025-07-02T10:00:00Z",
  },
];

// local formatDate removed - using @/lib/utils


// ─── Toast ────────────────────────────────────────────────────────────────────
// Remplacé par `Toast` global de `@/components/Toast`

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

function WorkflowProgress({ status }: { status: MaintenanceStatus }) {
  const effectiveIdx = status === "rejeté" || status === "anomalie"
    ? WORKFLOW_STEPS.findIndex(s => s.key === "rapporté")
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

// ─── Modale Devis rapide (centre) ─────────────────────────────────────────────

function QuickDevisModal({
  ticketRef,
  onClose,
  onSubmit,
}: {
  ticketRef: string;
  onClose: () => void;
  onSubmit: (data: any) => void;
}) {
  const [form, setForm] = useState({ description: "", amount_ht: "", tax_rate: "18", pdf: null as File | null });
  const [submitting, setSubmitting] = useState(false);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 800));
    onSubmit(form);
    setSubmitting(false);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200]" onClick={onClose} />
      <div className="fixed inset-0 z-[201] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">

          {/* Header */}
          <div className="flex items-start justify-between px-6 pt-6 pb-0">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-xl bg-orange-100 flex items-center justify-center">
                  <FileText size={14} className="text-orange-600" />
                </div>
                <span className="text-xs font-black text-orange-600 uppercase tracking-widest">Devis requis</span>
              </div>
              <h2 className="text-xl font-black text-slate-900">Émettre un devis</h2>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-xl transition">
              <X size={18} className="text-slate-500" />
            </button>
          </div>

          <form onSubmit={handle} className="px-6 py-5 space-y-4">
            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">Description de l'anomalie *</label>
              <textarea
                required
                rows={3}
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Décrivez l'anomalie et les travaux nécessaires…"
                className="w-full bg-slate-50 rounded-2xl p-4 text-sm text-slate-700 placeholder:text-slate-400
                  outline-none focus:ring-2 focus:ring-slate-900 transition resize-none"
              />
            </div>

            {/* Montants */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Montant HT (FCFA) *</label>
                <input
                  required type="number" min="0"
                  value={form.amount_ht}
                  onChange={e => setForm(p => ({ ...p, amount_ht: e.target.value }))}
                  placeholder="0"
                  className="w-full bg-slate-50 rounded-2xl p-4 text-sm text-slate-700
                    outline-none focus:ring-2 focus:ring-slate-900 transition"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">TVA (%)</label>
                <input
                  type="number" min="0" max="100"
                  value={form.tax_rate}
                  onChange={e => setForm(p => ({ ...p, tax_rate: e.target.value }))}
                  className="w-full bg-slate-50 rounded-2xl p-4 text-sm text-slate-700
                    outline-none focus:ring-2 focus:ring-slate-900 transition"
                />
              </div>
            </div>

            {/* Résumé TTC */}
            {form.amount_ht && (
              <div className="flex items-center justify-between bg-slate-900 rounded-2xl px-4 py-3">
                <span className="text-xs font-bold text-slate-400">Total TTC estimé</span>
                <span className="text-sm font-black text-white">
                  {formatCurrency(parseFloat(form.amount_ht) * (1 + parseFloat(form.tax_rate || "0") / 100))}
                </span>

              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="button" onClick={onClose}
                className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-700 text-sm font-bold
                  hover:bg-slate-50 transition"
              >
                Annuler
              </button>
              <button
                type="submit" disabled={submitting}
                className="flex-1 py-3 rounded-2xl bg-slate-900 text-white text-sm font-black
                  hover:bg-black transition disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <FileText size={15} />
                )}
                {submitting ? "Soumission…" : "Soumettre le devis"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// ─── Formulaire Rapport inline (side panel = ReusableForm custom) ─────────────
// On crée un formulaire dédié pour éviter la limitation radio de ReusableForm

function ReportFormPanel({
  ticket,
  onClose,
  onSubmit,
  submitting,
}: {
  ticket: MaintenanceTicket;
  onClose: () => void;
  onSubmit: (data: any) => void;
  submitting: boolean;
}) {
  const [observations, setObservations] = useState(
    ticket.report?.observations ?? ""
  );
  const [anomalyDetected, setAnomalyDetected] = useState(
    ticket.status === "anomalie"
  );
  const [showDevisModal, setShowDevisModal] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [devisSubmitted, setDevisSubmitted] = useState(false);

  const isRejected = ticket.status === "rejeté";

  const handleDevisSubmit = (data: any) => {
    setShowDevisModal(false);
    setDevisSubmitted(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!observations) return;
    onSubmit({
      findings: observations,
      anomaly_detected: anomalyDetected,
      attachments
    });
  };

  const radioOptions: { value: AnomalyAction; label: string; desc: string; icon: any; color: string }[] = [
    {
      value: "RAS",
      label: "RAS - Rien à signaler",
      desc: "Tout est en bon état. Le ticket sera clôturé automatiquement.",
      icon: CheckCircle2,
      color: "emerald",
    },
    {
      value: "immediate",
      label: "Anomalie - Résolue sur place",
      desc: "Une anomalie a été détectée et traitée immédiatement.",
      icon: Wrench,
      color: "amber",
    },
    {
      value: "devis",
      label: "Anomalie - Nécessite un devis",
      desc: "Intervention ultérieure requise. Un devis sera émis.",
      icon: FileText,
      color: "orange",
    },
  ];

  const colorMap: Record<string, { ring: string; bg: string; text: string; dot: string }> = {
    emerald: { ring: "ring-emerald-500 border-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
    amber: { ring: "ring-amber-500 border-amber-500", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
    orange: { ring: "ring-orange-500 border-orange-500", bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500" },
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[480px] bg-white z-50 shadow-2xl flex flex-col rounded-l-3xl overflow-hidden">

        {/* Close */}
        <div className="flex items-start px-6 pt-6 pb-0 shrink-0">
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-xl transition -ml-1">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        {/* Title */}
        <div className="px-6 pt-3 pb-5 shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-black uppercase tracking-widest
              ${isRejected ? "text-red-500" : "text-slate-400"}`}>
              {isRejected ? "⚠ Correction requise" : "Nouveau rapport"}
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900">
            {isRejected ? "Corriger le rapport" : "Rapport d'entretien"}
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">
            {isRejected
              ? `Motif : ${ticket.report?.rejection_reason ?? "Voir ci-dessous"}`
              : `Entretien ${ticket.reference} - ${ticket.site?.nom ?? ""}`}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 pb-6 space-y-5">

          {/* Motif rejet si applicable */}
          {isRejected && ticket.report?.rejection_reason && (
            <div className="bg-red-50 rounded-xl p-4 border border-red-100">
              <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Motif de rejet</p>
              <p className="text-sm text-red-700 leading-relaxed">{ticket.report.rejection_reason}</p>
            </div>
          )}

          {/* Observations */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-900">
              Observations <span className="text-red-500">*</span>
            </label>
            <textarea
              required rows={4}
              value={observations}
              onChange={e => setObservations(e.target.value)}
              placeholder="Décrivez l'état général des équipements vérifiés, les opérations effectuées…"
              className="w-full bg-slate-50 rounded-2xl p-4 text-sm text-slate-700 placeholder:text-slate-400
                outline-none focus:ring-2 focus:ring-slate-900 transition resize-none"
            />
          </div>

          {/* Checkbox Anomalie */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <Checkbox
              name="anomaly_detected"
              label="Anomalie détectée lors de l'entretien ?"
              defaultChecked={anomalyDetected}
              onChange={setAnomalyDetected}
            />
            <p className="text-[10px] text-slate-400 mt-2 ml-9 leading-relaxed">
              Cochez cette case si vous avez constaté un dysfonctionnement nécessitant une attention particulière ou un devis.
            </p>
            {anomalyDetected && !devisSubmitted && (
               <button
                  type="button"
                  onClick={() => setShowDevisModal(true)}
                  className="mt-3 ml-9 text-xs font-bold text-orange-600 underline underline-offset-2 hover:text-orange-800 transition"
                >
                  Remplir le formulaire de devis ...
                </button>
            )}
            {anomalyDetected && devisSubmitted && (
              <div className="mt-2 ml-9 flex items-center gap-1.5 text-xs font-bold text-orange-600">
                <CheckCircle2 size={12} /> Devis soumis avec succès
              </div>
            )}
          </div>

          {/* Upload Fichiers */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-900">Pièces jointes (Photos, PDF, Office)</label>
            <PdfUpload
              name="attachments"
              maxPDFs={10}
              accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
              placeholder="Cliquez pour ajouter des photos ou documents"
              onChange={setAttachments}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !observations || (anomalyDetected && !devisSubmitted)}
            className="w-full py-4 rounded-2xl bg-slate-900 text-white text-sm font-black
              hover:bg-black transition disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center justify-center gap-2"
          >
            {submitting
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <ClipboardList size={16} />}
            {submitting
              ? "Soumission en cours…"
              : isRejected ? "Resoumettre le rapport" : "Soumettre le rapport"}
          </button>

          {anomalyAction === "devis" && !devisSubmitted && (
            <p className="text-center text-xs text-orange-600 font-medium -mt-2">
              ⚠ Vous devez soumettre le devis avant de valider le rapport
            </p>
          )}
        </form>
      </div>

      {/* Modale devis (au centre) */}
      {showDevisModal && (
        <QuickDevisModal
          ticketRef={ticket.reference}
          onClose={() => setShowDevisModal(false)}
          onSubmit={handleDevisSubmit}
        />
      )}
    </>
  );
}

// ─── Side Panel aperçu ────────────────────────────────────────────────────────

function MaintenancePreviewPanel({
  ticket, onClose, onSubmitReport,
}: {
  ticket: MaintenanceTicket;
  onClose: () => void;
  onSubmitReport: (t: MaintenanceTicket) => void;
}) {
  const [copied, setCopied] = useState(false);
  const copyRef = () => {
    navigator.clipboard.writeText(ticket.reference);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const canSubmitReport = ticket.status === "en_cours" || ticket.status === "rejeté";

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
          <p className="text-slate-400 text-xs mt-0.5">Détails de la visite d'entretien préventif</p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-5">
          {/* Workflow
          <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Progression</p>
            <WorkflowProgress status={ticket.status} />
            {(ticket.status === "rejeté" || ticket.status === "anomalie") && (
              <div className="mt-4 flex items-center gap-2 text-xs font-bold text-red-600">
                <AlertTriangle size={12} />
                {ticket.status === "rejeté" ? "Rapport rejeté - correction requise" : "Anomalie détectée"}
              </div>
            )}
          </div> */}

          {/* Champs */}
          <div className="space-y-0">
            {[
              {
                label: "Référence", render: () => (
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{ticket.reference}</span>
                    <button onClick={copyRef} className="p-1 hover:bg-slate-100 rounded-md transition">
                      {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} className="text-slate-400" />}
                    </button>
                  </div>
                )
              },
              { label: "Site", value: ticket.site?.nom ?? ticket.site?.name ?? "-" },
              { label: "Date planifiée", value: formatDate(ticket.scheduled_date) },
              ...(ticket.completed_date ? [{ label: "Date réalisée", value: formatDate(ticket.completed_date) }] : []),
              ...(ticket.curative_ticket_id ? [{ label: "Ticket curatif lié", value: `#${ticket.curative_ticket_id}` }] : []),
            ].map((f, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                <p className="text-xs text-slate-400 font-medium">{f.label}</p>
                {(f as any).render ? (f as any).render()
                  : <p className="text-sm font-bold text-slate-900">{(f as any).value}</p>}
              </div>
            ))}
            <div className="flex items-center justify-between py-3">
              <p className="text-xs text-slate-400 font-medium">Statut</p>
              <StatusBadge status={ticket.status} />
            </div>
          </div>

          {/* Motif rejet */}
          {ticket.status === "rejeté" && ticket.report?.rejection_reason && (
            <div className="bg-red-50 rounded-xl p-4 border border-red-100">
              <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Motif de rejet</p>
              <p className="text-sm text-red-700 leading-relaxed">{ticket.report.rejection_reason}</p>
            </div>
          )}

          {/* Rapport existant */}
          {ticket.report && (
            <div>
              <p className="text-xs text-slate-400 font-medium mb-2">Observations</p>
              <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-xl p-4 border border-slate-100">
                {ticket.report.observations}
              </p>
            </div>
          )}

          {/* CTA rapport */}
          {canSubmitReport && (
            <button
              onClick={() => onSubmitReport(ticket)}
              className="w-full py-3.5 rounded-2xl bg-slate-900 text-white text-sm font-black
                hover:bg-black transition flex items-center justify-center gap-2"
            >
              <ClipboardList size={16} />
              {ticket.status === "rejeté" ? "Corriger et resoumettre" : "Soumettre le rapport"}
            </button>
          )}

          {ticket.status === "clos" && (
            <div className="flex items-center gap-2 py-3.5 px-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-bold">
              <CheckCircle2 size={16} />
              Clôturé le {formatDate(ticket.report?.validated_at ?? "")}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function ProviderEntretienPage() {
  const router = useRouter();
  const { toast } = useToast();

  const {
    reports, filteredReports, stats,
    loading, statsLoading, submitting,
    error, submitSuccess, submitError,
    filters, setFilters,
    createReport, exportXlsx, refresh
  } = useProviderReports({ type: "preventif" });

  useEffect(() => { if (submitSuccess) toast.success(submitSuccess); }, [submitSuccess]);
  useEffect(() => { if (submitError) toast.error(submitError); }, [submitError]);

  // Filtre préventif déjà passé en paramètre du hook ci-dessus
  // useEffect(() => { setFilters({ type: "preventif" }); }, []);

  const [dateRange, setDateRange] = useState<import("react-day-picker").DateRange | undefined>(undefined);
  const handleDateRange = (range: import("react-day-picker").DateRange | undefined) => {
    setDateRange(range);
    setFilters({
      type: "preventif",
      date_from: range?.from ? range.from.toISOString().split("T")[0] : undefined,
      date_to: range?.to ? range.to.toISOString().split("T")[0] : undefined,
    });
  };

  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportTargetTicket, setReportTargetTicket] = useState<any | null>(null);
  const [isNewReportOpen, setIsNewReportOpen] = useState(false);

  const openPanel = (t: any) => { setSelectedTicket(t); setIsPanelOpen(true); };
  const closePanel = () => setIsPanelOpen(false);

  const openReport = (t: any) => {
    setReportTargetTicket(t);
    setIsPanelOpen(false);
    setIsReportOpen(true);
  };
  const closeReport = () => { setIsReportOpen(false); setReportTargetTicket(null); };

  const openNewReport = () => setIsNewReportOpen(true);

  // Champs du formulaire "Nouveau rapport" - conformes à la logique métier backend
  // Un rapport d'entretien préventif : result + dates + description + observations + photos
  // Le ticket_id et intervention_type sont gérés automatiquement côté backend (planning)
  const newReportFields: FieldConfig[] = [
    {
      name: "anomaly_detected", label: "Anomalie détectée ?", type: "checkbox",
    },
    {
      name: "action_taken", label: "Description / Travaux effectués",
      type: "rich-text", gridSpan: 2, placeholder: "Détaillez les actions menées lors de cet entretien..."
    },
    {
      name: "findings", label: "Observations / Anomalies constatées",
      type: "rich-text", gridSpan: 2,
    },
    {
      name: "attachments", label: "Documents et Photos justificatives",
      type: "pdf-upload", maxPDFs: 10, gridSpan: 2,
      accept: ".pdf,.doc,.docx,.xls,.xlsx,image/*",
      placeholder: "Cliquez pour ajouter des photos, PDF ou documents Office"
    },
  ];

  // Stats calculées depuis les rapports déjà filtrés (préventifs uniquement)
  const preventifReports = filteredReports; // déjà filtrés sur type=preventif
  const preventifStats = {
    total: preventifReports.length,
    pending: preventifReports.filter(r => r.status === "submitted" || r.status === "pending").length,
    validated: preventifReports.filter(r => r.status === "validated").length,
    avg_rating: (() => {
      const rated = preventifReports.filter(r => r.rating);
      if (!rated.length) return null;
      return (rated.reduce((s, r) => s + (r.rating ?? 0), 0) / rated.length).toFixed(1);
    })(),
  };

  const kpis = [
    { label: "Total rapports", value: statsLoading ? "-" : preventifStats.total, delta: "", trend: "up" as const },
    { label: "En attente", value: statsLoading ? "-" : preventifStats.pending, delta: "", trend: "up" as const },
    { label: "Validés", value: statsLoading ? "-" : preventifStats.validated, delta: "", trend: "up" as const },
    { label: "Note moyenne", value: statsLoading ? "-" : (preventifStats.avg_rating ? `${preventifStats.avg_rating}/5` : "—"), delta: "", trend: "up" as const },
  ];

  const actions = [
    { label: "Exporter", icon: Download, onClick: exportXlsx, variant: "secondary" as const },
    // { label: "Nouveau rapport", icon: PlusCircle, onClick: openNewReport, variant: "primary" as const },
  ];

  const handleSubmitReport = async (formData: any) => {
    const success = await createReport({
      ticket_id: reportTargetTicket?.id,
      ...formData
    });
    if (success) {
      closeReport();
    }
  };

  const columns: ColumnConfig<any>[] = [
    {
      header: "Référence", key: "id",
      render: (_: any, row: any) => (
        <span className="font-black text-slate-900 text-sm">{row.ticket?.code_ticket || row.reference || `ENT-${row.id}`}</span>
      ),
    },
    {
      header: "Site", key: "site_id",
      render: (_: any, row: any) => (
        <span className="text-xs text-slate-600 font-medium">{row.ticket?.site?.nom ?? row.site?.nom ?? "-"}</span>
      ),
    },
    {
      header: "Date ", key: "created_at",
      render: (_: any, row: any) => (
        <span className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
          <CalendarDays size={12} className="text-slate-400" />
          {formatDate(row.ticket?.planned_at || row.created_at)}
        </span>
      ),
    },
    {
      header: "Statut", key: "status",
      render: (_: any, row: any) => <StatusBadge status={row.status.toLowerCase()} />,
    },

    {
      header: "Actions", key: "actions",
      render: (_: any, row: any) => (
        <div className="flex items-center gap-2">
          {/* <button onClick={() => openPanel(row)}
            className="p-2 hover:bg-slate-100 rounded-xl transition text-slate-600 hover:text-slate-900">
            <Eye size={16} />
          </button> */}
          <button
            onClick={() => router.push(`/provider/entretien/${row.id}`)}
            className="group p-2 rounded-xl bg-white hover:bg-black border border-slate-200 hover:border-black transition">
            <Eye size={15} className="text-slate-600 group-hover:text-white group-hover:rotate-45 transition-all" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex-1 flex flex-col">
      <Navbar />
      <main className="mt-20 p-6 space-y-8">

        <PageHeader
          title="Mes rapports préventifs"
          subtitle="Consultez vos visites d'entretien préventif et vos rapports d'entretien"
        />

        {(error || submitError) && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl text-sm font-medium">
            <AlertCircle size={15} className="shrink-0" /> {error || submitError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {kpis.map((k, i) => <StatsCard key={i} {...k} />)}
        </div>

        <div className="shrink-0 flex justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter size={15} className="text-slate-400 shrink-0" />
            <select
              value={filters.status || ""}
              onChange={e => setFilters({ ...filters, status: e.target.value })}
              className="border border-slate-200 bg-white text-slate-700 text-sm font-semibold
                  rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900 transition cursor-pointer"
            >
              <option value="">Tous les statuts</option>
              {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
            {filters.status && (
              <button onClick={() => setFilters({ ...filters, status: undefined })}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition text-slate-400">
                <X size={14} />
              </button>
            )}
          </div>
          <ActionGroup
            actions={actions}
            dateRange={dateRange}
            onDateRangeChange={handleDateRange}
            dateRangePlaceholder="Filtrer par date"
          />
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
            <span className="text-xs text-slate-400">{filteredReports.length} entretien{filteredReports.length > 1 ? "s" : ""}</span>
          </div>
          <div className="px-6 py-4">
            {loading ? (
              <div className="flex justify-center py-10">
                <RefreshCw className="animate-spin text-slate-400" size={30} />
              </div>
            ) : (
              <DataTable
                title="Liste des entretiens"
                columns={columns}
                data={filteredReports}
                onViewAll={() => { }}
              />
            )}
          </div>
        </div>

      </main>

      {isPanelOpen && selectedTicket && (
        <MaintenancePreviewPanel
          ticket={selectedTicket}
          onClose={closePanel}
          onSubmitReport={openReport}
        />
      )}

      {isReportOpen && reportTargetTicket && (
        <ReportFormPanel
          ticket={reportTargetTicket}
          onClose={closeReport}
          onSubmit={handleSubmitReport}
          submitting={submitting}
        />
      )}

      {/* Formulaire nouveau rapport via ReusableForm */}
      <ReusableForm
        isOpen={isNewReportOpen}
        onClose={() => setIsNewReportOpen(false)}
        title="Nouveau Rapport d'Entretien"
        subtitle="Soumettez votre rapport d'intervention préventive"
        fields={newReportFields}
        submitLabel="Soumettre le rapport"
        isSubmitting={submitting}
        onSubmit={async (values) => {
          const success = await createReport({
            intervention_type: "preventif",
            anomaly_detected: !!values.anomaly_detected,
            action_taken: values.action_taken as string || undefined,
            findings: values.findings as string || undefined,
            attachments: values.attachments,
          });
          if (success) setIsNewReportOpen(false);
        }}
      />
    </div>
  );
}