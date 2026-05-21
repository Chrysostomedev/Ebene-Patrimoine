"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import DataTable from "@/components/DataTable";
import Paginate from "@/components/Paginate";
import {
  ClipboardList, Search, Filter, Eye, Calendar, MapPin,
  User, CheckCircle2, AlertCircle, Info, Loader2, Wrench,
  Download, X
} from "lucide-react";
import ActionGroup from "@/components/ActionGroup";
import { TicketService, Ticket } from "@/services/admin/ticket.service";
import { formatDate } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

export default function AdminPreventiveTicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filters, setFilters] = useState<any>({
    page: 1,
    per_page: 15,
    type: "preventif",
    status: undefined,
    search: "",
  });
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await TicketService.getTickets(filters);
      setTickets(res.items);
      setMeta(res.meta);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await TicketService.exportTickets(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tickets_preventifs_admin_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
    }
  };

  useEffect(() => {
    setFilters((prev: any) => ({
      ...prev,
      date_debut: dateRange?.from ? dateRange.from.toISOString().split('T')[0] : undefined,
      date_fin: dateRange?.to ? dateRange.to.toISOString().split('T')[0] : undefined,
      page: 1
    }));
  }, [dateRange]);

  useEffect(() => {
    fetchTickets();
  }, [filters]);

  const STATUS_STYLE: Record<string, string> = {
    "SIGNALÉ": "bg-slate-100 border-slate-300 text-slate-700",
    "VALIDÉ": "bg-blue-50 border-blue-400 text-blue-700",
    "ASSIGNÉ": "bg-violet-50 border-violet-400 text-violet-700",
    "PLANIFIÉ": "bg-sky-50 border-sky-400 text-sky-700",
    "EN_COURS": "bg-orange-50 border-orange-400 text-orange-600",
    "RAPPORTÉ": "bg-amber-50 border-amber-400 text-amber-700",
    "ÉVALUÉ": "bg-emerald-50 border-emerald-400 text-emerald-700",
    "CLOS": "bg-black border-black text-white",
  };

  const columns = [
    {
      header: "Référence",
      key: "code_ticket",
      render: (_: any, row: Ticket) => (
        <span className="font-black text-slate-900 font-mono text-xs">{row.code_ticket || `#${row.id}`}</span>
      )
    },
    {
      header: "Site ",
      key: "site",
      render: (_: any, row: Ticket) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <MapPin size={12} className="text-slate-400" />
            <span className="text-xs font-bold text-slate-600">{row.site?.nom || "—"}</span>
          </div>
          {/* <div className="flex items-center gap-1.5">
                <Wrench size={12} className="text-slate-400" />
                <span className="text-[10px] font-medium text-slate-400">{row.asset?.designation || "—"}</span>
            </div> */}
        </div>
      )
    },
    {
      header: "Prestataire",
      key: "provider",
      render: (_: any, row: Ticket) => (
        <div className="flex items-center gap-2">
          <User size={14} className="text-slate-400" />
          <span className="font-medium text-slate-600">{(row.provider as any)?.company_name || row.provider?.name || "—"}</span>
        </div>
      )
    },
    {
      header: "Date prévue",
      key: "planned_at",
      render: (_: any, row: Ticket) => (
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-slate-400" />
          <span className="text-xs text-slate-500 font-medium">{formatDate(row.planned_at)}</span>
        </div>
      )
    },
    {
      header: "Statut",
      key: "status",
      render: (_: any, row: Ticket) => {
        const s = row.status?.toUpperCase();
        return (
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${STATUS_STYLE[s] ?? "bg-slate-50 border-slate-200 text-slate-500"}`}>
            {s}
          </span>
        );
      }
    },
    {
      header: "Actions",
      key: "actions",
      render: (_: any, row: Ticket) => (
        <button
          onClick={() => router.push(`/admin/preventif/${row.id}`)}
          className="p-2 hover:bg-slate-100 rounded-xl transition text-slate-400 hover:text-slate-900"
          title="Voir le ticket"
        >
          <Eye size={18} />
        </button>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Navbar />
      <main className="mt-20 p-8 space-y-8">
        <PageHeader
          title="Tickets Préventifs"
          subtitle="Gérez les interventions préventives automatiques générées par le système."
        />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-3 flex-1 max-w-2xl">
            <select
              value={filters.status || ""}
              onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined, page: 1 })}
              className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs font-black text-slate-700 outline-none focus:border-slate-400 cursor-pointer shadow-sm min-w-[180px] uppercase tracking-wider"
            >
              <option value="">Tous les statuts</option>
              <option value="SIGNALÉ">Signalé</option>
              <option value="PLANIFIÉ">Planifié</option>
              <option value="EN_COURS">En cours</option>
              <option value="RAPPORTÉ">Rapporté</option>
              <option value="ÉVALUÉ">Évalué</option>
              <option value="CLOS">Clos</option>
            </select>
          </div>

          <ActionGroup
            actions={[
              { label: "Actualiser", icon: X, onClick: () => { setFilters({ page: 1, per_page: 15, type: "preventif" }); setDateRange(undefined); }, variant: "secondary" as const },
              { label: "Exporter (.xlsx)", icon: Download, onClick: handleExport, variant: "secondary" as const },
            ]}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
        </div>

        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
          <DataTable
            title="Interventions Préventives"
            columns={columns}
            data={tickets}
            isLoading={loading}
            onSearchChange={(q) => setFilters({ ...filters, search: q, page: 1 })}
            pagination={{
              currentPage: filters.page,
              totalPages: meta?.last_page || 1,
              onPageChange: (p) => setFilters({ ...filters, page: p }),
            }}
          />
        </div>
      </main>
    </div>
  );
}
