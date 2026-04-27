"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Building2, Download, Eye, ChevronLeft, ChevronRight,
  MapPin, Copy, CheckCheck, AlertTriangle
} from "lucide-react";

import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import Paginate from "@/components/Paginate";
import StatsCard from "@/components/StatsCard";
import DataTable, { ColumnConfig } from "@/components/DataTable";

import { useSite } from "../../../../hooks/manager/useSite";
import { useAssets } from "../../../../hooks/manager/useAssets";
import { Asset } from "../../../../types/manager.types";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatMontant = (v?: number | null) => {
  if (!v && v !== 0) return "-";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M FCFA`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K FCFA`;
  return `${v} FCFA`;
};

const formatDate = (iso?: string | null) => {
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
  active: "Actif",
  in_maintenance: "En maintenance",
  out_of_service: "Hors service",
  disposed: "Réformé",
  actif: "Actif",
  inactif: "Inactif",
  hors_usage: "Hors usage",
};

// ─── CopyButton ───────────────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="ml-2 p-1 rounded-lg hover:bg-slate-200 transition text-slate-400 hover:text-slate-700"
    >
      {copied ? <CheckCheck size={13} /> : <Copy size={13} />}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SitePage() {
  const { site, stats: siteStats, isLoading: siteLoading, error: siteError } = useSite();
  const {
    assets,
    meta,
    isLoading: assetsLoading,
    setPage
  } = useAssets({ per_page: 5 });

  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);



  // ── Colonnes table ──
  const columns: ColumnConfig<Asset>[] = [
    {
      header: "Codification", key: "code",
      render: (_: any, row: any) => (
        <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">
          {row.codification ?? row.code ?? row.serial_number ?? "-"}
        </span>
      ),
    },
    {
      header: "Type", key: "typeAsset",
      render: (_: any, row: any) => row.type?.name ?? row.typeAsset?.name ?? "-",
    },
    {
      header: "Sous-type", key: "subTypeAsset",
      render: (_: any, row: any) => row.sub_type?.name ?? row.subTypeAsset?.name ?? "-",
    },

    {
      header: "Désignation", key: "designation",
      render: (_: any, row: any) => row.designation,
    },
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
          <button
            onClick={() => setSelectedAsset(row)}
            className="flex items-center gap-2 font-bold text-slate-800 hover:text-blue-600 transition"
          >
            <Eye size={18} />
          </button>
          <Link
            href={`/manager/patrimoines/${row.id}`}
            className="group p-2 rounded-xl bg-white hover:bg-black border border-slate-200 hover:border-black transition flex items-center justify-center"
            title="Voir le détail"
          >
            <ChevronRight size={15} className="text-slate-600 group-hover:text-white transition-all" />
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Navbar />

      <main className="mt-20 p-6 space-y-8 overflow-y-auto h-[calc(100vh-80px)]">

        {siteLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : siteError || !site ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-red-500 font-bold bg-white p-8 rounded-2xl shadow-sm border border-red-100 text-center">
              <AlertTriangle className="mx-auto mb-4 text-red-400" size={40} />
              <p>{siteError || "Impossible de charger les données du site."}</p>
              <p className="text-sm font-medium text-slate-400 mt-2">Vérifiez que ce manager est bien assigné à un site.</p>
            </div>
          </div>
        ) : (
          <>
            {/* ── HEADER SITE ── */}
            <div className="bg-white flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-2xl border border-slate-100 shadow-sm">
              <div className="space-y-4">
                <Link
                  href="/manager/dashboard"
                  className="flex items-center gap-2 text-slate-500 hover:text-black transition bg-white px-4 py-2 rounded-xl border border-slate-100 w-fit text-sm font-medium"
                >
                  <ChevronLeft size={18} /> Retour
                </Link>
                <div>
                  <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase leading-tight">
                    {site.nom || site.name}
                  </h1>
                  <div className="flex items-center gap-2 text-slate-400 mt-1">
                    <MapPin size={18} />
                    <span className="font-medium text-lg">{site.adresse || site.ville || "Adresse non renseignée"}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 min-w-[280px] space-y-2">
                <h3 className="font-bold text-lg text-slate-800">Informations du site</h3>

                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <MapPin size={16} />
                  <span>{site.adresse || site.ville || "N/A"}</span>
                </div>
              </div>
            </div>

            {/* ── KPIs ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatsCard label="Total patrimoines" value={siteStats?.total ?? 0} />
              <StatsCard label="Actifs" value={siteStats?.active ?? 0} />
              <StatsCard label="En maintenance" value={siteStats?.in_maintenance ?? 0} />
              <StatsCard label="Valeur totale" value={formatMontant(siteStats?.total_value)} />
            </div>

            {/* ── ACTIONS ── */}
            <div className="flex justify-end gap-3">
              <button
                onClick={async () => {
                  try {
                    const { default: api } = await import("../../../../core/axios");
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
            </div>

            {/* ── TABLE PATRIMOINES ── */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <DataTable
                columns={columns}
                data={assets}
                title="Patrimoines du site"
                onViewAll={() => { }}
              />
              {meta && (
                <div className="p-6 border-t border-slate-50 flex items-center justify-between bg-slate-50/30">
                  <p className="text-xs text-slate-400">
                    Page {meta.current_page} sur {meta.last_page} · {meta.total} éléments
                  </p>
                  <Paginate
                    currentPage={meta.current_page}
                    totalPages={meta.last_page}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </div>

            {/* ── SIDE PANEL aperçu actif ── */}
            {selectedAsset && (
              <>
                <div
                  className="fixed inset-0 bg-black/20 z-40"
                  onClick={() => setSelectedAsset(null)}
                />
                <div className="fixed right-0 top-0 h-full w-[420px] bg-white z-50 shadow-2xl rounded-l-3xl flex flex-col overflow-hidden animate-in slide-in-from-right">
                  <div className="p-6 border-b space-y-1">
                    <button
                      onClick={() => setSelectedAsset(null)}
                      className="text-xs text-slate-400 hover:text-black mb-2"
                    >
                      Fermer
                    </button>
                    <h2 className="text-2xl font-black">{selectedAsset.designation}</h2>
                    <span className={`inline-block px-3 py-1 rounded-xl border text-xs font-bold ${STATUS_STYLE[selectedAsset.status] ?? ""}`}>
                      {STATUS_LABEL[selectedAsset.status] ?? selectedAsset.status}
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 text-sm text-slate-700">
                    {[
                      { label: "ID", value: `#${selectedAsset.id}` },
                      { label: "Codification", value: selectedAsset.codification ?? selectedAsset.code ?? selectedAsset.serial_number ?? "-" },
                      { label: "Type", value: selectedAsset.type?.name ?? selectedAsset.typeAsset?.name ?? "-" },
                      { label: "Sous-type", value: selectedAsset.sub_type?.name ?? selectedAsset.subTypeAsset?.name ?? "-" },
                      { label: "Date d'entrée", value: formatDate(selectedAsset.date_entree ?? selectedAsset.acquisition_date) },
                      { label: "Valeur", value: formatMontant(selectedAsset.valeur_entree ?? selectedAsset.acquisition_value) },
                      { label: "Site", value: selectedAsset.site?.nom ?? "-" },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between border-b border-slate-50 pb-2">
                        <span className="text-slate-400 font-medium">{label}</span>
                        <span className="font-bold text-slate-800">{value}</span>
                      </div>
                    ))}
                    {selectedAsset.description && (
                      <div className="bg-slate-50 rounded-xl p-4 text-slate-600 text-sm mt-4">
                        {selectedAsset.description}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

          </>
        )}

      </main>
    </div>
  );
}