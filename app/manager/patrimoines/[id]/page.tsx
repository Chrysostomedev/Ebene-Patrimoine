"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft, MapPin, Zap, Shield, Calendar,
  TrendingDown, AlertTriangle, Clock, CheckCircle,
  Eye, Wrench, Building2, Tag as TagIcon,
  CalendarDays
} from "lucide-react";

import Navbar from "@/components/Navbar";
import StatsCard from "@/components/StatsCard";
import AttachmentViewer from "@/components/AttachmentViewer";
import ReusableForm, { FieldConfig } from "@/components/ReusableForm";
import { AssetService } from "../../../../services/manager/asset.service";
import { TicketService } from "../../../../services/manager/ticket.service";
import type { Asset, Ticket } from "../../../../types/manager.types";
import { useTicketActions } from "../../../../hooks/manager/useTicketActions";
import { resolveUrl } from "@/components/AttachmentViewer";
import { formatDate, formatCurrency } from "@/lib/utils";
import { useToast } from "../../../../contexts/ToastContext";



// ─────────────────────────────────────────────────────────────
// STATUTS & STYLES (Alignés sur Admin/Project standards)
// ─────────────────────────────────────────────────────────────

const ST_STYLE: Record<string, string> = {
  actif: "bg-green-50  border-green-400  text-green-700",
  active: "bg-green-50  border-green-400  text-green-700",
  inactif: "bg-red-50    border-red-400    text-red-600",
  in_maintenance: "bg-orange-50 border-orange-400 text-orange-700",
  hors_usage: "bg-slate-100 border-slate-400  text-slate-600",
  out_of_service: "bg-red-50 border-red-400 text-red-600",
};

const ST_LABEL: Record<string, string> = {
  actif: "Actif", active: "Actif",
  inactif: "Inactif", in_maintenance: "En maintenance",
  hors_usage: "Hors usage", out_of_service: "Hors service",
  disposed: "Réformé",
};

const ST_DOT: Record<string, string> = {
  actif: "#22c55e", active: "#22c55e",
  inactif: "#ef4444", in_maintenance: "#f97316",
  hors_usage: "#94a3b8", out_of_service: "#ef4444",
};

const TICKET_STATUS_STYLE: Record<string, string> = {
  SIGNALÉ: "border-slate-300 bg-slate-100 text-slate-700",
  ASSIGNÉ: "border-violet-400 bg-violet-50 text-violet-700",
  EN_COURS: "border-orange-400 bg-orange-50 text-orange-600",
  EN_TRAITEMENT: "border-orange-400 bg-orange-50 text-orange-600",
  RAPPORTÉ: "border-amber-400 bg-amber-50 text-amber-700",
  ÉVALUÉ: "border-green-500 bg-green-50 text-green-700",
  CLOS: "border-black bg-black text-white",
};

// ─────────────────────────────────────────────────────────────
// CALCUL AMORTISSEMENT (Logique Admin importée)
// ─────────────────────────────────────────────────────────────

const computeAmort = (asset: Asset | null) => {
  const dateStr = asset?.date_entree || asset?.acquisition_date;
  const valEntree = asset?.valeur_entree || asset?.acquisition_value;

  if (!dateStr) return null;

  const dureeVieMois = (asset as any).duree_vie_mois ?? 60;
  const dateEntree = new Date(dateStr);
  const dateFin = new Date(dateEntree);
  dateFin.setMonth(dateFin.getMonth() + dureeVieMois);

  const today = new Date();
  const totalDays = Math.ceil((dateFin.getTime() - dateEntree.getTime()) / 86_400_000);
  const elapsed = Math.ceil((today.getTime() - dateEntree.getTime()) / 86_400_000);
  const remaining = Math.ceil((dateFin.getTime() - today.getTime()) / 86_400_000);

  const pct = Math.min(100, Math.max(0, (elapsed / totalDays) * 100));
  const residual = valEntree ? Math.max(0, valEntree * (1 - pct / 100)) : null;

  const alerte: "ok" | "warning_6m" | "warning_3m" | "expire" =
    remaining <= 0 ? "expire" : remaining <= 90 ? "warning_3m" : remaining <= 180 ? "warning_6m" : "ok";

  return { dateEntree, dateFin, dureeVieMois, elapsed: Math.max(0, elapsed), remaining, pct, residual, alerte };
};

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

function AlerteBanner({ alerte, remaining, dateFin }: {
  alerte: "ok" | "warning_6m" | "warning_3m" | "expire";
  remaining: number;
  dateFin: Date;
}) {
  if (alerte === "ok") return null;
  const cfg = {
    expire: { bg: "bg-red-50 border-red-200", icon: <AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5" />, title: "Équipement amorti", msg: `Fin de vie dépassée depuis le ${formatDate(dateFin.toISOString())}.`, text: "text-red-700" },
    warning_3m: { bg: "bg-orange-50 border-orange-200", icon: <AlertTriangle size={16} className="text-orange-600 shrink-0 mt-0.5" />, title: `Rappel - ${remaining}j restants`, msg: `Fin de vie dans moins de 3 mois (${formatDate(dateFin.toISOString())}).`, text: "text-orange-700" },
    warning_6m: { bg: "bg-yellow-50 border-yellow-200", icon: <Clock size={16} className="text-yellow-600 shrink-0 mt-0.5" />, title: `Alerte - ${remaining}j restants`, msg: `Fin de vie estimée le ${formatDate(dateFin.toISOString())}.`, text: "text-yellow-700" },
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

export default function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const assetId = parseInt(id);

  const [asset, setAsset] = useState<Asset | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [assetError, setAssetError] = useState<string | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

  const { toast } = useToast();

  // Hook pour les actions de tickets
  const { createTicket, isSubmitting, error: ticketError, success } = useTicketActions({
    onSuccess: () => {
      setIsTicketModalOpen(false);
      toast.success("Votre signalement a été envoyé avec succès.");
    }
  });


  const ticketFields: FieldConfig[] = [
    { name: "subject", label: "Sujet du ticket", type: "text", placeholder: "Ex: Panne constatée...", required: true, icon: <TagIcon size={18} /> },
    { name: "type", label: "Type", type: "select", options: [{ label: "Curatif", value: "curatif" }, { label: "Préventif", value: "preventif" }], required: true, icon: <Wrench size={18} /> },
    { name: "priority", label: "Priorité", type: "select", options: [{ label: "Faible", value: "faible" }, { label: "Moyenne", value: "moyenne" }, { label: "Haute", value: "haute" }, { label: "Critique", value: "critique" }], required: true, icon: <AlertTriangle size={18} /> },
    { name: "planned_at", label: "Début souhaité", type: "date", disablePastDates: true, required: false, icon: <CalendarDays size={18} /> },
    { name: "description", label: "Détails supplémentaires", type: "rich-text", placeholder: "Décrivez précisément le problème...", required: true, gridSpan: 2 },
    { name: "attachments", label: "Photos justificatives", type: "image-upload", required: false, gridSpan: 2, maxImages: 3 },
  ];

  useEffect(() => {
    const load = async () => {
      if (!assetId) return;
      setLoading(true);
      try {
        const [a, t] = await Promise.all([
          AssetService.getAsset(assetId),
          TicketService.getTickets({ per_page: 50 }),
        ]);
        setAsset(a);
        setTickets(t.items.filter(tk => tk.asset_id === assetId || (tk.asset as any)?.id === assetId));
      } catch (e: any) {
        setAssetError(e?.response?.data?.message ?? "Impossible de charger l'équipement.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [assetId]);

  if (loading) return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="flex flex-col flex-1"><Navbar />
        <div className="mt-20 flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-slate-100 border-t-slate-900 rounded-full animate-spin" />
        </div>
      </div>
    </div>
  );

  if (assetError || !asset) return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="flex flex-col flex-1"><Navbar />
        <div className="mt-20 flex items-center justify-center h-64">
          <div className="text-center space-y-3">
            <AlertTriangle size={40} className="text-red-400 mx-auto" />
            <p className="text-red-600 font-bold">{assetError ?? "Équipement introuvable"}</p>
            <Link href="/manager/patrimoines" className="text-sm text-slate-500 underline">Retour à la liste</Link>
          </div>
        </div>
      </div>
    </div>
  );

  const amort = computeAmort(asset);
  const typeName = asset.type?.name ?? asset.typeAsset?.name ?? "-";
  const subTypeName = asset.sub_type?.name ?? asset.subTypeAsset?.name ?? "-";
  const siteName = asset.site?.nom ?? "-";

  const kpis = [
    { label: "Valeur d'entrée", value: formatCurrency(asset.valeur_entree || asset.acquisition_value), trend: "up" as const },
    { label: "Valeur résiduelle", value: formatCurrency(amort?.residual), trend: "down" as const },
    { label: "Jours restants", value: amort ? Math.max(0, amort.remaining) : "-", trend: (amort?.alerte !== "ok" ? "down" : "up") as const },
    { label: "Consommé", value: amort ? `${Math.round(amort.pct)}%` : "-", trend: "up" as const },
  ];

  const jalons = amort ? [
    { label: "Achat", date: formatDate(asset.date_entree || asset.acquisition_date), pct: 0, color: "bg-slate-400" },
    { label: "Alerte 6m", date: (() => { const d = new Date(amort.dateEntree); d.setMonth(d.getMonth() + amort.dureeVieMois - 6); return formatDate(d.toISOString()); })(), pct: Math.max(0, ((amort.dureeVieMois - 6) / amort.dureeVieMois) * 100), color: "bg-yellow-400" },
    { label: "Rappel 3m", date: (() => { const d = new Date(amort.dateEntree); d.setMonth(d.getMonth() + amort.dureeVieMois - 3); return formatDate(d.toISOString()); })(), pct: Math.max(0, ((amort.dureeVieMois - 3) / amort.dureeVieMois) * 100), color: "bg-orange-500" },
    { label: "Fin de vie", date: formatDate(amort.dateFin.toISOString()), pct: 100, color: "bg-red-500" },
  ] : [];

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans tracking-tight">
      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar />
        <main className="mt-20 p-8 space-y-8 overflow-y-auto h-[calc(100vh-80px)]">

          {/* Breadcrumb */}
          <Link href="/manager/patrimoines"
            className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 transition text-sm font-bold bg-white px-4 py-2 rounded-xl border border-slate-100 w-fit">
            <ChevronLeft size={16} /> Retour aux patrimoines
          </Link>

          {/* Header */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 flex flex-col md:flex-row gap-8 items-start justify-between">
            <div className="flex gap-6 items-start">
              <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center shrink-0 shadow-lg shadow-slate-200">
                <Building2 size={28} className="text-white" />
              </div>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                    {asset.designation}
                  </h1>
                  <span className={`px-3 py-1.5 rounded-full border text-[10px] font-black uppercase ${ST_STYLE[asset.status] ?? "border-slate-200 bg-slate-50 text-slate-500"}`}>
                    <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: ST_DOT[asset.status] }} />
                    {ST_LABEL[asset.status] ?? asset.status}
                  </span>
                  {asset.criticite === "critique" && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black border border-orange-300 bg-orange-50 text-orange-700">
                      <Shield size={10} /> CRITIQUE
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-6 text-sm text-slate-500 font-medium">
                  <span className="font-mono bg-slate-100 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700">
                    {asset.codification || asset.code || "-"}
                  </span>
                  <span className="flex items-center gap-1.5"><MapPin size={14} /> {siteName}</span>
                  <span className="flex items-center gap-1.5"><Zap size={14} /> {typeName} · {subTypeName}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsTicketModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-900 text-white text-sm font-black hover:bg-black transition shadow-xl shadow-slate-200"
            >
              <Wrench size={18} /> Signaler une anomalie
            </button>
          </div>

          {!loading && asset && amort && (
            <>
              {/* Alerte amortissement */}
              <AlerteBanner alerte={amort.alerte} remaining={amort.remaining} dateFin={amort.dateFin} />

              {/* KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {kpis.map((k, i) => <StatsCard key={i} {...k} />)}
              </div>

              {/* Contenu principal */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                {/* Colonne Gauche - Amortissement + Description */}
                <div className="xl:col-span-2 space-y-8">
                  {/* Bloc amortissement */}
                  <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-8 space-y-8">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Suivi d'Amortissement</h2>
                      <span className="text-xs text-slate-400 font-bold bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                        Cycle : {amort.dureeVieMois} mois
                      </span>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                        <span>{amort.elapsed} jours d'utilisation</span>
                        <span className="font-black text-slate-900 text-lg">{Math.round(amort.pct)}%</span>
                        <span>{Math.max(0, amort.remaining)} jours restants</span>
                      </div>
                      <AmortBar pct={amort.pct} alerte={amort.alerte} />
                    </div>

                    <div className="relative pt-6">
                      <div className="absolute left-0 right-0 top-6 h-px bg-slate-100" />
                      <div className="flex items-start justify-between">
                        {jalons.map((j, i) => (
                          <div key={i} className="flex flex-col items-center gap-2 relative">
                            <div className={`w-3 h-3 rounded-full ${j.color} border-2 border-white shadow-sm z-10`} />
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wide">{j.label}</span>
                            <span className="text-[10px] text-slate-400 font-bold">{j.date}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
                      {[
                        { l: "Valeur d'entrée", v: formatCurrency(asset.valeur_entree || asset.acquisition_value), bg: "bg-slate-50" },
                        { l: "Valeur résiduelle", v: formatCurrency(amort.residual), bg: "bg-slate-50" },
                        { l: "Mise en service", v: formatDate(asset.date_entree || asset.acquisition_date), bg: "bg-slate-50" },
                        { l: "Fin de vie est.", v: formatDate(amort.dateFin.toISOString()), bg: amort.alerte === "expire" ? "bg-red-50" : "bg-emerald-50" },
                      ].map((c, i) => (
                        <div key={i} className={`${c.bg} rounded-2xl p-5 border border-slate-100`}>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{c.l}</p>
                          <p className="text-sm font-black text-slate-900 leading-tight">{c.v}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  {asset.description && (
                    <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-8 space-y-4">
                      <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Description & Notes</h2>
                      <div className="prose prose-sm max-w-none text-slate-600 leading-relaxed bg-slate-50 p-6 rounded-2xl border border-slate-100 italic"
                        dangerouslySetInnerHTML={{ __html: asset.description }} />
                    </div>
                  )}

                  {/* Photos */}
                  {asset.images && asset.images.length > 0 && (
                    <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-8 space-y-6">
                      <AttachmentViewer attachments={asset.images} title="Photos de l'équipement" />
                    </div>
                  )}
                </div>

                {/* Colonne Droite - Image principale + Fiche Technique */}
                <div className="space-y-8">
                  {/* Photo de couverture */}
                  <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex flex-col group">
                    <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Aperçu Visuel</h3>
                    </div>
                    <div className="h-64 sm:h-80 w-full bg-slate-50 relative overflow-hidden">
                      {(() => {
                        const assetImages = asset.images ?? [];
                        if (assetImages.length > 0) {
                          const url = resolveUrl(assetImages[0]);
                          return (
                            <img src={url} alt="Aperçu" className="w-full h-full object-contain p-6 transition-all duration-700 group-hover:scale-110"
                              onError={(e) => { (e.target as HTMLImageElement).src = "/images/placeholder-asset.png"; }} />
                          );
                        }
                        return (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-slate-300">
                            <Building2 size={64} strokeWidth={1} />
                            <p className="text-xs font-bold uppercase tracking-widest">Aucun visuel</p>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Fiche Technique */}
                  <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-8 space-y-2">
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 border-b border-slate-50 pb-4">Fiche Technique</h2>
                    <div className="divide-y divide-slate-50">
                      {[
                        { l: "Désignation", v: asset.designation },
                        { l: "Famille / Type", v: typeName },
                        { l: "Sous-type", v: subTypeName },
                        { l: "Site d'affectation", v: siteName },
                        { l: "Codification", v: asset.codification || asset.code || "-" },
                        { l: "Statut Actuel", v: ST_LABEL[asset.status] ?? asset.status },
                        { l: "Criticité", v: asset.criticite === "critique" ? "🔴 Critique" : "🟢 Non critique" },
                        { l: "Date d'entrée", v: formatDate(asset.date_entree || asset.acquisition_date) },
                        { l: "Valeur d'entrée", v: formatCurrency(asset.valeur_entree || asset.acquisition_value) },
                        { l: "Dernière MAJ", v: formatDate(asset.updated_at || asset.created_at) },
                      ].map((r, i) => (
                        <div key={i} className="flex items-center justify-between py-4 group hover:bg-slate-50/50 -mx-4 px-4 transition-colors rounded-xl font-medium">
                          <p className="text-xs text-slate-400 font-bold uppercase">{r.l}</p>
                          <p className="text-xs font-black text-slate-900 text-right max-w-[60%] truncate">{r.v}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* Modale de création de ticket */}
      {asset && (
        <ReusableForm
          isOpen={isTicketModalOpen}
          onClose={() => setIsTicketModalOpen(false)}
          title="Signaler une Anomalie"
          subtitle={`Pour l'équipement : ${asset.designation}`}
          fields={ticketFields}
          initialValues={{
            type: 'curatif',
            priority: 'moyenne',
            company_asset_id: asset.id
          }}
          isSubmitting={isSubmitting}
          error={ticketError}
          success={success}
          onSubmit={(values) => {
            createTicket({
              ...values,
              company_asset_id: asset.id,
              site_id: asset.site_id
            } as any);
          }}
          submitLabel="Envoyer le signalement"
        />
      )}
    </div>
  );
}
