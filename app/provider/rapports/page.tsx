"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import StatsCard from "@/components/StatsCard";
import DataTable, { ColumnConfig } from "@/components/DataTable";
import PageHeader from "@/components/PageHeader";
import ActionGroup from "@/components/ActionGroup";
import Paginate from "@/components/Paginate";
import ReusableForm from "@/components/ReusableForm";
import type { FieldConfig } from "@/components/ReusableForm";
import { useToast } from "../../../contexts/ToastContext";

import {
  Eye, ArrowUpRight, Download, Filter, X,
  FileText, CheckCircle2, XCircle, Clock,
  AlertCircle, PlusCircle, Edit2, Star,
} from "lucide-react";
import AttachmentViewer from "@/components/AttachmentViewer";

import { useProviderReports, ReportFilterState } from "../../../hooks/provider/useProviderReports";
import {
  InterventionReport,
  STATUS_LABELS, STATUS_STYLES, STATUS_DOT,
  TYPE_LABELS, TYPE_STYLES,
  RESULT_LABELS, RESULT_STYLES,
  getAttachmentUrl, getSiteName, isEditable,
} from "../../../services/provider/providerReportService";
import { formatDate } from "@/lib/utils";

// ─── Toast ─────────────────────────────────────────────────────────────────────
// Remplacé par `Toast` global de `@/components/Toast`

// ─── Badges ────────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status?: string }) {
  const s = status ?? "pending";
  return (
    <span className={`inline-flex items-center justify-center min-w-[90px] px-3 py-1.5
      rounded-xl border text-xs font-bold ${STATUS_STYLES[s] ?? "border-slate-200 bg-slate-50 text-slate-500"}`}>
      {s === "validated" ? <CheckCircle2 size={11} className="mr-1" /> : <Clock size={11} className="mr-1" />}
      {STATUS_LABELS[s] ?? s}
    </span>
  );
}
function TypeBadge({ type }: { type?: string }) {
  if (!type) return null;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold
      ${TYPE_STYLES[type] ?? "bg-slate-50 text-slate-500 border border-slate-200"}`}>
      {TYPE_LABELS[type] ?? type}
    </span>
  );
}
function ResultBadge({ result }: { result?: string }) {
  if (!result) return null;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold
      ${RESULT_STYLES[result] ?? "bg-slate-50 text-slate-500 border border-slate-200"}`}>
      {RESULT_LABELS[result] ?? result}
    </span>
  );
}
function StarRow({ value }: { value?: number | null }) {
  if (!value) return <span className="text-slate-400 text-xs">-</span>;
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} size={13}
          className={i < value ? "fill-yellow-400 text-yellow-400" : "fill-slate-200 text-slate-200"} />
      ))}
    </div>
  );
}

// ─── PDF Preview Modal ─────────────────────────────────────────────────────────
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

// ─── Filter Dropdown ───────────────────────────────────────────────────────────
function FilterDropdown({
  isOpen, onClose, filters, onApply,
}: { isOpen: boolean; onClose: () => void; filters: ReportFilterState; onApply: (f: ReportFilterState) => void }) {
  const [local, setLocal] = useState(filters);
  useEffect(() => { setLocal(filters); }, [filters]);
  if (!isOpen) return null;

  const statusOpts = [
    { val: "", label: "Tous" },
    { val: "pending", label: "En attente" },
    { val: "validated", label: "Validé" },
  ];
  const typeOpts = [
    { val: "", label: "Tous" },
    { val: "curatif", label: "Curatif" },
    { val: "preventif", label: "Préventif" },
  ];
  return (
    <div className="absolute right-0 top-full mt-2 z-50 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <span className="text-sm font-black text-slate-900 uppercase tracking-widest">Filtres</span>
        <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition">
          <X size={16} className="text-slate-500" />
        </button>
      </div>
      <div className="p-5 space-y-5">
        <div>
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Statut</label>
          <div className="flex flex-col gap-2 mt-2">
            {statusOpts.map(({ val, label }) => (
              <button key={val}
                onClick={() => setLocal({ ...local, status: val || undefined })}
                className={`w-full text-left px-4 py-2 rounded-xl text-sm font-semibold transition
                  ${(local.status ?? "") === val ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {/* Type supprimé car implicite à la page */}
      </div>
      <div className="px-5 py-4 border-t border-slate-100 flex gap-3">
        <button onClick={() => { setLocal({}); onApply({}); onClose(); }}
          className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition">
          Réinitialiser
        </button>
        <button onClick={() => { onApply(local); onClose(); }}
          className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition">
          Appliquer
        </button>
      </div>
    </div>
  );
}

// ─── Side Panel ────────────────────────────────────────────────────────────────
function ReportSidePanel({
  report, onClose, onEdit,
}: { report: InterventionReport; onClose: () => void; onEdit: (r: InterventionReport) => void }) {
  const editable = isEditable(report);

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
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-black text-slate-900">Rapport #{report.id}</h2>
            <StatusBadge status={report.status} />
          </div>
          <p className="text-slate-400 text-xs">
            {report.intervention_type === "preventif"
              ? (report.planning?.codification ?? `Planning #${report.planning_id ?? "—"}`)
              : (report.ticket?.subject ?? `Ticket #${report.ticket_id ?? "—"}`)}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-5">
          {/* Champs */}
          <div className="space-y-0">
            {[
              { label: "Site", value: getSiteName(report.site) },
              { label: "Début", value: formatDate(report.start_date) },
              { label: "Fin", value: formatDate(report.end_date) },
              { label: "Créé le", value: formatDate(report.created_at) },
              { label: "Type", render: () => <TypeBadge type={report.intervention_type} /> },
              { label: "Résultat", render: () => <ResultBadge result={report.result} /> },
            ].map((f, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                <p className="text-xs text-slate-400 font-medium">{f.label}</p>
                {(f as any).render
                  ? (f as any).render()
                  : <p className="text-sm font-bold text-slate-900">{(f as any).value}</p>}
              </div>
            ))}
          </div>

          {/* Description */}
          {report.description && (
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Description</p>
              <div
                className="prose prose-sm max-w-none text-slate-700 leading-relaxed bg-slate-50 rounded-xl p-4 border border-slate-100"
                dangerouslySetInnerHTML={{ __html: report.description ?? "" }}
              />
            </div>
          )}

          {/* Observations */}
          {report.findings && (
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Observations</p>
              <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-xl p-4 border border-slate-100">
                {report.findings}
              </p>
            </div>
          )}

          {/* Bloc validation */}
          {report.status === "validated" && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                <CheckCircle2 size={16} /> Validé le {formatDate(report.validated_at)}
              </div>
              {report.rating && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Note :</span>
                  <StarRow value={report.rating} />
                  <span className="text-xs font-bold text-slate-700">{report.rating}/5</span>
                </div>
              )}
              {report.manager_comment && (
                <p className="text-xs text-slate-600 bg-white rounded-xl p-3 border border-emerald-100">
                  {report.manager_comment}
                </p>
              )}
            </div>
          )}

          {/* PDFs */}
          <AttachmentViewer attachments={report.attachments ?? []} title="Pièces jointes" />

          {/* CTAs */}
          <div className="space-y-2 pt-1">
            {report.ticket_id && (
              <a href={`/provider/tickets/${report.ticket_id}`}
                className="flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition group">
                <span className="text-xs font-bold text-slate-700">Voir le ticket lié</span>
                <ArrowUpRight size={14} className="text-slate-400 group-hover:text-slate-900 transition" />
              </a>
            )}
            <a href={`/provider/rapports/${report.id}`}
              className="flex items-center justify-between px-4 py-3 rounded-xl border border-slate-900 bg-slate-900 hover:bg-black transition group">
              <span className="text-xs font-bold text-white">Voir le détail complet</span>
              <ArrowUpRight size={14} className="text-white/70 group-hover:text-white transition" />
            </a>
          </div>
        </div>

        {/* Footer modifier */}
        {editable && (
          <div className="px-6 py-5 border-t border-slate-100 shrink-0">
            <button
              onClick={() => { onClose(); onEdit(report); }}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition">
              <Edit2 size={15} /> Modifier le rapport
            </button>
          </div>
        )}
      </div>

      {pdfPreview && (
        <PdfPreviewModal url={pdfPreview.url} name={pdfPreview.name} onClose={() => setPdfPreview(null)} />
      )}
    </>
  );
}

// ─── Champs formulaire ─────────────────────────────────────────────────────────
// Partagés création / édition
const baseFields: FieldConfig[] = [
  {
    name: "anomaly_detected", label: "Anomalie détectée ?", type: "checkbox",
  },
  { name: "action_taken", label: "Description / Travaux effectués", type: "rich-text", gridSpan: 2 },
  { name: "findings", label: "Observations / Constatations", type: "rich-text", gridSpan: 2 },
  {
    name: "attachments", label: "Documents et Photos de l'intervention",
    type: "pdf-upload", maxPDFs: 10, gridSpan: 2,
    accept: ".pdf,.doc,.docx,.xls,.xlsx,image/*",
    placeholder: "Cliquez pour ajouter des photos, PDF ou documents Office"
  },
];

const createFields: FieldConfig[] = [
  ...baseFields,
];

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function ProviderRapportsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const filterRef = useRef<HTMLDivElement>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PER_PAGE = 10;

  const {
    filteredReports, stats, selectedReport,
    loading, statsLoading, submitting,
    error,
    isPanelOpen, isCreateOpen, isEditOpen, filters,
    openPanel, closePanel, openCreate, closeCreate, openEdit, closeEdit,
    setFilters, createReport, updateReport, exportXlsx,
    submitSuccess, submitError // 👈 Réintroduction ici
  } = useProviderReports({ type: "curatif" });

  useEffect(() => { if (submitSuccess) toast.success(submitSuccess); }, [submitSuccess]);
  useEffect(() => { if (submitError) toast.error(submitError); }, [submitError]);

  // Filtre curatif déjà passé en paramètre du hook ci-dessus

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFiltersOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const applyFilters = (f: ReportFilterState) => { setFilters(f); setCurrentPage(1); setFiltersOpen(false); };
  const activeCount = Object.values(filters).filter(Boolean).length;
  const totalPages = Math.ceil(filteredReports.length / PER_PAGE);
  const paginated = filteredReports.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  // ── Date range ────────────────────────────────────────────────────────────
  const [dateRange, setDateRange] = useState<import("react-day-picker").DateRange | undefined>(undefined);
  const handleDateRange = (range: import("react-day-picker").DateRange | undefined) => {
    setDateRange(range);
    setFilters({
      ...filters,
      date_from: range?.from ? range.from.toISOString().split("T")[0] : undefined,
      date_to: range?.to ? range.to.toISOString().split("T")[0] : undefined,
    });
    setCurrentPage(1);
  };

  const handleCreate = async (formData: any) => {
    await createReport({
      ticket_id: parseInt(formData.ticket_id),
      intervention_type: formData.intervention_type,
      result: formData.result,
      start_date: formData.start_date,
      end_date: formData.end_date || undefined,
      findings: formData.findings || undefined,
      action_taken: formData.action_taken || undefined,
      attachments: formData.attachments ?? [],
    });
  };

  const handleUpdate = async (formData: any) => {
    if (!selectedReport) return;
    await updateReport(selectedReport.id, {
      intervention_type: formData.intervention_type || undefined,
      anomaly_detected: formData.anomaly_detected !== undefined ? !!formData.anomaly_detected : undefined,
      findings: formData.findings || undefined,
      action_taken: formData.action_taken || undefined,
      attachments: formData.attachments?.length ? formData.attachments : undefined,
    });
  };

  // Stats calculées depuis les rapports curatifs filtrés (pas les stats globales de l'API)
  const curatifReports = filteredReports; // déjà filtrés sur type=curatif
  const curatifStats = {
    total: curatifReports.length,
    validated: curatifReports.filter(r => r.status === "validated").length,
    pending: curatifReports.filter(r => r.status === "submitted" || r.status === "pending").length,
    avg_rating: (() => {
      const rated = curatifReports.filter(r => r.rating);
      if (!rated.length) return null;
      return (rated.reduce((s, r) => s + (r.rating ?? 0), 0) / rated.length).toFixed(1);
    })(),
  };

  const kpis = [
    { label: "Total rapports", value: loading ? "-" : curatifStats.total, delta: "", trend: "up" as const },
    { label: "Rapports validés", value: loading ? "-" : curatifStats.validated, delta: "", trend: "up" as const },
    { label: "En attente", value: loading ? "-" : curatifStats.pending, delta: "", trend: "up" as const },
    { label: "Note moyenne", value: loading ? "-" : (curatifStats.avg_rating ? `${curatifStats.avg_rating}/5` : "—"), delta: "", trend: "up" as const },
  ];

  const pageActions = [
    { label: "Exporter", icon: Download, onClick: exportXlsx, variant: "secondary" as const },
    // { label: "Nouveau rapport", icon: PlusCircle, onClick: openCreate, variant: "primary" as const },
  ];

  const columns: ColumnConfig<InterventionReport>[] = [
    {
      header: "Ticket / Planning", key: "ticket", render: (_: any, row: InterventionReport) => (
        <span className="text-xs text-slate-600 font-medium">
          {row.intervention_type === "preventif"
            ? (row.planning?.codification ?? `Planning #${row.planning_id ?? "—"}`)
            : (row.ticket?.subject ?? `Ticket #${row.ticket_id ?? "—"}`)}
        </span>
      )
    },
    { header: "Site", key: "site", render: (_: any, row: InterventionReport) => <span className="text-xs text-slate-600">{getSiteName(row.site)}</span> },
    { header: "Date", key: "created_at", render: (_: any, row: InterventionReport) => <span className="text-xs text-slate-400">{formatDate(row.created_at)}</span> },
    { header: "Note", key: "rating", render: (_: any, row: InterventionReport) => <StarRow value={row.rating} /> },
    { header: "Statut", key: "status", render: (_: any, row: InterventionReport) => <StatusBadge status={row.status} /> },
    {
      header: "Actions", key: "actions",
      render: (_: any, row: InterventionReport) => (
        <div className="flex items-center gap-3">
          {/* <button onClick={() => openPanel(row)} title="Aperçu"
            className="text-slate-800 hover:text-gray-500 transition">
            <Eye size={18} />
          </button> */}
          <button
            onClick={() => router.push(`/provider/rapports/${row.id}`)}
            className="group p-2 rounded-xl bg-white hover:bg-black border border-slate-200 hover:border-black transition flex items-center justify-center"
            title="Voir les détails">
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
          title="Rapports d'intervention"
          subtitle="Soumettez et suivez vos rapports d'intervention. Le gestionnaire sera notifié automatiquement."
        />

        {error && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl text-sm font-medium">
            <AlertCircle size={15} className="shrink-0" /> {error}
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsLoading
            ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-3xl border border-slate-100 p-6 animate-pulse h-28" />
            ))
            : kpis.map((k, i) => <StatsCard key={i} {...k} />)
          }
        </div>

        {/* Toolbar */}
        <div className="flex justify-between items-center gap-4">
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition
                  ${filtersOpen || activeCount > 0 ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>
              <Filter size={15} /> Filtrer par
              {activeCount > 0 && (
                <span className="ml-1 bg-white text-slate-900 text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                  {activeCount}
                </span>
              )}
            </button>
            <FilterDropdown isOpen={filtersOpen} onClose={() => setFiltersOpen(false)} filters={filters} onApply={applyFilters} />
          </div>
          <ActionGroup
            actions={pageActions}
            dateRange={dateRange}
            onDateRangeChange={handleDateRange}
            dateRangePlaceholder="Filtrer par date"
          />
        </div>

        {/* Chips filtres actifs */}
        {activeCount > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-500 font-medium">Filtré par :</span>
            {filters.status && (
              <span className="flex items-center gap-1.5 bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded-full">
                {STATUS_LABELS[filters.status] ?? filters.status}
                <button onClick={() => applyFilters({ ...filters, status: undefined })} className="hover:opacity-70"><X size={11} /></button>
              </span>
            )}
            {/* Chip type masqué car implicite */}
          </div>
        )}

        {/* DataTable */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Liste des rapports</h3>
            <span className="text-xs text-slate-400">
              {filteredReports.length} rapport{filteredReports.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="px-6 py-4">
            {loading
              ? <div className="space-y-3 animate-pulse">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded-xl" />
                ))}
              </div>
              : <DataTable
                title="Liste des rapports soumis"
                columns={columns}
                data={paginated}
                onViewAll={() => { }}
              />
            }
          </div>
          {totalPages > 1 && (
            <div className="p-6 border-t border-slate-50 flex justify-end bg-slate-50/30">
              <Paginate currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
          )}
        </div>
      </main>

      {/* Panel aperçu */}
      {isPanelOpen && selectedReport && (
        <ReportSidePanel report={selectedReport} onClose={closePanel} onEdit={openEdit} />
      )}

      {/* Formulaire création */}
      <ReusableForm
        isOpen={isCreateOpen}
        onClose={closeCreate}
        title="Soumettre un rapport d'intervention"
        subtitle="Renseignez les informations de votre intervention. Le gestionnaire de site sera notifié automatiquement à la soumission."
        fields={createFields}
        onSubmit={handleCreate}
        isSubmitting={submitting}
        submitLabel={submitting ? "Soumission en cours..." : "Soumettre le rapport"}
      />

      {/* Formulaire édition */}
      {selectedReport && (
        <ReusableForm
          isOpen={isEditOpen}
          onClose={closeEdit}
          title={`Modifier le rapport ${selectedReport.id}`}
          subtitle="Les modifications sont impossibles après validation par le gestionnaire."
          fields={baseFields}
          initialValues={{
            intervention_type: selectedReport.intervention_type ?? "",
            result: selectedReport.result ?? "",
            start_date: selectedReport.start_date ?? "",
            end_date: selectedReport.end_date ?? "",
            description: selectedReport.description ?? "",
            findings: selectedReport.findings ?? "",
            attachments: selectedReport.attachments ?? [],
          }}
          onSubmit={handleUpdate}
          isSubmitting={submitting}
          submitLabel={submitting ? "Mise à jour..." : "Mettre à jour"}
        />
      )}
    </div>
  );
}