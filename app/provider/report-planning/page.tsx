// app/provider/report-planning/page.tsx

"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Eye, Filter, Download, Upload, X,
  CheckCircle2, FileText, ChevronRight,
  Clock, MapPin, Wrench, Calendar, Star,
  AlertTriangle, Search, Info
} from "lucide-react";

import Navbar from "@/components/Navbar";
import StatsCard from "@/components/StatsCard";
import DataTable from "@/components/DataTable";
import Paginate from "@/components/Paginate";
import PageHeader from "@/components/PageHeader";

import { providerReportService, InterventionReport } from "../../../services/provider/providerReportService";
import { formatDate } from "@/lib/utils";

// Styles de statuts uniformisés selon la charte Canal+ premium
const STATUS_STYLES: Record<string, string> = {
  validated: "border-emerald-200 bg-emerald-50 text-emerald-700",
  validé: "border-emerald-200 bg-emerald-50 text-emerald-700",
  submitted: "border-blue-200 bg-blue-50 text-blue-700",
  pending: "border-slate-200 bg-slate-50 text-slate-500",
  rejected: "border-red-200 bg-red-50 text-red-700",
  rejeté: "border-red-200 bg-red-50 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  validated: "Validé",
  validé: "Validé",
  submitted: "Soumis",
  pending: "En attente",
  rejected: "Rejeté",
  rejeté: "Rejeté",
};

// Badge de statut pour uniformité premium
function StatusBadge({ status }: { status?: string }) {
  const s = status ?? "pending";
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold ${STATUS_STYLES[s] ?? "border-slate-200 bg-slate-50 text-slate-500"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s === 'validated' || s === 'validé' ? 'bg-emerald-500' : s === 'submitted' ? 'bg-blue-500' : 'bg-amber-500'}`} />
      {STATUS_LABELS[s] ?? s}
    </span>
  );
}

export default function ProviderReportPlanningPage() {
  // Gestion de l'onglet actif : "global" (Onglet 1) ou "ticket" (Onglet 2)
  const [activeTab, setActiveTab] = useState<"global" | "ticket">("global");

  // États de chargement et données
  const [items, setItems] = useState<InterventionReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Recherche debouncée (400ms)
  const [search, setSearch] = useState("");
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // KPIs globaux gérés côté prestataire (filtré auto par le back sur son provider_id)
  const [kpis, setKpis] = useState([
    { label: "Rapports globaux", value: "0", delta: "", trend: "up" as const },

    { label: "En attente", value: "0", delta: "", trend: "up" as const },
    { label: "Validés", value: "0", delta: "", trend: "up" as const },
  ]);

  // Chargement des données selon l'onglet actif, la page et la recherche debouncée
  const loadData = async (searchTerm: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = {
        page,
        per_page: 10,
        search: searchTerm || undefined,
      };

      let res;
      if (activeTab === "global") {
        res = await providerReportService.getReportsGlobal(params);
      } else {
        res = await providerReportService.getReportsTicket(params);
      }

      setItems(res.items);
      setTotalPages(res.meta?.last_page || 1);
      setTotalItems(res.meta?.total || 0);

      // Récupération des statistiques filtrées par prestataire
      try {
        const stats = await providerReportService.getStats({ intervention_type: "preventif" });
        setKpis([
          { label: "Rapports globaux", value: String(stats.total_reports || 0), delta: "", trend: "up" as const },
          { label: "En attente", value: String(stats.pending_reports || 0), delta: "", trend: "up" as const },
          { label: "Validés", value: String(stats.validated_reports || 0), delta: "", trend: "up" as const },
        ]);
      } catch {
        /* Silencieux */
      }

    } catch (err: any) {
      console.error(err);
      setError("Erreur lors du chargement des rapports de planning.");
    } finally {
      setIsLoading(false);
    }
  };

  // Re-déclenchement du chargement lors du changement d'onglet ou de page
  useEffect(() => {
    loadData(search);
  }, [activeTab, page]);

  // Gestion de la recherche avec debouncing de 400ms pour éviter de surcharger l'API Laravel
  const handleSearchChange = (q: string) => {
    setSearch(q);
    setPage(1); // Retour à la première page

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      loadData(q);
    }, 400);
  };

  // Configuration des colonnes du tableau interactif selon l'onglet
  const columns = activeTab === "global" ? [
    {
      header: "Référence Planning",
      key: "planning_ref",
      render: (_: any, row: InterventionReport) => (
        <span className="font-extrabold text-slate-900 uppercase">
          {(row as any).planning?.codification || `PLAN-${(row as any).planning?.id || row.id}`}
        </span>
      ),
    },
    {
      header: "Site",
      key: "site",
      render: (_: any, row: InterventionReport) => (
        <div className="flex items-center gap-2">
          <MapPin size={14} className="text-slate-400 shrink-0" />
          <span className="font-semibold text-slate-700">{row.site?.nom || row.site?.name || "—"}</span>
        </div>
      ),
    },
    {
      header: "Prestataire",
      key: "provider",
      render: (_: any, row: InterventionReport) => (
        <span className="font-medium text-slate-600">{row.provider?.company_name || row.provider?.name || "—"}</span>
      ),
    },
    {
      header: "Effectué le",
      key: "start_date",
      render: (_: any, row: InterventionReport) => (
        <span className="text-slate-500 font-medium">{formatDate(row.start_date)}</span>
      ),
    },
    {
      header: "Statut",
      key: "status",
      render: (_: any, row: InterventionReport) => <StatusBadge status={row.status} />,
    },
    {
      header: "Actions",
      key: "actions",
      render: (_: any, row: InterventionReport) => (
        <div className="flex items-center gap-2">
          <Link
            href={`/provider/report-planning/${row.id}`}
            className="group p-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-100 transition shadow-sm flex items-center justify-center"
            title="Détails du rapport global"
          >
            <Eye size={16} className="group-hover:rotate-12 transition-transform text-slate-700" />
          </Link>
        </div>
      ),
    },
  ] : [
    {
      header: "Code Ticket / Rapport",
      key: "report_ref",
      render: (_: any, row: InterventionReport) => (
        <span className="font-extrabold text-slate-900 uppercase">
          {row.reference || `TKP-${row.ticket_id || row.id}`}
        </span>
      ),
    },
    {
      header: "Équipement / Patrimoine",
      key: "asset",
      render: (_: any, row: InterventionReport) => (
        <div className="flex items-center gap-2">
          <Wrench size={14} className="text-slate-400 shrink-0" />
          <span className="font-semibold text-slate-700">
            {(row as any).asset?.designation || (row as any).asset?.name || "Intervention préventive"}
          </span>
        </div>
      ),
    },
    {
      header: "Site",
      key: "site",
      render: (_: any, row: InterventionReport) => (
        <span className="font-medium text-slate-600">{row.site?.nom || row.site?.name || "—"}</span>
      ),
    },
    {
      header: "Réalisé le",
      key: "start_date",
      render: (_: any, row: InterventionReport) => (
        <span className="text-slate-500 font-medium">{formatDate(row.start_date)}</span>
      ),
    },
    {
      header: "Statut",
      key: "status",
      render: (_: any, row: InterventionReport) => <StatusBadge status={row.status} />,
    },
    {
      header: "Actions",
      key: "actions",
      render: (_: any, row: InterventionReport) => (
        <div className="flex items-center gap-2">
          <Link
            href={`/provider/entretien/${row.id}`}
            className="group p-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-100 transition shadow-sm flex items-center justify-center"
            title="Détails du rapport individuel"
          >
            <Eye size={16} className="group-hover:rotate-12 transition-transform text-slate-700" />
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen flex bg-slate-50">
      <div className="flex-1 flex flex-col font-sans">
        <Navbar />

        <main className="mt-20 p-8 space-y-8 max-w-7xl mx-auto w-full">
          {/* En-tête de la page */}
          <PageHeader
            title="Rapports d'entretien par planning"
            subtitle="Suivi des rapports globaux de plannings et des tickets d'anomalies préventifs associés."
          />

          {/* ── KPIs Premium Uniformisés ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {kpis.map((k, i) => <StatsCard key={i} {...k} />)}
          </div>

          {/* ── Zone de Tableau & Recherche ── */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            {error && (
              <div className="p-6 bg-red-50 text-red-700 text-sm font-semibold flex items-center gap-2">
                <AlertTriangle size={16} />
                {error}
              </div>
            )}

            <DataTable
              title={activeTab === "global" ? "Listing des rapports d'entretien globaux" : "Listing des rapports individuels"}
              columns={columns}
              data={isLoading ? [] : items}
              isLoading={isLoading}
              onSearchChange={handleSearchChange}
              onViewAll={() => { }}
            />

            {/* Pagination */}
            <div className="p-6 border-t border-slate-50 flex justify-end bg-slate-50/30">
              <Paginate
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
