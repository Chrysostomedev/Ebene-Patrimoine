//cette page doit recuperer tous les pattrimoines et confondues de tous les sites de manager

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import Paginate from "@/components/Paginate";
import StatsCard from "@/components/StatsCard";
import DataTable from "@/components/DataTable";
import PageHeader from "@/components/PageHeader";
import ReusableForm, { FieldConfig } from "@/components/ReusableForm";
import { Tag, Wrench, AlertTriangle, CheckCircle2, CalendarDays, Clock, Building2, Eye, MapPin, Copy, CheckCheck, Filter, Download } from "lucide-react";

import { useAssets } from "../../../hooks/manager/useAssets";
import { useTicketActions } from "../../../hooks/manager/useTicketActions";
import { AssetService } from "../../../services/manager/asset.service";


// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatMontant = (v?: number | null) => {
  if (!v && v !== 0) return "-";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M FCFA`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K FCFA`;
  return `${v.toLocaleString("fr-FR")} FCFA`;
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

export default function PatrimoinesPage() {
  const {
    assets,
    meta,
    isLoading,
    error,
    setPage,
    updateFilters,
    filters
  } = useAssets({ per_page: 10 });

  const [stats, setStats] = useState<any>(null);
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

  useEffect(() => {
    AssetService.getStats().then(setStats).catch(console.error);
  }, []);

  // Hook pour les actions de tickets
  const { createTicket, isSubmitting: isTicketSubmitting } = useTicketActions({
    onSuccess: () => {
      setIsTicketModalOpen(false);
      setSelectedAsset(null);
    }
  });

  const ticketFields: FieldConfig[] = [
    {
      name: "subject",
      label: "Sujet du ticket",
      type: "text",
      placeholder: "Ex: Panne constatée sur l'équipement",
      required: true,
      icon: <Tag size={18} />
    },
    {
      name: "type",
      label: "Type",
      type: "select",
      options: [
        { label: "Curatif", value: "curatif" },
        { label: "Préventif", value: "preventif" },
      ],
      required: true,
      icon: <Wrench size={18} />
    },
    {
      name: "priority",
      label: "Priorité",
      type: "select",
      options: [
        { label: "Faible", value: "faible" },
        { label: "Moyenne", value: "moyenne" },
        { label: "Haute", value: "haute" },
        { label: "Critique", value: "critique" },
      ],
      required: true,
      icon: <AlertTriangle size={18} />
    },
    {
      name: "planned_at",
      label: "Début souhaité",
      type: "date",
      disablePastDates: true,
      required: true,
      icon: <CalendarDays size={18} />
    },
    {
      name: "due_at",
      label: "Échéance",
      type: "date",
      required: true,
      disablePastDates: true,
      icon: <Clock size={18} />,
    },
    {
      name: "description",
      label: "Détails supplémentaires",
      type: "rich-text",
      placeholder: "Décrivez précisément le problème constaté...",
      required: true,
      gridSpan: 2,
    },
    {
      name: "image",
      label: "Photo justificative",
      type: "image-upload",
      required: false,
      gridSpan: 2,
    },
  ];

  // ── Colonnes table ──
  const columns: any[] = [
    {
      header: "Codification", key: "codification",
      render: (_: any, row: any) => (
        <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg">
          {row.codification || row.code || "-"}
        </span>
      ),
    },
    {
      header: "Désignation", key: "designation",
      render: (_: any, row: any) => (
        <div className="font-bold text-slate-900 text-sm truncate max-w-[200px]" title={row.designation}>
          {row.designation}
        </div>
      ),
    },
    {
      header: "Type", key: "type",
      render: (_: any, row: any) => row.type?.name ?? row.typeAsset?.name ?? "-",
    },
    {
      header: "Site", key: "site",
      render: (_: any, row: any) => row.site?.nom ?? "-",
    },
    {
      header: "Statut", key: "status",
      render: (_: any, row: any) => (
        <span className={`px-3 py-1.5 rounded-full border text-[10px] font-black uppercase whitespace-nowrap ${STATUS_STYLE[row.status] ?? ""}`}>
          <span className="inline-block w-1 h-1 rounded-full mr-1" style={{ backgroundColor: STATUS_STYLE[row.status]?.includes('green') ? '#22c55e' : STATUS_STYLE[row.status]?.includes('red') ? '#ef4444' : '#94a3b8' }} />
          {STATUS_LABEL[row.status] ?? row.status}
        </span>
      ),
    },
    {
      header: "Valeur", key: "valeur_entree",
      render: (_: any, row: any) => (
        <span className="text-sm font-black text-slate-900 whitespace-nowrap">
          {formatMontant(row.valeur_entree || row.acquisition_value)}
        </span>
      ),
    },
    {
      header: "Actions", key: "actions",
      render: (_: any, row: any) => (
        <div className="flex items-center gap-2">
          <Link href={`/manager/patrimoines/${row.id}`} className="group p-2 rounded-xl bg-white hover:bg-black border border-slate-200 hover:border-black transition flex items-center justify-center shadow-sm">
            <Eye size={14} className="text-slate-600 group-hover:text-white transition-all" />
          </Link>
        </div>
      ),
    },
  ];


  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Navbar />

      <main className="mt-20 p-8 space-y-8 overflow-y-auto h-[calc(100vh-80px)]">

        <PageHeader
          title="Mon Patrimoine"
          subtitle="Inventaire complet des équipements et actifs sous votre responsabilité."
        />

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard label="Total actifs" value={stats?.total_actifs ?? 0} delta="+10%" trend="up" />
          <StatsCard label="Actifs actifs" value={stats?.actifs_actifs ?? 0} delta="+15%" trend="up" />
          <StatsCard label="Actifs critiques" value={stats?.total_actifs_critiques ?? 0} delta="-2%" trend="down" />
          <StatsCard label="Valeur totale" value={stats?.valeur_totale_patrimoine ? `${(stats.valeur_totale_patrimoine / 1_000_000).toFixed(1)}M` : "0"} delta="+3%" trend="up" />
        </div>


        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 px-6 py-4 rounded-2xl text-sm font-semibold">
            {error}
          </div>
        )}

        {/* ── FILTRES ET ACTIONS ── */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm">
              <Filter size={16} className="text-slate-400" />
              <select
                className="bg-transparent border-none outline-none text-sm font-bold text-slate-700 cursor-pointer"
                value={filters.status || ""}
                onChange={(e) => updateFilters({ status: e.target.value || undefined })}
              >
                <option value="">Tous les statuts</option>
                <option value="actif">Actif</option>
                <option value="inactif">Inactif</option>
                <option value="hors_usage">Hors usage</option>
              </select>
            </div>
          </div>

          <button
            onClick={async () => {
              try {
                const { default: api } = await import("../../../core/axios");
                const res = await api.get("/manager/asset/export", { params: filters, responseType: "blob" });
                const url = URL.createObjectURL(new Blob([res.data]));
                const a = document.createElement("a"); a.href = url;
                a.download = `patrimoines_${new Date().toISOString().slice(0, 10)}.xlsx`;
                a.click(); URL.revokeObjectURL(url);
              } catch { alert("Erreur lors de l'export."); }
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-sm font-black hover:border-slate-900 transition shadow-sm"
          >
            <Download size={16} /> Exporter (.xlsx)
          </button>
        </div>

        {/* ── TABLE PRINCIPALE ── */}
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden min-h-[500px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
              <div className="w-10 h-10 border-4 border-slate-100 border-t-slate-900 rounded-full animate-spin" />
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Chargement du patrimoine</p>
            </div>
          ) : (
            <>
              <DataTable
                columns={columns}
                data={assets}
                title="Liste des équipements"
                onViewAll={() => { }}
              />
              {meta && meta.last_page > 1 && (
                <div className="px-8 py-6 border-t border-slate-50 flex justify-end bg-slate-50/20">
                  <Paginate
                    currentPage={meta.current_page}
                    totalPages={meta.last_page}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* ── SIDE PANEL ── */}
        {selectedAsset && (
          <>
            <div
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity"
              onClick={() => setSelectedAsset(null)}
            />
            <div className="fixed right-0 top-0 h-full w-[440px] bg-white z-50 shadow-2xl rounded-l-[40px] flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
              <div className="p-8 border-b border-slate-50 space-y-4">
                <div className="flex justify-between items-center">
                  <span className={`px-4 py-1.5 rounded-full border text-[10px] font-black uppercase ${STATUS_STYLE[selectedAsset.status] ?? ""}`}>
                    {STATUS_LABEL[selectedAsset.status] ?? selectedAsset.status}
                  </span>
                  <button onClick={() => setSelectedAsset(null)} className="p-2 hover:bg-slate-100 rounded-full transition">
                    <X size={20} className="text-slate-400" />
                  </button>
                </div>
                <div>
                  <h2 className="text-3xl font-black text-slate-900 leading-tight">{selectedAsset.designation}</h2>
                  <p className="text-slate-400 font-medium mt-1">ID #{selectedAsset.id} · {selectedAsset.code || "Sans code"}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                <section className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Spécifications</h4>
                  <div className="grid grid-cols-2 gap-y-4">
                    {[
                      { label: "Type", value: selectedAsset.type?.name ?? selectedAsset.typeAsset?.name },
                      { label: "Sous-type", value: selectedAsset.sub_type?.name ?? selectedAsset.subTypeAsset?.name },
                      { label: "Site", value: selectedAsset.site?.nom },
                      { label: "N° Série", value: selectedAsset.serial_number },
                      { label: "Date acquisition", value: formatDate(selectedAsset.date_entree ?? selectedAsset.acquisition_date) },
                      { label: "Valeur d'acquisition", value: formatMontant(selectedAsset.valeur_entree ?? selectedAsset.acquisition_value) },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{label}</p>
                        <p className="text-sm font-black text-slate-900 mt-0.5">{value || "-"}</p>
                      </div>
                    ))}
                  </div>
                </section>

                {selectedAsset.description && (
                  <section className="space-y-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Description</h4>
                    <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100 italic">
                      "{selectedAsset.description}"
                    </p>
                  </section>
                )}
              </div>

              <div className="p-8 border-t border-slate-50 shrink-0">
                <button
                  onClick={() => setIsTicketModalOpen(true)}
                  className="w-full py-4 text-center rounded-2xl bg-slate-900 text-white font-black hover:bg-black transition shadow-xl shadow-slate-200"
                >
                  Signaler une anomalie
                </button>
              </div>
            </div>
          </>
        )}

      </main>

      {/* Modale de création de ticket */}
      {selectedAsset && (
        <ReusableForm
          isOpen={isTicketModalOpen}
          onClose={() => setIsTicketModalOpen(false)}
          title="Signaler un Problème"
          subtitle={`Équipement : ${selectedAsset.designation}`}
          fields={ticketFields}
          initialValues={{
            type: 'curatif',
            priority: 'moyenne',
            company_asset_id: selectedAsset.id
          }}
          isLoading={isTicketSubmitting}
          onSubmit={(values) => {
            // Récupération de l'image du formulaire (déjà un tableau File[] via ImageUpload)
            const attachments = (values as any).image || undefined;

            createTicket({
              ...values,
              company_asset_id: selectedAsset.id,
              site_id: selectedAsset.site_id,
              attachments
            } as any);
          }}
          submitLabel="Envoyer le ticket"
        />
      )}
    </div>
  );
}

// ─── X Icon ──────────────────────────────────────────────────────────────────
function X({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}