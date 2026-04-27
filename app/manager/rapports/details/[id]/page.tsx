"use client";

import { useState, use } from "react";
import Link from "next/link";
import {
  ChevronLeft, CheckCircle2, Clock, FileText,
  Eye, Download, Star, X, MapPin, Wrench,
  AlertTriangle, CheckCircle, Info
} from "lucide-react";

import Navbar from "@/components/Navbar";
import StatsCard from "@/components/StatsCard";

import { useReport } from "../../../../../hooks/manager/useReport";
import { InterventionReport, ValidateReportPayload } from "../../../../../types/manager.types";

// ─────────────── HELPERS ───────────────
const formatDate = (iso?: string | null): string => {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
};

function StatusBadge({ status }: { status?: string }) {
  const isValidated = status === "validated";
  const isRejected = status === "rejected";

  let styles = "border-slate-300 bg-slate-100 text-slate-700";
  if (isValidated) styles = "border-emerald-200 bg-emerald-50 text-emerald-600";
  if (isRejected) styles = "border-rose-200 bg-rose-50 text-rose-600";

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-black uppercase tracking-widest ${styles}`}>
      {isValidated ? <CheckCircle2 size={11} /> : <Clock size={11} />}
      {status === "validated" ? "Validé" : status === "pending" ? "En attente" : status}
    </span>
  );
}

function TypeBadge({ type }: { type?: string }) {
  const isCuratif = type === "curatif";
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest ${isCuratif ? "bg-orange-100 text-orange-700 border border-orange-200" : "bg-blue-100 text-blue-700 border border-blue-200"
      }`}>
      {isCuratif ? "Curatif" : "Préventif"}
    </span>
  );
}

function ResultBadge({ result }: { result?: string }) {
  if (!result) return null;
  const isAnomalie = result === "anomalie";
  const isResolu = result === "resolu";

  let styles = "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (isAnomalie) styles = "bg-red-100 text-red-700 border-red-200";
  if (isResolu) styles = "bg-blue-100 text-blue-700 border-blue-200";

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border ${styles}`}>
      {result === "ras" ? "RAS" : result === "anomalie" ? "Anomalie" : "Résolu"}
    </span>
  );
}

function StarRatingDisplay({ value }: { value?: number | null }) {
  if (!value) return <span className="text-slate-400 text-sm font-medium italic">Non noté</span>;
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} size={16} className={i < value ? "fill-yellow-400 text-yellow-400" : "fill-slate-200 text-slate-200"} />
        ))}
      </div>
      <span className="text-sm font-black text-slate-900">{value}/5</span>
    </div>
  );
}

// ─────────────── PDF PREVIEW MODAL ───────────────
function PdfPreviewModal({ url, name, onClose }: { url: string; name: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[300] flex flex-col bg-black/95 animate-in fade-in duration-300">
      <div className="flex items-center justify-between px-6 py-4 bg-black border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-red-600 flex items-center justify-center shadow-lg shadow-red-900/20">
            <FileText size={18} className="text-white" />
          </div>
          <div>
            <p className="text-white font-black text-sm uppercase tracking-widest">{name}</p>
            <p className="text-white/40 text-[10px] uppercase font-bold">Document PDF </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a href={url} download target="_blank" rel="noreferrer"
            className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-white/10 hover:bg-white text-white hover:text-black text-xs font-black uppercase tracking-widest transition-all">
            <Download size={14} /> Télécharger
          </a>
          <button onClick={onClose} className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 transition-colors group">
            <X size={20} className="text-white group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>
      </div>
      <div className="flex-1 bg-white/5 p-4 md:p-8">
        <iframe src={`${url}#toolbar=0`} className="w-full h-full border-0 rounded-3xl shadow-2xl" title={name} />
      </div>
    </div>
  );
}

// ─────────────── VALIDATE MODAL (CONFORME V3) ───────────────
function ValidateModal({
  report, onClose, onConfirm, isValidating
}: {
  report: InterventionReport;
  onClose: () => void;
  onConfirm: (payload: ValidateReportPayload) => void;
  isValidating: boolean;
}) {
  const [rating, setRating] = useState<number>(0);
  const [hovered, setHovered] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [result, setResult] = useState<"RAS" | "ANOMALIE" | "RESOLU">("RAS");

  const results = [
    { id: "RAS", label: "RAS", desc: "Tout est conforme", icon: CheckCircle, color: "emerald" },
    { id: "ANOMALIE", label: "Anomalie", desc: "Besoin de réparation", icon: AlertTriangle, color: "red" },
    { id: "RESOLU", label: "Résolu", desc: "Problème réglé", icon: CheckCircle2, color: "blue" },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-white rounded-[40px] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">

        <div className="flex items-center justify-between px-10 py-8 border-b border-slate-50">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Valider l'intervention</h2>
            <p className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-widest">Rapport technique #{report.id}</p>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-slate-50 rounded-2xl transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="px-10 py-8 space-y-10 overflow-y-auto max-h-[70vh]">

          {/* Étape 1 : Le Résultat (CRITIQUE V3) */}
          {/* <div className="space-y-4">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] block">
              1. Résultat de l'intervention <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {results.map((res) => {
                const Icon = res.icon;
                const active = result === res.id;
                return (
                  <button
                    key={res.id}
                    onClick={() => setResult(res.id as any)}
                    className={`flex flex-col items-center gap-3 p-5 rounded-3xl border-2 transition-all duration-300 text-center
                      ${active
                        ? `bg-${res.color}-50 border-${res.color}-500 shadow-lg shadow-${res.color}-100`
                        : "bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50"}`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center 
                      ${active ? `bg-${res.color}-500 text-white` : "bg-slate-50 text-slate-400"}`}>
                      <Icon size={24} />
                    </div>
                    <div>
                      <p className={`text-sm font-black uppercase tracking-widest ${active ? `text-${res.color}-700` : "text-slate-900"}`}>{res.label}</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">{res.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div> */}

          {/* Étape 2 : La Note */}
          <div className="space-y-4">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] block">
              2. Note de satisfaction
            </label>
            <div className="flex gap-3 justify-center py-4 bg-slate-50/50 rounded-3xl border border-slate-50">
              {Array.from({ length: 5 }, (_, i) => {
                const val = i + 1;
                const active = val <= (hovered || rating);
                return (
                  <button key={i}
                    onMouseEnter={() => setHovered(val)}
                    onMouseLeave={() => setHovered(0)}
                    onClick={() => setRating(rating === val ? 0 : val)}
                    className={`transition-all duration-300 transform active:scale-90 ${active ? "scale-110" : "scale-100"}`}>
                    <Star size={40} className={`transition-colors duration-300 ${active ? "fill-yellow-400 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.4)]" : "fill-slate-200 text-slate-200"}`} />
                  </button>
                );
              })}
            </div>
            {rating > 0 && <p className="text-center text-sm font-black text-slate-900 italic">"{rating === 5 ? "Excellent !" : rating === 1 ? "Très déçu" : "Satisfaisant"}"</p>}
          </div>

          {/* Étape 3 : Commentaire */}
          <div className="space-y-4">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] block">
              3. Commentaire de validation
            </label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={3}
              placeholder="Ex: Travaux bien exécutés, site laissé propre..."
              className="w-full px-6 py-5 rounded-3xl border border-slate-100 text-sm text-slate-900 placeholder-slate-300 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all bg-slate-50/20"
            />
          </div>
        </div>

        <div className="px-10 py-8 border-t border-slate-50 flex gap-4 bg-slate-50/30">
          <button onClick={onClose} disabled={isValidating} className="flex-1 py-4 rounded-2xl border border-slate-200 text-slate-600 text-sm font-black uppercase tracking-widest hover:bg-white transition-all disabled:opacity-50">
            Annuler
          </button>
          <button
            disabled={!result || isValidating}
            onClick={() => {
              if (result) {
                onConfirm({
                  result: result as any,
                  rating: rating || undefined,
                  comment: comment || undefined
                });
              }
            }}
            className="flex-3 flex items-center justify-center gap-3 py-4 px-10 rounded-2xl bg-slate-900 text-white text-sm font-black uppercase tracking-[0.2em] hover:bg-black hover:shadow-xl hover:shadow-slate-900/10 transition-all disabled:opacity-30 disabled:grayscale"
          >
            {isValidating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Traitement...
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                Finaliser & Valider
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────── PAGE DETAIL ───────────────
export default function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const reportId = parseInt(resolvedParams.id);

  const {
    report, isLoading, isValidating, error, flash,
    validateReport, getAttachmentUrl
  } = useReport(reportId);

  const [pdfPreview, setPdfPreview] = useState<{ url: string; name: string } | null>(null);
  const [showValidate, setShowValidate] = useState(false);

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <div className="flex flex-col flex-1 overflow-hidden">
          <Navbar />
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Récupération des données techniques...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <div className="flex flex-col flex-1 overflow-hidden">
          <Navbar />
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-6">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle size={40} className="text-red-500" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-black text-slate-900 uppercase">Erreur de chargement</h1>
              <p className="text-slate-500 font-medium max-w-md">{error || "Ce rapport est introuvable ou vous n'avez pas les droits pour y accéder."}</p>
            </div>
            <Link href="/manager/rapports" className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-black transition-all">
              Retour à la liste
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isValidated = report.status === "validated";
  
  // Récupération robuste des pièces jointes (certains endpoints renvoient rapport_attachments)
  const allAttachments = [
    ...(report.attachments ?? []),
    ...((report as any).rapport_attachments ?? []),
    ...((report as any).ticket_attachments ?? [])
  ];

  // Filtrage intelligent par type ou extension
  const pdfs = allAttachments.filter(a => 
    a.file_type === "document" || 
    a.file_type === "pdf" ||
    (a.file_path && a.file_path.toLowerCase().endsWith(".pdf"))
  );

  const photos = allAttachments.filter(a => 
    a.file_type === "photo" || 
    a.file_type === "image" ||
    (a.file_path && /\.(jpg|jpeg|png|gif|webp)$/i.test(a.file_path))
  );

  const providerName = report.provider?.company_name ?? report.provider?.name ?? "-";
  const siteName = report.site?.nom ?? report.site?.name ?? "-";

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans tracking-tight">
      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar />
        <main className="mt-20 p-8 space-y-8 overflow-y-auto h-[calc(100vh-80px)]">

          {flash && (
            <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[100] px-8 py-4 rounded-[24px] shadow-2xl text-sm font-black border flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 ${flash.type === "success"
              ? "bg-white text-emerald-700 border-emerald-100 shadow-emerald-500/10"
              : "bg-white text-red-600 border-red-100 shadow-red-500/10"
              }`}>
              {flash.type === "success" ? <CheckCircle size={18} className="text-emerald-500" /> : <AlertTriangle size={18} className="text-red-500" />}
              {flash.message}
            </div>
          )}

          {/* Header Premium */}
          <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm flex flex-col lg:flex-row gap-10 items-start">

            <div className="flex-1 space-y-8">
              <Link
                href="/manager/rapports"
                className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors bg-slate-50 px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest"
              >
                <ChevronLeft size={16} /> Liste des rapports
              </Link>

              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                  <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                    Rapport {report.reference}
                  </h1>
                  <StatusBadge status={report.status} />
                </div>

                <div className="flex flex-wrap items-center gap-x-8 gap-y-4 pt-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                      <MapPin size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Localisation</p>
                      <p className="font-black text-slate-900 uppercase tracking-tight">{siteName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                      <Wrench size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Intervention</p>
                      <p className="font-black text-slate-900 uppercase tracking-tight">{report.ticket?.subject || "Technique"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full lg:w-auto flex flex-col gap-4">
              <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100 min-w-[320px] space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-white/50 p-3 rounded-2xl border border-white">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</span>
                    <TypeBadge type={report.intervention_type} />
                  </div>
                  <div className="flex justify-between items-center bg-white/50 p-3 rounded-2xl border border-white">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Résultat</span>
                    <ResultBadge result={report.result} />
                  </div>
                  <div className="flex justify-between items-center bg-white/50 p-3 rounded-2xl border border-white">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Déposé le</span>
                    <span className="text-sm font-black text-slate-900 uppercase">{formatDate(report.created_at)}</span>
                  </div>
                </div>

                {isValidated && (
                  <div className="pt-4 border-t border-slate-200/50 space-y-4 animate-in slide-in-from-bottom-2 duration-500">
                    <div className="flex justify-between items-center bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100">
                      <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Validation</span>
                      <span className="text-[11px] font-black text-emerald-700 uppercase">{formatDate(report.validated_at)}</span>
                    </div>
                    <div className="flex justify-between items-center bg-white p-3 rounded-2xl border border-slate-100">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Notation</span>
                      <StarRatingDisplay value={report.rating} />
                    </div>
                  </div>
                )}
              </div>

              {!isValidated && (
                <button
                  onClick={() => setShowValidate(true)}
                  className="w-full flex items-center justify-center gap-3 bg-slate-900 text-white py-5 px-8 rounded-[24px] font-black text-sm uppercase tracking-[0.2em] hover:bg-black hover:shadow-2xl hover:shadow-slate-900/20 active:scale-95 transition-all"
                >
                  <CheckCircle2 size={18} /> Valider le rapport
                </button>
              )}

              {isValidated && report.status === "pending" && (
                <div className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl text-[11px] font-black uppercase text-center border border-emerald-100">
                  En attente de traitement final
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            {/* Colonne Gauche : Détails techniques */}
            <div className="lg:col-span-8 space-y-8">

              {/* Descriptifs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white"><Wrench size={16} /></div>
                    <label className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Travaux effectués</label>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed font-medium bg-slate-50/50 p-6 rounded-2xl border border-slate-50">
                    <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: report.action_taken || "Aucune description détaillée fournie." }} />
                  </p>
                </div>

                <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-red-600 flex items-center justify-center text-white"><AlertTriangle size={16} /></div>
                    <label className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Observations / Anomalies</label>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed font-medium bg-slate-50/50 p-6 rounded-2xl border border-slate-50 italic">
                    {report.findings || "Aucune observation particulière signalée."}
                  </p>
                </div>
              </div>

              {/* Photos Panel */}
              <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg"><Eye size={20} /></div>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Galerie Photo</h3>
                  </div>
                  <span className="px-4 py-1.5 bg-slate-50 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest">{photos.length} image{photos.length > 1 ? "s" : ""}</span>
                </div>

                {photos.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {photos.map(att => {
                      const url = getAttachmentUrl(att.file_path);
                      return (
                        <a key={att.id} href={url} target="_blank" rel="noreferrer"
                          className="group relative aspect-square rounded-3xl overflow-hidden border border-slate-100 hover:shadow-xl transition-all duration-500">
                          <img src={url} alt="Preuve d'intervention" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <Eye className="text-white" size={24} />
                          </div>
                        </a>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200 gap-4">
                    <Eye size={40} className="text-slate-200" />
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Aucune photo jointe</p>
                  </div>
                )}
              </div>
            </div>

            {/* Colonne Droite : Documents & Infos Complémentaires */}
            <div className="lg:col-span-4 space-y-8">

              {/* Documents justificatifs */}
              <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                  <FileText size={16} className="text-red-600" /> Documents (PDF)
                </h3>

                {pdfs.length > 0 ? (
                  <div className="space-y-3">
                    {pdfs.map(att => {
                      const url = getAttachmentUrl(att.file_path);
                      const name = att.file_path.split("/").pop() ?? "document.pdf";
                      return (
                        <div key={att.id} className="group flex items-center gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-900 transition-all duration-300">
                          <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors">
                            <FileText size={20} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-slate-900 truncate uppercase tracking-tight">{name}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Document PDF</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => setPdfPreview({ url, name })} className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-900 hover:text-white transition-all">
                              <Eye size={14} />
                            </button>
                            <a href={url} download target="_blank" rel="noreferrer" className="p-2.5 rounded-xl bg-slate-900 text-white hover:bg-black transition-colors shadow-sm">
                              <Download size={14} />
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-10 text-center border border-dashed border-slate-200 rounded-2xl">
                    <p className="text-[10px] font-black text-slate-300 uppercase italic">Aucun document joint</p>
                  </div>
                )}
              </div>

              {/* Prestataire & Timing */}
              <div className="bg-slate-900 p-8 rounded-[32px] text-white space-y-8 shadow-2xl shadow-slate-900/40">
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Prestataire</h3>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-xl font-black">
                      {providerName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-lg font-black uppercase tracking-tight leading-none mb-1">{providerName}</p>
                      <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest italic">{report.provider?.company_name ? "Société de maintenance" : "Technicien indépendant"}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-white/10">
                  <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Chronologie</h3>
                  <div className="space-y-6 relative overflow-hidden">
                    <div className="absolute left-[7px] top-2 bottom-2 w-px bg-white/10" />
                    {[
                      { label: "Début", val: report.start_date, active: true },
                      { label: "Fin", val: report.end_date, active: !!report.end_date },
                      { label: "Soumis", val: report.created_at, active: true },
                      { label: "Validé", val: report.validated_at, active: !!report.validated_at },
                    ].filter(x => x.val).map((step, i) => (
                      <div key={i} className="flex items-start gap-4 relative">
                        <div className={`w-3.5 h-3.5 rounded-full z-10 border-2 border-slate-900 ${step.active ? "bg-emerald-400" : "bg-white/20"}`} />
                        <div>
                          <p className="text-[10px] font-black uppercase text-white/40 leading-none mb-1">{step.label}</p>
                          <p className="text-xs font-bold text-white tracking-widest">{formatDate(step.val)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>

        </main>
      </div>

      {pdfPreview && <PdfPreviewModal url={pdfPreview.url} name={pdfPreview.name} onClose={() => setPdfPreview(null)} />}

      {showValidate && (
        <ValidateModal
          report={report}
          onClose={() => setShowValidate(false)}
          isValidating={isValidating}
          onConfirm={(payload) => {
            validateReport(payload).then(() => {
              setShowValidate(false);
            });
          }}
        />
      )}
    </div>
  );
}