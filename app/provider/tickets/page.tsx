"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import StatsCard from "@/components/StatsCard";
import DataTable from "@/components/DataTable";
import PageHeader from "@/components/PageHeader";
import ReusableForm from "@/components/ReusableForm";
import type { FieldConfig } from "@/components/ReusableForm";
import { Ticket, isPendingAdminAction, TICKET_STATUS } from "../../../services/provider/providerTicketService";
import { formatDate, formatCurrency, formatHeures, formatNumber } from "@/lib/utils";
import { useToast } from "../../../contexts/ToastContext";
import { useProviderTickets } from "../../../hooks/provider/useProviderTickets";
import { useProviderReports } from "../../../hooks/provider/useProviderReports";
import { AlertCircle, AlertTriangle, Check, CheckCircle2, ChevronLeft, ChevronRight, Clock, Copy, Eye, FileText, MapPin, RefreshCw, Tag, Wrench, X } from "lucide-react";
import { parseApiError } from "@/core/error";

// ─── Champs formulaire Rapport ────────────────────────────────────────────────

const reportFields: FieldConfig[] = [
  // {
  //   name: "result", label: "Résultat de l'intervention", type: "select", required: true,
  //   options: [
  //     { label: "Sélectionner…", value: "" },
  //     { label: "RAS - Rien à signaler", value: "RAS" },
  //     { label: "Anomalie détectée", value: "anomalie" },
  //   ], gridSpan: 2
  // },
  { name: "period", label: "Période de l'intervention (Début - Fin)", type: "date-range", required: true, gridSpan: 2, disablePastDates: true },
  {
    name: "findings", label: "Observations / Constatations ",
    type: "rich-text",
    required: true, gridSpan: 2
  },
  {
    name: "action_taken", label: "Actions menées / Travaux effectués", type: "rich-text",
    required: true, gridSpan: 2
  },
  {
    name: "attachments", label: "Photos & Documents justificatifs (PDF, images)",
    type: "pdf-upload", accept: "application/pdf,image/*", placeholder: "Cliquez pour uploader (PDF, Images)", maxPDFs: 10, gridSpan: 2
  } as any,
];

// ─── Helpers ──────────────────────────────────────────────────────────────────


// ─── Statuts — valeurs exactes retournées par le back ────────────────────────

const STATUS_LABELS: Record<string, string> = {
  // Majuscules (back v3)
  "SIGNALÉ": "Signalé",
  "VALIDÉ": "Validé",
  "ASSIGNÉ": "Assigné",
  "PLANIFIÉ": "Planifié",
  "EN_COURS": "En cours",
  "EN_TRAITEMENT": "En traitement",
  "DEVIS_EN_ATTENTE": "Devis en attente",
  "DEVIS_APPROUVÉ": "Devis approuvé",
  "RAPPORTÉ": "Rapporté",
  "ÉVALUÉ": "Évalué",
  "CLOS": "Clôturé",
  "EN_RETARD": "En retard",
  "RÉSOLU": "Résolu",
  // Minuscules legacy
  signalez: "Signalé", validé: "Validé", assigné: "Assigné",
  en_cours: "En cours", rapporté: "Rapporté", évalué: "Évalué", clos: "Clôturé",
};

const STATUS_STYLES: Record<string, string> = {
  // Majuscules (back v3)
  "SIGNALÉ": "border-slate-300 bg-slate-100 text-slate-700",
  "VALIDÉ": "border-blue-400 bg-blue-50 text-blue-700",
  "ASSIGNÉ": "border-violet-400 bg-violet-50 text-violet-700",
  "PLANIFIÉ": "border-sky-400 bg-sky-50 text-sky-700",
  "EN_COURS": "border-orange-400 bg-orange-50 text-orange-600",
  "EN_TRAITEMENT": "border-orange-400 bg-orange-50 text-orange-600",
  "DEVIS_EN_ATTENTE": "border-yellow-400 bg-yellow-50 text-yellow-700",
  "DEVIS_APPROUVÉ": "border-teal-400 bg-teal-50 text-teal-700",
  "RAPPORTÉ": "border-amber-400 bg-amber-50 text-amber-700",
  "ÉVALUÉ": "border-emerald-500 bg-emerald-50 text-emerald-700",
  "CLOS": "border-black bg-black text-white",
  "EN_RETARD": "border-red-400 bg-red-50 text-red-700",
  "RÉSOLU": "border-green-400 bg-green-50 text-green-700",
  // Minuscules legacy
  signalez: "border-slate-300 bg-slate-100 text-slate-700",
  validé: "border-blue-400 bg-blue-50 text-blue-700",
  assigné: "border-violet-400 bg-violet-50 text-violet-700",
  en_cours: "border-orange-400 bg-orange-50 text-orange-600",
  rapporté: "border-amber-400 bg-amber-50 text-amber-700",
  évalué: "border-emerald-500 bg-emerald-50 text-emerald-700",
  clos: "border-black bg-black text-white",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center justify-center min-w-[90px] px-3 py-1.5 rounded-xl border text-xs font-bold ${STATUS_STYLES[status] ?? "border-gray-200 bg-gray-50 text-gray-600"}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

const PRIORITY_STYLES: Record<string, string> = {
  faible: "bg-slate-100 text-slate-600", moyenne: "bg-blue-50 text-blue-700",
  haute: "bg-orange-50 text-orange-700", critique: "bg-red-100 text-red-700",
};
const PRIORITY_LABELS: Record<string, string> = {
  faible: "Faible", moyenne: "Moyenne", haute: "Haute", critique: "Critique",
};

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${PRIORITY_STYLES[priority] ?? "bg-gray-100 text-gray-600"}`}>
      {PRIORITY_LABELS[priority] ?? priority}
    </span>
  );
}

// ─── Filtre select ────────────────────────────────────────────────────────────
function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-xs font-semibold text-gray-700 border border-gray-200 rounded-xl px-3 py-2 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 transition"
    >
      <option value="">{label}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProviderTicketsPage() {
  const { toast } = useToast();
  const {
    tickets, stats, meta, selectedTicket,
    loading, statsLoading, updateLoading,
    error, updateError, updateSuccess,
    filters, setFilters,
    openTicket, closeTicket,
    startIntervention, requestDevis,
    canStart, canReport, canDevis, alreadyReported,
    refresh,
  } = useProviderTickets();

  const { createReport, submitting, submitSuccess, submitError } = useProviderReports();

  useEffect(() => { if (submitSuccess) toast.success(submitSuccess); }, [submitSuccess]);
  useEffect(() => { if (submitError) toast.error(parseApiError(submitError)); }, [submitError]);

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportTicketId, setReportTicketId] = useState<number | null>(null);

  const handleOpenReportModal = (ticketId: number) => {
    setReportTicketId(ticketId);
    setIsReportModalOpen(true);
  };

  const handleCloseReportModal = () => {
    setIsReportModalOpen(false);
    setReportTicketId(null);
  };

  // Démarrer l'intervention puis ouvrir directement la modale rapport
  const handleStartAndReport = async (ticketId: number) => {
    try {
      await startIntervention(ticketId);
      // Après démarrage réussi, ouvrir directement la modale rapport
      handleOpenReportModal(ticketId);
    } catch {
      // L'erreur est déjà gérée dans startIntervention via toast
    }
  };

  const handleCreateReport = async (formData: any) => {
    if (!reportTicketId) return;
    await createReport({
      ticket_id: reportTicketId,
      intervention_type: "curatif", // ou récupéré du ticket si nécessaire, mais par défaut curatif
      result: formData.result,
      start_date: formData.start_date,
      end_date: formData.end_date || undefined,
      findings: formData.findings || undefined,
      action_taken: formData.action_taken || undefined,
      attachments: formData.attachments ?? [],
    });
    handleCloseReportModal();
    // Optionnel : on pourrait actualiser les tickets
    refresh();
  };

  // ── Colonnes DataTable ────────────────────────────────────────────────────
  const columns = [
    {
      header: "Référence",
      key: "code_ticket",
      render: (_: any, row: Ticket) => (
        <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg whitespace-nowrap">
          {row.code_ticket ?? `#${row.id}`}
        </span>
      ),
    },
    {
      header: "Sujet",
      key: "subject",
      render: (_: any, row: Ticket) => (
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate max-w-[160px]">
            {row.subject ?? row.asset?.designation ?? `Ticket #${row.id}`}
          </p>
          {row.asset && (
            <p className="text-[10px] text-slate-400 font-medium truncate max-w-[160px]">
              {row.asset.codification}
            </p>
          )}
        </div>
      ),
    },
    {
      header: "Site",
      key: "site",
      render: (_: any, row: Ticket) => <span className="text-sm text-slate-600">{row.site?.nom ?? "-"}</span>,
    },
    {
      header: "Type",
      key: "type",
      render: (_: any, row: Ticket) => (
        <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold ${row.type === "curatif" ? "bg-orange-50 text-orange-700" : "bg-blue-50 text-blue-700"}`}>
          {row.type === "curatif" ? "Curatif" : "Préventif"}
        </span>
      ),
    },
    {
      header: "Priorité",
      key: "priority",
      render: (_: any, row: Ticket) => <PriorityBadge priority={row.priority} />,
    },
    {
      header: "Statut",
      key: "status",
      render: (_: any, row: Ticket) => (
        <div className="flex flex-col gap-1">
          <StatusBadge status={row.status} />
          {row.delai_restant?.est_en_retard && (
            <span className="text-[10px] font-bold text-red-600 whitespace-nowrap">
              ⚠ {row.delai_restant.libelle}
            </span>
          )}
          {row.delai_restant?.est_urgent && !row.delai_restant.est_en_retard && (
            <span className="text-[10px] font-bold text-orange-500 whitespace-nowrap">
              ⏰ {row.delai_restant.libelle}
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Signalé le",
      key: "planned_at",
      render: (_: any, row: Ticket) => <span className="text-xs text-slate-500">{formatDate(row.planned_at)}</span>,
    },
    {
      header: "Actions",
      key: "actions",
      render: (_: any, row: Ticket) => (
        <div className="flex items-center gap-3">

          <Link href={`/provider/tickets/${row.id}`} className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition" title="Voir les détails">
            <Eye size={16} /> Aperçu
          </Link>
          {/* Démarrer l'intervention → ouvre directement la modale rapport après succès */}
          {canStart(row) && (
            <button
              onClick={() => handleStartAndReport(row.id)}
              disabled={updateLoading}
              className="flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-800 transition disabled:opacity-40"
              title="Démarrer et soumettre un rapport"
            >
              {/* <RefreshCw size={14} className={updateLoading ? "animate-spin" : ""} /> */}
            </button>
          )}
          {/* Soumettre rapport — désactivé si déjà rapporté */}
          {canReport(row) && (
            <button
              onClick={() => handleOpenReportModal(row.id)}
              className="flex items-center gap-1.5 text-sm font-bold text-slate-800 hover:text-indigo-600 transition"
              title="Soumettre un rapport"
            >
              <FileText size={16} />
            </button>
          )}
          {alreadyReported(row) && (
            <span className="text-xs text-amber-500 font-semibold" title="Rapport déjà soumis — en attente de validation">
              <FileText size={16} className="opacity-40" />
            </span>
          )}
          {/* Demander un devis */}
          {/* {canDevis(row) && (
            <button
              onClick={() => requestDevis(row.id)}
              disabled={updateLoading}
              className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition disabled:opacity-40"
              title="Demander un devis"
            >
              <AlertCircle size={14} />
            </button>
          )} */}
        </div>
      ),
    },
  ];

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis1 = [
    { label: "Coût moyen / ticket", value: formatCurrency(stats?.cout_moyen_par_ticket ?? 0), delta: "", trend: "up" as const },

    // AVANt
    // APRÈS
    { label: "Total tickets", value: stats?.total ?? 0, delta: "", trend: "up" as const },
    { label: "Tickets en cours", value: stats?.en_cours ?? 0, delta: "", trend: "up" as const },
    { label: "Tickets clôturés", value: stats?.clotures ?? 0, delta: "", trend: "up" as const },
  ];


  return (
    <>
      <div className="flex-1 flex flex-col">
        <Navbar />

        <main className="mt-20 p-6 space-y-8">

          <div className="flex items-center justify-between">
            <PageHeader
              title="Mes Tickets"
              subtitle="Consultez et mettez à jour le statut de vos interventions"
            />
            <button
              onClick={refresh}
              disabled={loading}
              className="flex items-center gap-2 text-xs font-semibold text-gray-600 hover:text-gray-900 border border-gray-200 rounded-xl px-3 py-2 hover:border-gray-400 transition disabled:opacity-40"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              Actualiser
            </button>
          </div>

          {/* Erreur globale */}
          {error && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl text-sm">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
              <button onClick={refresh} className="ml-auto text-xs font-bold underline">Réessayer</button>
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {statsLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-3xl border border-slate-100 p-6 animate-pulse h-28" />
              ))
              : kpis1.map((k, i) => <StatsCard key={i} {...k} />)
            }
          </div>

          {/* Filtres */}
          <div className="flex flex-wrap gap-3 items-center">
            <FilterSelect
              label="Tous les statuts"
              value={filters.status ?? ""}
              onChange={(v) => setFilters({ status: v || undefined })}
              options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
            />
            <FilterSelect
              label="Tous les types"
              value={filters.type ?? ""}
              onChange={(v) => setFilters({ type: v || undefined })}
              options={[{ value: "curatif", label: "Curatif" }, { value: "preventif", label: "Préventif" }]}
            />
            <FilterSelect
              label="Toutes priorités"
              value={filters.priority ?? ""}
              onChange={(v) => setFilters({ priority: v || undefined })}
              options={Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label }))}
            />
            {(filters.status || filters.type || filters.priority) && (
              <button
                onClick={() => setFilters({ status: undefined, type: undefined, priority: undefined })}
                className="text-xs font-semibold text-gray-500 hover:text-gray-900 flex items-center gap-1 transition"
              >
                <X size={12} /> Réinitialiser
              </button>
            )}
          </div>

          {/* Table */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800">Liste de mes tickets</h3>
              {meta && (
                <span className="text-xs text-gray-400 font-medium">
                  {meta.total} ticket{meta.total > 1 ? "s" : ""}
                </span>
              )}
            </div>

            <div className="px-6 py-4">
              {loading ? (
                <div className="space-y-3 animate-pulse">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-12 bg-gray-100 rounded-xl" />
                  ))}
                </div>
              ) : (
                <DataTable title="Liste de mes tickets" columns={columns as any[]} data={tickets} />
              )}
            </div>

            {/* Pagination */}
            {meta && meta.last_page > 1 && (
              <div className="px-6 py-4 border-t border-slate-50 flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  Page {meta.current_page} / {meta.last_page}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilters({ page: meta.current_page - 1 })}
                    disabled={meta.current_page <= 1}
                    className="p-2 rounded-xl border border-gray-200 hover:border-gray-400 disabled:opacity-30 transition"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={() => setFilters({ page: meta.current_page + 1 })}
                    disabled={meta.current_page >= meta.last_page}
                    className="p-2 rounded-xl border border-gray-200 hover:border-gray-400 disabled:opacity-30 transition"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

        </main>
      </div>

      {/* Panel détail ticket */}
      {selectedTicket && (
        <TicketDetailPanel
          ticket={selectedTicket}
          onClose={closeTicket}
          onStart={() => handleStartAndReport(selectedTicket.id)}
          onDevis={() => requestDevis(selectedTicket.id)}
          onReport={() => handleOpenReportModal(selectedTicket.id)}
          updateLoading={updateLoading}
          updateError={updateError}
          updateSuccess={updateSuccess}
          canStart={canStart(selectedTicket)}
          canReport={canReport(selectedTicket)}
          canDevis={canDevis(selectedTicket)}
          alreadyReported={alreadyReported(selectedTicket)}
        />
      )}

      {/* Modal création rapport */}
      <ReusableForm
        isOpen={isReportModalOpen}
        onClose={handleCloseReportModal}
        title={`Soumettre un rapport pour le ticket ${reportTicketId}`}
        subtitle="Renseignez les informations de votre intervention. Le gestionnaire de site sera notifié automatiquement à la soumission."
        fields={reportFields}
        onSubmit={handleCreateReport}
        submitLabel={submitting ? "Soumission en cours..." : "Soumettre le rapport"}
      />
    </>
  );
}

// ─── Panel détail ticket ──────────────────────────────────────────────────────

function TicketDetailPanel({
  ticket, onClose, onStart, onDevis, onReport,
  updateLoading, updateError, updateSuccess,
  canStart, canReport, canDevis, alreadyReported,
}: {
  ticket: Ticket;
  onClose: () => void;
  onStart: () => void;
  onDevis: () => void;
  onReport: () => void;
  updateLoading: boolean;
  updateError: string;
  updateSuccess: string;
  canStart: boolean;
  canReport: boolean;
  canDevis: boolean;
  alreadyReported: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(String(ticket.id));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[480px] bg-white z-50 shadow-2xl flex flex-col rounded-l-3xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-xl transition">
              <X size={16} className="text-slate-500" />
            </button>
            <span className="text-xs font-semibold text-slate-400">Détail du ticket</span>
          </div>
          <StatusBadge status={ticket.status} />
        </div>

        {/* Titre */}
        <div className="px-7 pt-5 pb-4 shrink-0">
          <h2 className="text-xl font-black text-slate-900 leading-tight">
            {ticket.subject ?? `Ticket #${ticket.id}`}
          </h2>
          <div className="flex flex-wrap items-center gap-2 mt-2.5">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${ticket.type === "curatif" ? "bg-orange-50 text-orange-700 border-orange-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
              {ticket.type === "curatif" ? "Curatif" : "Préventif"}
            </span>
            <PriorityBadge priority={ticket.priority} />
          </div>
        </div>

        {/* Corps */}
        <div className="flex-1 overflow-y-auto px-7 pb-7 space-y-5">

          {/* Référence */}
          <div className="flex items-center justify-between py-3 border-b border-slate-50">
            <div className="flex items-center gap-2 text-slate-400">
              <Tag size={13} />
              <span className="text-xs font-medium">Référence</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-slate-900">#{ticket.id}</span>
              <button onClick={handleCopy} className={`p-1.5 rounded-lg border transition ${copied ? "bg-green-50 border-green-200 text-green-600" : "bg-slate-50 border-slate-100 text-slate-400 hover:text-slate-600"}`}>
                {copied ? <Check size={11} /> : <Copy size={11} />}
              </button>
            </div>
          </div>

          {/* Infos */}
          {[
            { icon: <MapPin size={13} />, label: "Site", value: ticket.site?.nom ?? "-" },
            { icon: <Wrench size={13} />, label: "Actif", value: ticket.asset ? `${ticket.asset.designation} (${ticket.asset.codification})` : "-" },
            { icon: <AlertTriangle size={13} />, label: "Service", value: ticket.service?.name ?? "-" },
            { icon: <Clock size={13} />, label: "Signalé le", value: formatDate(ticket.planned_at) },
            { icon: <Clock size={13} />, label: "Échéance", value: formatDate(ticket.due_at) },
            { icon: <CheckCircle2 size={13} />, label: "Résolu le", value: formatDate(ticket.resolved_at) },
          ].map(({ icon, label, value }) => (
            <div key={label} className="flex items-start justify-between py-2.5 border-b border-slate-50 last:border-0 gap-4">
              <div className="flex items-center gap-2 text-slate-400 shrink-0">
                {icon}
                <span className="text-xs font-medium whitespace-nowrap">{label}</span>
              </div>
              <span className="text-xs font-semibold text-slate-700 text-right">{value}</span>
            </div>
          ))}

          {/* Description */}
          {ticket.description && (
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Description</p>
              <div
                className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-sm text-slate-700 leading-relaxed prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: ticket.description }}
              />
            </div>
          )}

          {/* Feedback update */}
          {updateError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-semibold">
              <AlertCircle size={13} /> {updateError}
            </div>
          )}
          {updateSuccess && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-xs font-semibold">
              <CheckCircle2 size={13} /> {updateSuccess}
            </div>
          )}

          {/* ── Bouton Démarrer — prioritaire et visible ──────────────────── */}
          {canStart && (
            <div className={`rounded-2xl border p-4 space-y-3 ${ticket.delai_restant?.est_en_retard
              ? "bg-red-50 border-red-200"
              : ticket.delai_restant?.est_urgent
                ? "bg-orange-50 border-orange-200"
                : "bg-orange-50 border-orange-200"
              }`}>
              {/* Délai */}
              {ticket.due_at && ticket.planned_at && (() => {
                const start = new Date(ticket.planned_at!);
                const due = new Date(ticket.due_at!);
                const now = new Date();
                const totalH = Math.round((due.getTime() - start.getTime()) / 3_600_000);
                const remainH = Math.round((due.getTime() - now.getTime()) / 3_600_000);
                const remainD = Math.floor((due.getTime() - now.getTime()) / 86_400_000);
                const isLate = remainH < 0;
                const pct = Math.min(100, Math.max(0, ((now.getTime() - start.getTime()) / (due.getTime() - start.getTime())) * 100));
                return (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-medium">
                      <span className="text-slate-500">SLA {totalH}h</span>
                      <span className={`font-black ${isLate ? "text-red-600" : remainD < 1 ? "text-orange-600" : "text-slate-600"}`}>
                        {isLate
                          ? `En retard de ${Math.abs(remainH)}h`
                          : remainD > 0
                            ? `${remainD}j ${Math.abs(remainH % 24)}h restants`
                            : `${remainH}h restantes`}
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isLate ? "bg-red-500" : remainD < 1 ? "bg-orange-400" : "bg-emerald-500"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })()}
              <button
                onClick={onStart}
                disabled={updateLoading}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-black disabled:opacity-50 transition ${ticket.delai_restant?.est_en_retard
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-orange-500 hover:bg-orange-600"
                  }`}
              >
                {updateLoading
                  ? <RefreshCw size={14} className="animate-spin" />
                  : <Wrench size={14} />}
                {ticket.delai_restant?.est_en_retard
                  ? "Démarrer maintenant — SLA dépassé"
                  : "Démarrer l'intervention"}
              </button>
            </div>
          )}

          {/* Section rapport curatif */}
          <div className="border border-slate-100 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rapport curatif</p>
            </div>
            {alreadyReported ? (
              <div className="px-4 py-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-amber-600">
                  <FileText size={14} className="shrink-0" />
                  <span className="text-xs font-semibold">Rapport soumis — en attente de validation</span>
                </div>
                <a href="/provider/rapports" className="text-xs font-bold text-slate-900 underline underline-offset-2 hover:text-black transition shrink-0">
                  Voir mes rapports
                </a>
              </div>
            ) : canReport ? (
              <div className="px-4 py-4 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500 font-medium">Aucun rapport soumis pour ce ticket.</span>
                <button
                  onClick={onReport}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-black transition shrink-0"
                >
                  <FileText size={13} /> Soumettre un rapport
                </button>
              </div>
            ) : (
              <div className="px-4 py-4">
                <span className="text-xs text-slate-400 font-medium italic">
                  {ticket.status === "CLOS" || ticket.status === "ÉVALUÉ"
                    ? "Ticket clôturé."
                    : "Démarrez l'intervention pour soumettre un rapport."}
                </span>
              </div>
            )}
          </div>

          {/* Demander un devis */}
          {canDevis && (
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Devis</p>
              <button
                onClick={onDevis}
                disabled={updateLoading}
                className="w-full py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {updateLoading ? <RefreshCw size={12} className="animate-spin" /> : <Tag size={12} />}
                Demander un devis
              </button>
            </div>
          )}

        </div>
      </div>
    </>
  );
}