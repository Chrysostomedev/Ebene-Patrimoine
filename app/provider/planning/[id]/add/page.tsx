"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import AssetChecklist, { AssetResult } from "@/components/form/AssetChecklist";
import { useToast } from "@/contexts/ToastContext";
import { ChevronLeft, Send, ClipboardList, MapPin, Calendar, Loader2, FileText, Wrench } from "lucide-react";
import { providerReportService } from "@/services/provider/providerReportService";
import { providerPlanningService } from "@/services/provider/providerPlanningService";
import api from "@/core/axios";

function ReportForm() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);
  const { toast } = useToast();

  const [planning, setPlanning] = useState<any>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [findings, setFindings] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [assetResults, setAssetResults] = useState<AssetResult[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // 1. Get planning details
        const pData = await providerPlanningService.getPlanningById(id);
        setPlanning(pData);

        // 2. Get assets by site
        const siteId = pData.site_id;
        if (siteId) {
          const assetsRes = await api.get(`/provider/asset/by-site/${siteId}`);
          setAssets(assetsRes.data?.data || assetsRes.data || []);
        }
      } catch (err: any) {
        toast.error("Erreur lors de la récupération des données");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, router, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!findings.trim() || !actionTaken.trim()) {
      toast.error("Veuillez remplir les observations et les actions menées.");
      return;
    }

    try {
      setSubmitting(true);
      const hasAnomalie = assetResults.some(r => r.status === "ANOMALIE");

      await providerReportService.createReport({
        planning_id: id,
        intervention_type: "preventif",
        findings,
        action_taken: actionTaken,
        result: hasAnomalie ? "anomalie" : "RAS",
        anomaly_detected: hasAnomalie,
        // @ts-ignore
        asset_results: assetResults
      });

      toast.success("Rapport d'intervention soumis avec succès !");
      router.push(`/provider/planning/${id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Erreur lors de la soumission du rapport");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-slate-900 animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">Chargement du formulaire...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 pb-20">
      {/* Infos Planning */}
      <div className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-400">
              <ClipboardList size={16} />
              <span className="text-xs font-black uppercase tracking-widest">Planning #{id}</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">{planning?.codification}</h2>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-3 px-5 py-3 bg-slate-50 rounded-2xl border border-slate-100">
              <MapPin size={16} className="text-slate-400" />
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Site</p>
                <p className="text-sm font-bold text-slate-900 leading-none">{planning?.site?.nom || "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-5 py-3 bg-slate-50 rounded-2xl border border-slate-100">
              <Calendar size={16} className="text-slate-400" />
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Date</p>
                <p className="text-sm font-bold text-slate-900 leading-none">{planning?.date_debut ? new Date(planning.date_debut).toLocaleDateString("fr-FR") : "—"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Colonne Gauche: Observations */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm space-y-6 sticky top-28">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <FileText size={14} /> Observations / Constatations
              </label>
              <textarea
                value={findings}
                onChange={(e) => setFindings(e.target.value)}
                placeholder="Rédigez vos constatations globales sur le site..."
                className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 text-sm font-bold text-slate-900 focus:bg-white focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all outline-none min-h-[150px]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Wrench size={14} /> Actions Menées
              </label>
              <textarea
                value={actionTaken}
                onChange={(e) => setActionTaken(e.target.value)}
                placeholder="Détaillez les travaux et vérifications effectués..."
                className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 text-sm font-bold text-slate-900 focus:bg-white focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all outline-none min-h-[150px]"
                required
              />
            </div>
          </div>
        </div>

        {/* Colonne Droite: Checklist Assets */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm min-h-full">

            <AssetChecklist
              assets={assets}
              onChange={setAssetResults}
            />
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-end gap-4 bg-white/80 backdrop-blur-md border border-slate-100 p-4 rounded-[24px] sticky bottom-6 shadow-xl shadow-slate-200/50">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-2 px-8 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition shadow-lg shadow-slate-900/20 disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Envoi en cours...
            </>
          ) : (
            <>
              <Send size={16} />
              Soumettre le rapport
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export default function AddPreventiveReportPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Navbar />
      <main className="mt-20 p-6 md:p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition text-slate-400 hover:text-slate-900 shadow-sm"
          >
            <ChevronLeft size={20} />
          </button>
          <PageHeader
            title="Rapport de Visite d'Entretien"
            subtitle="Complétez le diagnostic global pour l'ensemble des équipements du site lors de votre visite."
          />
        </div>

        <Suspense fallback={
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <Loader2 className="w-10 h-10 text-slate-900 animate-spin" />
            <p className="text-slate-500 font-medium animate-pulse">Chargement...</p>
          </div>
        }>
          <ReportForm />
        </Suspense>
      </main>
    </div>
  );
}
