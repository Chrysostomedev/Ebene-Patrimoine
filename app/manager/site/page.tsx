"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Download, Eye, ChevronRight, MapPin, AlertTriangle,
  Building2, Ticket, TrendingUp, Layers,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Navbar from "@/components/Navbar";
import Paginate from "@/components/Paginate";
import StatsCard from "@/components/StatsCard";
import DataTable, { ColumnConfig } from "@/components/DataTable";

import { useSite } from "../../../hooks/manager/useSite";
import { useAssets } from "../../../hooks/manager/useAssets";
import { Asset, ManagerSite } from "../../../types/manager.types";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtMontant = (v?: number | null) => {
  if (!v && v !== 0) return "-";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M FCFA`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K FCFA`;
  return `${v} FCFA`;
};
const fmtDate = (iso?: string | null) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString("fr-FR");
};

// ─── Statuts ──────────────────────────────────────────────────────────────────
const STATUS_STYLE: Record<string, string> = {
  active: "border-green-500 bg-green-50 text-green-700",
  in_maintenance: "border-amber-400 bg-amber-50 text-amber-700",
  out_of_service: "border-red-400 bg-red-50 text-red-600",
  disposed: "border-slate-400 bg-slate-100 text-slate-700",
  actif: "border-green-500 bg-green-50 text-green-700",
  inactif: "border-red-400 bg-red-50 text-red-600",
  hors_usage: "border-slate-400 bg-slate-100 text-slate-700",
};
const STATUS_LABEL: Record<string, string> = {
  active: "Actif", in_maintenance: "En maintenance",
  out_of_service: "Hors service", disposed: "Réformé",
  actif: "Actif", inactif: "Inactif", hors_usage: "Hors usage",
};

// ─── SiteCard manager ─────────────────────────────────────────────────────────
function ManagerSiteCard({ site }: { site: ManagerSite }) {
  const ticketsParSite = (site as any).tickets_en_cours ?? site.tickets_count ?? 0;
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
      <div className="bg-slate-50 px-5 py-4 border-b border-slate-100">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight truncate">{site.nom}</h3>
            <div className="flex items-center gap-1.5 mt-1 text-slate-400 text-xs font-medium">
              <MapPin size={11} />
              <span className="truncate">{(site as any).adresse ?? (site as any).localisation ?? (site as any).ville ?? "—"}</span>
            </div>
          </div>
          <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
            (site.status?.toLowerCase() === "active" || site.status?.toLowerCase() === "actif")
              ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-600"
          }`}>
            {(site.status?.toLowerCase() === "active" || site.status?.toLowerCase() === "actif") ? "Actif" : "Inactif"}
          </span>

        </div>
      </div>
      <div className="px-5 py-4 flex items-center justify-between flex-1">
        <div className="flex items-center gap-2 text-slate-600">
          <Ticket size={14} className="text-orange-500" />
          <span className="text-xs font-bold">{ticketsParSite} ticket{ticketsParSite > 1 ? "s" : ""} en cours</span>
        </div>
        <Link
          href={`/manager/site/${site.id}`}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-black transition"
        >
          Voir le détail <ChevronRight size={13} />
        </Link>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SitesPage() {
  const { sites, siteStats, stats: assetStats, isLoading, error } = useSite();
  const { assets, meta, setPage } = useAssets({ per_page: 8 });
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);

  const columns: ColumnConfig<Asset>[] = [
    {
      header: "Codification", key: "code",
      render: (_: any, row: any) => (
        <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">
          {row.codification ?? row.code ?? row.serial_number ?? "-"}
        </span>
      ),
    },
    { header: "Désignation", key: "designation", render: (_: any, row: any) => row.designation },
    { header: "Type", key: "typeAsset", render: (_: any, row: any) => row.type?.name ?? row.typeAsset?.name ?? "-" },
    { header: "Sous-type", key: "subTypeAsset", render: (_: any, row: any) => row.sub_type?.name ?? row.subTypeAsset?.name ?? "-" },
    { header: "Site", key: "site", render: (_: any, row: any) => row.site?.nom ?? "-" },
    {
      header: "Statut", key: "status",
      render: (_: any, row: any) => (
        <span className={`px-3 py-1 rounded border text-xs font-bold ${STATUS_STYLE[row.status] ?? ""}`}>
          {STATUS_LABEL[row.status] ?? row.status}
        </span>
      ),
    },
    {
      header: "Actions", key: "actions",
      render: (_: any, row: any) => (
        <div className="flex items-center gap-2">

          <Link href={`/manager/patrimoines/${row.id}`} className="group p-2 rounded-xl bg-white hover:bg-black border border-slate-200 hover:border-black transition flex items-center justify-center">
            <Eye size={14} className="text-slate-600 group-hover:text-white transition-all" />
          </Link>
        </div>
      ),
    },
  ];

  const kpis = [
    { 
      label: "Sites assignés", 
      value: siteStats?.nombre_sites ?? siteStats?.nombre_total_sites ?? sites.length, 
      delta: "", trend: "up" as const 
    },
    { 
      label: "Sites actifs", 
      value: siteStats?.nombre_sites_actifs ?? sites.filter(s => {
        const st = (s as any).status?.toLowerCase();
        return st === "active" || st === "actif";
      }).length, 
      delta: "", trend: "up" as const 
    },
    { 
      label: "Total patrimoines", 
      value: siteStats?.nombre_equipements ?? assetStats?.total ?? 0, 
      delta: "", trend: "up" as const 
    },
    { 
      label: "Loyer moyen/site", 
      value: (siteStats?.loyer_moyen || siteStats?.cout_loyer_moyen_par_site) 
        ? fmtMontant(siteStats.loyer_moyen || siteStats.cout_loyer_moyen_par_site) 
        : "-", 
      delta: "", trend: "up" as const 
    },
  ];



  return (
    <div className="flex flex-col flex-1">
      <Navbar />
      <main className="mt-20 p-6 space-y-8">

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900" />
          </div>
        ) : error ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-red-500 font-bold bg-white p-8 rounded-2xl shadow-sm border border-red-100 text-center">
              <AlertTriangle className="mx-auto mb-4 text-red-400" size={40} />
              <p>{error}</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <PageHeader title="Sites" subtitle="Suivi et gestion de tous les sites" />
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              {kpis.map((k, i) => <StatsCard key={i} {...k} />)}
            </div>

            {/* KPIs */}
            <button
              onClick={async () => {
                try {
                  const { default: api } = await import("../../../core/axios");
                  const res = await api.get("/manager/asset/export", { responseType: "blob" });
                  const url = URL.createObjectURL(new Blob([res.data]));
                  const a = document.createElement("a"); a.href = url;
                  a.download = `patrimoines_${new Date().toISOString().slice(0, 10)}.xlsx`;
                  a.click(); URL.revokeObjectURL(url);
                } catch { alert("Erreur lors de l'export."); }
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-bold hover:bg-slate-50 transition"
            >
              <Download size={16} /> Exporter
            </button>
            {/* Grille des sites */}
            {sites.length > 0 && (
              <div>
                <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Mes sites</h2>
                <p className="text-slate-400 text-sm mt-1">{sites.length} site{sites.length > 1 ? "s" : ""} assigné{sites.length > 1 ? "s" : ""}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sites.map(s => <ManagerSiteCard key={s.id} site={s} />)}
                </div>
              </div>
            )}

            {/* Table patrimoines (tous sites confondus) */}
            <div>
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Tous les patrimoines</h2>
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <DataTable columns={columns} data={assets} title="Patrimoines" onViewAll={() => { }} />
                {meta && (
                  <div className="p-6 border-t border-slate-50 flex items-center justify-between bg-slate-50/30">
                    <p className="text-xs text-slate-400">Page {meta.current_page} sur {meta.last_page} · {meta.total} éléments</p>
                    <Paginate currentPage={meta.current_page} totalPages={meta.last_page} onPageChange={setPage} />
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Side panel aperçu actif */}
      {selectedAsset && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setSelectedAsset(null)} />
          <div className="fixed right-0 top-0 h-full w-[420px] bg-white z-50 shadow-2xl rounded-l-3xl flex flex-col overflow-hidden animate-in slide-in-from-right">
            <div className="p-6 border-b space-y-1">
              <button onClick={() => setSelectedAsset(null)} className="text-xs text-slate-400 hover:text-black mb-2">Fermer</button>
              <h2 className="text-2xl font-black">{selectedAsset.designation}</h2>
              <span className={`inline-block px-3 py-1 rounded-xl border text-xs font-bold ${STATUS_STYLE[selectedAsset.status] ?? ""}`}>
                {STATUS_LABEL[selectedAsset.status] ?? selectedAsset.status}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-3 text-sm text-slate-700">
              {[
                { label: "Codification", value: selectedAsset.codification ?? selectedAsset.code ?? "-" },
                { label: "Type", value: selectedAsset.type?.name ?? selectedAsset.typeAsset?.name ?? "-" },
                { label: "Sous-type", value: selectedAsset.sub_type?.name ?? selectedAsset.subTypeAsset?.name ?? "-" },
                { label: "Site", value: selectedAsset.site?.nom ?? "-" },
                { label: "Date entrée", value: fmtDate(selectedAsset.date_entree ?? selectedAsset.acquisition_date) },
                { label: "Valeur", value: fmtMontant(selectedAsset.valeur_entree ?? selectedAsset.acquisition_value) },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between border-b border-slate-50 pb-2">
                  <span className="text-slate-400 font-medium">{label}</span>
                  <span className="font-bold text-slate-800">{value}</span>
                </div>
              ))}
              {selectedAsset.description && (
                <div className="bg-slate-50 rounded-xl p-4 text-slate-600 text-sm mt-2">
                  <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: selectedAsset.description }} />
                </div>
              )}
              <Link href={`/manager/patrimoines/${selectedAsset.id}`} className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition mt-4">
                Voir le détail complet <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
