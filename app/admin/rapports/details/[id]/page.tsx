"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, CheckCircle2, Clock, FileText,
  Eye, Download, Star, X, MapPin, Wrench,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import StatsCard from "@/components/StatsCard";

import { ReportService, InterventionReport, ValidateReportPayload } from "../../../../../services/report.service";

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

const formatDate = (iso?: string | null): string => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

// ═══════════════════════════════════════════════
// COMPOSANTS LOCAUX
// ═══════════════════════════════════════════════

function StatusBadge({ status }: { status?: string }) {
  const isValidated = status === "validated";
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${
      isValidated ? "border-black bg-black text-white" : "border-slate-300 bg-slate-100 text-slate-700"
    }`}>
      {isValidated ? <CheckCircle2 size={11} /> : <Clock size={11} />}
      {isValidated ? "Validé" : "En attente"}
    </span>
  );
}

function TypeBadge({ type }: { type?: string }) {
  const isCuratif = type === "curatif";
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold ${
      isCuratif ? "bg-orange-50 text-orange-600 border border-orange-200" : "bg-blue-50 text-blue-600 border border-blue-200"
    }`}>
      {isCuratif ? "Curatif" : "Préventif"}
    </span>
  );
}

function StarRatingDisplay({ value }: { value?: number | null }) {
  if (!value) return <span className="text-slate-400 text-sm font-medium">Non noté</span>;
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} size={18} className={i < value ? "fill-yellow-400 text-yellow-400" : "fill-slate-200 text-slate-200"} />
        ))}
      </div>
      <span className="text-sm font-black text-slate-700">{value}/5</span>
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
// VALIDATE MODAL — notation + commentaire
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
        <div className="flex items-center justify-between px-7 py-6 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-black text-slate-900">Valider le rapport</h2>
            <p className="text-xs text-slate-400 mt-0.5">Rapport #{report.id}</p>
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
        <div className="px-7 py-5 border-t border-slate-100 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition">
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition disabled:opacity-60">
            {loading
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <CheckCircle2 size={15} />
            }
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// PAGE DÉTAIL RAPPORT
// ═══════════════════════════════════════════════

export default function ReportDetailPage() {
  const params    = useParams();
  const reportId  = Number(params.id);

  const [report,        setReport]        = useState<InterventionReport | null>(null);
  const [isLoading,     setIsLoading]     = useState(false);
  const [pdfPreview,    setPdfPreview]    = useState<{ url: string; name: string } | null>(null);
  const [showValidate,  setShowValidate]  = useState(false);
  const [flash,         setFlash]         = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showFlash = (type: "success" | "error", message: string) => {
    setFlash({ type, message });
    setTimeout(() => setFlash(null), 5000);
  };

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const data = await ReportService.getReport(reportId);
      setReport(data);
    } catch (err) {
      console.error("Erreur chargement rapport", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { if (reportId) fetchReport(); }, [reportId]);

  const handleValidate = async (payload: ValidateReportPayload) => {
    try {
      const updated = await ReportService.validateReport(reportId, payload);
      setReport(updated);
      showFlash("success", "Rapport validé avec succès.");
    } catch {
      showFlash("error", "Erreur lors de la validation.");
    }
  };

  const isValidated  = report?.status === "validated";
  const pdfs         = (report?.attachments ?? []).filter(a => a.file_type === "document");
  const photos       = (report?.attachments ?? []).filter(a => a.file_type === "photo");
  const providerName = report?.provider?.company_name ?? report?.provider?.name ?? "—";
  const siteName     = report?.site?.nom ?? report?.site?.name ?? "—";

  // KPIs dynamiques depuis le rapport
  const kpis = [
    { label: "Prestataire",   value: providerName,                                    delta: "", trend: "up" as const },
    { label: "Site",          value: siteName,                                        delta: "", trend: "up" as const },
    { label: "Pièces jointes",value: (report?.attachments?.length ?? 0),              delta: "", trend: "up" as const },
    { label: "Note",          value: report?.rating ? `${report.rating}/5` : "N/A",  delta: "", trend: "up" as const },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col pl-64">
        <Navbar />
        <main className="mt-20 p-8 space-y-8">

          {flash && (
            <div className={`px-6 py-4 rounded-2xl text-sm font-semibold ${
              flash.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}>{flash.message}</div>
          )}

          {/* ── Header ── */}
          <div className="bg-white flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="space-y-4">
              <Link
                href="/admin/rapports"
                className="flex items-center gap-2 text-slate-500 hover:text-black transition-colors bg-white px-4 py-2 rounded-xl border border-slate-100 w-fit text-sm font-medium"
              >
                <ChevronLeft size={18} /> Retour
              </Link>
              <div>
                <div className="flex items-center gap-4 mb-1">
                  <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase">
                    {isLoading ? "Chargement..." : `Rapport #${reportId}`}
                  </h1>
                  {report && <StatusBadge status={report.status} />}
                  {report && <TypeBadge type={report.intervention_type} />}
                </div>
                <div className="flex items-center gap-2 text-slate-400 mt-1">
                  <MapPin size={18} />
                  <span className="font-medium text-lg">{siteName}</span>
                </div>
                {report?.ticket?.subject && (
                  <div className="flex items-center gap-2 text-slate-500 mt-1">
                    <Wrench size={15} />
                    <span className="text-sm font-medium">{report.ticket.subject}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bloc droit — info validation + bouton */}
            <div className="flex flex-col gap-4">
              <div className="bg-slate-50/50 p-6 rounded-[24px] border border-slate-100 flex flex-col gap-4 min-w-[300px]">
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Créé le</span>
                    <span className="font-bold text-slate-900">{formatDate(report?.created_at)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Début</span>
                    <span className="font-bold text-slate-900">{formatDate(report?.start_date)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Fin</span>
                    <span className="font-bold text-slate-900">{formatDate(report?.end_date)}</span>
                  </div>
                  {isValidated && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-medium">Validé le</span>
                      <span className="font-bold text-emerald-700">{formatDate(report?.validated_at)}</span>
                    </div>
                  )}
                </div>
                {isValidated && report?.rating && (
                  <div className="border-t border-slate-100 pt-3">
                    <StarRatingDisplay value={report.rating} />
                  </div>
                )}
              </div>

              {!isValidated && report && (
                <button
                  onClick={() => setShowValidate(true)}
                  className="flex items-center justify-center gap-2 bg-slate-900 text-white py-3 px-6 rounded-2xl font-bold hover:bg-black transition-colors"
                >
                  <CheckCircle2 size={16} /> Valider le rapport
                </button>
              )}
            </div>
          </div>

          {/* ── KPIs ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis.map((k, i) => <StatsCard key={i} {...k} />)}
          </div>

          {/* ── Contenu principal ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Description + commentaire validateur */}
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Description</h3>
                {report?.description ? (
                  <p className="text-sm text-slate-700 leading-relaxed">{report.description}</p>
                ) : (
                  <p className="text-slate-400 text-sm italic">Aucune description renseignée.</p>
                )}
              </div>

              {/* Commentaire de validation */}
              {isValidated && report?.manager_comment && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-[24px] p-6">
                  <h3 className="text-sm font-black text-emerald-800 uppercase tracking-widest mb-3">
                    Commentaire de validation
                  </h3>
                  <p className="text-sm text-emerald-700 leading-relaxed">{report.manager_comment}</p>
                </div>
              )}

              {/* Photos */}
              {photos.length > 0 && (
                <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">
                    Photos ({photos.length})
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
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
            </div>

            {/* Sidebar droite — docs PDF + infos */}
            <div className="space-y-6">

              {/* Documents PDF */}
              <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">
                  Documents
                </h3>
                {pdfs.length > 0 ? (
                  <div className="space-y-3">
                    {pdfs.map(att => {
                      const url  = ReportService.getAttachmentUrl(att.file_path);
                      const name = att.file_path.split("/").pop() ?? "document.pdf";
                      return (
                        <div key={att.id} className="flex flex-col gap-2 p-3 rounded-xl border border-slate-100 bg-slate-50">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                              <FileText size={16} className="text-red-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">{name}</p>
                              <p className="text-[10px] text-slate-400">PDF</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setPdfPreview({ url, name })}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-bold hover:bg-white transition"
                            >
                              <Eye size={13} /> Aperçu
                            </button>
                            <a href={url} download target="_blank" rel="noreferrer"
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-black transition">
                              <Download size={13} /> Télécharger
                            </a>
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
              </div>

              {/* Informations ticket */}
              {report?.ticket && (
                <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Ticket lié</h3>
                  <div className="space-y-2.5">
                    {[
                      { label: "ID",      value: `#${report.ticket.id}` },
                      { label: "Sujet",   value: report.ticket.subject ?? "—" },
                      { label: "Type",    value: report.ticket.type === "curatif" ? "Curatif" : "Préventif" },
                      { label: "Statut",  value: report.ticket.status ?? "—" },
                    ].map((f, i) => (
                      <div key={i} className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0">
                        <span className="text-xs text-slate-400 font-medium">{f.label}</span>
                        <span className="text-xs font-bold text-slate-900">{f.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* PDF fullscreen */}
      {pdfPreview && (
        <PdfPreviewModal url={pdfPreview.url} name={pdfPreview.name} onClose={() => setPdfPreview(null)} />
      )}

      {/* Validate modal */}
      {showValidate && report && (
        <ValidateModal
          report={report}
          onClose={() => setShowValidate(false)}
          onConfirm={handleValidate}
        />
      )}
    </div>
  );
}