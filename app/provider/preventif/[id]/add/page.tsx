"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import AssetChecklist, { AssetResult } from "@/components/form/AssetChecklist";
import { useToast } from "@/contexts/ToastContext";
import { ChevronLeft, Send, ClipboardList, MapPin, Calendar, Loader2, Wrench, FileText } from "lucide-react";
import { providerTicketService } from "@/services/provider/providerTicketService";
import { providerReportService } from "@/services/provider/providerReportService";
import api from "@/core/axios";

export default function ProviderAddPreventiveReportPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);
  const { toast } = useToast();

  const [ticket, setTicket] = useState<any>(null);
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
        // 1. Get ticket details
        const tData = await providerTicketService.getTicketById(id);
        setTicket(tData);

        // 2. Get assets by site
        const siteId = tData.site_id || (tData as any).site?.id;
        if (siteId) {
          const assetsRes = await api.get(`/provider/asset/by-site/${siteId}`);
          setAssets(assetsRes.data?.data || assetsRes.data || []);
        }
      } catch (err: any) {
        toast.error("Erreur lors de la récupération des données");
        router.back();
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
      
      // On détecte si une anomalie globale est signalée dans les assets
      const hasAnomalie = assetResults.some(r => r.status === "ANOMALIE");

      await providerReportService.createReport({
        ticket_id: id,
        intervention_type: "preventif",
        findings,
        action_taken: actionTaken,
        result: hasAnomalie ? "anomalie" : "RAS",
        anomaly_detected: hasAnomalie,
        asset_results: assetResults
      });

      toast.success("Rapport préventif soumis avec succès !");
      router.push(`/provider/preventif/${id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Erreur lors de la soumission du rapport");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="w-10 h-10 text-slate-900 animate-spin" />
        <p className="text-slate-500 font-medium">Chargement du formulaire...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Navbar />
      <main className="mt-20 p-8 max-w-7xl mx-auto space-y-8 pb-20">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="p-2 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition text-slate-400 hover:text-slate-900 shadow-sm"
          >
            <ChevronLeft size={20} />
          </button>
          <PageHeader 
            title="Nouveau Rapport Préventif" 
            subtitle={`Saisie du diagnostic pour le ticket #${ticket?.code_ticket || id}`}
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
            {/* Infos Contextuelles */}
            <div className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                            <MapPin size={18} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Site</p>
                            <p className="text-sm font-bold text-slate-900">{ticket?.site?.nom || "—"}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                            <Wrench size={18} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Équipement cible</p>
                            <p className="text-sm font-bold text-slate-900">{ticket?.asset?.designation || "—"}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                            <Calendar size={18} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Date intervention</p>
                            <p className="text-sm font-bold text-slate-900">{new Date().toLocaleDateString("fr-FR")}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Observations & Actions */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm space-y-6 sticky top-28">
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <FileText size={14} /> Observations / Constatations
                            </label>
                            <textarea
                                value={findings}
                                onChange={(e) => setFindings(e.target.value)}
                                placeholder="Décrivez l'état général constaté..."
                                className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 text-sm font-bold text-slate-900 focus:bg-white focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all outline-none min-h-[150px]"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Wrench size={14} /> Actions menées
                            </label>
                            <textarea
                                value={actionTaken}
                                onChange={(e) => setActionTaken(e.target.value)}
                                placeholder="Détaillez les travaux effectués..."
                                className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 text-sm font-bold text-slate-900 focus:bg-white focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all outline-none min-h-[150px]"
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* Checklist Patrimoines */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 tracking-tight">Checklist du site</h3>
                                <p className="text-xs text-slate-400 font-medium">Veuillez diagnostiquer l'ensemble des équipements du site.</p>
                            </div>
                            <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{assets.length} Équipements</span>
                            </div>
                        </div>

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
                            Soumission...
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
      </main>
    </div>
  );
}
