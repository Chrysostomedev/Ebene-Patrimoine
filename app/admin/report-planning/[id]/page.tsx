// app/admin/report-planning/[id]/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft, MapPin, User, ShieldCheck,
  Clock, FileText, CheckCircle2, AlertTriangle,
  Eye, Wrench, Star, X, Info, ShieldAlert,
  AlertCircle
} from "lucide-react";

import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import StatsCard from "@/components/StatsCard";
import RichContent from "@/components/RichContent";

import { ReportService, InterventionReport, ValidateReportPayload } from "../../../../services/admin/report.service";
import { AssetService } from "../../../../services/admin/asset.service";
import Link from "next/link";

// Styles de statuts uniformisés selon la charte Canal+ premium
const STATUS_STYLES: Record<string, string> = {
  validated: "border-emerald-200 bg-emerald-50 text-emerald-700",
  validé: "border-emerald-200 bg-emerald-50 text-emerald-700",
  submitted: "border-blue-200 bg-blue-50 text-blue-700",
  pending: "border-slate-200 bg-slate-50 text-slate-500",
  rejected: "border-red-200 bg-red-50 text-red-700",
  rejeté: "border-red-200 bg-red-50 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  validated: "Validé",
  validé: "Validé",
  submitted: "Soumis",
  pending: "En attente",
  rejected: "Rejeté",
  rejeté: "Rejeté",
};

const formatDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";

export default function AdminReportPlanningDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  // États de chargement et données
  const [report, setReport] = useState<InterventionReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Validation
  const [isValidModalOpen, setIsValidModalOpen] = useState(false);
  const [validationComment, setValidationComment] = useState("");
  const [validationRating, setValidationRating] = useState<number>(5);
  const [validationResult, setValidationResult] = useState<"RAS" | "ANOMALIE">("RAS");
  const [submitting, setSubmitting] = useState(false);

  const [siteAssets, setSiteAssets] = useState<any[]>([]);

  const loadReport = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await ReportService.getReport(Number(id));
      setReport(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Erreur lors du chargement du rapport global");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [id]);

  useEffect(() => {
    if (report?.site_id) {
      AssetService.getAssets({ site_id: report.site_id, per_page: 1000 })
        .then(res => setSiteAssets(res.items || []))
        .catch(console.error);
    }
  }, [report?.site_id]);

  const handleValidate = async () => {
    if (!report || submitting) return;
    setSubmitting(true);
    try {
      await ReportService.validateReport(report.id, {
        result: validationResult,
        rating: validationRating,
        comment: validationComment || "Validé sans commentaire",
      });
      setIsValidModalOpen(false);
      await loadReport();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Erreur lors de la validation du rapport");
    } finally {
      setSubmitting(false);
    }
  };

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
          <p className="text-slate-600 font-bold">{error || "Rapport global introuvable"}</p>
          <button onClick={() => router.back()} className="text-sm font-bold text-slate-900 underline underline-offset-4">
            Retourner à la liste
          </button>
        </div>
      </div>
    );
  }

  const isValidated = report.status === "validated";
  const providerName = report.provider?.company_name || report.provider?.name || "-";
  const siteName = report.site?.nom || report.site?.name || "-";

  // Extraction et comptage des anomalies dans les résultats de contrôle
  const tickets = (report as any).planning?.tickets || (report as any).tickets || [];
  const baseResults = (report.items && report.items.length > 0)
    ? report.items.map((item: any) => ({
        asset_id: item.company_asset_id,
        asset: item.asset,
        status: item.status,
        comment: item.comment,
        photo: item.photo_path
      }))
    : report.asset_results && report.asset_results.length > 0
      ? report.asset_results
      : tickets.map((t: any) => {
        const comment = t.findings || t.description || t.comment || null;
        const isObs = (comment || "").toLowerCase().includes("observation");
        const isAnom = t.status === "SIGNALÉ" || (comment || "").toLowerCase().includes("anomalie");
        const status = isAnom ? "ANOMALIE" : isObs ? "OBSERVATION" : "RAS";
        return {
          asset_id: t.company_asset?.id,
          asset: {
            reference: t.company_asset?.codification || `PAT-${t.company_asset?.id}`,
            designation: t.company_asset?.designation || "Équipement non spécifié",
            local: t.company_asset?.local || t.company_asset?.location || "Non spécifiée"
          },
          status,
          anomaly_detected: status === "ANOMALIE",
          comment
        };
      });

  const assetResults = siteAssets.length > 0
    ? siteAssets.map((asset: any) => {
      const result = baseResults.find((r: any) => Number(r.asset_id) === Number(asset.id));
      if (result) {
        // Uniformisation du statut de base si non spécifié correctement
        let status = result.status || "RAS";
        if (status === "RAS" && result.comment) {
          const lowercaseComment = (result.comment || "").toLowerCase();
          if (lowercaseComment.includes("observation")) {
            status = "OBSERVATION";
          } else if (lowercaseComment.includes("anomalie")) {
            status = "ANOMALIE";
          }
        }
        return {
          ...result,
          status,
          asset: {
            ...asset,
            reference: asset.codification || asset.code || `PAT-${asset.id}`,
          }
        };
      }

      const ticketForAsset = tickets.find((t: any) =>
        Number(t.company_asset?.id || t.company_asset_id || t.asset_id) === Number(asset.id)
      );

      let status = "RAS";
      let comment = null;
      if (ticketForAsset) {
        comment = ticketForAsset.findings || ticketForAsset.description || ticketForAsset.comment || null;
        const lowercaseComment = (comment || "").toLowerCase();
        if (lowercaseComment.includes("observation")) {
          status = "OBSERVATION";
        } else {
          status = "ANOMALIE";
        }
      }

      return {
        asset_id: asset.id,
        asset: {
          id: asset.id,
          reference: asset.codification || asset.code || `PAT-${asset.id}`,
          designation: asset.designation || "Équipement non spécifié",
          local: asset.local || asset.location || "Non spécifiée"
        },
        status,
        anomaly_detected: status === "ANOMALIE",
        comment
      };
    })
    : baseResults;

  const anomaliesCount = assetResults.filter((r: any) =>
    r.status?.toUpperCase() === "ANOMALIE" ||
    r.status?.toUpperCase() === "OBSERVATION" ||
    r.anomaly_detected ||
    r.comment?.toLowerCase().includes("anomalie")
  ).length;

  // KPIs dynamiques uniformisés
  const kpis = [
    { label: "Prestataire", value: providerName, delta: "", trend: "up" as const },
    { label: "Site", value: siteName, delta: "", trend: "up" as const },
    { label: "Patrimoines contrôlés", value: String(assetResults.length || 0), delta: "", trend: "up" as const },
    { label: "Anomalies signalées", value: String(anomaliesCount), delta: "", trend: "down" as const },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />
      <main className="mt-20 p-8 max-w-7xl mx-auto w-full space-y-8">

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
                  Rapport global planning {report.id}
                </h1>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${STATUS_STYLES[report.status || "pending"] || "bg-slate-50 text-slate-600 border border-slate-100"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${report.status === 'validated' ? 'bg-emerald-500' : report.status === 'submitted' ? 'bg-blue-500' : 'bg-amber-500'}`} />
                  {STATUS_LABELS[report.status || "pending"] || report.status}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700">
                  <ShieldAlert size={11} />
                  Entretien Global
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-400 mt-1">
                <MapPin size={18} />
                <span className="font-medium text-lg">{siteName}</span>
              </div>
              {(report as any).planning?.codification && (
                <div className="flex items-center gap-2 text-slate-500 mt-1">
                  <Clock size={15} />
                  <span className="text-sm font-medium">Planning : {(report as any).planning.codification}</span>
                </div>
              )}
            </div>
          </div>

          {/* Bloc droit - info validation + bouton */}
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
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star
                        key={s}
                        size={16}
                        className={s <= (report.rating || 0) ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"}
                      />
                    ))}
                    <span className="ml-1 text-sm font-bold text-slate-700">{report.rating}/5</span>
                  </div>
                </div>
              )}
            </div>

            {!isValidated && (report.status === "submitted" || report.status === "pending") && (
              <button
                onClick={() => setIsValidModalOpen(true)}
                className="flex items-center justify-center gap-2 bg-slate-900 text-white py-3 px-6 rounded-2xl font-bold hover:bg-black transition-colors"
              >
                <CheckCircle2 size={16} /> Valider le rapport global
              </button>
            )}
          </div>
        </div>

        {/* ── KPIs Premium Uniformisés ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpis.map((k, i) => <StatsCard key={i} {...k} />)}
        </div>

        {/* ── Grille de détails principale ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Colonne Gauche: Informations & Constats */}
          <div className="space-y-8">
            <div className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm space-y-6">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <FileText size={14} /> Description / Constats globaux
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Actions ménées</label>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-slate-700 text-sm font-medium">
                    <RichContent html={report.action_taken || "Aucun constat rédigé."} />
                  </div>
                </div>

                {report.manager_comment && (
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Commentaire Gestionnaire</label>
                    <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 text-emerald-800 text-sm font-medium">
                      {report.manager_comment}
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Observations</label>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-slate-700 text-sm font-medium">
                    <RichContent html={report.findings || "Aucun constat rédigé."} />
                  </div>
                </div>


              </div>
            </div>
          </div>

          {/* Colonne Droite: Diagnostic Technique exhaustif */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Diagnostic Technique Global</h3>
                  <p className="text-xs text-slate-400 font-medium">État de contrôle individuel de chaque patrimoine du site</p>
                </div>
                <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {assetResults.length} Patrimoines
                  </span>
                </div>
              </div>

              {assetResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                  <Info size={32} className="mb-2" />
                  <p className="text-sm font-semibold">Aucun patrimoine lié à ce rapport d'entretien global.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {assetResults.map((r: any, idx: number) => {
                    const isAnomal = r.status?.toUpperCase() === "ANOMALIE" || r.anomaly_detected;
                    const isObservation = r.status?.toUpperCase() === "OBSERVATION";
                    const isRas = !isAnomal && !isObservation;

                    const ticketForAsset = tickets.find((t: any) =>
                      Number(t.company_asset?.id || t.company_asset_id || t.asset_id) === Number(r.asset_id)
                    );

                    let containerClass = "p-5 rounded-2xl border transition-all bg-slate-50/30 border-slate-100 hover:border-slate-200";
                    if (isAnomal) {
                      containerClass = "p-5 rounded-2xl border transition-all bg-red-50/40 border-red-100 hover:border-red-200 shadow-sm";
                    } else if (isObservation) {
                      containerClass = "p-5 rounded-2xl border transition-all bg-amber-50/40 border-amber-100 hover:border-amber-200 shadow-sm";
                    } else if (isRas) {
                      containerClass = "p-5 rounded-2xl border transition-all bg-emerald-50/10 border-emerald-100 hover:border-emerald-200";
                    }

                    return (
                      <div key={idx} className={containerClass}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              Code: {r.asset?.reference || `PAT-${r.asset_id}`}
                            </span>
                            <h4 className="text-md font-bold text-slate-900 mt-0.5">
                              {r.asset?.designation || "Équipement non spécifié"}
                            </h4>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {isAnomal && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-100 border border-red-200 text-xs font-bold text-red-800">
                                <AlertTriangle size={12} /> Anomalie
                              </span>
                            )}
                            {isObservation && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 border border-amber-200 text-xs font-bold text-amber-800">
                                <AlertCircle size={12} /> Observation
                              </span>
                            )}
                            {isRas && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 border border-emerald-200 text-xs font-bold text-emerald-800">
                                <CheckCircle2 size={12} /> R.A.S.
                              </span>
                            )}
                            {ticketForAsset && (
                              <Link
                                href={`/admin/preventif/${ticketForAsset.id}`}
                                className="group p-2 rounded-xl bg-white hover:bg-black border border-slate-200 hover:border-black transition flex items-center justify-center shadow-sm"
                                title="Voir le ticket préventif"
                              >
                                <Eye size={14} className="text-slate-600 group-hover:text-white transition-all" />
                              </Link>
                            )}
                          </div>
                        </div>

                        {/* Remarques / Observations spécifiques */}
                        {r.comment && (
                          <div className="mt-3 pt-3 border-t border-slate-100 text-xs font-medium text-slate-600">
                            <span className="font-extrabold text-slate-700 block mb-0.5">Note technique :</span>
                            {r.comment}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── MODAL VALIDATION PREMIUM ── */}
        {isValidModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <div className="bg-white rounded-[32px] p-8 max-w-md w-full border border-slate-100 shadow-2xl relative space-y-6">

              <button
                onClick={() => setIsValidModalOpen(false)}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-black hover:bg-slate-50 rounded-xl transition"
              >
                <X size={18} />
              </button>

              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900 leading-tight">Valider le Rapport Global</h3>
                <p className="text-slate-400 text-xs">Évaluez l'intervention de l'équipe et validez le diagnostic.</p>
              </div>

              <div className="space-y-4">
                {/* Résultat global */}


                {/* Notation */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block">Note globale</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        onClick={() => setValidationRating(s)}
                        className="p-1 hover:scale-110 transition-transform"
                      >
                        <Star
                          size={32}
                          className={s <= validationRating ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Commentaire */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block">Commentaire / Recommandation</label>
                  <textarea
                    value={validationComment}
                    onChange={(e) => setValidationComment(e.target.value)}
                    rows={4}
                    placeholder="Saisissez vos remarques sur l'état général du site..."
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus:border-slate-900 text-slate-900 bg-white"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setIsValidModalOpen(false)}
                  className="flex-1 py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-bold transition"
                >
                  Annuler
                </button>
                <button
                  onClick={handleValidate}
                  disabled={submitting}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-900 hover:bg-black text-white text-sm font-bold shadow-lg shadow-slate-900/10 transition disabled:opacity-50"
                >
                  {submitting ? "Validation..." : "Valider"}
                </button>
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  );
}
