"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import StatsCard from "@/components/StatsCard";
import ReusableForm from "@/components/ReusableForm";
import type { FieldConfig } from "@/components/ReusableForm";
import RichContent from "@/components/RichContent";

import Link from "next/link";
import {
  ChevronLeft, CheckCircle2, Clock, FileText,
  Eye, Download, X, Star, AlertCircle,
  MapPin, Wrench, Edit2, AlertTriangle, ArrowUpRight,
  CheckSquare, Info, PenSquare, MessageSquare,
  User
} from "lucide-react";

import AttachmentViewer, { isImage, isPdf } from "@/components/AttachmentViewer";

import {
  providerReportService, InterventionReport,
  STATUS_LABELS, STATUS_STYLES, STATUS_DOT,
  TYPE_LABELS, TYPE_STYLES,
  RESULT_LABELS, RESULT_STYLES,
  getAttachmentUrl,
  getSiteName, getProviderName, isEditable,
} from "../../../../services/provider/providerReportService";
import { providerQuoteService } from "../../../../services/provider/providerQuoteService";
import { providerInvoiceService } from "../../../../services/provider/providerInvoiceService";
import { formatDate, formatCurrency } from "@/lib/utils";
import { useProviderReports } from "../../../../hooks/provider/useProviderReports";

// ─── Badges ────────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status?: string }) {
  const s = status ?? "pending";
  return (
    <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-bold
      ${STATUS_STYLES[s] ?? "border-slate-200 bg-slate-50 text-slate-500"}`}>
      {s === "validated" ? <CheckCircle2 size={14} /> : <Clock size={14} />}
      {STATUS_LABELS[s] ?? s}
    </span>
  );
}
function TypeBadge({ type }: { type?: string }) {
  if (!type) return null;
  return (
    <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold
      ${TYPE_STYLES[type] ?? "bg-slate-50 text-slate-500 border border-slate-200"}`}>
      {TYPE_LABELS[type] ?? type}
    </span>
  );
}
function ResultBadge({ result }: { result?: string }) {
  if (!result) return null;
  return (
    <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold
      ${RESULT_STYLES[result] ?? "bg-slate-50 text-slate-500 border border-slate-200"}`}>
      {RESULT_LABELS[result] ?? result}
    </span>
  );
}
function StarRatingDisplay({ value }: { value?: number | null }) {
  if (!value) return <span className="text-slate-400 text-sm">Non noté</span>;
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} size={18}
            className={i < value ? "fill-yellow-400 text-yellow-400" : "fill-slate-200 text-slate-200"} />
        ))}
      </div>
      <span className="text-sm font-black text-slate-700">{value}/5</span>
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

// ─── Timeline ─────────────────────────────────────────────────────────────────
interface TimelineEvent {
  label: string;
  sublabel?: string;
  date?: string;
  icon: React.ReactNode;
  dotColor: string;
  bgColor: string;
  borderColor: string;
}

function buildTimeline(report: InterventionReport): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  events.push({
    label: "Rapport soumis",
    sublabel: report.ticket?.subject
      ? `Ticket : "${report.ticket.subject}"`
      : `Ticket #${report.ticket_id}`,
    date: report.created_at,
    icon: <FileText size={14} />,
    dotColor: "text-blue-500",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  });

  if (report.start_date) {
    events.push({
      label: `Intervention ${TYPE_LABELS[report.intervention_type ?? ""]}`,
      sublabel: report.end_date
        ? `Du ${formatDate(report.start_date)} au ${formatDate(report.end_date)}`
        : `Le ${formatDate(report.start_date)}`,
      date: report.start_date,
      icon: <Wrench size={14} />,
      dotColor: "text-purple-500",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
    });
  }

  if (report.result) {
    const isAnomal = report.result === "anomalie";
    events.push({
      label: `Résultat : ${RESULT_LABELS[report.result]}`,
      sublabel: report.findings
        ? `"${report.findings.slice(0, 80)}${report.findings.length > 80 ? "…" : ""}"`
        : undefined,
      date: report.updated_at ?? report.created_at,
      icon: isAnomal ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />,
      dotColor: isAnomal ? "text-red-500" : "text-green-500",
      bgColor: isAnomal ? "bg-red-50" : "bg-green-50",
      borderColor: isAnomal ? "border-red-200" : "border-green-200",
    });
  }

  const count = report.attachments?.length ?? 0;
  if (count > 0) {
    const pdfsN = (report.attachments ?? []).filter(a => a.file_type === "document").length;
    const photosN = (report.attachments ?? []).filter(a => a.file_type === "photo").length;
    events.push({
      label: `${count} pièce${count > 1 ? "s" : ""} jointe${count > 1 ? "s" : ""} déposée${count > 1 ? "s" : ""}`,
      sublabel: `${pdfsN} document${pdfsN > 1 ? "s" : ""} · ${photosN} photo${photosN > 1 ? "s" : ""}`,
      date: report.created_at,
      icon: <FileText size={14} />,
      dotColor: "text-slate-500",
      bgColor: "bg-slate-50",
      borderColor: "border-slate-200",
    });
  }

  if (report.status === "validated") {
    events.push({
      label: "Rapport validé le gestionnaire",
      sublabel: report.manager_comment
        ? `Commentaire : "${report.manager_comment.slice(0, 80)}${report.manager_comment.length > 80 ? "…" : ""}"`
        : report.rating ? `Note attribuée : ${report.rating}/5` : undefined,
      date: report.validated_at,
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
        {event.sublabel && (
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{event.sublabel}</p>
        )}
      </div>
    </div>
  );
}

const editFields: FieldConfig[] = [
  // {
  //   name: "anomaly_detected", label: "Anomalie détectée ?", type: "checkbox",
  // },
  { name: "action_taken", label: "Description / Travaux effectués", type: "rich-text", gridSpan: 2 },
  { name: "findings", label: "Observations / Constatations", type: "rich-text", gridSpan: 2 },
  {
    name: "attachments", label: "Documents et Photos de l'intervention",
    type: "pdf-upload", maxPDFs: 10, gridSpan: 2,
    accept: ".pdf,.doc,.docx,.xls,.xlsx,image/*",
    placeholder: "Cliquez pour ajouter des photos, PDF ou documents Office"
  },
];

export default function ProviderEntretienDetailPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = Number(params?.id);

  const [report, setReport] = useState<InterventionReport | null>(null);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pdfPreview, setPdfPreview] = useState<{ url: string; name: string } | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [flash, setFlash] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const { updateReport, submitting } = useProviderReports();

  const showFlash = (type: "success" | "error", msg: string) => {
    setFlash({ type, msg }); setTimeout(() => setFlash(null), 4500);
  };

  useEffect(() => {
    if (!reportId) return;
    const load = async () => {
      setLoading(true); setError("");
      try {
        const data = await providerReportService.getReportById(reportId);
        setReport(data);
        // Charger devis & factures liées au ticket
        const ticketId = data.ticket_id || (data.ticket as any)?.id;
        if (ticketId) {
          try {
            const invRes = await providerInvoiceService.getInvoices({ per_page: 100 });
            setInvoices(invRes.items.filter((i: any) => i.ticket_id && Number(i.ticket_id) === Number(ticketId)));
          } catch { /* silently ignore */ }
          try {
            const allQs = await providerQuoteService.getQuotes({ per_page: 100, ticket_id: ticketId });
            setQuotes(allQs);
          } catch { /* silently ignore */ }
        }
      } catch (e: any) {
        setError(
          e.response?.data?.message ??
          e.response?.data?.error ??
          "Impossible de charger ce rapport."
        );
      } finally { setLoading(false); }
    };
    load();
  }, [reportId]);

  const handleUpdate = async (formData: any) => {
    if (!report) return;
    const ok = await updateReport(report.id, {
      intervention_type: formData.intervention_type || undefined,
      anomaly_detected: formData.anomaly_detected !== undefined ? !!formData.anomaly_detected : undefined,
      action_taken: formData.action_taken || undefined,
      findings: formData.findings || undefined,
      attachments: formData.attachments?.length ? formData.attachments : undefined,
    });
    if (ok) {
      setIsEditOpen(false);
      showFlash("success", "Rapport mis à jour avec succès.");
      try {
        setReport(await providerReportService.getReportById(report.id));
      } catch { /* silencieux */ }
    } else {
      showFlash("error", "Erreur lors de la mise à jour.");
    }
  };

  const pdfs = (report?.attachments ?? []).filter(a => isPdf(a) || (!isImage(a) && a.file_type === "document"));
  const photos = (report?.attachments ?? []).filter(a => isImage(a));
  const timeline = report ? buildTimeline(report) : [];
  const editable = report ? isEditable(report) : false;
  const isValidated = report?.status === "validated";

  const kpis = [
    { label: "Prestataire", value: getProviderName(report?.provider), delta: "", trend: "up" as const },
    { label: "Site", value: getSiteName(report?.site), delta: "", trend: "up" as const },
    { label: "Pièces jointes", value: report?.attachments?.length ?? 0, delta: "", trend: "up" as const },
    { label: "Note", value: report?.rating ? `${report.rating}/5` : "N/A", delta: "", trend: "up" as const },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="mt-20 p-8 space-y-8">

          {flash && (
            <div className={`px-5 py-4 rounded-2xl text-sm font-semibold border
              ${flash.type === "success"
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-red-50 text-red-700 border-red-200"}`}>
              {flash.msg}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl text-sm font-medium">
              <AlertCircle size={15} className="shrink-0" /> {error}
            </div>
          )}

          {loading && (
            <div className="space-y-4 animate-pulse">
              <div className="h-10 w-80 bg-slate-100 rounded-2xl" />
              <div className="h-44 bg-slate-100 rounded-3xl" />
              <div className="grid grid-cols-4 gap-6">
                {[0, 1, 2, 3].map(i => <div key={i} className="h-28 bg-slate-100 rounded-3xl" />)}
              </div>
            </div>
          )}

          {report && (
            <>
              {/* ── Header Premium Uniformisé ── */}
              <div className="bg-white flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="space-y-4">
                  <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-slate-500 hover:text-black transition-colors bg-white px-4 py-2 rounded-xl border border-slate-100 w-fit text-sm font-medium"
                  >
                    <ChevronLeft size={18} /> Retour
                  </button>
                  <div>
                    <div className="flex items-center gap-4 mb-1">
                      <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">
                        Rapport de visite préventive {report.reference || report.id}
                      </h1>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${STATUS_STYLES[report.status || "pending"] || "bg-slate-50 text-slate-600 border border-slate-100"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${report.status === 'validated' ? 'bg-emerald-500' : report.status === 'submitted' ? 'bg-blue-500' : 'bg-amber-500'}`} />
                        {STATUS_LABELS[report.status || "pending"] || report.status}
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-700">
                        <Wrench size={11} />
                        Préventif
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 mt-1">
                      <MapPin size={18} />
                      <span className="font-medium text-lg">{getSiteName(report.site)}</span>
                    </div>
                    {report.planning?.codification && (
                      <div className="flex items-center gap-2 text-slate-500 mt-1">
                        <Clock size={15} />
                        <span className="text-sm font-medium">Planning : {report.planning.codification}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bloc droit - info validation + bouton édition si modifiable */}
                <div className="flex flex-col gap-4">
                  <div className="bg-slate-50/50 p-6 rounded-[24px] border border-slate-100 flex flex-col gap-4 min-w-[300px]">
                    <div className="flex flex-col gap-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-medium">Effectué le</span>
                        <span className="font-bold text-slate-900">{formatDate(report.start_date)}</span>
                      </div>
                      {isValidated && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 font-medium">Rapport validé le</span>
                          <span className="font-bold text-emerald-700">
                            {formatDate(report.validated_at)}
                          </span>
                        </div>
                      )}
                    </div>
                    {isValidated && report.rating && (
                      <div className="border-t border-slate-100 pt-3">
                        <StarRatingDisplay value={report.rating} />
                      </div>
                    )}
                  </div>

                  {editable && (
                    <button
                      onClick={() => setIsEditOpen(true)}
                      className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-black text-white py-3 px-6 rounded-2xl font-bold transition-colors"
                    >
                      <Edit2 size={15} /> Modifier le Rapport
                    </button>
                  )}
                </div>
              </div>

              {/* ── KPIs Premium Uniformisés ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpis.map((k, i) => <StatsCard key={i} {...k} />)}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Side Info & Tickets */}
                <div className="space-y-8">
                  {/* Tickets de Suivi - Toujours en haut pour visibilité */}
                  {(() => {
                    const ticketsFromPlanning = (report as any).planning?.tickets || [];
                    const ticketsFromResults = ((report as any).asset_results || (report as any).results || []).filter((r: any) => r.preventive_ticket_id).map((r: any) => ({
                      id: r.preventive_ticket_id,
                      code_ticket: r.preventive_ticket_code || `TKP-${r.preventive_ticket_id}`,
                      status: "EN_COURS",
                      asset: r.asset
                    }));

                    // Fusion unique par ID
                    const allTicketsMap = new Map();
                    [...ticketsFromPlanning, ...ticketsFromResults].forEach(t => {
                      if (t.id || t.preventive_ticket_id) {
                        allTicketsMap.set(t.id || t.preventive_ticket_id, t);
                      }
                    });
                    const allTickets = Array.from(allTicketsMap.values());

                    if (allTickets.length === 0) return null;

                    return (
                      <div className="bg-slate-900 rounded-[32px] p-6 shadow-xl shadow-slate-200 space-y-4 border border-slate-800">
                        <div className="flex items-center justify-between">
                          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <AlertTriangle size={14} className="text-amber-500" /> Tickets de Suivi ({allTickets.length})
                          </h3>
                        </div>
                        <div className="space-y-2">
                          {allTickets.map((t: any, idx: number) => (
                            <Link
                              key={idx}
                              href={`/provider/preventif/${t.id || t.preventive_ticket_id}`}
                              className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/50 border border-slate-700 hover:border-white transition-all group"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-slate-400 group-hover:text-white shadow-sm">
                                  <Wrench size={14} />
                                </div>
                                <div>
                                  <p className="text-[10px] font-black text-white uppercase tracking-tight">
                                    {t.code_ticket || `TKP-${t.id || t.preventive_ticket_id}`}
                                  </p>
                                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 truncate max-w-[120px]">
                                    {t.asset?.designation || t.designation || "Intervention"}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1.5 py-0.5 bg-slate-900 rounded border border-slate-700">
                                  {t.status || "OUVERT"}
                                </span>
                                <ArrowUpRight size={14} className="text-slate-500 group-hover:text-white transition-colors" />
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  <div className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm space-y-8 sticky top-28">
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <FileText size={14} /> Observations / Constatations
                      </label>
                      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 min-h-[120px]">
                        <div className="prose prose-slate max-w-none text-slate-900 font-bold text-sm leading-relaxed">
                          <RichContent html={report.findings || (report as any).description} placeholder="Aucune observation rédigée." />
                        </div>
                      </div>
                    </div>

                    {report.action_taken && (
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <Wrench size={14} /> Actions Menées
                        </label>
                        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 min-h-[120px]">
                          <div className="prose prose-slate max-w-none text-slate-900 font-bold text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: report.action_taken }} />
                        </div>
                      </div>
                    )}

                    {/* Context Info Cards */}
                    <div className="pt-6 border-t border-slate-100 space-y-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                          <MapPin size={18} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Site concerné</p>
                          <p className="text-sm font-bold text-slate-900">{getSiteName(report.site)}</p>
                        </div>
                      </div>

                      {/* Nouveau : Manager du site */}
                      {(report.site as any)?.manager && (
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 border border-blue-100">
                            <User size={18} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Gestionnaire Site</p>
                            <p className="text-sm font-bold text-slate-900">
                              {(report.site as any).manager.first_name} {(report.site as any).manager.last_name}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                          <Clock size={18} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Date de soumission</p>
                          <p className="text-sm font-bold text-slate-900">{formatDate(report.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Asset Checklist (Read Only) */}
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Diagnostic Technique</h3>
                        <p className="text-xs text-slate-400 font-medium">Contrôle individuel des patrimoines effectué</p>
                      </div>
                      <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {(() => {
                            const res = (report as any).asset_results || (report as any).results || (report as any).assets || (report as any).items || (report as any).diagnostic || [];
                            if (res.length > 0) return res.length;
                            const single = (report as any).asset || (report as any).company_asset || (report as any).patrimoine || (report as any).equipment || report.ticket?.asset;
                            return single ? 1 : 0;
                          })()} Équipements
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {(() => {
                        // --- LOGIQUE DE RÉCUPÉRATION DES ÉQUIPEMENTS ---
                        let results = (report as any).asset_results || (report as any).results || (report as any).assets || (report as any).items || (report as any).diagnostic || [];

                        // Si pas de résultats multiples, on simule un résultat unique si l'asset est présent
                        if (results.length === 0) {
                          const singleAsset = (report as any).asset || (report as any).company_asset || (report as any).patrimoine || (report as any).equipment || report.ticket?.asset;
                          if (singleAsset) {
                            results = [{
                              asset: singleAsset,
                              status: (report.result === "anomalie" || !!(report as any).anomaly_detected) ? "ANOMALIE" : "RAS",
                              comment: report.findings || report.description || (report as any).anomaly_description
                            }];
                          }
                        }

                        return results.map((res: any, idx: number) => {
                          const status = (res.status || "RAS").toUpperCase();
                          const isAnomalie = status === "ANOMALIE";
                          const isObservation = status === "OBSERVATION";
                          const isRas = status === "RAS";

                          return (
                            <div key={idx} className={`p-5 rounded-2xl border transition-all ${isAnomalie ? "bg-red-50/30 border-red-100 shadow-sm shadow-red-50" :
                              isObservation ? "bg-amber-50/30 border-amber-100 shadow-sm shadow-amber-50" :
                                "bg-emerald-50/10 border-emerald-100 shadow-sm shadow-emerald-50"
                              }`}>
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-start gap-3">
                                  <div className={`mt-1 w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isAnomalie ? "bg-red-500 text-white" :
                                    isObservation ? "bg-amber-500 text-white" :
                                      "bg-emerald-500 text-white"
                                    }`}>
                                    {isRas && <CheckCircle2 size={16} />}
                                    {isObservation && <Info size={16} />}
                                    {isAnomalie && <AlertCircle size={16} />}
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-slate-900">{res.asset?.designation || res.designation || "Équipement"}</p>
                                    <p className="text-[10px] font-medium text-slate-400 tracking-wider uppercase mt-0.5">
                                      {res.asset?.codification || res.codification || "N/A"}
                                    </p>
                                  </div>
                                </div>

                                {/* Status Buttons Selector Style (Read Only) */}
                                <div className="flex items-center bg-slate-100/50 p-1 rounded-xl shrink-0 self-end md:self-auto">
                                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black tracking-tight transition-all ${isRas ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500/50"
                                    }`}>
                                    <CheckCircle2 size={12} /> RAS
                                  </div>
                                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black tracking-tight transition-all ${isObservation ? "bg-white text-amber-600 shadow-sm" : "text-slate-500/50"
                                    }`}>
                                    <Info size={12} /> OBSERVATION
                                  </div>
                                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black tracking-tight transition-all ${isAnomalie ? "bg-white text-red-600 shadow-sm" : "text-slate-500/50"
                                    }`}>
                                    <AlertCircle size={12} /> ANOMALIE
                                  </div>
                                  {res.preventive_ticket_id && (
                                    <Link
                                      href={`/provider/preventif/${res.preventive_ticket_id}`}
                                      className="ml-2 p-1.5 bg-white rounded-lg border border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-900 transition shadow-sm"
                                      title="Voir le ticket préventif"
                                    >
                                      <Eye size={14} />
                                    </Link>
                                  )}
                                </div>
                              </div>

                              {(isAnomalie || isObservation) && res.comment && (
                                <div className="mt-4 pt-4 border-t border-slate-100/50">
                                  <div className="flex items-center gap-2 mb-2">
                                    <MessageSquare size={12} className={isAnomalie ? "text-red-400" : "text-amber-400"} />
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                      {isAnomalie ? "Description de l'anomalie" : "Commentaire / Observation"}
                                    </p>
                                  </div>
                                  <p className={`w-full px-4 py-3 rounded-xl border text-sm font-bold transition-all min-h-[80px] ${isAnomalie ? "bg-white border-red-100 text-red-900" : "bg-white border-amber-100 text-amber-900"
                                    }`}>
                                    "{res.comment}"
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Devis & Factures liés au ticket */}
              {(quotes.length > 0 || invoices.length > 0) && (
                <div className="space-y-4 mt-6">
                  {quotes.length > 0 && (
                    <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Devis associés ({quotes.length})</h3>
                      <div className="space-y-3">
                        {quotes.map((q: any, i: number) => {
                          const st = (q.status || "").toLowerCase();
                          const isApproved = ["approved", "approuvé", "validé"].includes(st);
                          const isRejected = ["rejected", "rejeté"].includes(st);
                          return (
                            <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50">
                              <div>
                                <p className="text-sm font-bold text-slate-900">{q.reference ?? `Devis #${q.id}`}</p>
                                <p className="text-xs text-slate-500">{q.amount_ttc ? formatCurrency(Number(q.amount_ttc)) : "—"}</p>
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
                  {invoices.length > 0 && (
                    <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Factures ({invoices.length})</h3>
                      <div className="space-y-3">
                        {invoices.map((inv: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50">
                            <div>
                              <p className="text-sm font-bold text-slate-900">{inv.reference ?? `Facture #${inv.id}`}</p>
                              <p className="text-xs text-slate-500">{inv.amount_ttc ? formatCurrency(Number(inv.amount_ttc)) : "—"}</p>
                            </div>
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${inv.payment_status === "paid" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                              {inv.payment_status === "paid" ? "Validée" : "En attente"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {pdfPreview && (
        <PdfPreviewModal url={pdfPreview.url} name={pdfPreview.name} onClose={() => setPdfPreview(null)} />
      )}

      {report && (
        <ReusableForm
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          title={`Modifier le rapport ${report.id}`}
          subtitle="Impossible de modifier un rapport déjà validé par le gestionnaire."
          fields={editFields}
          initialValues={{
            intervention_type: report.intervention_type ?? "",
            anomaly_detected: report.result === "anomalie" || !!report.anomaly_detected,
            action_taken: report.action_taken ?? report.description ?? "",
            findings: report.findings ?? "",
            attachments: report.attachments ?? [],
          }}
          onSubmit={handleUpdate}
          submitLabel={submitting ? "Mise à jour..." : "Mettre à jour"}
        />
      )}
    </div>
  );
}
