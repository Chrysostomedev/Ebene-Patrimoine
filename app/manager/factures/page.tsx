"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import StatsCard from "@/components/StatsCard";
import DataTable from "@/components/DataTable";
import PageHeader from "@/components/PageHeader";
import SearchInput from "@/components/SearchInput";
import { Download, FileText, CheckCircle2, AlertCircle, Clock, XCircle } from "lucide-react";
import type { ColumnConfig } from "@/components/DataTable";

import { useInvoices } from "../../../hooks/manager/useInvoices";
import type { Invoice, InvoiceStatus } from "../../../types/manager.types";

/* -------------------------------------------------------------------------- */
/*                                  STATUS                                     */
/* -------------------------------------------------------------------------- */

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; icon: any }> = {
  paid:      { label: "Payée",      color: "green",  icon: CheckCircle2 },
  pending:   { label: "En attente", color: "orange", icon: Clock },
  unpaid:    { label: "Non payée",  color: "red",    icon: AlertCircle },
  overdue:   { label: "En retard",  color: "rose",   icon: AlertCircle },
  cancelled: { label: "Annulée",    color: "slate",  icon: XCircle },
};

/* -------------------------------------------------------------------------- */
/*                                   PAGE                                     */
/* -------------------------------------------------------------------------- */

export default function FacturesPage() {
  const {
    invoices,
    stats,
    isLoading,
    error,
    search,
    setFilters,
    exportInvoices
  } = useInvoices();

  const [activeTab, setActiveTab] = useState<InvoiceStatus | "all">("all");

  const handleTabChange = (status: InvoiceStatus | "all") => {
    setActiveTab(status);
    setFilters({ payment_status: status === "all" ? undefined : status });
  };

  const kpis = [
    {
      label: "Total Facturé",
      value: `${(stats?.total_amount ?? 0).toLocaleString()} FCFA`,
      delta: `${stats?.total_invoices ?? 0} facture(s)`,
      trend: "up" as const
    },
    {
      label: "Montant Payé",
      value: `${(stats?.paid_amount ?? stats?.total_paid_amount ?? 0).toLocaleString()} FCFA`,
      delta: `${stats?.total_paid ?? 0} payée(s)`,
      trend: "up" as const
    },
    {
      label: "Reste à Recouvrer",
      value: `${(stats?.unpaid_amount ?? stats?.total_unpaid_amount ?? 0).toLocaleString()} FCFA`,
      delta: `${stats?.total_unpaid ?? 0} impayée(s)`,
      trend: "down" as const
    }
  ];

  /* ------------------------------ COLUMNS ---------------------------------- */

  const columns: ColumnConfig<Invoice>[] = [
    {
      header: "Référence",
      key: "reference",
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
            <FileText size={16} />
          </div>
          <span className="font-black text-slate-900">{row.reference}</span>
        </div>
      )
    },
    {
      header: "Prestataire",
      key: "provider",
      render: (_, row) => (
         <div className="flex flex-col">
            <span className="font-bold text-slate-700">{row.provider?.company_name || row.provider?.name || "-"}</span>
            <span className="text-[10px] text-slate-400 uppercase font-black">{row.provider?.phone || "Pas de tel"}</span>
         </div>
      )
    },
   
    {
      header: "Date",
      key: "invoice_date",
      render: (val) => <span className="text-slate-500">{val ? new Date(val as string).toLocaleDateString() : "-"}</span>
    },
    {
      header: "Montant TTC",
      key: "amount_ttc",
      render: (_, row) => (
        <span className="font-black text-slate-900">
          {(row.total_amount_ttc ?? row.amount_ttc ?? 0).toLocaleString()} <small className="text-[10px] text-slate-400">FCFA</small>
        </span>
      )
    },
    {
      header: "Statut",
      key: "status",
      render: (_, row) => {
        const s = row.payment_status || row.status || "pending";
        const cfg = STATUS_CONFIG[s as InvoiceStatus] || STATUS_CONFIG.pending;
        const Icon = cfg.icon;
        return (
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider
            ${s === "paid" ? "bg-green-50 text-green-600" :
              s === "pending" ? "bg-orange-50 text-orange-600" :
              s === "unpaid" || s === "overdue" ? "bg-red-50 text-red-600" :
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
          {row.pdf_path && (
            <button
              onClick={() => window.open(row.pdf_path, "_blank")}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-900 transition"
              title="Voir PDF"
            >
              <FileText size={18} />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar />

        <main className="mt-20 p-8 space-y-8 overflow-y-auto h-[calc(100vh-80px)]">
          <PageHeader
            title="Factures"
            subtitle="Suivez les paiements et gérez la facturation de vos sites."
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
                {(["all", "paid", "pending", "unpaid"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => handleTabChange(tab)}
                    className={`py-5 text-xs font-black uppercase tracking-widest transition relative
                      ${activeTab === tab ? "text-slate-900" : "text-slate-400 hover:text-slate-600"}`}
                  >
                    {tab === "all" ? "Toutes" : STATUS_CONFIG[tab as InvoiceStatus].label}
                    {activeTab === tab && (
                      <div className="absolute bottom-0 left-0 w-full h-0.5 bg-slate-900 rounded-full" />
                    )}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={exportInvoices}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase text-slate-600 hover:text-slate-900 transition"
                >
                  <Download size={14} /> Exporter (.xlsx)
                </button>
              </div>
            </div>

            <div className="p-8 space-y-6">
              

               <DataTable
                 columns={columns}
                 data={invoices}
                 title="Liste des factures"
               />
            </div>
          </div>
        </main>
      </div>
  );
}