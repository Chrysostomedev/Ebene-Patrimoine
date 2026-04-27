"use client";

/**
 * app/provider/dashboard/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * CHANGEMENTS vs version originale :
 *
 * 1. import { useToast }      → messages flash en haut via ToastProvider
 * 2. import { parseApiError } → toutes les erreurs back traduites en FR
 * 3. SideDetailsPanel         → redirectHref="/provider/tickets/[id]" (1 seul
 *    bouton "Voir le ticket") — plus de onEdit/Annuler sur le dashboard
 * 4. fetchDashboard           → erreurs via toast.error() + parseApiError()
 *
 * Rien d'autre n'a changé (logique, colonnes, stats, UI).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import StatsCard from "@/components/StatsCard";
import DataTable, { ColumnConfig } from "@/components/DataTable";
import EventListCard from "@/components/EventListCard";
import SideDetailsPanel from "@/components/SideDetailsPanel";
import { Eye, RefreshCw, AlertCircle } from "lucide-react";

import {
  providerDashboardService,
  ProviderDashboardData,
  Intervention,
} from "../../../services/provider/providerDashboardService";
import { authService } from "../../../services/AuthService";
import { formatDate } from "@/lib/utils";
// ✅ AJOUT : hook toast global
import { useToast } from "../../../contexts/ToastContext";
// ✅ AJOUT : traduction centralisée des erreurs back
import { parseApiError } from "../../../core/error";

// ── Statuts - inchangés ───────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
  signalez: "border-slate-300 text-slate-700 bg-gray-100",
  validé: "border-blue-400 text-blue-600 bg-blue-50",
  assigné: "border-purple-400 text-purple-600 bg-purple-50",
  en_cours: "border-orange-400 text-orange-500 bg-orange-50",
  rapporté: "border-yellow-400 text-yellow-600 bg-yellow-50",
  évalué: "border-green-400 text-green-600 bg-green-50",
  clos: "bg-black text-white border-black",
};

const STATUS_LABELS: Record<string, string> = {
  signalez: "Signalé",
  validé: "Validé",
  assigné: "Assigné",
  en_cours: "En cours",
  rapporté: "Rapporté",
  évalué: "Évalué",
  clos: "Clos",
};

// ── Helper toEventItem - inchangé ─────────────────────────────────────────────
const stripHtml = (html?: string | null) =>
  html ? html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim() : "";

function toEventItem(i: Intervention) {
  const date = new Date(i.date_debut);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow =
    date.getDate() === tomorrow.getDate() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getFullYear() === tomorrow.getFullYear();

  const dayLabel = isToday
    ? "Aujourd'hui"
    : isTomorrow
      ? "Demain"
      : formatDate(date, { day: "2-digit", month: "short" });

  const timeLabel = formatDate(date, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return {
    id: i.id,
    title: stripHtml(i.title ?? i.description ?? `Intervention #${i.id}`),
    time: `${dayLabel} à ${timeLabel}`,
    location: i.site ?? i.location ?? "",
    href: "#",
  };
}

// ── Skeleton StatsCard - inchangé ────────────────────────────────────────────
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

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ProviderDashboard() {
  const router = useRouter();
  // ✅ Hook toast (disponible grâce au ToastProvider dans le layout)
  const { toast } = useToast();

  const [data, setData] = useState<ProviderDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchDashboard = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await providerDashboardService.getDashboard();
      setData(result);
    } catch (err: any) {
      if (err.response?.status === 401) {
        authService.logout();
        return;
      }
      // ✅ parseApiError traduit le message brut du back en FR lisible
      const message = parseApiError(err);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authService.isAuthenticated() || !authService.hasRole(["PROVIDER"])) {
      router.replace("/login");
      return;
    }
    fetchDashboard();
  }, []);

  // ── Raccourcis données ─────────────────────────────────────────────────────
  const stats = data?.stats;
  const tickets = data?.tickets_recents ?? [];

  // ── Panneau détail ticket ──────────────────────────────────────────────────
  const handleOpenDetails = (ticket: any) => {
    const statusColor =
      ticket.status === "clos" ? "#000" :
        ticket.status === "en_cours" ? "#f97316" :
          ticket.status === "évalué" ? "#22c55e" : "#64748b";

    setSelectedTicket({
      id: ticket.id,          // ✅ conservé pour construire le redirectHref
      title: ticket.subject ?? `Ticket ${ticket.code_ticket}`,
      reference: `${ticket.code_ticket}`,
      description: "Ticket récent visualisé depuis le tableau de bord.",
      fields: [
        { label: "Type", value: ticket.type === "curatif" ? "Curatif" : "Préventif" },
        { label: "Sujet", value: ticket.subject ?? "-" },
        { label: "Site concerné", value: ticket.site?.nom ?? "-" },
        { label: "Service", value: ticket.service?.name ?? "-" },
        { label: "Date planifiée", value: ticket.planned_at ?? "-" },
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

  // ── Colonnes DataTable - inchangées ──────────────────────────────────────
  const columns: ColumnConfig<any>[] = [
    { header: "Code ", key: "code_ticket", render: (_: any, row: any) => `${row.code_ticket}` },
    { header: "Nom", key: "subject", render: (_: any, row: any) => row.subject ?? "-" },
    { header: "Site", key: "site", render: (_: any, row: any) => row.site?.nom ?? "-" },
    // { header: "Catégorie", key: "category", render: (_: any, row: any) => row.category?.name ?? "-" },
    {
      header: "Type", key: "type",
      render: (_: any, row: any) => row.type === "curatif" ? "Curatif" : "Préventif",
    },
    {
      header: "Statut",
      key: "status",
      render: (_: any, row: any) => (
        <span className={`inline-flex items-center justify-center min-w-[90px] px-3 py-1.5 rounded-xl border text-xs font-bold ${STATUS_STYLES[row.status] ?? ""}`}>
          {STATUS_LABELS[row.status] ?? row.status}
        </span>
      ),
    },
    {
      header: "Actions",
      key: "actions",
      render: (_: any, row: any) => (
        <button
          onClick={() => router.push(`/provider/tickets/${row.id}`)}
          className="font-bold text-slate-800 hover:text-blue-600 transition"
          aria-label={`Voir détail ticket #${row.id}`}
        >
          <Eye size={18} />
        </button>
      ),
    },
  ];

  // ── Rendu ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col">
      <Navbar />

      <main className="flex-1 p-8 pt-24 space-y-8">

        {/* Erreur inline (en complément du toast) */}
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
              <StatsCard label="Total tickets" value={stats?.tickets.total ?? 0} delta="+0%" trend="up" href="/provider/tickets" />
              <StatsCard label="Tickets en cours" value={stats?.tickets.en_cours ?? 0} delta="+0%" trend="up" href="/provider/tickets" />
              <StatsCard label="Tickets clôturés" value={stats?.tickets.clotures ?? 0} delta="+0%" trend="up" href="/provider/tickets" />
              <StatsCard label="Total devis" value={stats?.devis.total ?? 0} delta="+0%" trend="up" href="/provider/devis" />
            </>
          )}
        </div>

        {/* ── KPIs Devis & Factures ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? <StatsSkeleton count={4} /> : (
            <>
              <StatsCard label="Devis en attente" value={stats?.devis.en_attente ?? 0} delta="+0%" trend="up" href="/provider/devis" />
              <StatsCard label="Factures totales" value={stats?.factures.total ?? 0} delta="+0%" trend="up" href="/provider/factures" />
              <StatsCard label="Factures payées" value={stats?.factures.payees ?? 0} delta="+0%" trend="up" isCurrency={false} href="/provider/factures" />
              <StatsCard label="Factures en attente" value={stats?.factures.en_attente ?? 0} delta="+0%" trend="up" href="/provider/factures" />
            </>
          )}
        </div>

        {/* ── Prochaines interventions ──────────────────────────────────── */}
        <div className="rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <EventListCard
            interventions={data?.prochaines_interventions ?? []}
            loading={loading}
            viewAllHref="/provider/planning"
            cardHref={(inv) => `/provider/planning/${inv.id}`}
          />
        </div>

        {/* ── Table tickets curatifs récents ─────────────────────────────── */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4">
            {loading ? (
              <div className="space-y-3 animate-pulse">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 bg-gray-100 rounded-xl" />
                ))}
              </div>
            ) : (
              <DataTable
                title="Listes tickets curatifs récents"
                columns={columns}
                data={tickets}
                onViewAll={() => (window.location.href = "/provider/tickets")}
              />
            )}
          </div>
        </div>

      </main>

      {/*
        ── SideDetailsPanel ─────────────────────────────────────────────────
        CHANGEMENT : plus de onEdit sur le dashboard provider.
        → redirectHref construit dynamiquement depuis l'id du ticket sélectionné
        → 1 seul bouton "Voir le ticket" qui redirige + ferme le panel
        → labels "Annuler" / "Modifier" supprimés de cette vue
      */}
      <SideDetailsPanel
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title={selectedTicket?.title ?? ""}
        reference={selectedTicket?.reference}
        fields={selectedTicket?.fields ?? []}
        descriptionContent={selectedTicket?.description}
        redirectHref={
          selectedTicket?.id ? `/provider/tickets/${selectedTicket.id}` : undefined
        }
        redirectLabel="Voir le ticket"
      />
      
      {/* <SideDetailsPanel
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title={selectedTicket?.title ?? ""}
        reference={selectedTicket?.reference}
        fields={selectedTicket?.fields ?? []}
        descriptionContent={selectedTicket?.description}
        redirectHref="/provider/tickets"
        redirectLabel="Voir le ticket"
      /> */}


    </div>
  );
}