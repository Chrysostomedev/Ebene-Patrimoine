"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import StatsCard from "@/components/StatsCard";
import {
  ChevronLeft, MapPin, Wrench, Tag, Clock, CheckCircle2,
  AlertTriangle, FileText, Eye, X, Calendar, Shield, AlertCircle, Pencil,
  User, Building2, Phone, Mail
} from "lucide-react";
import * as PlanningService from "../../../../services/admin/planningService";
import { ReportService, InterventionReport } from "../../../../services/admin/report.service";
import { formatDate } from "@/lib/utils";

// ─── Statuts Planning ────────────────────────────────────────────────────────
const STATUS_STYLE: Record<string, string> = {
  "PLANIFIÉ": "bg-slate-100  border-slate-300  text-slate-700",
  "EN_COURS": "bg-blue-50    border-blue-400   text-blue-700",
  "EN_RETARD": "bg-red-50     border-red-400    text-red-700",
  "RÉALISÉ": "bg-emerald-50 border-emerald-400 text-emerald-700",
};

const STATUS_LABEL: Record<string, string> = {
  "PLANIFIÉ": "Planifié",
  "EN_COURS": "En cours",
  "EN_RETARD": "En retard",
  "RÉALISÉ": "Réalisé",
};

export default function AdminPlanningDetailPage() {
  const params = useParams<{ id: string }>();
  const planningId = Number(params.id);
  const router = useRouter();

  const [planning, setPlanning] = useState<PlanningService.Planning | null>(null);
  const [reports, setReports] = useState<InterventionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    if (!planningId) return;
    setLoading(true);
    setError("");

    try {
      const [planningData, reportsData] = await Promise.all([
        PlanningService.fetchPlanningById(planningId),
        ReportService.getReports({ planning_id: planningId })
      ]);
      setPlanning(planningData);
      setReports(reportsData);
    } catch (e: any) {
      console.error("[AdminPlanningDetail] Error:", e);
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
        <main className="mt-24 p-8 space-y-8 animate-pulse">
          <div className="h-10 w-32 bg-slate-200 rounded-xl" />
          <div className="h-40 bg-white rounded-3xl border border-slate-100 shadow-sm" />
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
            <h1 className="text-2xl font-black text-slate-900 mb-2">Oups ! Une erreur est survenue</h1>
            <p className="text-slate-500 mb-8 max-w-md">{error || "Ce planning est introuvable."}</p>
            <button onClick={() => router.back()} className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black transition shadow-lg">
              Retourner au planning
            </button>
          </div>
        </main>
      </div>
    );
  }

  const kpis = [
    { label: "Date de début", value: formatDate(planning.date_debut), icon: <Calendar size={18} className="text-blue-500" /> },
    { label: "Date de fin", value: formatDate(planning.date_fin), icon: <Clock size={18} className="text-amber-500" /> },
    { label: "Rapports préventifs", value: reports.length, icon: <FileText size={18} className="text-emerald-500" /> },
    { label: "Statut", value: STATUS_LABEL[planning.status] ?? planning.status, icon: <Shield size={18} className="text-slate-500" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mt-28 p-10 lg:p-12 space-y-12 max-w-7xl mx-auto">
        {/* Navigation */}
        <button 
          onClick={() => router.back()} 
          className="group flex items-center gap-2 text-slate-500 hover:text-black transition-all bg-white px-4 py-2.5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md w-fit text-sm font-bold"
        >
          <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
          Retour
        </button>

        {/* Header Section */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 opacity-50" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-8">
            <div className="space-y-4 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] font-mono">
                  {planning.codification || `PLANNING-${planning.id}`}
                </span>
                <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${STATUS_STYLE[planning.status] ?? "bg-slate-100 border-slate-300 text-slate-600"}`}>
                  <Shield size={10} />
                  {STATUS_LABEL[planning.status] ?? planning.status}
                </span>
              </div>
              
              <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">
                Détails du planning préventif
              </h1>
              
              <div className="flex items-center gap-6 flex-wrap text-sm text-slate-500 font-medium">
                {planning.site && (
                  <span className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                    <MapPin size={14} className="text-slate-400" /> {planning.site.nom}
                  </span>
                )}
                {planning.provider && (
                  <span className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                    <User size={14} className="text-slate-400" /> {planning.provider.company_name || "Prestataire inconnu"}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 min-w-[200px]">
              {planning.status === "PLANIFIÉ" && (
                <button className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition-all shadow-xl hover:shadow-2xl active:scale-95">
                  <Pencil size={16} /> Modifier
                </button>
              )}
            </div>
          </div>
        </div>

        {/* KPIs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpis.map((k, i) => (
            <div key={i} className="bg-white p-8 rounded-[1.8rem] border border-slate-100 shadow-sm flex flex-col gap-4 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
                {k.icon}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{k.label}</p>
                <p className="text-lg font-black text-slate-900 mt-1">{k.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content & Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Infos & Reports */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Description Card */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  <FileText size={18} />
                </div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-wider">Observations / Description</h3>
              </div>
              
              {planning.description ? (
                <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed font-medium" 
                     dangerouslySetInnerHTML={{ __html: planning.description }} />
              ) : (
                <div className="flex flex-col items-center justify-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <AlertCircle size={24} className="text-slate-300 mb-2" />
                  <p className="text-slate-400 text-sm font-bold">Aucune observation renseignée.</p>
                </div>
              )}
            </div>

            {/* Reports Card */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <CheckCircle2 size={18} />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-wider">Rapports préventifs ({reports.length})</h3>
                </div>
                {reports.length > 0 && (
                  <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full uppercase tracking-widest">
                    Vérifié
                  </span>
                )}
              </div>

              {reports.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {reports.map((report) => (
                    <div key={report.id} className="group flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-blue-200 hover:shadow-md transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors">
                          <Shield size={22} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900">Rapport #{report.id}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-slate-400 font-bold flex items-center gap-1">
                              <Calendar size={12} /> {formatDate(report.created_at)}
                            </span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border uppercase ${
                              report.status === "validated" ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-amber-50 border-amber-100 text-amber-600"
                            }`}>
                              {report.status === "validated" ? "Validé" : "En attente"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mt-4 sm:mt-0">
                        <Link 
                          href={`/admin/rapports/details/${report.id}`}
                          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-sm"
                        >
                          <Eye size={14} /> Voir le rapport
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 bg-slate-50/50 rounded-[1.5rem] border border-dashed border-slate-200">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4">
                    <FileText size={32} className="text-slate-200" />
                  </div>
                  <p className="text-slate-500 font-black">Aucun rapport soumis</p>
                  <p className="text-slate-400 text-xs font-bold mt-1">Le prestataire n'a pas encore validé cette intervention.</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Sidebar Infos */}
          <div className="space-y-8">
            
            {/* Site Info */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Informations Site</h3>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nom du site</p>
                    <p className="text-sm font-black text-slate-900 mt-0.5">{planning.site?.nom || "Non spécifié"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 shrink-0">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Localisation</p>
                    <p className="text-sm font-black text-slate-900 mt-0.5">{planning.site?.localisation || "Non spécifié"}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-50 space-y-4">
                   <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                      <User size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Responsable Site</p>
                      <p className="text-sm font-black text-slate-900 mt-0.5">{planning.responsable_name || "N/A"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Provider Info */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Prestataire Assigné</h3>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shrink-0 shadow-lg font-black">
                    {(planning.provider?.company_name?.[0] || "P").toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Entreprise</p>
                    <p className="text-sm font-black text-slate-900 mt-0.5 truncate">{planning.provider?.company_name || "N/A"}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">ID: #PROV-{planning.provider_id}</p>
                  </div>
                </div>

                <div className="space-y-3 pt-6 border-t border-slate-50">
                  <div className="flex items-center gap-3 text-slate-500">
                    <Mail size={14} />
                    <span className="text-xs font-bold truncate">{planning.provider?.email || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-500">
                    <Phone size={14} />
                    <span className="text-xs font-bold">{planning.provider?.phone || "N/A"}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
