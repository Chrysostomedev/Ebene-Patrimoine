"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronLeft, CheckCircle2, Clock, FileText,
  Eye, Download, Star, X, MapPin, Wrench,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import StatsCard from "@/components/StatsCard";

// ─────────────── MOCK TYPES & DATA ───────────────
type InterventionReport = {
  id: number;
  ticket_id: number;
  description?: string;
  status?: "pending" | "validated";s
  intervention_type?: "curatif" | "preventif";
  start_date?: string;
  end_date?: string;
  created_at?: string;
  validated_at?: string;
  rating?: number | null;
  manager_comment?: string | null;
  provider?: { company_name?: string; name?: string };
  site?: { nom?: string; name?: string };
  ticket?: { id?: number; subject?: string; type?: string; status?: string };
  attachments?: { id: number; file_type: "document" | "photo"; file_path: string }[];
};

// Données statiques simulant un rapport
const mockReport: InterventionReport = {
  id: 101,
  ticket_id: 55,
  status: "pending",
  intervention_type: "curatif",
  start_date: "2026-03-01",
  end_date: "2026-03-02",
  created_at: "2026-03-01",
  provider: { company_name: "ÉlecCorp" },
  site: { nom: "Site Alpha" },
  ticket: { id: 55, subject: "Panne générale", type: "curatif", status: "ouvert" },
  attachments: [
    { id: 1, file_type: "document", file_path: "/docs/rapport1.pdf" },
    { id: 2, file_type: "photo", file_path: "/images/photo1.jpg" },
  ],
};

// ─────────────── HELPERS ───────────────
const formatDate = (iso?: string | null): string => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

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

// ─────────────── PDF PREVIEW MODAL ───────────────
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

// ─────────────── VALIDATE MODAL SIMULÉ ───────────────
function ValidateModal({
  report, onClose, onConfirm,
}: {
  report: InterventionReport;
  onClose: () => void;
  onConfirm: (payload: { rating: number | null; comment: string | null }) => void;
}) {
  const [rating, setRating] = useState<number>(0);
  const [hovered, setHovered] = useState<number>(0);
  const [comment, setComment] = useState("");

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
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition">
            Annuler
          </button>
          <button onClick={() => { onConfirm({ rating: rating || null, comment: comment || null }); onClose(); }}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition">
            <CheckCircle2 size={15} /> Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────── PAGE DETAIL STATIQUE ───────────────
export default function ReportDetailPage() {
  const [report] = useState(mockReport);
  const [pdfPreview, setPdfPreview] = useState<{ url: string; name: string } | null>(null);
  const [showValidate, setShowValidate] = useState(false);
  const [flash, setFlash] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showFlash = (type: "success" | "error", message: string) => {
    setFlash({ type, message });
    setTimeout(() => setFlash(null), 5000);
  };

  const handleValidate = (payload: { rating: number | null; comment: string | null }) => {
    // Simule validation localement
    report.status = "validated";
    report.rating = payload.rating ?? 5;
    report.manager_comment = payload.comment ?? "Rapport validé (simulé).";
    report.validated_at = new Date().toISOString();
    showFlash("success", "Rapport validé avec succès.");
  };

  const isValidated = report.status === "validated";
  const pdfs = (report.attachments ?? []).filter(a => a.file_type === "document");
  const photos = (report.attachments ?? []).filter(a => a.file_type === "photo");
  const providerName = report.provider?.company_name ?? report.provider?.name ?? "—";
  const siteName = report.site?.nom ?? report.site?.name ?? "—";

  const kpis = [
    { label: "Prestataire", value: providerName, delta: "", trend: "up" as const },
    { label: "Site", value: siteName, delta: "", trend: "up" as const },
    { label: "Pièces jointes", value: report.attachments?.length ?? 0, delta: "", trend: "up" as const },
    { label: "Note", value: report.rating ? `${report.rating}/5` : "N/A", delta: "", trend: "up" as const },
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
                    Rapport #{report.id}
                  </h1>
                  <StatusBadge status={report.status} />
                  <TypeBadge type={report.intervention_type} />
                </div>
                <div className="flex items-center gap-2 text-slate-400 mt-1">
                  <MapPin size={18} />
                  <span className="font-medium text-lg">{siteName}</span>
                </div>
                {report.ticket?.subject && (
                  <div className="flex items-center gap-2 text-slate-500 mt-1">
                    <Wrench size={15} />
                    <span className="text-sm font-medium">{report.ticket.subject}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="bg-slate-50/50 p-6 rounded-[24px] border border-slate-100 flex flex-col gap-4 min-w-[300px]">
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Créé le</span>
                    <span className="font-bold text-slate-900">{formatDate(report.created_at)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Début</span>
                    <span className="font-bold text-slate-900">{formatDate(report.start_date)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Fin</span>
                    <span className="font-bold text-slate-900">{formatDate(report.end_date)}</span>
                  </div>
                  {isValidated && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-medium">Validé le</span>
                      <span className="font-bold text-emerald-700">{formatDate(report.validated_at)}</span>
                    </div>
                  )}
                </div>
                {isValidated && report.rating && <StarRatingDisplay value={report.rating} />}
              </div>

              {!isValidated && (
                <button
                  onClick={() => setShowValidate(true)}
                  className="flex items-center justify-center gap-2 bg-slate-900 text-white py-3 px-6 rounded-2xl font-bold hover:bg-black transition-colors"
                >
                  <CheckCircle2 size={16} /> Valider le rapport
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis.map((k, i) => <StatsCard key={i} {...k} />)}
          </div>
        </main>
      </div>

      {pdfPreview && <PdfPreviewModal url={pdfPreview.url} name={pdfPreview.name} onClose={() => setPdfPreview(null)} />}
      {showValidate && <ValidateModal report={report} onClose={() => setShowValidate(false)} onConfirm={handleValidate} />}
    </div>
  );
}