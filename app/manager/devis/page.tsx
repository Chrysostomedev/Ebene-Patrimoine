"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import StatsCard from "@/components/StatsCard";
import DataTable from "@/components/DataTable";
import PageHeader from "@/components/PageHeader";
import { Download, FileText, CheckCircle2, Clock, XCircle, AlertCircle, Eye, X, Copy, Info } from "lucide-react";
import type { ColumnConfig } from "@/components/DataTable";

import { useQuotes } from "../../../hooks/manager/useQuotes";
import type { Quote } from "../../../types/manager.types";

/* -------------------------------------------------------------------------- */
/*                                  STATUS                                     */
/* -------------------------------------------------------------------------- */

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  approved: { label: "Approuvé", color: "green", icon: CheckCircle2 },
  pending: { label: "En attente", color: "orange", icon: Clock },
  rejected: { label: "Rejeté", color: "red", icon: XCircle },
  validated: { label: "Validé", color: "blue", icon: CheckCircle2 },
  invalidated: { label: "Invalidé", color: "rose", icon: AlertCircle },
  revision: { label: "À réviser", color: "amber", icon: Clock },
  "en attente": { label: "En attente", color: "orange", icon: Clock },
};

/* -------------------------------------------------------------------------- */
/*                                   PAGE                                     */
/* -------------------------------------------------------------------------- */

export default function DevisPage() {
  const {
    quotes,
    stats,
    isLoading,
    error,
    setFilters,
    exportQuotes
  } = useQuotes();

  const [activeTab, setActiveTab] = useState<string>("all");
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const router = useRouter();

  const handleTabChange = (status: string) => {
    setActiveTab(status);
    setFilters({ status: status === "all" ? undefined : status });
  };

  // ─── Fallback stats if API returns 0 but list is not empty ────────────────
  const fallbackTotalAmount = quotes.reduce((acc, q) => acc + (q.amount_ttc ?? q.total_amount_ttc ?? 0), 0);
  const fallbackTotalQuotes = quotes.length;
  const fallbackApproved = quotes.filter(q => q.status === "approved" || q.status === "validated").length;
  const fallbackPending = quotes.filter(q => q.status === "pending" || q.status === "en attente").length;

  const kpis = [
    {
      label: "Total Approuvé",
      value: `${(stats?.total_approved_amount || fallbackTotalAmount).toLocaleString()} FCFA`,
      delta: `${stats?.total ?? fallbackTotalQuotes} devis total`,
      trend: "up" as const
    },
    {
      label: "Devis Approuvés",
      value: `${(stats?.approved || fallbackApproved)}`,
      delta: "Validés par manager",
      trend: "up" as const
    },
    {
      label: "En attente",
      value: `${(stats?.pending || fallbackPending)}`,
      delta: "Action requise",
      trend: "down" as const
    }
  ];

  /* ------------------------------ COLUMNS ---------------------------------- */

  const columns: ColumnConfig<Quote>[] = [
    {
      header: "Référence",
      key: "reference",
      render: (val) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
            <FileText size={16} />
          </div>
          <span className="font-black text-slate-900">{val as string}</span>
        </div>
      )
    },
    {
      header: "Prestataire",
      key: "provider",
      render: (_, row) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-700">{row.provider?.company_name || row.provider?.name || "-"}</span>
        </div>
      )
    },

    {
      header: "Date",
      key: "created_at",
      render: (val) => <span className="text-slate-500">{val ? new Date(val as string).toLocaleDateString() : "-"}</span>
    },
    {
      header: "Montant TTC",
      key: "amount_ttc",
      render: (_, row) => (
        <span className="font-black text-slate-900">
          {(row.amount_ttc ?? 0).toLocaleString()} <small className="text-[10px] text-slate-400">FCFA</small>
        </span>
      )
    },
    {
      header: "Statut",
      key: "status",
      render: (val) => {
        const s = (val as string)?.toLowerCase() || "pending";
        const cfg = STATUS_CONFIG[s] || STATUS_CONFIG.pending;
        const Icon = cfg.icon;
        return (
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider
            ${s === "approved" || s === "validated" ? "bg-green-50 text-green-600" :
              s === "pending" || s === "en attente" || s === "revision" ? "bg-orange-50 text-orange-600" :
                s === "rejected" || s === "invalidated" ? "bg-red-50 text-red-600" :
                  "bg-slate-50 text-slate-600"}`}
          >
            <Icon size={12} />
            {cfg.label}
          </div>
        );
      }
    },
    {
      header: "Actions",
      key: "id",
      render: (_, row) => (
        <div className="flex items-center gap-2">

          <button
            onClick={() => router.push(`/manager/devis/details/${row.id}`)}
            className="p-2 hover:bg-slate-900 hover:text-white border border-slate-100 rounded-xl transition text-slate-400"
            title="Voir la fiche complète"
          >
            <Eye size={18} />
          </button>
        </div>
      )
    }
  ];

  return (
    <>
      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar />

        <main className="mt-20 p-8 space-y-8 overflow-y-auto h-[calc(100vh-80px)]">
          <PageHeader
            title="Devis"
            subtitle="Consultez et validez les devis transmis par vos prestataires."
          />

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 px-6 py-4 rounded-2xl text-sm font-semibold mb-4">
              {error}
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {kpis.map((k, i) => <StatsCard key={i} {...k} />)}
          </div>

          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
            {/* Tabs */}
            <div className="flex items-center justify-between px-8 border-b border-slate-50 bg-slate-50/50">
              <div className="flex gap-8">
                {(["all", "pending", "approved", "rejected"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => handleTabChange(tab)}
                    className={`py-5 text-xs font-black uppercase tracking-widest transition relative
                      ${activeTab === tab ? "text-slate-900" : "text-slate-400 hover:text-slate-600"}`}
                  >
                    {tab === "all" ? "Tous" : STATUS_CONFIG[tab].label}
                    {activeTab === tab && (
                      <div className="absolute bottom-0 left-0 w-full h-0.5 bg-slate-900 rounded-full" />
                    )}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={exportQuotes}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase text-slate-600 hover:text-slate-900 transition"
                >
                  <Download size={14} /> Exporter
                </button>
              </div>
            </div>

            <div className="p-8 space-y-6">

              <DataTable
                columns={columns}
                data={quotes}
                title="Liste des devis"
              />
            </div>
          </div>
        </main>
      </div>

      {/* ── SideModal Devis ── */}
      {selectedQuote && (
        <>
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={() => setSelectedQuote(null)} />
          <div className="fixed right-0 top-0 h-full w-[420px] bg-white z-50 shadow-2xl flex flex-col rounded-l-3xl overflow-hidden">
            <div className="flex items-start px-6 pt-6 pb-0 shrink-0">
              <button onClick={() => setSelectedQuote(null)} className="p-1.5 hover:bg-slate-100 rounded-xl transition -ml-1">
                <X size={18} className="text-slate-500" />
              </button>
            </div>
            <div className="px-6 pt-4 pb-5 shrink-0">
              <h2 className="text-2xl font-black text-slate-900">Devis #{selectedQuote.id}</h2>
              <p className="text-slate-400 text-xs mt-0.5">Retrouvez les détails du devis en dessous</p>
            </div>
            <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-0">
              {[
                { label: "Référence", value: selectedQuote.reference },
                { label: "Prestataire", value: selectedQuote.provider?.company_name ?? selectedQuote.provider?.name ?? "-" },
                { label: "Site", value: selectedQuote.site?.nom ?? selectedQuote.site?.name ?? "-" },
                { label: "Date", value: selectedQuote.created_at ? new Date(selectedQuote.created_at).toLocaleDateString("fr-FR") : "-" },
                { label: "Montant HT", value: `${(selectedQuote.amount_ht ?? 0).toLocaleString()} FCFA` },
                { label: "Montant TTC", value: `${(selectedQuote.amount_ttc ?? selectedQuote.total_amount_ttc ?? 0).toLocaleString()} FCFA` },
              ].map((f, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                  <p className="text-xs text-slate-400 font-medium">{f.label}</p>
                  <p className="text-sm font-bold text-slate-900">{f.value}</p>
                </div>
              ))}
              <div className="flex items-center justify-between py-3">
                <p className="text-xs text-slate-400 font-medium">Statut</p>
                {(() => {
                  const s = (selectedQuote.status ?? "pending").toLowerCase();
                  const cfg = STATUS_CONFIG[s] ?? STATUS_CONFIG.pending;
                  const Icon = cfg.icon;
                  return (
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase ${s === "approved" || s === "validated" ? "bg-green-50 text-green-600" :
                      s === "pending" || s === "en attente" ? "bg-orange-50 text-orange-600" :
                        s === "rejected" ? "bg-red-50 text-red-600" : "bg-slate-50 text-slate-600"
                      }`}>
                      <Icon size={12} />{cfg.label}
                    </div>
                  );
                })()}
              </div>
              {selectedQuote.description && (
                <div className="pt-4">
                  <p className="text-xs text-slate-400 font-medium mb-2">Description</p>
                  <div
                    className="prose prose-sm max-w-none text-slate-700 bg-slate-50 rounded-xl p-4 border border-slate-100 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: selectedQuote.description ?? "" }}
                  />
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}