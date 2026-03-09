"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import {
  Eye, Filter, Upload, Download, X,
  CheckCircle2, Clock, FileText, Star,
  ArrowUpRight,
} from "lucide-react";

import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import StatsCard from "@/components/StatsCard";
import DataTable from "@/components/DataTable";
import Paginate from "@/components/Paginate";
import PageHeader from "@/components/PageHeader";

import { useReports } from "../../../hooks/useReports";
import { InterventionReport, ReportService, ValidateReportPayload } from "../../../services/report.service";

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

const formatDate = (iso?: string | null): string => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

// ═══════════════════════════════════════════════
// STATUTS
// ═══════════════════════════════════════════════

const STATUS_STYLES: Record<string, string> = {
  validated: "border-black bg-black text-white",
  pending:   "border-slate-300 bg-slate-100 text-slate-700",
};
const STATUS_LABELS: Record<string, string> = {
  validated: "Validé",
  pending:   "En attente",
};

function StatusBadge({ status }: { status?: string }) {
  const s = status ?? "pending";
  return (
    <span className={`inline-flex items-center justify-center min-w-[90px] px-3 py-1.5 rounded-xl border text-xs font-bold ${STATUS_STYLES[s] ?? "border-slate-200 bg-slate-50 text-slate-500"}`}>
      {s === "validated" ? <CheckCircle2 size={11} className="mr-1" /> : <Clock size={11} className="mr-1" />}
      {STATUS_LABELS[s] ?? s}
    </span>
  );
}

function TypeBadge({ type }: { type?: string }) {
  const isCuratif = type === "curatif";
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold ${
      isCuratif ? "bg-orange-50 text-orange-600 border border-orange-200" : "bg-blue-50 text-blue-600 border border-blue-200"
    }`}>
      {isCuratif ? "Curatif" : "Préventif"}
    </span>
  );
}

function StarRating({ value }: { value?: number | null }) {
  if (!value) return <span className="text-slate-400 text-xs">—</span>;
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} size={13} className={i < value ? "fill-yellow-400 text-yellow-400" : "fill-slate-200 text-slate-200"} />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════
// PDF PREVIEW MODAL
// ═══════════════════════════════════════════════

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

// ═══════════════════════════════════════════════
// VALIDATION MODAL — notation étoiles + commentaire
// ═══════════════════════════════════════════════

function ValidateModal({
  report, onClose, onConfirm,
}: {
  report: InterventionReport;
  onClose: () => void;
  onConfirm: (payload: ValidateReportPayload) => Promise<void>;
}) {
  const [rating,  setRating]  = useState<number>(0);
  const [hovered, setHovered] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onConfirm({ rating: rating || null, comment: comment || null });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-7 py-6 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-black text-slate-900">Valider le rapport</h2>
            <p className="text-xs text-slate-400 mt-0.5">Ticket #{report.ticket_id}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        <div className="px-7 py-6 space-y-6">

          {/* Notation étoiles */}
          <div>
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-3">
              Note de satisfaction
            </label>
            <div className="flex gap-2 items-center">
              {Array.from({ length: 5 }, (_, i) => {
                const val = i + 1;
                const active = val <= (hovered || rating);
                return (
                  <button
                    key={i}
                    onMouseEnter={() => setHovered(val)}
                    onMouseLeave={() => setHovered(0)}
                    onClick={() => setRating(rating === val ? 0 : val)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      size={32}
                      className={`transition-colors ${active ? "fill-yellow-400 text-yellow-400" : "fill-slate-200 text-slate-200"}`}
                    />
                  </button>
                );
              })}
              {rating > 0 && (
                <span className="ml-2 text-sm font-bold text-slate-600">{rating}/5</span>
              )}
            </div>
          </div>

          {/* Commentaire */}
          <div>
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-2">
              Commentaire (optionnel)
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

        {/* Footer */}
        <div className="px-7 py-5 border-t border-slate-100 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition">
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition disabled:opacity-60">
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <CheckCircle2 size={15} />
            )}
            Confirmer la validation
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// SIDE PANEL RAPPORT — visualisation + PDF + validation
// ═══════════════════════════════════════════════

function ReportSidePanel({
  report, onClose, onValidate,
}: {
  report: InterventionReport | null;
  onClose: () => void;
  onValidate: (r: InterventionReport) => void;
}) {
  const [pdfPreview, setPdfPreview] = useState<{ url: string; name: string } | null>(null);
  const [showValidateModal, setShowValidateModal] = useState(false);

  useEffect(() => { setPdfPreview(null); setShowValidateModal(false); }, [report?.id]);

  if (!report) return null;

  const isValidated  = report.status === "validated";
  const pdfs         = (report.attachments ?? []).filter(a => a.file_type === "document");
  const photos       = (report.attachments ?? []).filter(a => a.file_type === "photo");
  const providerName = report.provider?.company_name ?? report.provider?.name ?? "—";
  const siteName     = report.site?.nom ?? report.site?.name ?? "—";
  const ticketSubject = report.ticket?.subject ?? `Ticket #${report.ticket_id}`;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full w-[440px] bg-white z-50 shadow-2xl flex flex-col rounded-l-3xl overflow-hidden">

        {/* Croix */}
        <div className="flex items-start px-6 pt-6 pb-0 shrink-0">
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-xl transition -ml-1">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        {/* Titre */}
        <div className="px-6 pt-4 pb-5 shrink-0">
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-black text-slate-900">Rapport #{report.id}</h2>
            <StatusBadge status={report.status} />
          </div>
          <p className="text-slate-400 text-xs">{ticketSubject}</p>
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-5">

          {/* Champs */}
          <div className="space-y-0">
            {[
              { label: "Prestataire",  value: providerName },
              { label: "Site",         value: siteName },
              { label: "Type",         render: () => <TypeBadge type={report.intervention_type} /> },
              { label: "Début",        value: formatDate(report.start_date) },
              { label: "Fin",          value: formatDate(report.end_date) },
              { label: "Créé le",      value: formatDate(report.created_at) },
            ].map((f, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                <p className="text-xs text-slate-400 font-medium">{f.label}</p>
                {f.render ? f.render() : <p className="text-sm font-bold text-slate-900">{f.value}</p>}
              </div>
            ))}
          </div>

          {/* Description */}
          {report.description && (
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Description</p>
              <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-xl p-4 border border-slate-100">
                {report.description}
              </p>
            </div>
          )}

          {/* Validation info */}
          {isValidated && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                <CheckCircle2 size={16} />
                Validé le {formatDate(report.validated_at)}
              </div>
              {report.rating && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Note :</span>
                  <StarRating value={report.rating} />
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

          {/* Pièces jointes PDF */}
          {pdfs.length > 0 && (
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">
                Documents ({pdfs.length})
              </p>
              <div className="space-y-2">
                {pdfs.map(att => {
                  const url  = ReportService.getAttachmentUrl(att.file_path);
                  const name = att.file_path.split("/").pop() ?? "document.pdf";
                  return (
                    <div key={att.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-white">
                      <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                        <FileText size={16} className="text-red-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{name}</p>
                        <p className="text-[10px] text-slate-400">PDF</p>
                      </div>
                      <button
                        onClick={() => setPdfPreview({ url, name })}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition shrink-0"
                      >
                        <Eye size={13} /> Aperçu
                      </button>
                      <a href={url} download target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-black transition shrink-0">
                        <Download size={13} />
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pièces jointes photos */}
          {photos.length > 0 && (
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">
                Photos ({photos.length})
              </p>
              <div className="grid grid-cols-3 gap-2">
                {photos.map(att => {
                  const url = ReportService.getAttachmentUrl(att.file_path);
                  return (
                    <a key={att.id} href={url} target="_blank" rel="noreferrer"
                      className="aspect-square rounded-xl overflow-hidden border border-slate-100 hover:opacity-80 transition">
                      <img src={url} alt="photo" className="w-full h-full object-cover" />
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Aucune pièce jointe */}
          {!pdfs.length && !photos.length && (
            <div className="border border-dashed border-slate-200 rounded-2xl px-5 py-5 flex items-center gap-3 text-slate-400">
              <FileText size={18} className="shrink-0" />
              <p className="text-sm font-medium">Aucune pièce jointe</p>
            </div>
          )}
        </div>

        {/* Footer — Valider */}
        {!isValidated && (
          <div className="px-6 py-5 border-t border-slate-100 shrink-0">
            <button
              onClick={() => setShowValidateModal(true)}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition"
            >
              <CheckCircle2 size={16} /> Valider le rapport
            </button>
          </div>
        )}
      </div>

      {/* PDF fullscreen */}
      {pdfPreview && (
        <PdfPreviewModal url={pdfPreview.url} name={pdfPreview.name} onClose={() => setPdfPreview(null)} />
      )}

      {/* Validate modal */}
      {showValidateModal && (
        <ValidateModal
          report={report}
          onClose={() => setShowValidateModal(false)}
          onConfirm={async (payload) => {
            await onValidate({ ...report, ...payload } as any);
          }}
        />
      )}
    </>
  );
}

// ═══════════════════════════════════════════════
// FILTER DROPDOWN
// ═══════════════════════════════════════════════

function FilterDropdown({
  isOpen, onClose, filters, onApply,
}: {
  isOpen: boolean; onClose: () => void;
  filters: { status?: string; type?: string };
  onApply: (f: { status?: string; type?: string }) => void;
}) {
  const [local, setLocal] = useState(filters);
  useEffect(() => { setLocal(filters); }, [filters]);
  if (!isOpen) return null;

  const statusOpts = [
    { val: "",          label: "Tous"       },
    { val: "pending",   label: "En attente" },
    { val: "validated", label: "Validé"     },
  ];
  const typeOpts = [
    { val: "",          label: "Tous"        },
    { val: "curatif",   label: "Curatif"     },
    { val: "preventif", label: "Préventif"   },
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
        {/* Statut */}
        <div>
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Statut</label>
          <div className="flex flex-col gap-2 mt-2">
            {statusOpts.map(({ val, label }) => (
              <button key={val}
                onClick={() => setLocal({ ...local, status: val || undefined })}
                className={`w-full text-left px-4 py-2 rounded-xl text-sm font-semibold transition ${
                  (local.status ?? "") === val ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {/* Type */}
        <div>
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Type</label>
          <div className="flex flex-col gap-2 mt-2">
            {typeOpts.map(({ val, label }) => (
              <button key={val}
                onClick={() => setLocal({ ...local, type: val || undefined })}
                className={`w-full text-left px-4 py-2 rounded-xl text-sm font-semibold transition ${
                  (local.type ?? "") === val ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>
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

// ═══════════════════════════════════════════════
// PAGE PRINCIPALE
// ═══════════════════════════════════════════════

export default function RapportsPage() {
 
  const filterRef = useRef<HTMLDivElement>(null);
  const { reports, stats, isLoading, statsLoading, fetchReports, fetchStats, validateReport } = useReports();

  const [selectedReport, setSelectedReport] = useState<InterventionReport | null>(null);
  const [isDetailsOpen,  setIsDetailsOpen]  = useState(false);
  const [filtersOpen,    setFiltersOpen]    = useState(false);
  const [filters,        setFilters]        = useState<{ status?: string; type?: string }>({});
  const [currentPage,    setCurrentPage]    = useState(1);
  const [flashMessage,   setFlashMessage]   = useState<{ type: "success" | "error"; message: string } | null>(null);

  const PER_PAGE = 10;

  useEffect(() => { fetchReports(); fetchStats(); }, []);

  useEffect(() => {
    if (!flashMessage) return;
    const t = setTimeout(() => setFlashMessage(null), 5000);
    return () => clearTimeout(t);
  }, [flashMessage]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFiltersOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const showFlash = (type: "success" | "error", message: string) => setFlashMessage({ type, message });
  const applyFilters = (f: { status?: string; type?: string }) => { setFilters(f); setCurrentPage(1); };

  const filtered = reports.filter(r => {
    if (filters.status && r.status !== filters.status) return false;
    if (filters.type   && r.intervention_type !== filters.type) return false;
    return true;
  });
  const totalPages  = Math.ceil(filtered.length / PER_PAGE);
  const paginated   = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);
  const activeCount = Object.values(filters).filter(Boolean).length;

  const handleValidate = async (report: InterventionReport, payload: ValidateReportPayload) => {
    try {
      await validateReport(report.id, payload);
      // Met à jour le rapport affiché dans le side panel
      setSelectedReport(prev => prev?.id === report.id
        ? { ...prev, status: "validated", rating: payload.rating ?? prev.rating, manager_comment: payload.comment ?? prev.manager_comment, validated_at: new Date().toISOString() }
        : prev
      );
      showFlash("success", "Rapport validé avec succès.");
    } catch {
      showFlash("error", "Erreur lors de la validation.");
    }
  };

  const kpis = [
    { label: "Total rapports",    value: statsLoading ? 0 : (stats?.total_reports    ?? 0), delta: "+3%",  trend: "up" as const },
    { label: "Rapports validés",  value: statsLoading ? 0 : (stats?.validated_reports ?? 0), delta: "+8%",  trend: "up" as const },
    { label: "En attente",        value: statsLoading ? 0 : (stats?.pending_reports   ?? 0), delta: "+0%",  trend: "up" as const },
    {
      label: "Note moyenne",
      value: statsLoading ? "—" : (stats?.average_rating ? `${Number(stats.average_rating).toFixed(1)}/5` : "—"),
      delta: "+0%", trend: "up" as const,
    },
  ];

  const columns = [
    { header: "ID",          key: "id",         render: (_: any, row: InterventionReport) => <span className="font-black text-slate-900 text-sm">#{row.id}</span> },
    { header: "Ticket",      key: "ticket",     render: (_: any, row: InterventionReport) => row.ticket?.subject ?? `#${row.ticket_id}` },
    { header: "Prestataire", key: "provider",   render: (_: any, row: InterventionReport) => row.provider?.company_name ?? row.provider?.name ?? "—" },
    { header: "Site",        key: "site",       render: (_: any, row: InterventionReport) => row.site?.nom ?? row.site?.name ?? "—" },
    { header: "Type",        key: "type",       render: (_: any, row: InterventionReport) => <TypeBadge type={row.intervention_type} /> },
    { header: "Date",        key: "created_at", render: (_: any, row: InterventionReport) => formatDate(row.created_at) },
    { header: "Note",        key: "rating",     render: (_: any, row: InterventionReport) => <StarRating value={row.rating} /> },
    { header: "Statut",      key: "status",     render: (_: any, row: InterventionReport) => <StatusBadge status={row.status} /> },
    {
      header: "Actions",
      key: "actions",
      render: (_: any, row: InterventionReport) => (
        <div className="flex items-center gap-3">
          
          {/* Aperçu side panel */}
          <button
            onClick={() => {
              setSelectedReport(row);
              setIsDetailsOpen(true);
            }}
            className="flex items-center gap-2 font-bold text-slate-800 hover:text-gray-500 transition"
          >
            <Eye size={18} />
          </button>
    
          {/* Redirection vers page détails */}
          <Link
            href={`/admin/rapports/details/${row.id}`}
            className="group p-2 rounded-xl bg-white hover:bg-black transition flex items-center justify-center"
          >
           <ArrowUpRight
  size={16}
  className="group-hover:rotate-45 transition-transform"
/>
          </Link>
    
        </div>
      ),
    }
  ];

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="ml-64 mt-20 p-6 space-y-8">
          <PageHeader title="Rapports d'intervention" subtitle="Visualisez et validez les rapports soumis par vos prestataires" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis.map((k, i) => <StatsCard key={i} {...k} />)}
          </div>

          <div className="shrink-0 flex justify-end items-center gap-3">
            <div className="relative" ref={filterRef}>
              <button
                onClick={() => setFiltersOpen(!filtersOpen)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition ${
                  filtersOpen || activeCount > 0 ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Filter size={16} /> Filtrer par
                {activeCount > 0 && (
                  <span className="ml-1 bg-white text-slate-900 text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center">{activeCount}</span>
                )}
              </button>
              <FilterDropdown isOpen={filtersOpen} onClose={() => setFiltersOpen(false)} filters={filters} onApply={applyFilters} />
            </div>
            <button
              onClick={() => showFlash("error", "Fonctionnalité d'export en cours de développement.")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-bold hover:bg-slate-50 transition"
            >
              <Upload size={16} /> Exporter
            </button>
          </div>

          {/* Chips filtres actifs */}
          {activeCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Filtré par :</span>
              {filters.status && (
                <span className="flex items-center gap-1.5 bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded-full">
                  {STATUS_LABELS[filters.status] ?? filters.status}
                  <button onClick={() => applyFilters({ ...filters, status: undefined })} className="hover:opacity-70"><X size={12} /></button>
                </span>
              )}
              {filters.type && (
                <span className="flex items-center gap-1.5 bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded-full">
                  {filters.type === "curatif" ? "Curatif" : "Préventif"}
                  <button onClick={() => applyFilters({ ...filters, type: undefined })} className="hover:opacity-70"><X size={12} /></button>
                </span>
              )}
            </div>
          )}

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <DataTable columns={columns} data={isLoading ? [] : paginated} onViewAll={() => {}} />
            <div className="p-6 border-t border-slate-50 flex justify-end bg-slate-50/30">
              <Paginate currentPage={currentPage} totalPages={totalPages || 1} onPageChange={setCurrentPage} />
            </div>
          </div>

          <ReportSidePanel
            report={isDetailsOpen ? selectedReport : null}
            onClose={() => { setIsDetailsOpen(false); setSelectedReport(null); }}
            onValidate={async (reportWithPayload) => {
              await handleValidate(
                reportWithPayload,
                { rating: reportWithPayload.rating, comment: reportWithPayload.manager_comment }
              );
            }}
          />

          {flashMessage && (
            <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-xl shadow-lg text-sm font-semibold border ${
              flashMessage.type === "success" ? "text-green-700 bg-green-50 border-green-200" : "text-red-600 bg-red-100 border-red-300"
            }`}>
              {flashMessage.message}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}