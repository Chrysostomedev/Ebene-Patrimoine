// app/admin/factures/page.tsx
// VERSION 100% STATIQUE (aucune API / aucune DB)

import Link from "next/link";
import {
  Eye,
  Filter,
  Upload,
  ArrowUpRight,
} from "lucide-react";

import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import StatsCard from "@/components/StatsCard";
import DataTable from "@/components/DataTable";
import Paginate from "@/components/Paginate";
import PageHeader from "@/components/PageHeader";

// ═════════════════════════════════════
// TYPES
// ═════════════════════════════════════

type Invoice = {
  id: number;
  reference: string;
  provider: { company_name: string };
  site: { nom: string };
  invoice_date: string;
  amount_ttc: number;
  payment_status: "paid" | "pending" | "overdue" | "cancelled";
};

// ═════════════════════════════════════
// MOCK DATA (statique)
// ═════════════════════════════════════

const invoices: Invoice[] = [
  {
    id: 1,
    reference: "FAC-2025-001",
    provider: { company_name: "Tech Maintenance CI" },
    site: { nom: "Abidjan Plateau" },
    invoice_date: "2025-01-10",
    amount_ttc: 350000,
    payment_status: "paid",
  },
  {
    id: 2,
    reference: "FAC-2025-002",
    provider: { company_name: "Clima Services" },
    site: { nom: "Marcory Zone 4" },
    invoice_date: "2025-01-18",
    amount_ttc: 120000,
    payment_status: "pending",
  },
  {
    id: 3,
    reference: "FAC-2025-003",
    provider: { company_name: "ElecPro CI" },
    site: { nom: "Cocody Riviera" },
    invoice_date: "2025-02-02",
    amount_ttc: 540000,
    payment_status: "overdue",
  },
];

// ═════════════════════════════════════
// HELPERS
// ═════════════════════════════════════

const formatMontant = (v: number): string => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M FCFA`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}K FCFA`;
  return `${v.toLocaleString("fr-FR")} FCFA`;
};

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

// ═════════════════════════════════════
// STATUS BADGE
// ═════════════════════════════════════

const STATUS_STYLES: Record<string, string> = {
  paid: "border-black bg-black text-white",
  pending: "border-slate-300 bg-slate-100 text-slate-700",
  overdue: "border-red-500 bg-red-100 text-red-600",
  cancelled: "border-slate-400 bg-slate-100 text-slate-500",
};

const STATUS_LABELS: Record<string, string> = {
  paid: "Payée",
  pending: "En attente",
  overdue: "En retard",
  cancelled: "Annulée",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center min-w-[90px] px-3 py-1.5 rounded-xl border text-xs font-bold ${
        STATUS_STYLES[status] ?? ""
      }`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ═════════════════════════════════════
// PAGE PRINCIPALE
// ═════════════════════════════════════

export default function FacturesPage() {
  const totalAmount = invoices.reduce((s, i) => s + i.amount_ttc, 0);
  const avgCost = Math.round(totalAmount / invoices.length);

  const stats = {
    total_invoices: invoices.length,
    total_paid: invoices.filter((i) => i.payment_status === "paid").length,
    total_unpaid: invoices.filter((i) => i.payment_status === "pending").length,
  };

  const kpis = [
    { label: "Coût moyen par facture", value: avgCost, delta: "+3%", trend: "up" as const, isCurrency: true },
    { label: "Nombre total de factures", value: stats.total_invoices, delta: "+3%", trend: "up" as const },
    { label: "Factures en attente", value: stats.total_unpaid, delta: "+0%", trend: "up" as const },
    { label: "Factures payées", value: stats.total_paid, delta: "+15%", trend: "up" as const },
  ];

  const columns = [
    {
      header: "ID Facture",
      key: "reference",
      render: (_: any, row: Invoice) => (
        <span className="font-black text-slate-900 text-sm">{row.reference}</span>
      ),
    },
    {
      header: "Prestataire",
      key: "provider",
      render: (_: any, row: Invoice) => row.provider.company_name,
    },
    {
      header: "Date",
      key: "invoice_date",
      render: (_: any, row: Invoice) => formatDate(row.invoice_date),
    },
    {
      header: "Site",
      key: "site",
      render: (_: any, row: Invoice) => row.site.nom,
    },
    {
      header: "Montant TTC",
      key: "amount_ttc",
      render: (_: any, row: Invoice) => (
        <span className="font-bold">{formatMontant(row.amount_ttc)}</span>
      ),
    },
    {
      header: "Statut",
      key: "payment_status",
      render: (_: any, row: Invoice) => (
        <StatusBadge status={row.payment_status} />
      ),
    },
    {
      header: "Actions",
      key: "actions",
      render: (_: any, row: Invoice) => (
        <div className="flex items-center gap-3">
          <Eye size={18} className="text-slate-700" />
          <Link
            href={`/admin/factures/details/${row.id}`}
            className="group p-2 rounded-xl bg-white hover:bg-black transition flex items-center justify-center"
          >
            <ArrowUpRight
              size={16}
              className="group-hover:rotate-45 transition-transform"
            />
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Navbar />

        <main className="ml-64 mt-20 p-6 space-y-8">
          <PageHeader
            title="Factures"
            subtitle="Liste statique des factures"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis.map((k, i) => (
              <StatsCard key={i} {...k} />
            ))}
          </div>

          <div className="flex justify-end gap-3">
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-bold">
              <Filter size={16} /> Filtrer
            </button>

            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-bold">
              <Upload size={16} /> Exporter
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <DataTable columns={columns} data={invoices} onViewAll={() => {}} />

            <div className="p-6 border-t border-slate-50 flex justify-end bg-slate-50/30">
              <Paginate currentPage={1} totalPages={1} onPageChange={() => {}} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}