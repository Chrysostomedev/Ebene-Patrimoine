"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, CheckCircle2, Clock, FileText,
  Eye, Download, Star, X, MapPin, Wrench, ArrowUpRight, AlertTriangle,
} from "lucide-react";

import AttachmentViewer from "@/components/AttachmentViewer";

import Navbar from "@/components/Navbar";
import StatsCard from "@/components/StatsCard";
import RichContent from "@/components/RichContent";

import { ReportService, InterventionReport, ValidateReportPayload } from "../../../../../services/admin/report.service";
import { resolveUrl } from "@/components/AttachmentViewer";
import { useToast } from "@/contexts/ToastContext";
import { formatDate } from "@/lib/utils";


// ═══════════════════════════════════════════════
// COMPOSANTS UI LOCAUX
// ═══════════════════════════════════════════════

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  submitted: { label: "Soumis", bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  validated: { label: "Validé", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  rejected: { label: "Rejeté", bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  draft: { label: "Brouillon", bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
};

function StatusBadge({ status }: { status?: string }) {
  const cfg = STATUS_CONFIG[status ?? ""] ?? { label: status ?? "—", bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function TypeBadge({ type }: { type?: string }) {
  const isCuratif = type === "curatif";
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${isCuratif ? "bg-orange-50 text-orange-700" : "bg-teal-50 text-teal-700"
      }`}>
      <Wrench size={11} />
      {isCuratif ? "Curatif" : "Préventif"}
    </span>
  );
}

function StarRatingDisplay({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(s => (
        <Star
          key={s}
          size={16}
          className={s <= value ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"}
        />
      ))}
      <span className="ml-1 text-sm font-bold text-slate-700">{value}/5</span>
    </div>
  );
}

function PdfPreviewModal({ url, name, onClose }: { url: string; name: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm">
      <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <FileText size={18} className="text-slate-300" />
          <span className="text-sm font-bold text-white truncate max-w-md">{name}</span>
        </div>
        <div className="flex items-center gap-3">
          <a href={url} download target="_blank" rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition">
            <Download size={14} /> Télécharger
          </a>
          <button onClick={onClose}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white transition">
            <X size={18} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <iframe src={url} className="w-full h-full" title={name} />
      </div>
    </div>
  );
}

function ValidateModal({
  report, onClose, onConfirm,
}: {
  report: InterventionReport;
  onClose: () => void;
  onConfirm: (payload: ValidateReportPayload) => Promise<void>;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onConfirm({
        result: "RAS", // Requis par le back mais non affiché
        rating: rating || undefined,
        comment: comment || undefined
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-900">Valider le rapport</h2>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 transition">
            <X size={18} />
          </button>
        </div>
        <div className="bg-slate-50 rounded-2xl p-4 text-sm text-slate-600">
          Rapport <span className="font-bold text-slate-900">{report.reference || `#${report.id}`}</span>
        </div>
        {/* Note */}
        <div>
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-3">Note de satisfaction</label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map(s => (
              <button key={s} onClick={() => setRating(s === rating ? 0 : s)}
                className="transition-transform hover:scale-110">
                <Star size={28} className={s <= rating ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"} />
              </button>
            ))}
            {rating > 0 && <span className="ml-1 text-sm font-bold text-slate-600">{rating}/5</span>}
          </div>
        </div>
        {/* Commentaire */}
        <div>
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Commentaire</label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={3}
            placeholder="Ajouter un commentaire de validation..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-900 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition">
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 py-3 rounded-2xl bg-slate-900 text-white font-bold hover:bg-black transition flex items-center justify-center gap-2 disabled:opacity-60">
            <CheckCircle2 size={16} />
            {loading ? "Validation..." : "Confirmer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════
/**
 * Résout le nom complet d'un acteur (First + Last)
 */
const getActorName = (obj?: any | null) => {
  if (!obj) return null;
  const u = obj.user || obj;
  const person = u.manager || u.admin || u;
  const fname = (person.first_name || u.first_name || obj.first_name || "").trim();
  const lname = (person.last_name || u.last_name || obj.last_name || "").trim();
  const fullName = `${fname} ${lname}`.trim();
  if (fullName) return fullName;
  return person.name || u.name || obj.name || obj.company_name || null;
};

// ═══════════════════════════════════════════════
// TIMELINE
// ═══════════════════════════════════════════════

interface TimelineEvent {
  label: string;
  date?: string;
  icon: React.ReactNode;
  dotColor: string;
  bgColor: string;
  borderColor: string;
}

function buildTimeline(report: InterventionReport): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const technicianName = getActorName(report.provider);
  const validatorName = getActorName(report.validator);

  // 1. Soumission
  events.push({
    label: `Rapport soumis par ${technicianName}`,
    date: report.created_at,
    icon: <FileText size={14} />,
    dotColor: "text-blue-500",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  });

  // 2. Intervention
  if (report.start_date) {
    events.push({
      label: `Intervention ${report.intervention_type === 'curatif' ? 'Curative' : 'Préventive'} par ${technicianName}`,
      date: report.start_date,
      icon: <Wrench size={14} />,
      dotColor: "text-purple-500",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
    });
  }

  // 3. Résultat
  if (report.status === "validated" || report.status === "submitted") {
    const isAnomal = report.rejection_reason || (report as any).result === "anomalie";
    events.push({
      label: `Résultat renseigné par ${technicianName}`,
      date: report.updated_at ?? report.created_at,
      icon: isAnomal ? <AlertTriangle size={14} className="text-red-500" /> : <CheckCircle2 size={14} className="text-green-500" />,
      dotColor: isAnomal ? "text-red-500" : "text-green-500",
      bgColor: isAnomal ? "bg-red-50" : "bg-green-50",
      borderColor: isAnomal ? "border-red-200" : "border-green-200",
    });
  }

  // 4. Validation
  if (report.status === "validated") {
    events.push({
      label: `Rapport validé par ${validatorName || "Administrateur"}`,
      date: report.validated_at ?? undefined,
      icon: <CheckCircle2 size={14} />,
      dotColor: "text-emerald-500",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200",
    });
  }

  return events;
}

function TimelineItem({ event, isLast }: { event: TimelineEvent; isLast: boolean }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center shrink-0
          ${event.bgColor} ${event.borderColor}`}>
          <span className={event.dotColor}>{event.icon}</span>
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-slate-100 mt-2" />}
      </div>
      <div className="flex-1 pb-6">
        <div className="flex items-start justify-between gap-3 mb-0.5">
          <h4 className="text-sm font-bold text-slate-900">{event.label}</h4>
          <span className="text-[10px] text-slate-400 shrink-0 mt-0.5">{formatDate(event.date)}</span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// PAGE DÉTAIL RAPPORT
// ═══════════════════════════════════════════════

export default function ReportDetailPage() {
  const params = useParams();
  const reportId = Number(params.id);

  const [report, setReport] = useState<InterventionReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<{ url: string; name: string } | null>(null);
  const [showValidate, setShowValidate] = useState(false);
  const { toast } = useToast();


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
      toast.success("Rapport validé avec succès.");
    } catch {
      toast.error("Erreur lors de la validation.");
    }
  };

  const isValidated = report?.status === "validated";
  const pdfs = (report?.attachments ?? []).filter(a => a.file_type === "document");
  const photos = (report?.attachments ?? []).filter(a => a.file_type === "photo");
  const providerName = getActorName(report?.provider);
  const siteName = report?.site?.nom ?? report?.site?.name ?? "-";
  const validatorName = getActorName(report?.validator);
  const timeline = report ? buildTimeline(report) : [];

  // KPIs dynamiques depuis le rapport
  const kpis = [
    { label: "Prestataire", value: providerName || "-", delta: "", trend: "up" as const },
    { label: "Site", value: siteName, delta: "", trend: "up" as const },
    { label: "Pièces jointes", value: (report?.attachments?.length ?? 0), delta: "", trend: "up" as const },
    { label: "Note", value: report?.rating ? `${report.rating}/5` : "N/A", delta: "", trend: "up" as const },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50 text-slate-900 font-sans">
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="mt-20 p-8 space-y-8">


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
                    {isLoading ? "Chargement..." : `Rapport ${report?.reference || reportId}`}
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

            {/* Bloc droit - info validation + bouton */}
            <div className="flex flex-col gap-4">
              <div className="bg-slate-50/50 p-6 rounded-[24px] border border-slate-100 flex flex-col gap-4 min-w-[300px]">
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Créé le</span>
                    <span className="font-bold text-slate-900">{formatDate(report?.created_at)}</span>
                  </div>
                  {isValidated && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-medium">Rapport validé le</span>
                      <span className="font-bold text-emerald-700">
                        {formatDate(report?.validated_at)}
                      </span>
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
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Actions menées</h3>
                <RichContent html={report?.action_taken} placeholder="Aucune action renseignée." />
              </div>
              <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Observations</h3>
                <RichContent html={report?.findings} placeholder="Aucune observation renseignée." />
              </div>
              {/* Commentaire de validation */}
              {isValidated && report?.manager_comment && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-[24px] p-6">
                  <h3 className="text-xs font-black text-emerald-800 uppercase tracking-widest mb-3">
                    Commentaire de validation
                  </h3>
                  <p className="text-sm text-emerald-700 leading-relaxed">{report.manager_comment}</p>
                </div>
              )}

              {/* Photos */}
              {photos.length > 0 && (
                <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                    Photos ({photos.length})
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {photos.map(att => {
                      const url = resolveUrl(att.file_path);
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

              {/* ── Timeline des mouvements ──────────────────────── */}
              <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">
                  Historique des mouvements
                </h3>
                {timeline.length > 0
                  ? <div>
                    {timeline.map((evt, i) => (
                      <TimelineItem key={i} event={evt} isLast={i === timeline.length - 1} />
                    ))}
                  </div>
                  : <p className="text-sm text-slate-400 italic">Aucun mouvement enregistré.</p>
                }
              </div>
            </div>

            {/* Sidebar droite - docs PDF + infos */}
            <div className="space-y-6">

              {/* Documents PDF */}
              <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                  Documents
                </h3>
                {pdfs.length > 0 ? (
                  <div className="space-y-3">
                    {pdfs.map(att => {
                      const url = resolveUrl(att.file_path);
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
                              <Eye size={13} />
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
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Ticket lié</h3>
                  <div className="space-y-2.5">
                    {[
                      { label: "Référence", value: `${report.ticket.code_ticket || report.ticket.reference || '-'}` },
                      { label: "Sujet", value: report.ticket.subject ?? "-" },
                      { label: "Type", value: report.ticket.type === "curatif" ? "Curatif" : "Préventif" },
                      { label: "Statut", value: report.ticket.status ?? "-" },
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