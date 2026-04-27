"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import StatsCard from "@/components/StatsCard";
import {
  ChevronLeft, MapPin, Wrench, Tag, Clock, CheckCircle2,
  AlertTriangle, FileText, Eye, Shield,
  User, Building2, Phone, Mail, Calendar, Plus
} from "lucide-react";
import { providerPlanningService, Planning } from "../../../../services/provider/providerPlanningService";
import { providerReportService, InterventionReport } from "../../../../services/provider/providerReportService";
import { formatDate } from "@/lib/utils";
import ReusableForm, { FieldConfig } from "@/components/ReusableForm";
import { useToast } from "../../../../contexts/ToastContext";

const STATUS_STYLE: Record<string, string> = {
  planifie: "bg-slate-100  border-slate-300  text-slate-700",
  en_cours: "bg-blue-50    border-blue-400   text-blue-700",
  en_retard: "bg-red-50     border-red-400    text-red-700",
  realise: "bg-emerald-50 border-emerald-400 text-emerald-700",
};

const STATUS_LABEL: Record<string, string> = {
  planifie: "Planitié",
  en_cours: "En cours",
  en_retard: "En retard",
  realise: "Réalisé",
};

export default function ProviderPlanningDetailPage() {
  const params = useParams<{ id: string }>();
  const planningId = Number(params.id);
  const router = useRouter();
  const { toast } = useToast();

  const [planning, setPlanning] = useState<Planning | null>(null);
  const [reports, setReports] = useState<InterventionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isReportFormOpen, setIsReportFormOpen] = useState(false);
  const [isReportSubmitting, setIsReportSubmitting] = useState(false);

  const loadData = async () => {
    if (!planningId) return;
    setLoading(true);
    setError("");

    try {
      const [planningData, reportsData] = await Promise.all([
        providerPlanningService.getPlanningById(planningId),
        providerReportService.getReports({ planning_id: planningId })
      ]);
      setPlanning(planningData);
      setReports(reportsData);
    } catch (e: any) {
      console.error("[ProviderPlanningDetail] Error:", e);
      setError(e?.response?.data?.message ?? "Impossible de charger les détails de l'intervention.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [planningId]);

  const newReportFields: FieldConfig[] = [
    // {
    //   name: "result", label: "Résultat", type: "select", required: true,
    //   options: [
    //     { label: "RAS - Rien à signaler", value: "RAS" },
    //     { label: "Anomalie détectée", value: "anomalie" },
    //   ],
    //   gridSpan: 2,
    // },
    // { name: "start_date", label: "Début intervention", type: "date", required: true },
    // { name: "end_date", label: "Fin intervention", type: "date", required: true },
    { name: "findings", label: "Observations / Constatations", type: "rich-text", required: true, gridSpan: 2 },
    { name: "action_taken", label: "Actions menées", type: "rich-text", required: true, gridSpan: 2 },
    { name: "attachments", label: "Photos justificatives", type: "image-upload", required: false, maxImages: 5, gridSpan: 2 },
  ];

  const handleReportSubmit = async (values: any) => {
    if (!planning) return;
    setIsReportSubmitting(true);
    try {
      await providerReportService.createReport({
        planning_id: planning.id,
        intervention_type: "preventif",
        result: values.result,
        findings: values.findings ?? "",
        action_taken: values.action_taken,
        start_date: values.start_date,
        end_date: values.end_date,
        anomaly_detected: values.result === "anomalie",
        attachments: values.attachments as File[] | undefined,
      });
      setIsReportFormOpen(false);
      toast.success("Rapport soumis avec succès.");
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Erreur lors de la soumission.");
    } finally {
      setIsReportSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <main className="mt-24 p-8 space-y-8 animate-pulse max-w-7xl mx-auto w-full">
          <div className="h-10 w-32 bg-slate-200 rounded-xl" />
          <div className="h-44 bg-white rounded-3xl border border-slate-100 shadow-sm" />
        </main>
      </div>
    );
  }

  if (error || !planning) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <main className="mt-24 p-8 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
            <AlertCircle size={40} className="text-red-500" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">Impossible d'accéder à ce planning</h1>
          <p className="text-slate-500 mb-8 max-w-md">{error || "Il se peut que ce planning ne vous soit plus assigné."}</p>
          <button onClick={() => router.back()} className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black transition">
            Retour
          </button>
        </main>
      </div>
    );
  }

  const kpis = [
    { label: "Date prévue", value: formatDate(planning.date_debut), icon: <Calendar size={18} className="text-blue-500" /> },
    { label: "Fin prévue", value: formatDate(planning.date_fin), icon: <Clock size={18} className="text-orange-500" /> },
    { label: "Client", value: planning.site?.nom || "—", icon: <Building2 size={18} className="text-indigo-500" /> },
    { label: "Statut", value: STATUS_LABEL[planning.status] ?? planning.status, icon: <Shield size={18} className="text-slate-500" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mt-28 p-10 lg:p-12 space-y-12 max-w-7xl mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-500 hover:text-black transition-all bg-white px-5 py-2.5 rounded-2xl border border-slate-100 shadow-sm w-fit text-sm font-bold"
        >
          <ChevronLeft size={16} />
          Retour
        </button>

        {/* Header */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10 relative overflow-hidden flex flex-col md:flex-row justify-between gap-10">
          <div className="space-y-4 flex-1">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-lg">
                {planning.codification}
              </span>
              <span className={`inline-flex items-center gap-2 px-4 py-1 rounded-full text-[10px] font-black border uppercase tracking-widest ${STATUS_STYLE[planning.status] ?? "bg-slate-100 border-slate-300 text-slate-600"}`}>
                {STATUS_LABEL[planning.status] ?? planning.status}
              </span>
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Intervention Préventive</h1>
            <p className="text-slate-500 font-semibold flex items-center gap-2">
              <MapPin size={16} className="text-blue-500" /> {planning.site?.nom || "Site non précisé"}
            </p>
          </div>

          <div className="flex flex-col gap-3 min-w-[240px]">
            {planning.status !== 'realise' && (
              <button
                onClick={() => setIsReportFormOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-slate-900 text-white text-sm font-black hover:bg-black transition-all shadow-xl active:scale-95"
              >
                <Plus size={18} /> Rédiger le rapport
              </button>
            )}
            <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Contact Client</p>
              <p className="text-sm font-black text-slate-900">{planning.responsable_name || "N/A"}</p>
              <p className="text-xs font-bold text-slate-500 mt-0.5">{planning.responsable_phone || "Aucun numéro"}</p>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpis.map((k, i) => (
            <div key={i} className="bg-white p-8 rounded-[1.8rem] border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0">
                {k.icon}
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{k.label}</p>
                <p className="text-base font-black text-slate-900">{k.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <FileText size={14} /> Description de la mission
              </h3>
              {planning.description ? (
                <div className="text-slate-600 font-semibold leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: planning.description }} />
              ) : (
                <p className="text-slate-400 italic font-bold">Aucune instruction spécifique.</p>
              )}
            </div>

            {/* Reports */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Shield size={14} /> Rapports soumis ({reports.length})
                </h3>
              </div>
              {reports.length > 0 ? (
                <div className="space-y-4">
                  {reports.map((report) => (
                    <div key={report.id} className="flex items-center justify-between p-5 rounded-2xl border border-slate-100 bg-slate-50/50">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-emerald-500">
                          <CheckCircle2 size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900">Rapport #{report.id}</p>
                          <p className="text-[10px] font-bold text-slate-400">{formatDate(report.created_at)}</p>
                        </div>
                      </div>
                      <Link
                        href={`/provider/rapports/${report.id}`}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                      >
                        Voir
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <FileText size={32} className="text-slate-200 mb-3" />
                  <p className="text-sm font-black text-slate-400">Aucun rapport pour le moment.</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 underline decoration-blue-500 decoration-2 underline-offset-4">
                Informations Site
              </h3>
              <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Nom du client</p>
                  <p className="text-sm font-black text-slate-900">{planning.site?.nom || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Localisation</p>
                  <p className="text-xs font-bold text-slate-500 leading-relaxed italic">{planning.site?.localisation || "—"}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
              <h3 className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-6">Assistance</h3>
              <p className="text-xs font-bold text-white/70 mb-6 leading-relaxed">
                Un problème sur site ? Contactez directement le responsable.
              </p>
              {planning.responsable_phone && (
                <a href={`tel:${planning.responsable_phone}`} className="flex items-center justify-center gap-3 w-full py-4 bg-white/10 rounded-2xl border border-white/20 hover:bg-white hover:text-slate-900 transition-all font-black text-sm mb-4 tracking-tighter">
                  <Phone size={16} /> Appeler
                </a>
              )}
            </div>
          </div>
        </div>
      </main>

      <ReusableForm
        isOpen={isReportFormOpen}
        onClose={() => setIsReportFormOpen(false)}
        title="Nouveau Rapport préventif"
        subtitle="Renseignez les détails de votre intervention"
        fields={newReportFields}
        submitLabel="Soumettre le rapport"
        isLoading={isReportSubmitting}
        onSubmit={handleReportSubmit}
      />
    </div>
  );
}
