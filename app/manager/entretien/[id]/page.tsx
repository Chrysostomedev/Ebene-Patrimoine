"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, CalendarDays, MapPin, User, ShieldCheck, 
  Clock, FileText, CheckCircle2, AlertTriangle, Star,
  Download, Eye, Wrench, ArrowUpRight
} from "lucide-react";

import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import AttachmentViewer from "@/components/AttachmentViewer";
import { ReportService } from "../../../../services/manager/report.service";
import { InterventionReport } from "../../../../types/manager.types";

const formatDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";

const STATUS_LABELS: Record<string, string> = {
  submitted: "Soumis",
  validated: "Validé",
  pending: "En attente",
  rejected: "Rejeté",
  draft: "Brouillon",
};

const STATUS_STYLES: Record<string, string> = {
  submitted: "bg-blue-50 text-blue-700 border-blue-100",
  validated: "bg-emerald-50 text-emerald-700 border-emerald-100",
  pending: "bg-amber-50 text-amber-700 border-amber-100",
  rejected: "bg-red-50 text-red-700 border-red-100",
};

export default function ManagerReportDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [report, setReport] = useState<InterventionReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        setLoading(true);
        const data = await ReportService.getReport(Number(id));
        setReport(data);
      } catch (err: any) {
        setError(err?.response?.data?.message || "Erreur lors du chargement du rapport");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <AlertTriangle size={48} className="text-red-400" />
          <p className="text-slate-600 font-bold">{error || "Rapport introuvable"}</p>
          <button onClick={() => router.back()} className="text-sm font-bold text-slate-900 underline underline-offset-4">
            Retourner à la liste
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="mt-20 p-8 max-w-7xl mx-auto w-full space-y-8">
        {/* Breadcrumb & Header */}
        <div className="space-y-4">
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition font-bold text-sm"
          >
            <ArrowLeft size={16} /> Retour aux entretiens
          </button>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <PageHeader 
              title={`Rapport #${report.reference || report.id}`}
              subtitle={`Entretien préventif réalisé le ${formatDate(report.start_date)}`}
            />
            <div className="flex items-center gap-3">
              <span className={`px-4 py-2 rounded-2xl border text-xs font-black uppercase tracking-widest ${STATUS_STYLES[report.status] || "bg-slate-50 text-slate-600"}`}>
                {STATUS_LABELS[report.status] || report.status}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-8">
            {/* General Description */}
            <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-50 pb-5">
                <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-white">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Observations de l'intervention</h3>
                  <p className="text-xs text-slate-400 font-medium italic">Rapport détaillé soumis par le prestataire</p>
                </div>
              </div>
              <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed font-medium">
                <div dangerouslySetInnerHTML={{ __html: report.description || "Aucune observation particulière n'a été notée pour cette intervention." }} />
              </div>
            </div>

            {/* Attachments Section */}
            <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm space-y-6 text-black">
              <div className="flex items-center gap-3 border-b border-slate-50 pb-5 ">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white">
                  <Eye size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Preuves & Documents</h3>
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">Photos et fichiers joints</p>
                </div>
              </div>
              <AttachmentViewer 
                attachments={report.attachments || []} 
                title="Pièces jointes du rapport"
              />
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-8">
            {/* Site & Provider Card */}
            <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm space-y-6">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Intervenants</h3>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-2xl bg-slate-50 text-slate-900 border border-slate-100">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Localisation</p>
                    <p className="text-sm font-bold text-slate-900">{report.site?.nom || report.site?.name || "N/A"}</p>
                    <p className="text-xs text-slate-500 font-medium">{report.site?.adresse || "-"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-2xl bg-slate-50 text-slate-900 border border-slate-100">
                    <User size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Prestataire</p>
                    <p className="text-sm font-bold text-slate-900">{report.provider?.company_name || report.provider?.name || "N/A"}</p>
                    <p className="text-xs text-slate-500 font-medium">{report.provider?.email}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-2xl bg-slate-50 text-slate-900 border border-slate-100">
                    <Wrench size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Type d'Actif</p>
                    <p className="text-sm font-bold text-slate-900">{report.asset?.designation || (report as any).company_asset?.designation || "Consommable / Divers"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Feedback / Evaluation if exists */}
            {report.rating && (
              <div className="bg-amber-50 rounded-[32px] p-8 border border-amber-100 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-400 flex items-center justify-center text-white">
                    <Star size={16} className="fill-white" />
                  </div>
                  <h3 className="text-sm font-black text-amber-800 uppercase tracking-widest">Évaluation du Manager</h3>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star 
                      key={s} 
                      size={20} 
                      className={s <= (report.rating || 0) ? "text-amber-400 fill-amber-400" : "text-amber-200"} 
                    />
                  ))}
                </div>
                {report.comment && (
                  <p className="text-sm text-amber-700 leading-relaxed italic font-medium">"{report.comment}"</p>
                )}
                <p className="text-[10px] text-amber-400 font-bold uppercase tracking-widest pt-2 border-t border-amber-100">
                  Validé le {formatDate(report.validated_at)}
                </p>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-slate-900 rounded-[32px] p-8 text-white space-y-6">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Actions rapides</h3>
              <div className="grid grid-cols-1 gap-3">
                <button className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-white/10 hover:bg-white text-white hover:text-slate-900 text-sm font-black transition group">
                  <Download size={16} /> Télécharger le PDF
                </button>
                <button 
                  onClick={() => router.push(`/manager/tickes/${report.ticket_id}`)}
                  className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-white/10 hover:bg-white text-white hover:text-slate-900 text-sm font-black transition group opacity-50 cursor-not-allowed"
                >
                  <ArrowUpRight size={16} className="group-hover:rotate-45 transition-transform" /> Voir le ticket lié
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
