"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ChevronLeft, ChevronRight, MapPin, Zap,
  Shield, Calendar, TrendingDown, AlertTriangle,
  Clock, CheckCircle, ArrowRightLeft, Eye,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import PageHeader from "@/components/PageHeader";
import StatsCard from "@/components/StatsCard";
import AttachmentViewer from "@/components/AttachmentViewer";
import ReusableForm, { FieldConfig } from "@/components/ReusableForm";
import { useTypes } from "../../../../hooks/admin/useTypes";
import { useSubTypeAssets } from "../../../../hooks/admin/useSubTypeAssets";
import { useSites } from "../../../../hooks/admin/useSites";
import { Pencil } from "lucide-react";

import { AssetService, CompanyAsset } from "../../../../services/admin/asset.service";
import { TicketService, Ticket } from "../../../../services/admin/ticket.service";
import { resolveUrl } from "@/components/AttachmentViewer";
import { useToast } from "@/contexts/ToastContext";
import { formatDate, formatCurrency } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

// local fmt helpers removed - using @/lib/utils


// ─────────────────────────────────────────────────────────────
// STATUTS
// ─────────────────────────────────────────────────────────────

const ST_STYLE: Record<string, string> = {
  actif: "bg-green-50  border-green-400  text-green-700",
  inactif: "bg-red-50    border-red-400    text-red-600",
  hors_usage: "bg-slate-100 border-slate-400  text-slate-600",
};
const ST_LABEL: Record<string, string> = {
  actif: "Actif", inactif: "Inactif", hors_usage: "Hors usage",
};
const fmtDateForInput = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};
const ST_DOT: Record<string, string> = {
  actif: "#22c55e", inactif: "#ef4444", hors_usage: "#94a3b8",
};

// ─────────────────────────────────────────────────────────────
// CALCUL AMORTISSEMENT
// ─────────────────────────────────────────────────────────────

const computeAmort = (asset: CompanyAsset | null) => {
  if (!asset?.date_entree) return null;
  const dureeVieMois = (asset as any).duree_vie_mois ?? 60;
  const dateEntree = new Date(asset.date_entree);
  const dateFin = new Date(dateEntree);
  dateFin.setMonth(dateFin.getMonth() + dureeVieMois);
  const today = new Date();
  const totalDays = Math.ceil((dateFin.getTime() - dateEntree.getTime()) / 86_400_000);
  const elapsed = Math.ceil((today.getTime() - dateEntree.getTime()) / 86_400_000);
  const remaining = Math.ceil((dateFin.getTime() - today.getTime()) / 86_400_000);
  const pct = Math.min(100, Math.max(0, (elapsed / totalDays) * 100));
  const residual = asset.valeur_entree ? Math.max(0, asset.valeur_entree * (1 - pct / 100)) : null;
  const alerte: "ok" | "warning_6m" | "warning_3m" | "expire" =
    remaining <= 0 ? "expire" : remaining <= 90 ? "warning_3m" : remaining <= 180 ? "warning_6m" : "ok";
  return { dateEntree, dateFin, dureeVieMois, elapsed: Math.max(0, elapsed), remaining, pct, residual, alerte };
};

// ─────────────────────────────────────────────────────────────
// COMPOSANT BARRE AMORTISSEMENT
// ─────────────────────────────────────────────────────────────

function AmortBar({ pct, alerte }: { pct: number; alerte: string }) {
  const color =
    alerte === "expire" ? "bg-red-500" :
      alerte === "warning_3m" ? "bg-orange-500" :
        alerte === "warning_6m" ? "bg-yellow-400" : "bg-emerald-500";
  return (
    <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPOSANT ALERTE BANNER
// ─────────────────────────────────────────────────────────────

function AlerteBanner({ alerte, remaining, dateFin }: {
  alerte: "ok" | "warning_6m" | "warning_3m" | "expire";
  remaining: number;
  dateFin: Date;
}) {
  if (alerte === "ok") return null;
  const cfg = {
    expire: { bg: "bg-red-50 border-red-200", icon: <AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5" />, title: "Équipement amorti", msg: `Fin de vie dépassée depuis le ${formatDate(dateFin.toISOString())}. Statut suggéré : HORS USAGE.`, text: "text-red-700" },
    warning_3m: { bg: "bg-orange-50 border-orange-200", icon: <AlertTriangle size={16} className="text-orange-600 shrink-0 mt-0.5" />, title: `Rappel - ${remaining}j restants`, msg: `Fin de vie dans moins de 3 mois (${formatDate(dateFin.toISOString())}). Prévoyez le remplacement.`, text: "text-orange-700" },
    warning_6m: { bg: "bg-yellow-50 border-yellow-200", icon: <Clock size={16} className="text-yellow-600 shrink-0 mt-0.5" />, title: `Alerte - ${remaining}j restants`, msg: `Fin de vie estimée le ${formatDate(dateFin.toISOString())}. Planifiez la maintenance.`, text: "text-yellow-700" },
  }[alerte];
  return (
    <div className={`flex items-start gap-3 p-4 rounded-2xl border ${cfg.bg}`}>
      {cfg.icon}
      <div>
        <p className={`text-sm font-black ${cfg.text}`}>{cfg.title}</p>
        <p className={`text-sm mt-0.5 ${cfg.text} opacity-80`}>{cfg.msg}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────

export default function PatrimoineDetailsPage() {
  const params = useParams();
  const assetId = Number(params?.id);

  const [asset, setAsset] = useState<CompanyAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [relatedTickets, setRelatedTickets] = useState<Ticket[]>([]);

  // ── Edit States ──
  const { types } = useTypes();
  const { subTypes } = useSubTypeAssets();
  const { sites, fetchSites } = useSites();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    if (sites.length === 0) fetchSites();
  }, []);


  const loadAssetData = () => {
    if (!assetId) return;
    setLoading(true);
    AssetService.getAssetById(assetId)
      .then(setAsset).catch(() => setAsset(null)).finally(() => setLoading(false));

    TicketService.getTickets({ company_asset_id: assetId, per_page: 15 })
      .then(d => setRelatedTickets(d.items))
      .catch(console.error);
  };

  useEffect(() => {
    loadAssetData();
  }, [assetId]);

  const handleEdit = async (formData: any) => {
    if (!asset) return;
    try {
      await AssetService.updateAsset(asset.id, formData);
      toast.success("Patrimoine mis à jour avec succès.");
      setIsEditModalOpen(false);
      loadAssetData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Erreur lors de la mise à jour.");
    }
  };

  const assetFields: FieldConfig[] = [
    {
      name: "type_company_asset_id", label: "Famille / Type", type: "select", required: true,
      options: types.map((t: any) => ({ label: t.name, value: String(t.id) })),
    },
    {
      name: "sub_type_company_asset_id", label: "Sous-type", type: "select", required: true,
      options: (selectedTypeId
        ? subTypes.filter((st: any) => String(st.type_company_asset_id) === selectedTypeId)
        : subTypes
      ).map((st: any) => ({ label: st.name, value: String(st.id) })),
    },
    {
      name: "site_id", label: "Site", type: "select", required: true,
      options: sites.map((s: any) => ({ label: s.nom, value: String(s.id) })),
    },
    { name: "designation", label: "Désignation", type: "text", required: true },
    { name: "serial_number", label: "N° de Série", type: "text", placeholder: "Ex: SN123456789" },
    { name: "product_type_code", label: "Code Produit", type: "text", placeholder: "Ex: 03 (2 chiffres)", minLength: 2, maxLength: 2 },
    {
      name: "status", label: "Statut", type: "select", required: true,
      options: Object.entries(ST_LABEL).map(([v, l]) => ({ label: l, value: v })),
    },
    {
      name: "criticite", label: "Criticité", type: "select", required: true,
      options: [{ label: "Critique", value: "critique" }, { label: "Non critique", value: "non_critique" }],
    },
    { name: "date_entree", label: "Date d'entrée", type: "date", required: true },
    { name: "valeur_entree", label: "Valeur d'entrée (FCFA)", type: "number", required: true },
    { name: "description", label: "Description", type: "rich-text", gridSpan: 2 },
    { name: "images", label: "Photos", type: "image-upload", gridSpan: 2, maxImages: 5 },
  ];

  const amort = computeAmort(asset);

  const typeName = asset?.type?.name ?? "-";
  const subTypeName = (asset as any)?.sub_type?.name ?? asset?.subType?.name ?? "-";
  const siteName = asset?.site?.nom ?? "-";
  const siteId = (asset?.site as any)?.id ?? null;

  const kpis = [
    { label: "Valeur d'entrée", value: formatCurrency(asset?.valeur_entree), delta: "", trend: "up" as const },
    { label: "Valeur résiduelle", value: formatCurrency(amort?.residual), delta: "", trend: "down" as const },
    { label: "Jours restants", value: amort ? Math.max(0, amort.remaining) : "-", delta: "", trend: (amort?.alerte !== "ok" ? "down" : "up") as const },
    { label: "Consommé", value: amort ? `${Math.round(amort.pct)}%` : "-", delta: "", trend: "up" as const },
  ];

  // Jalons timeline amortissement
  const jalons = amort ? [
    { label: "Achat", date: formatDate(asset?.date_entree), pct: 0, color: "bg-slate-400" },
    { label: "Alerte 6 mois", date: (() => { const d = new Date(amort.dateEntree); d.setDate(d.getDate() + amort.elapsed + amort.remaining - 180); return formatDate(d); })(), pct: Math.max(0, ((amort.elapsed + amort.remaining - 180) / (amort.elapsed + amort.remaining)) * 100), color: "bg-yellow-400" },
    { label: "Rappel 3 mois", date: (() => { const d = new Date(amort.dateEntree); d.setDate(d.getDate() + amort.elapsed + amort.remaining - 90); return formatDate(d); })(), pct: Math.max(0, ((amort.elapsed + amort.remaining - 90) / (amort.elapsed + amort.remaining)) * 100), color: "bg-orange-500" },
    { label: "Fin de vie", date: formatDate(amort.dateFin), pct: 100, color: "bg-red-500" },
  ] : [];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="flex flex-col flex-1">
        <Navbar />
        <main className="mt-4 p-8 space-y-8">

          {/* Back */}
          <div className="flex items-center justify-between gap-4">
            <Link href="/admin/patrimoines"
              className="flex items-center gap-2 text-slate-500 hover:text-slate-900 bg-white px-4 py-2 rounded-xl border border-slate-100 w-fit text-sm font-medium transition">
              <ChevronLeft size={16} /> Retour aux patrimoines
            </Link>

          </div>


          {/* Header fiche */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            {loading ? (
              <div className="space-y-3 animate-pulse">
                <div className="w-80 h-8 bg-slate-100 rounded-xl" />
                <div className="w-52 h-5 bg-slate-50 rounded-lg" />
              </div>
            ) : asset ? (
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
                <div className="space-y-3 flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black border ${ST_STYLE[asset.status] ?? ""}`}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ST_DOT[asset.status] }} />
                      {ST_LABEL[asset.status] ?? asset.status}
                    </span>
                    {asset.criticite === "critique" && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black border border-orange-300 bg-orange-50 text-orange-700">
                        <Shield size={9} /> Critique
                      </span>
                    )}
                  </div>
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight">{asset.designation}</h1>
                  <div className="flex items-center gap-4 flex-wrap text-sm text-slate-500 font-medium">
                    <span className="font-mono bg-slate-100 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700">{asset.codification}</span>
                    {siteId && (
                      <Link href={`/admin/sites/${siteId}`} className="flex items-center gap-1.5 hover:text-slate-900 transition">
                        <MapPin size={13} /> {siteName}
                      </Link>
                    )}
                    <span className="flex items-center gap-1.5"><Zap size={13} /> {typeName} · {subTypeName}</span>
                  </div>
                </div>
                {/* Liens rapides */}
                <div className="flex flex-col gap-2 shrink-0">
                  {siteId && (
                    <Link href={`/admin/sites/details/${siteId}`}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition">
                      <Eye size={14} /> Voir le site
                    </Link>
                  )}
                  <button onClick={() => { setSelectedTypeId(String(asset.type_company_asset_id ?? "")); setIsEditModalOpen(true); }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition shadow-sm">
                    <Pencil size={14} /> Modifier le patrimoine
                  </button>
                  <Link href={`/admin/patrimoines/transfert`}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition">
                    <ArrowRightLeft size={14} /> Transférer
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-sm text-center py-6">Patrimoine introuvable.</p>
            )}
          </div>

          {!loading && asset && amort && (
            <>
              {/* Alerte amortissement */}
              <AlerteBanner alerte={amort.alerte} remaining={amort.remaining} dateFin={amort.dateFin} />

              {/* KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                {kpis.map((k, i) => <StatsCard key={i} {...k} />)}
              </div>

              {/* Contenu principal */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                {/* Colonne 2/3 - Amortissement + description */}
                <div className="xl:col-span-2 space-y-6">

                  {/* Bloc amortissement */}
                  <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Amortissement</h2>
                      <span className="text-xs text-slate-400 font-medium">Durée de vie : {amort.dureeVieMois} mois</span>
                    </div>

                    {/* Barre */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                        <span>{amort.elapsed} jours écoulés</span>
                        <span className="font-black text-slate-900">{Math.round(amort.pct)}% consommé</span>
                        <span>{Math.max(0, amort.remaining)} jours restants</span>
                      </div>
                      <AmortBar pct={amort.pct} alerte={amort.alerte} />
                    </div>

                    {/* Jalons sous la barre */}
                    <div className="relative pt-4">
                      <div className="absolute left-0 right-0 top-4 h-px bg-slate-100" />
                      <div className="flex items-start justify-between">
                        {jalons.map((j, i) => (
                          <div key={i} className="flex flex-col items-center gap-1.5 relative" style={{ left: i === jalons.length - 1 ? "auto" : undefined }}>
                            <div className={`w-2.5 h-2.5 rounded-full ${j.color} border-2 border-white shadow-sm z-10`} />
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wide text-center whitespace-nowrap">{j.label}</span>
                            <span className="text-[9px] text-slate-400 font-medium">{j.date}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Cards valeurs */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                      {[
                        { l: "Valeur d'entrée", v: formatCurrency(asset.valeur_entree), bg: "bg-slate-50" },
                        { l: "Valeur résiduelle", v: formatCurrency(amort.residual), bg: "bg-slate-50" },
                        { l: "Date d'entrée", v: formatDate(asset.date_entree), bg: "bg-slate-50" },
                        {
                          l: "Fin de vie est.", v: formatDate(amort.dateFin), bg:
                            amort.alerte === "expire" ? "bg-red-50" :
                              amort.alerte === "warning_3m" ? "bg-orange-50" :
                                amort.alerte === "warning_6m" ? "bg-yellow-50" : "bg-emerald-50"
                        },
                      ].map((c, i) => (
                        <div key={i} className={`${c.bg} rounded-2xl p-4 border border-slate-100`}>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{c.l}</p>
                          <p className="text-sm font-black text-slate-900 leading-tight">{c.v}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  {asset.description && (
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
                      <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Description</h2>
                      <div
                        className="prose prose-sm max-w-none text-slate-700 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: asset.description }}
                      />
                    </div>
                  )}

                  {/* Photos - si le patrimoine possède des images */}
                  {(() => {
                    const assetImages = asset.images ?? [];
                    if (!assetImages || assetImages.length === 0) return null;
                    return (
                      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
                        <AttachmentViewer attachments={assetImages} title="Toutes les photos" />
                      </div>
                    );
                  })()}

                  {/* Tickets liés */}
                  <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Tickets associés ({relatedTickets.length})</h2>
                      <Link href={`/admin/tickets-curatifs?company_asset_id=${asset.id}`} className="text-xs font-bold text-slate-500 hover:text-slate-900 transition">
                        Voir tout
                      </Link>
                    </div>
                    {relatedTickets.length > 0 ? (
                      <div className="space-y-3">
                        {relatedTickets.map((t) => (
                          <div key={t.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50">
                            <div>
                              <p className="text-sm font-bold text-slate-900">{t.subject || t.code_ticket}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{t.type === "curatif" ? "Curatif" : "Préventif"} · {formatDate(t.created_at)}</p>
                            </div>
                            <Link href={`/admin/tickets/${t.id}`} className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-black hover:border-black hover:text-white transition">
                              <Eye size={14} />
                            </Link>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 italic">Aucun ticket relié à ce patrimoine.</p>
                    )}
                  </div>
                </div>

                {/* Colonne 1/3 - Image + Fiche technique + Timeline statuts */}
                <div className="space-y-6">

                  {/* PHOTO PROÉMINENTE (Comme demandé) */}
                  <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Photo du patrimoine</h3>
                      {(() => {
                        const assetImages = asset.images ?? [];
                        return assetImages.length > 0 && (
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                            {assetImages.length} photo{assetImages.length > 1 ? 's' : ''}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="h-64 sm:h-80 w-full bg-slate-50 relative group">
                      {(() => {
                        const assetImages = asset.images ?? [];
                        if (assetImages.length > 0) {
                          const firstImg = assetImages[0];
                          const url = resolveUrl(firstImg);
                          return (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={url}
                                alt="Patrimoine"
                                className="w-full h-full object-contain p-4 transition-all duration-500 group-hover:scale-105"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "/images/placeholder-asset.png";
                                }}
                              />
                            </>
                          );
                        }
                        return (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-slate-300">
                            <Eye size={48} strokeWidth={1} />
                            <p className="text-xs font-medium">Aucune photo disponible</p>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Fiche technique */}
                  <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-1">
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Fiche technique</h2>
                    <div className="divide-y divide-slate-50">
                      {[
                        { l: "Famille / Type", v: typeName },
                        { l: "Sous-type", v: subTypeName },
                        { l: "Site", v: siteName },
                        { l: "Code Article", v: asset.codification },
                        { l: "Code unique", v: asset.article_code ?? "-" },
                        { l: "Statut", v: ST_LABEL[asset.status] ?? asset.status },
                        { l: "Criticité", v: asset.criticite === "critique" ? "Critique" : "Non critique" },
                        { l: "Date d'entrée", v: formatDate(asset.date_entree) },
                        { l: "Valeur d'entrée", v: formatCurrency(asset.valeur_entree) },
                        { l: "Créé le", v: formatDate(asset.created_at) },
                      ].map((r, i) => (
                        <div key={i} className="flex items-center justify-between py-3">
                          <p className="text-xs text-slate-400 font-medium">{r.l}</p>
                          <p className="text-sm font-bold text-slate-900 text-right max-w-[55%] truncate">{r.v}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Timeline statuts */}
                  <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Historique</h2>
                    <div className="relative">
                      <div className="absolute left-3.5 top-0 bottom-0 w-px bg-slate-100" />
                      <div className="space-y-5 pl-10">
                        {/* Création */}
                        <div className="relative">
                          <div className="absolute -left-[calc(2.5rem-3px)] w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm">
                            <CheckCircle size={13} className="text-white" />
                          </div>
                          <p className="text-[9px] text-slate-400 font-medium uppercase tracking-widest mb-0.5">{formatDate(asset.created_at)}</p>
                          <p className="text-xs font-black text-slate-900">Création de l'équipement</p>
                          <p className="text-xs text-slate-500 mt-0.5">Codification : {asset.codification}</p>
                        </div>
                        {/* Mise en service */}
                        {asset.date_entree && (
                          <div className="relative">
                            <div className="absolute -left-[calc(2.5rem-3px)] w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center shadow-sm">
                              <Calendar size={13} className="text-white" />
                            </div>
                            <p className="text-[9px] text-slate-400 font-medium uppercase tracking-widest mb-0.5">{formatDate(asset.date_entree)}</p>
                            <p className="text-xs font-black text-slate-900">Mise en service</p>
                            <p className="text-xs text-slate-500 mt-0.5">Valeur : {formatCurrency(asset.valeur_entree)}</p>
                          </div>
                        )}
                        {/* Fin de vie (futur) */}
                        {amort.alerte !== "expire" && (
                          <div className="relative opacity-40">
                            <div className="absolute -left-[calc(2.5rem-3px)] w-7 h-7 rounded-full border-2 border-dashed border-slate-300 bg-white flex items-center justify-center">
                              <TrendingDown size={13} className="text-slate-400" />
                            </div>
                            <p className="text-[9px] text-slate-400 font-medium uppercase tracking-widest mb-0.5">{formatDate(amort.dateFin)} (estimé)</p>
                            <p className="text-xs font-black text-slate-500">Fin de vie estimée</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </>
          )}

          {loading && (
            <div className="py-24 flex flex-col items-center gap-3">
              <span className="w-8 h-8 border-2 border-slate-200 border-t-slate-700 rounded-full animate-spin" />
              <p className="text-slate-400 text-sm">Chargement...</p>
            </div>
          )}

        </main>

        <ReusableForm
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title="Modifier le patrimoine"
          subtitle="Mettez à jour les informations de cet équipement"
          fields={assetFields}
          initialValues={asset ? {
            type_company_asset_id: String(asset.type_company_asset_id ?? ""),
            sub_type_company_asset_id: String(asset.sub_type_company_asset_id ?? ""),
            site_id: String(asset.site_id ?? (asset.site as any)?.id ?? ""),
            designation: asset.designation,
            serial_number: asset.serial_number ?? "",
            product_type_code: asset.product_type_code ?? "",
            status: asset.status,
            criticite: asset.criticite ?? "non_critique",
            date_entree: fmtDateForInput(asset.date_entree),
            valeur_entree: asset.valeur_entree ?? "",
            description: asset.description ?? "",
            images: asset.images ?? [],
          } : {}}
          onFieldChange={(name, value, setter) => {
            if (name === "type_company_asset_id") {
              setSelectedTypeId(String(value));
              setter("sub_type_company_asset_id", "");
            }
          }}
          onSubmit={handleEdit}
          submitLabel="Mettre à jour"
        />
      </div>
    </div>
  );
}