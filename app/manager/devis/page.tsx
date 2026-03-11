"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import {
  Eye, Filter, Upload, X,
  CheckCircle2, Copy, FileText,
  PlusCircle, CalendarDays, ArrowUpRight
} from "lucide-react";

import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import StatsCard from "@/components/StatsCard";
import DataTable from "@/components/DataTable";
import Paginate from "@/components/Paginate";
import PageHeader from "@/components/PageHeader";
import ReusableForm from "@/components/ReusableForm";

/* ───────────────────────────── */
/* FORMATTERS */
/* ───────────────────────────── */

const formatMontant = (v) => {
  if (!v && v !== 0) return "—";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M FCFA`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}K FCFA`;
  return `${v.toLocaleString("fr-FR")} FCFA`;
};

const formatDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR");
};

/* ───────────────────────────── */
/* MOCK DATA */
/* ───────────────────────────── */

const MOCK_QUOTES = [
  {
    id: 1,
    reference: "DV-2026-001",
    ticket_id: 201,
    created_at: "2026-03-01",
    status: "pending",
    amount_ttc: 250000,
    provider: { name: "SOGE Maintenance" },
    site: { name: "Plateau" },
    ticket: { reference: "TK-201" },
  },
  {
    id: 2,
    reference: "DV-2026-002",
    ticket_id: 202,
    created_at: "2026-03-02",
    status: "approved",
    amount_ttc: 420000,
    provider: { name: "ElecPro CI" },
    site: { name: "Cocody" },
    ticket: { reference: "TK-202" },
  },
  {
    id: 3,
    reference: "DV-2026-003",
    ticket_id: 203,
    created_at: "2026-03-05",
    status: "rejected",
    rejection_reason: "Montant trop élevé",
    amount_ttc: 180000,
    provider: { name: "ClimaTech" },
    site: { name: "Marcory" },
    ticket: { reference: "TK-203" },
  },
];

/* ───────────────────────────── */
/* STATUS UI */
/* ───────────────────────────── */

const STATUS_STYLES = {
  pending: "border-slate-300 bg-slate-100 text-slate-700",
  approved: "border-green-600 bg-green-50 text-green-700",
  rejected: "border-red-500 bg-red-100 text-red-600",
  revision: "border-blue-400 bg-blue-50 text-blue-700",
};

const STATUS_LABELS = {
  pending: "En attente",
  approved: "Approuvé",
  rejected: "Rejeté",
  revision: "En révision",
};

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center justify-center min-w-[90px] px-3 py-1.5 rounded-xl border text-xs font-bold ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

/* ───────────────────────────── */
/* PAGE */
/* ───────────────────────────── */

export default function DevisPage() {

  const filterRef = useRef(null);

  const [quotes, setQuotes] = useState(MOCK_QUOTES);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const [filters, setFilters] = useState({});
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const PER_PAGE = 10;

  /* ───────────────────────────── */
  /* ACTIONS MOCK */
  /* ───────────────────────────── */

  const approveQuote = (id) => {
    setQuotes(q =>
      q.map(item =>
        item.id === id ? { ...item, status: "approved" } : item
      )
    );
  };

  const rejectQuote = (id, reason) => {
    setQuotes(q =>
      q.map(item =>
        item.id === id
          ? { ...item, status: "rejected", rejection_reason: reason }
          : item
      )
    );
  };

  /* ───────────────────────────── */
  /* FILTER + PAGINATION */
  /* ───────────────────────────── */

  const filtered = quotes.filter(q =>
    !filters.status || q.status === filters.status
  );

  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const paginated = filtered.slice(
    (currentPage - 1) * PER_PAGE,
    currentPage * PER_PAGE
  );

  /* ───────────────────────────── */
  /* KPIs */
  /* ───────────────────────────── */

  const stats = {
    total: quotes.length,
    pending: quotes.filter(q => q.status === "pending").length,
    approved: quotes.filter(q => q.status === "approved").length,
    total_approved_amount: quotes
      .filter(q => q.status === "approved")
      .reduce((s, q) => s + (q.amount_ttc || 0), 0),
  };

  const kpis = [
    { label: "Total des devis", value: stats.total },
    { label: "Devis en attente", value: stats.pending },
    { label: "Devis approuvés", value: stats.approved },
    {
      label: "Montant approuvé",
      value: stats.total_approved_amount,
      isCurrency: true,
    },
  ];

  /* ───────────────────────────── */
  /* TABLE COLUMNS */
  /* ───────────────────────────── */

  const columns = [

    {
      header: "Référence",
      key: "reference",
      render: (_, row) => (
        <span className="font-black text-slate-900 text-sm">
          {row.reference}
        </span>
      ),
    },

    {
      header: "Ticket",
      key: "ticket",
      render: (_, row) =>
        row.ticket?.reference ?? `#${row.ticket_id}`,
    },

    {
      header: "Prestataire",
      key: "provider",
      render: (_, row) => row.provider?.name ?? "—",
    },

    {
      header: "Site",
      key: "site",
      render: (_, row) => row.site?.name ?? "—",
    },

    {
      header: "Montant TTC",
      key: "amount",
      render: (_, row) => (
        <span className="font-bold">
          {formatMontant(row.amount_ttc)}
        </span>
      ),
    },

    {
      header: "Date",
      key: "date",
      render: (_, row) => formatDate(row.created_at),
    },

    {
      header: "Statut",
      key: "status",
      render: (_, row) => <StatusBadge status={row.status} />,
    },

    {
      header: "Actions",
      key: "actions",
      render: (_, row) => (
        <div className="flex items-center gap-3">

          <button
            onClick={() => {
              setSelectedQuote(row);
              setIsDetailsOpen(true);
            }}
            className="hover:text-gray-500"
          >
            <Eye size={18} />
          </button>

          <Link
            href={`/admin/devis/details/${row.id}`}
            className="group p-2 rounded-xl bg-white hover:bg-black transition"
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

  /* ───────────────────────────── */
  /* RENDER */
  /* ───────────────────────────── */

  return (
    <div className="flex min-h-screen bg-gray-50">

      <Sidebar />

      <div className="flex-1 flex flex-col">

        <Navbar />

        <main className="ml-64 mt-20 p-6 space-y-8">

          <PageHeader
            title="Devis"
            subtitle="Gestion des devis prestataires"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis.map((k, i) => (
              <StatsCard key={i} {...k} />
            ))}
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">

            <DataTable
              columns={columns}
              data={paginated}
              onViewAll={() => {}}
            />

            <div className="p-6 border-t border-slate-50 flex justify-end">

              <Paginate
                currentPage={currentPage}
                totalPages={totalPages || 1}
                onPageChange={setCurrentPage}
              />

            </div>

          </div>

        </main>

      </div>

    </div>
  );
}