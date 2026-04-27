"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import StatsCard from "@/components/StatsCard";
import {
  ChevronLeft, MapPin, Wrench, Tag, Clock, CheckCircle2,
  AlertTriangle, FileText, Eye, AlertCircle, Shield,
  User, Building2, Phone, Mail, Calendar
} from "lucide-react";
import { PlanningService } from "../../../../services/manager/planning.service";
import { ReportService } from "../../../../services/manager/report.service";
import { Planning, InterventionReport } from "../../../../types/manager.types";
import { formatDate } from "@/lib/utils";

const STATUS_STYLE: Record<string, string> = {
  "PLANIFIÉ": "bg-slate-100  border-slate-300  text-slate-700",
  "planifie": "bg-slate-100  border-slate-300  text-slate-700",
  "EN_COURS": "bg-blue-50    border-blue-400   text-blue-700",
  "en_cours": "bg-blue-50    border-blue-400   text-blue-700",
  "EN_RETARD": "bg-red-50     border-red-400    text-red-700",
  "en_retard": "bg-red-50     border-red-400    text-red-700",
  "RÉALISÉ": "bg-emerald-50 border-emerald-400 text-emerald-700",
  "realise": "bg-emerald-50 border-emerald-400 text-emerald-700",
};

const STATUS_LABEL: Record<string, string> = {
  "PLANIFIÉ": "Planifié",
  "planifie": "Planifié",
  "EN_COURS": "En cours",
  "en_cours": "En cours",
  "EN_RETARD": "En retard",
  "en_retard": "En retard",
  "RÉALISÉ": "Réalisé",
  "realise": "Réalisé",
};

export default function ManagerPlanningDetailPage() {
  const params = useParams<{ id: string }>();
  const planningId = Number(params.id);
  const router = useRouter();

  const [planning, setPlanning] = useState<Planning | null>(null);
  const [reports, setReports] = useState<InterventionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    if (!planningId) return;
    setLoading(true);
    setError("");

    try {
      const [planningData, reportsData] = await Promise.all([
        PlanningService.getPlanning(planningId),
        ReportService.getReports({ planning_id: planningId })
      ]);
      setPlanning(planningData);
      setReports(reportsData.items);
    } catch (e: any) {
      console.error("[ManagerPlanningDetail] Error:", e);
      setError(e?.response?.data?.message ?? "Impossible de charger les détails du planning.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [planningId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <main className="mt-24 p-8 space-y-8 animate-pulse max-w-7xl mx-auto w-full">
          <div className="h-10 w-32 bg-slate-200 rounded-xl" />
          <div className="h-44 bg-white rounded-3xl border border-slate-100 shadow-sm" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-white rounded-3xl border border-slate-100 shadow-sm" />)}
          </div>
        </main>
      </div>
    );
  }

  if (error || !planning) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <main className="mt-24 p-8">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
              <AlertCircle size={40} className="text-red-500" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 mb-2">Accès restreint</h1>
            <p className="text-slate-500 mb-8 max-w-md">{error || "Ce planning est inaccessible."}</p>
            <button onClick={() => router.back()} className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black transition shadow-lg">
              Retour au calendrier
            </button>
          </div>
        </main>
      </div>
    );
  }

  const kpis = [
    { label: "Date de début", value: formatDate(planning.date_debut), icon: <Calendar size={18} className="text-blue-500" /> },
    { label: "Date de fin", value: formatDate(planning.date_fin), icon: <Clock size={18} className="text-orange-500" /> },
    { label: "Rapports", value: reports.length, icon: <FileText size={18} className="text-emerald-500" /> },
    { label: "Statut", value: STATUS_LABEL[planning.status] ?? planning.status, icon: <Shield size={18} className="text-slate-500" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mt-28 p-10 lg:p-12 space-y-12 max-w-7xl mx-auto">
        {/* Navigation */}
        <button 
          onClick={() => router.back()} 
          className="group flex items-center gap-2 text-slate-500 hover:text-black transition-all bg-white px-5 py-2.5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md w-fit text-sm font-bold"
        >
          <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
          Retour
        </button>

        {/* Header Section */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10 relative overflow-hidden">
          {/* Subtle background element */}
          <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-slate-50 rounded-full opacity-50 blur-3xl" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-10">
            <div className="space-y-6 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] font-mono bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">
                  {planning.codification || `ID-${planning.id}`}
                </span>
                <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black border uppercase tracking-widest ${STATUS_STYLE[planning.status] ?? "bg-slate-100 border-slate-300 text-slate-600"}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${planning.status === 'realise' ? 'bg-emerald-500' : 'bg-current'}`} />
                  {STATUS_LABEL[planning.status] ?? planning.status}
                </span>
              </div>
              
              <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight max-w-3xl">
                Planning d'intervention préventive
              </h1>
              
              <div className="flex items-center gap-4 flex-wrap text-sm text-slate-500 font-bold">
                {planning.site && (
                  <span className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-slate-600">
                    <MapPin size={16} className="text-blue-500" /> {planning.site.nom}
                  </span>
                )}
                <span className="w-1.5 h-1.5 rounded-full bg-slate-200 hidden md:block" />
                {planning.provider && (
                  <span className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-slate-600">
                    <Building2 size={16} className="text-orange-500" /> {planning.provider.company_name || planning.provider.name}
                  </span>
                )}
              </div>
            </div>
            
            {/* Contextual Info */}
            <div className="bg-slate-50 rounded-3xl border border-slate-100 p-6 space-y-3 min-w-[240px]">
              <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-slate-400">
                <span>Dernière mise à jour</span>
              </div>
              <p className="text-sm font-black text-slate-900">{formatDate(new Date().toISOString())}</p>
            </div>
          </div>
        </div>

        {/* KPIs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpis.map((k, i) => (
            <div key={i} className="bg-white p-8 rounded-[1.8rem] border border-slate-100 shadow-sm flex flex-col gap-4 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center -mt-2 -ml-1">
                {k.icon}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2">{k.label}</p>
                <p className="text-xl font-black text-slate-900 tracking-tight">{k.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Layout Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-8">
            {/* Description Card */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <FileText size={20} />
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Détails de l'opération</h3>
              </div>
              
              {planning.description ? (
                <div className="text-slate-600 leading-relaxed font-semibold text-base" 
                     dangerouslySetInnerHTML={{ __html: planning.description }} />
              ) : (
                <div className="flex flex-col items-center justify-center py-16 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                  <AlertTriangle size={36} className="text-slate-200 mb-4" />
                  <p className="text-slate-400 font-bold">Aucun détail supplémentaire.</p>
                </div>
              )}
            </div>

            {/* Reports List */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10">
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <Shield size={20} />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Rapports d'intervention ({reports.length})</h3>
                </div>
              </div>

              {reports.length > 0 ? (
                <div className="space-y-4">
                  {reports.map((report) => (
                    <div key={report.id} className="group flex flex-col md:flex-row md:items-center justify-between p-6 rounded-[1.8rem] border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-blue-100 hover:shadow-xl transition-all duration-300">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-blue-500 group-hover:bg-blue-50 group-hover:border-blue-100 transition-all shadow-sm">
                          <CheckCircle2 size={24} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900">Rapport #{report.id}</p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5 bg-white px-2 py-0.5 rounded-lg border border-slate-50">
                              <Calendar size={12} /> {formatDate(report.created_at)}
                            </span>
                            <span className={`text-[9px] font-black px-3 py-1 rounded-full border uppercase tracking-widest ${
                              report.status === "validated" ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-amber-50 border-amber-100 text-amber-600"
                            }`}>
                              {report.status === "validated" ? "Validé" : "En attente"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 md:mt-0">
                        <Link 
                          href={`/manager/rapports/details/${report.id}`}
                          className="inline-flex items-center gap-3 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-[11px] font-black text-slate-800 uppercase tracking-widest hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-sm active:scale-95"
                        >
                          <Eye size={14} /> Consulter
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200/80">
                  <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-sm mb-6">
                    <FileText size={40} className="text-slate-100" />
                  </div>
                  <p className="text-slate-400 font-black text-lg">Aucun rapport disponible</p>
                  <p className="text-slate-300 text-xs font-bold mt-2 uppercase tracking-widest">En attente d'intervention prestataire</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-8">
            {/* Sidebar Cards - Site & Contacts */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8">
              <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mb-10">Point de contact</h3>
              
              <div className="space-y-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
                    <User size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Responsable</p>
                    <p className="text-base font-black text-slate-900 leading-tight">{planning.responsable_name || "N/A"}</p>
                    <div className="flex items-center gap-2 mt-2 text-slate-500">
                      <Phone size={14} />
                      <span className="text-xs font-bold">{planning.responsable_phone || "A fixer"}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-50">
                   <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shrink-0 shadow-xl">
                      <Building2 size={24} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Prestataire</p>
                      <p className="text-base font-black text-slate-900 leading-tight truncate">{planning.provider?.company_name || planning.provider?.name || "N/A"}</p>
                      <div className="flex flex-col gap-2 mt-3">
                        <div className="flex items-center gap-2 text-slate-400">
                          <Mail size={12} />
                          <span className="text-[11px] font-bold truncate">{planning.provider?.email || "N/A"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-400">
                          <Phone size={12} />
                          <span className="text-[11px] font-bold">{planning.provider?.phone || "N/A"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-50">
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                       <MapPin size={10} /> Localisation Site
                    </h4>
                    <p className="text-xs font-black text-slate-700 leading-relaxed italic">{planning.site?.localisation || "Pas de coordonnées."}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Quick Actions (Manager can't edit planning, but can create a support ticket related to it?) */}
            <div className="p-1">
              <button 
                onClick={() => router.push('/manager/tickets')}
                className="w-full flex items-center justify-between p-6 rounded-[2rem] bg-slate-50 border border-slate-100 group hover:bg-slate-900 transition-all duration-300 shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 group-hover:text-slate-900 group-hover:scale-110 transition-all">
                    <Tag size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-300">Besoin d'aide ?</p>
                    <p className="text-sm font-black text-slate-900 group-hover:text-white">Signaler un souci</p>
                  </div>
                </div>
                <ChevronLeft size={16} className="text-slate-300 rotate-180 group-hover:text-white transition-colors" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
