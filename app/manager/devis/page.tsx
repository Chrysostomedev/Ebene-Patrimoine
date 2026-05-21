"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import StatsCard from "@/components/StatsCard";
import DataTable from "@/components/DataTable";
import PageHeader from "@/components/PageHeader";
import Paginate from "@/components/Paginate";
import { Download, FileText, CheckCircle2, Clock, XCircle, AlertCircle, Eye, X, Filter, ChevronDown, ListFilter } from "lucide-react";
import type { ColumnConfig } from "@/components/DataTable";
import { useQuotes } from "../../../hooks/manager/useQuotes";
import type { Quote } from "../../../types/manager.types";
import { formatCurrency, formatDate } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any; className: string }> = {
  approved: { label: "Approuvé", color: "green", icon: CheckCircle2, className: "bg-emerald-50 text-emerald-600 border border-emerald-200" },
  approuvé: { label: "Approuvé", color: "green", icon: CheckCircle2, className: "bg-emerald-50 text-emerald-600 border border-emerald-200" },
  pending: { label: "En attente", color: "orange", icon: Clock, className: "bg-amber-50 text-amber-600 border border-amber-200" },
  rejected: { label: "Rejeté", color: "red", icon: XCircle, className: "bg-rose-50 text-rose-600 border border-rose-200" },
  rejeté: { label: "Rejeté", color: "red", icon: XCircle, className: "bg-rose-50 text-rose-600 border border-rose-200" },
  revision: { label: "À réviser", color: "amber", icon: Clock, className: "bg-sky-50 text-sky-600 border border-sky-200" },
  "en révision": { label: "À réviser", color: "amber", icon: Clock, className: "bg-sky-50 text-sky-600 border border-sky-200" },
  "en attente": { label: "En attente", color: "orange", icon: Clock, className: "bg-amber-50 text-amber-600 border border-amber-200" },
};

export default function DevisPage() {
  const {
    quotes,
    stats,
    meta,
    isLoading,
    error,
    setFilters,
    exportQuotes,
    filters: currentFilters
  } = useQuotes();

  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setFiltersOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fallbackTotalAmount = quotes.reduce((acc, q) => acc + (q.amount_ttc ?? q.total_amount_ttc ?? 0), 0);
  const fallbackTotalQuotes = quotes.length;
  const fallbackApproved = quotes.filter(q => q.status === "approved" || q.status === "validated").length;
  const fallbackPending = quotes.filter(q => q.status === "pending" || q.status === "en attente").length;

  const kpis = [
    { label: "Total des devis", value: isLoading ? 0 : (stats?.total ?? fallbackTotalQuotes), delta: "+0%", trend: "up" as const },
    { label: "Devis en attente", value: isLoading ? 0 : (stats?.pending ?? fallbackPending), delta: "+0%", trend: "up" as const },
    { label: "Devis approuvés", value: isLoading ? 0 : (stats?.approved ?? fallbackApproved), delta: "+0%", trend: "up" as const },
    { label: "Montant approuvé", value: isLoading ? 0 : formatCurrency(stats?.total_approved_amount ?? fallbackTotalAmount), delta: "+0%", trend: "up" as const, isCurrency: true },
  ];

  const columns: ColumnConfig<Quote>[] = [
    {
      header: "Référence",
      key: "reference",
      render: (val) => <span className="font-black text-slate-900 text-sm">{val as string}</span>
    },
    {
      header: "Prestataire",
      key: "provider",
      render: (_, row) => (
        <span className="font-bold text-slate-700">{row.provider?.company_name || row.provider?.name || "-"}</span>
      )
    },
    {
      header: "Site",
      key: "site",
      render: (_, row) => (
        <span className="text-slate-600">{row.site?.nom || row.site?.name || "-"}</span>
      )
    },
    {
      header: "Montant TTC",
      key: "amount_ttc",
      render: (_, row) => (
        <span className="font-bold text-slate-900">
          {formatCurrency(row.amount_ttc ?? 0)}
        </span>
      )
    },
    {
      header: "Date",
      key: "created_at",
      render: (val) => <span className="text-slate-500">{formatDate(val as string)}</span>
    },
    {
      header: "Statut",
      key: "status",
      render: (val) => {
        const s = (val as string)?.toLowerCase().trim() || "pending";
        const cfg = STATUS_CONFIG[s] || STATUS_CONFIG.pending;
        return (
          <span className={`inline-flex items-center justify-center min-w-[90px] px-3 py-1.5 rounded-xl text-xs font-bold ${cfg.className}`}>
            {cfg.label}
          </span>
        );
      }
    },
    {
      header: "Actions",
      key: "id",
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/manager/devis/details/${row.id}`)}
            className="group p-2 rounded-xl bg-white border border-slate-100 transition flex items-center justify-center hover:bg-slate-900 hover:text-white"
            title="Voir la fiche complète"
          >
            <Eye size={16} />
          </button>
        </div>
      )
    }
  ];

  return (
    <>
      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar />

        <main className="mt-20 p-6 space-y-8 overflow-y-auto h-[calc(100vh-80px)]">
          <PageHeader
            title="Devis"
            subtitle="Consultez et suivez les devis transmis par vos prestataires."
          />

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 px-6 py-4 rounded-2xl text-sm font-semibold mb-4">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis.map((k, i) => <StatsCard key={i} {...k} />)}
          </div>

          <div className="shrink-0 flex justify-end items-center gap-3">
            <div className="relative" ref={filterRef}>
              <button
                onClick={() => setFiltersOpen(!filtersOpen)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition ${filtersOpen || currentFilters.status ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
              >
                <Filter size={16} /> Filtrer par
                {currentFilters.status && <span className="ml-1 bg-white text-slate-900 text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center">1</span>}
              </button>
              <FilterDropdown isOpen={filtersOpen} onClose={() => setFiltersOpen(false)} currentStatus={currentFilters.status} onApply={(s) => setFilters({ status: s || undefined })} />
            </div>

            <button
              onClick={exportQuotes}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-bold hover:bg-slate-50 transition"
            >
              <Download size={16} /> Exporter
            </button>
          </div>

          {currentFilters.status && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Filtré par :</span>
              <span className="flex items-center gap-1.5 bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded-full">
                {STATUS_CONFIG[currentFilters.status]?.label ?? currentFilters.status}
                <button onClick={() => setFilters({ status: undefined })} className="hover:opacity-70 transition"><X size={12} /></button>
              </span>
            </div>
          )}

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <DataTable
              columns={columns}
              data={isLoading ? [] : quotes}
              title="Liste des devis"
              onSearchChange={(q) => setFilters({ search: q || undefined })}
              isLoading={isLoading}
            />
            {meta && meta.last_page > 1 && (
              <div className="p-6 border-t border-slate-50 flex justify-end bg-slate-50/30">
                <Paginate currentPage={meta.current_page} totalPages={meta.last_page} onPageChange={(p) => setFilters({ page: p })} />
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

function FilterDropdown({
  isOpen, onClose, currentStatus, onApply,
}: {
  isOpen: boolean; onClose: () => void;
  currentStatus?: string; onApply: (status: string) => void;
}) {
  const [local, setLocal] = useState(currentStatus || "");
  useEffect(() => { setLocal(currentStatus || ""); }, [currentStatus]);
  if (!isOpen) return null;

  const options = [
    { val: "", label: "Tous" },
    { val: "pending", label: "En attente" },
    { val: "approved", label: "Approuvés" },
    { val: "rejected", label: "Rejetés" },
    { val: "revision", label: "En révision" },
  ];

  return (
    <div className="absolute right-0 top-full mt-2 z-50 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <span className="text-sm font-black text-slate-900 uppercase tracking-widest">Filtres</span>
        <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition">
          <X size={16} className="text-slate-500" />
        </button>
      </div>
      <div className="p-5">
        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Statut</label>
        <div className="flex flex-col gap-2 mt-2">
          {options.map(({ val, label }) => (
            <button
              key={val}
              onClick={() => setLocal(val)}
              className={`w-full text-left px-4 py-2 rounded-xl text-sm font-semibold transition ${local === val
                ? "bg-slate-900 text-white"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="px-5 py-4 border-t border-slate-100 flex gap-3">
        <button onClick={() => { setLocal(""); onApply(""); onClose(); }}
          className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition">
          Réinitialiser
        </button>
        <button onClick={() => { onApply(local); onClose(); }}
          className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition">
          Appliquer
        </button>
      </div>
    </div>
  );
}
