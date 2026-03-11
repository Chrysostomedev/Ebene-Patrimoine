/**
 * app/provider/dashboard/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Dashboard Provider — branché sur l'AuthService unifié.
 *
 * CHANGEMENTS vs version originale :
 *   - Import : `providerAuthService` → `authService` (service unifié)
 *   - Guard  : `authService.isAuthenticated()` + `authService.hasRole(["PROVIDER"])`
 *   - Logout : `authService.logout()` (redirige automatiquement vers /login)
 *   - Aucune logique métier / UI modifiée
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar         from "@/components/Sidebar";
import Navbar          from "@/components/Navbar";
import StatsCard       from "@/components/StatsCard";
import DataTable       from "@/components/DataTable";
import EventListCard   from "@/components/EventListCard";
import SideDetailsPanel from "@/components/SideDetailsPanel";
import { Eye, RefreshCw, AlertCircle } from "lucide-react";

import {
  providerDashboardService,
  ProviderDashboardData,
  Intervention,
} from "../../../services/provider/providerDashboardService";

// ✅ Import unique — authService unifié remplace providerAuthService
import { authService } from "../../../services/AuthService";

// ─── Statuts — inchangés ──────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
  signalez: "border-slate-300 text-slate-700 bg-gray-100",
  validé:   "border-blue-400 text-blue-600 bg-blue-50",
  assigné:  "border-purple-400 text-purple-600 bg-purple-50",
  en_cours: "border-orange-400 text-orange-500 bg-orange-50",
  rapporté: "border-yellow-400 text-yellow-600 bg-yellow-50",
  évalué:   "border-green-400 text-green-600 bg-green-50",
  clos:     "bg-black text-white border-black",
};

const STATUS_LABELS: Record<string, string> = {
  signalez: "Signalé",
  validé:   "Validé",
  assigné:  "Assigné",
  en_cours: "En cours",
  rapporté: "Rapporté",
  évalué:   "Évalué",
  clos:     "Clos",
};

// ─── Helper : convertit une Intervention Laravel → format EventListCard ───────
function toEventItem(i: Intervention) {
  const date = new Date(i.date_debut);
  const now  = new Date();

  const isToday =
    date.getDate()     === now.getDate()  &&
    date.getMonth()    === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow =
    date.getDate()     === tomorrow.getDate()  &&
    date.getMonth()    === tomorrow.getMonth() &&
    date.getFullYear() === tomorrow.getFullYear();

  const dayLabel = isToday
    ? "Aujourd'hui"
    : isTomorrow
    ? "Demain"
    : date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });

  const timeLabel = date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return {
    id:       i.id,
    title:    i.title ?? i.description ?? `Intervention #${i.id}`,
    time:     `${dayLabel} à ${timeLabel}`,
    location: i.site ?? i.location ?? "",
    href:     "#",
  };
}

// ─── Skeleton StatsCard ───────────────────────────────────────────────────────
function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 animate-pulse"
        >
          <div className="h-3 w-28 bg-gray-200 rounded-full mb-4" />
          <div className="h-7 w-16 bg-gray-200 rounded-lg mb-2" />
          <div className="h-3 w-12 bg-gray-100 rounded-full" />
        </div>
      ))}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ProviderDashboard() {
  const router = useRouter();

  const [data, setData]       = useState<ProviderDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen]   = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchDashboard = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await providerDashboardService.getDashboard();
      setData(result);
    } catch (err: any) {
      if (err.response?.status === 401) {
        // Token expiré → logout propre via authService (nettoie ls + redirige /login)
        authService.logout();
        return;
      }
      setError(
        err.response?.data?.message ||
        "Impossible de charger le tableau de bord."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // ✅ Guard unifié :
    //   1. Vérifie qu'il y a un token + un rôle valide (isAuthenticated)
    //   2. Vérifie que le rôle est bien PROVIDER (hasRole)
    //   → Sinon redirige vers /login (pas /provider/login — page unifiée)
    if (!authService.isAuthenticated() || !authService.hasRole(["PROVIDER"])) {
      router.replace("/login");
      return;
    }
    fetchDashboard();
  }, []);

  // ── Raccourcis données ─────────────────────────────────────────────────────
  const stats   = data?.stats;
  const tickets = data?.tickets_recents ?? [];

  // ── Panneau détail ticket ──────────────────────────────────────────────────
  const handleOpenDetails = (ticket: any) => {
    const statusColor =
      ticket.status === "clos"     ? "#000"    :
      ticket.status === "en_cours" ? "#f97316" :
      ticket.status === "évalué"   ? "#22c55e" : "#64748b";

    setSelectedTicket({
      title:       ticket.subject ?? `Ticket #${ticket.id}`,
      reference:   `#${ticket.id}`,
      description: "Ticket récent visualisé depuis le tableau de bord.",
      fields: [
        { label: "Type",           value: ticket.type === "curatif" ? "Curatif" : "Préventif" },
        { label: "Sujet",          value: ticket.subject       ?? "-" },
        { label: "Site concerné",  value: ticket.site?.nom     ?? "-" },
        { label: "Service",        value: ticket.service?.name ?? "-" },
        { label: "Date planifiée", value: ticket.planned_at    ?? "-" },
        {
          label: "Statut",
          value: STATUS_LABELS[ticket.status] ?? ticket.status,
          isStatus: true,
          statusColor,
        },
      ],
    });
    setIsDetailsOpen(true);
  };

  // ── Colonnes DataTable — inchangées ───────────────────────────────────────
  const columns = [
    { header: "ID ticket", key: "id",      render: (_: any, row: any) => `#${row.id}` },
    { header: "Nom",       key: "subject", render: (_: any, row: any) => row.subject ?? "-" },
    { header: "Site",      key: "site",    render: (_: any, row: any) => row.site?.nom ?? "-" },
    { header: "Catégorie", key: "category",render: (_: any, row: any) => row.category?.name ?? "-" },
    { header: "Type",      key: "type",    render: (_: any, row: any) =>
        row.type === "curatif" ? "Curatif" : "Préventif"
    },
    {
      header: "Statut",
      key: "status",
      render: (_: any, row: any) => (
        <span className={`inline-flex items-center justify-center min-w-[90px] px-3 py-1.5 rounded-xl border text-xs font-bold ${STATUS_STYLES[row.status] || ""}`}>
          {STATUS_LABELS[row.status] ?? row.status}
        </span>
      ),
    },
    {
      header: "Actions",
      key: "actions",
      render: (_: any, row: any) => (
        <button
          onClick={() => handleOpenDetails(row)}
          className="font-bold text-slate-800 hover:text-blue-600 transition"
        >
          <Eye size={18} />
        </button>
      ),
    },
  ];

  // ── Rendu ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-zinc-50">

      <Sidebar />

      <div className="flex-1 flex flex-col pl-64">

        <Navbar />

        <main className="flex-1 p-8 pt-24 space-y-8">

          {/* Erreur + bouton réessayer */}
          {error && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl text-sm">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
              <button
                onClick={fetchDashboard}
                className="ml-auto flex items-center gap-1.5 text-xs font-bold underline hover:no-underline"
              >
                <RefreshCw size={12} />
                Réessayer
              </button>
            </div>
          )}

          {/* ── KPIs Tickets ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {loading ? <StatsSkeleton count={4} /> : (
              <>
                <StatsCard label="Total tickets"    value={stats?.tickets.total    ?? 0} delta="+0%" trend="up" />
                <StatsCard label="Tickets en cours" value={stats?.tickets.en_cours ?? 0} delta="+0%" trend="up" />
                <StatsCard label="Tickets clôturés" value={stats?.tickets.clotures ?? 0} delta="+0%" trend="up" />
                <StatsCard label="Total devis"      value={stats?.devis.total      ?? 0} delta="+0%" trend="up" />
              </>
            )}
          </div>

          {/* ── KPIs Devis & Factures ─────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {loading ? <StatsSkeleton count={4} /> : (
              <>
                <StatsCard label="Devis en attente"    value={stats?.devis.en_attente   ?? 0} delta="+0%" trend="up" />
                <StatsCard label="Factures totales"    value={stats?.factures.total      ?? 0} delta="+0%" trend="up" />
                <StatsCard label="Factures payées"     value={stats?.factures.payees     ?? 0} delta="+0%" trend="up" isCurrency={false} />
                <StatsCard label="Factures en attente" value={stats?.factures.en_attente ?? 0} delta="+0%" trend="up" />
              </>
            )}
          </div>

          {/* ── Prochaines interventions ──────────────────────────────────── */}
          <div className="rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <EventListCard
              interventions={data?.prochaines_interventions ?? []}
              loading={loading}
              viewAllHref="/provider/interventions"
            />
          </div>

          {/* ── Table tickets récents ─────────────────────────────────────── */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4">
              <h3 className="text-base font-bold text-slate-800">
                Listes tickets récents
              </h3>
            </div>
            <div className="px-6 py-4">
              {loading ? (
                <div className="space-y-3 animate-pulse">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-10 bg-gray-100 rounded-xl" />
                  ))}
                </div>
              ) : (
                <DataTable
                  columns={columns}
                  data={tickets}
                  onViewAll={() => (window.location.href = "/provider/tickets")}
                />
              )}
            </div>
          </div>

        </main>
      </div>

      {/* Panel détails ticket — inchangé */}
      <SideDetailsPanel
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title={selectedTicket?.title || ""}
        reference={selectedTicket?.reference}
        fields={selectedTicket?.fields || []}
        descriptionContent={selectedTicket?.description}
      />

    </div>
  );
}