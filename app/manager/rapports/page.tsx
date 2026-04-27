"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import {
  Eye, Filter, Download, X,
  CheckCircle2, Clock, FileText, Star,
  ArrowUpRight,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import StatsCard from "@/components/StatsCard";
import DataTable, { ColumnConfig } from "@/components/DataTable";
import Paginate from "@/components/Paginate";
import PageHeader from "@/components/PageHeader";

import { useReports } from "../../../hooks/manager/useReports";
import { InterventionReport } from "../../../types/manager.types";

// ─────────────── HELPERS ───────────────
const formatDate = (iso?: string | null): string => {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

// ─────────────── STATUS & TYPE BADGES ───────────────
const STATUS_STYLES: Record<string, string> = {
  validated: "border-emerald-200 bg-emerald-50 text-emerald-600",
  pending: "border-amber-200 bg-amber-50 text-amber-600",
  submitted: "border-blue-200 bg-blue-50 text-blue-600",
  rejected: "border-rose-200 bg-rose-50 text-rose-600",
};
const STATUS_LABELS: Record<string, string> = {
  validated: "Validé",
  pending: "En attente",
  submitted: "Soumis",
  rejected: "Rejeté",
};

function StatusBadge({ status }: { status?: string }) {
  const s = status ?? "pending";
  return (
    <span className={`inline-flex items-center justify-center min-w-[90px] px-3 py-1.5 rounded-xl border text-xs font-bold ${STATUS_STYLES[s] ?? "border-slate-200 bg-slate-50 text-slate-500"}`}>
      {s === "validated" ? <CheckCircle2 size={11} className="mr-1" /> : <Clock size={11} className="mr-1" />}
      {STATUS_LABELS[s] ?? s}
    </span>
  );
}

function TypeBadge({ type }: { type?: string }) {
  const isCuratif = type === "curatif";
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold ${isCuratif ? "bg-orange-50 text-orange-600 border border-orange-200" : "bg-blue-50 text-blue-600 border border-blue-200"}`}>
      {isCuratif ? "Curatif" : "Préventif"}
    </span>
  );
}

function StarRating({ value }: { value?: number | null }) {
  if (!value) return <span className="text-slate-400 text-xs">-</span>;
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} size={13} className={i < value ? "fill-yellow-400 text-yellow-400" : "fill-slate-200 text-slate-200"} />
      ))}
    </div>
  );
}

// ─────────────── SIDE PANEL ───────────────
function ReportSidePanel({ report, onClose }: { report: InterventionReport | null; onClose: () => void }) {
  if (!report) return null;

  const providerName = report.provider?.company_name ?? report.provider?.name ?? "-";
  const siteName = report.site?.nom ?? report.site?.name ?? "-";
  const ticketSubject = report.ticket?.subject ?? `Ticket #${report.ticket_id}`;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[440px] bg-white z-50 shadow-2xl flex flex-col rounded-l-3xl overflow-hidden">
        <div className="flex items-start px-6 pt-6 pb-0 shrink-0">
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-xl transition -ml-1">
            <X size={18} className="text-slate-500" />
          </button>
        </div>
        <div className="px-6 pt-4 pb-5 shrink-0">
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-black text-slate-900">Rapport {report.reference}</h2>
            <StatusBadge status={report.status} />
          </div>
          <p className="text-slate-400 text-xs">{ticketSubject}</p>
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-5">
          <div className="space-y-0">
            {[
              { label: "Prestataire", value: providerName },
              { label: "Site", value: siteName },
              { label: "Type", render: () => <TypeBadge type={report.intervention_type} /> },
              { label: "Début", value: formatDate(report.start_date) },
              { label: "Fin", value: formatDate(report.end_date) },
              { label: "Créé le", value: formatDate(report.created_at) },
            ].map((f, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                <p className="text-xs text-slate-400 font-medium">{f.label}</p>
                {f.render ? f.render() : <p className="text-sm font-bold text-slate-900">{f.value}</p>}
              </div>
            ))}
          </div>
        </div>
        <div className="px-6 py-5 border-t border-slate-100 shrink-0">
          <Link
            href={`/manager/rapports/details/${report.id}`}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition"
          >
            <Eye size={15} /> Voir les détails
          </Link>
        </div>
      </div>
    </>
  );
}

// ─────────────── MAIN PAGE ───────────────
export default function RapportsPage() {
  const {
    reports, stats, meta, filters, isLoading, error: apiError,
    setFilters, exportReports
  } = useReports();

  const [selectedReport, setSelectedReport] = useState<InterventionReport | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const activeCount = Object.values(filters).filter((v, i) => i > 1 && !!v).length;

  const kpis = [
    { label: "Total rapports", value: stats?.total ?? 0, delta: "", trend: "up" as const },
    { label: "Rapports validés", value: stats?.validated ?? 0, delta: "", trend: "up" as const },
    { label: "En attente", value: stats?.pending ?? 0, delta: "", trend: "up" as const },
    { label: "Note moyenne", value: stats?.average_rating ? `${stats.average_rating}/5` : "-", delta: "", trend: "up" as const },
  ];

  const columns: ColumnConfig<InterventionReport>[] = [
    { header: "Reference", key: "reference", render: (_: any, row: InterventionReport) => <span className="font-black text-slate-900 text-sm">{row.reference}</span> },
    { header: "Ticket", key: "ticket" as any, render: (_: any, row: InterventionReport) => row.ticket?.code_ticket ?? `${row.ticket_code_ticket}` },
    { header: "Prestataire", key: "provider" as any, render: (_: any, row: InterventionReport) => row.provider?.company_name ?? row.provider?.name ?? "-" },
    { header: "Type", key: "intervention_type" as any, render: (_: any, row: InterventionReport) => <TypeBadge type={row.intervention_type} /> },
    { header: "Date", key: "created_at", render: (_: any, row: InterventionReport) => formatDate(row.created_at) },
    { header: "Statut", key: "status", render: (_: any, row: InterventionReport) => <StatusBadge status={row.status} /> },
    {
      header: "Actions", key: "actions" as any, render: (_: any, row: InterventionReport) => (
        <div className="flex items-center gap-3">

          <Link href={`/manager/rapports/details/${row.id}`} className="group p-2 rounded-xl bg-white hover:bg-black border border-slate-200 transition flex items-center justify-center">
            <Eye size={16} className="text-slate-600 group-hover:text-white group-hover:rotate-45 transition-all" />
          </Link>
        </div>
      )
    },
  ];

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Navbar />
      <main className="mt-20 p-8 space-y-8 overflow-y-auto h-[calc(100vh-80px)]">
        <PageHeader
          title="Rapports d'intervention"
          subtitle="Analysez et validez les rapports techniques soumis par vos prestataires."
        />

        {apiError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl text-sm font-semibold flex items-center gap-3">
            <FileText size={18} /> {apiError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpis.map((k, i) => <StatsCard key={i} {...k} />)}
        </div>

        <div className="flex justify-between items-center gap-4">
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl border text-sm font-bold transition shadow-sm
                ${filtersOpen || activeCount > 0 ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
            >
              <Filter size={16} /> Filtrer les rapports
              {activeCount > 0 && <span className="ml-1 bg-white text-slate-900 text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center">{activeCount}</span>}
            </button>
            
            {filtersOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setFiltersOpen(false)} />
                <div className="absolute top-full mt-2 left-0 w-72 bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 z-20 animate-in fade-in zoom-in-95 duration-200">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Statut</label>
                      <select
                        value={filters.status || ""}
                        onChange={(e) => setFilters({ status: e.target.value || undefined })}
                        className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/5 transition-all cursor-pointer"
                      >
                        <option value="">Tous les statuts</option>
                        {Object.entries(STATUS_LABELS).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Type d'intervention</label>
                      <select
                        value={filters.intervention_type || ""}
                        onChange={(e) => setFilters({ intervention_type: e.target.value || undefined })}
                        className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/5 transition-all cursor-pointer"
                      >
                        <option value="">Tous les types</option>
                        <option value="curatif">Curatif</option>
                        <option value="preventif">Préventif</option>
                      </select>
                    </div>

                    <button
                      onClick={() => {
                        setFilters({ page: 1 });
                        setFiltersOpen(false);
                      }}
                      className="w-full py-3 rounded-2xl bg-rose-50 text-rose-600 text-xs font-black uppercase tracking-widest hover:bg-rose-100 transition-all"
                    >
                      Réinitialiser
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
          <button
            onClick={exportReports}
            className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-800 text-sm font-black hover:border-slate-900 transition shadow-sm"
          >
            <Download size={16} /> Exporter (.xlsx)
          </button>
        </div>

        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden min-h-[500px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
              <div className="w-10 h-10 border-4 border-slate-100 border-t-slate-900 rounded-full animate-spin" />
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Chargement en cours</p>
            </div>
          ) : (
            <>
              <div className="p-2">
                <DataTable
                  title="Liste des rapports soumis"
                  columns={columns}
                  data={reports}
                  onViewAll={() => { }}
                />    </div>
              {meta && meta.last_page > 1 && (
                <div className="px-8 py-6 border-t border-slate-50 flex justify-end bg-slate-50/20">
                  <Paginate currentPage={meta.current_page} totalPages={meta.last_page} onPageChange={(p) => setFilters({ page: p })} />
                </div>
              )}
            </>
          )}
        </div>

        <ReportSidePanel report={isDetailsOpen ? selectedReport : null} onClose={() => setIsDetailsOpen(false)} />
      </main>
    </div>
  );
}