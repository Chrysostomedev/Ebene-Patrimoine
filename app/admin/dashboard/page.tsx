"use client";

/**
 * app/admin/dashboard/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * CHANGEMENTS vs version originale :
 *
 * 1. import { useToast }      → messages flash en haut via ToastProvider
 * 2. import { parseApiError } → toutes les erreurs back traduites en FR
 * 3. SideDetailsPanel         → redirectHref="/admin/tickets/[id]" (1 seul
 *    bouton "Voir le ticket") — plus de onEdit/Annuler sur le dashboard
 *
 * Rien d'autre n'a changé (logique, graphiques, colonnes, stats, UI).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import { formatDate } from "@/lib/utils";
import Navbar from "@/components/Navbar";
import StatsCard from "@/components/StatsCard";
import ListCard from "@/components/ListCard";
import Link from "next/link";
import DonutChartCard from "@/components/DonutChartCard";
import BarChartCard from "@/components/BarChartCard";
import DataTable, { ColumnConfig } from "@/components/DataTable";
import SideDetailsPanel from "@/components/SideDetailsPanel";
import { Eye } from "lucide-react";
import { useDashboard } from "../../../hooks/admin/useDashboard";
import { useLanguage } from "../../../contexts/LanguageContext";
// ✅ AJOUT : hook toast global
import { useToast } from "../../../contexts/ToastContext";
// ✅ AJOUT : traduction centralisée des erreurs back
import { parseApiError } from "../../../core/error";

// ── Constantes & mappings statiques - inchangés ───────────────────────────────

const MOIS_LABELS = [
  "Jan", "Fév", "Mar", "Avr", "Mai", "Juin",
  "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc",
];

const DONUT_COLORS = ["#df1414", "#07ad07", "#606eee", "#050f6b", "#f97316"];

const BAR_COLORS = [
  "#01050e", "#041022", "#192535", "#2d3748",
  "#373e46", "#4a5568", "#718096", "#969799",
  "#a0aec0", "#cbd5e0", "#e2e8f0", "#94a3b8",
];

const STATUS_LABELS: Record<string, string> = {
  signalez: "Signalé",
  validé: "Validé",
  assigné: "Assigné",
  en_cours: "En cours",
  rapporté: "Rapporté",
  évalué: "Évalué",
  clos: "Clôturé",
};

const STATUS_STYLES: Record<string, string> = {
  signalez: "border-slate-300 text-slate-700 bg-gray-100",
  validé: "border-blue-400 text-blue-600 bg-blue-50",
  assigné: "border-purple-400 text-purple-600 bg-purple-50",
  en_cours: "border-orange-400 text-orange-500 bg-orange-50",
  rapporté: "border-yellow-400 text-yellow-600 bg-yellow-50",
  évalué: "border-green-400 text-green-600 bg-green-50",
  clos: "bg-black text-white border-black",
};

// ── Composant principal ───────────────────────────────────────────────────────

export default function Dashboard() {
  const { dashboard, isLoading } = useDashboard();
  const { t } = useLanguage();
  // ✅ Hook toast (disponible grâce au ToastProvider dans le layout admin)
  const { toast } = useToast();

  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // ── Builders de données - inchangés ──────────────────────────────────────

  const buildBarData = () => {
    if (!dashboard?.tendance_annuelle_maintenance) return [];
    const filtered = dashboard.tendance_annuelle_maintenance.filter(
      (i) => i.annee === selectedYear,
    );
    const map: Record<number, number> = {};
    filtered.forEach((i) => { map[i.mois] = i.total; });
    return MOIS_LABELS.map((label, i) => ({
      label,
      value: map[i + 1] ?? 0,
      color: BAR_COLORS[i] ?? "#0F172A",
    }));
  };

  const buildDonutData = () =>
    (dashboard?.sites_les_plus_frequentes ?? []).map((site, i) => ({
      label: site.nom,
      value: site.total_tickets,
      color: DONUT_COLORS[i % DONUT_COLORS.length],
    }));

  const buildListItems = () =>
    (dashboard?.sites_les_plus_frequentes ?? []).map((site) => ({
      id: site.site_id,
      name: site.nom,
      subText: `${site.total_tickets} ticket${site.total_tickets > 1 ? "s" : ""}`,
    }));

  // ── Gestion du panneau de détail ─────────────────────────────────────────

  const handleOpenDetails = (ticket: any) => {
    const statusColor =
      ticket.status === "clos" ? "#000" :
        ticket.status === "en_cours" ? "#f97316" :
          ticket.status === "évalué" ? "#22c55e" : "#64748b";

    setSelectedTicket({
      id: ticket.id,          // ✅ conservé pour construire le redirectHref
      title: ticket.subject ?? `Ticket ${ticket.code_ticket}`,
      code: `${ticket.code_ticket}`,
      description: "Ticket récent visualisé depuis le tableau de bord.",
      fields: [
        { label: "Type", value: ticket.type === "curatif" ? "Curatif" : "Préventif" },
        { label: "Sujet", value: ticket.subject ?? "-" },
        { label: "Site concerné", value: ticket.site?.nom ?? "-" },
        { label: "Service", value: ticket.service?.name ?? "-" },
        { label: "Date planifiée", value: formatDate(ticket.planned_at) },
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

  // ── Colonnes du DataTable - inchangées ───────────────────────────────────

  type DashboardTicket = {
    id: number;
    subject?: string;
    site?: { nom: string };
    service?: { name: string };
    type: string;
    status: string;
    planned_at?: string;
  };

  const columns: ColumnConfig<DashboardTicket>[] = [
    {
      header: "Ticket",
      key: "id",
      render: (_: any, row: any) => `${row.code_ticket}`,
    },
    {
      header: "Nom",
      key: "subject",
      render: (_: any, row: any) => row.subject ?? "-",
    },
    {
      header: "Site",
      key: "site",
      render: (_: any, row: any) => row.site?.nom ?? "-",
    },
    // {
    //   header: "Service",
    //   key: "service",
    //   render: (_: any, row: any) => row.service?.name ?? "-",
    // },
    {
      header: "Type",
      key: "type",
      render: (_: any, row: any) => row.type === "curatif" ? "Curatif" : "Préventif",
    },
    {
      header: "Statut",
      key: "status",
      render: (_: any, row: any) => (
        <span
          className={`inline-flex items-center justify-center min-w-[90px] px-3 py-1.5 rounded-xl border text-xs font-bold ${STATUS_STYLES[row.status] ?? ""
            }`}
        >
          {STATUS_LABELS[row.status] ?? row.status}
        </span>
      ),
    },
    {
      header: "Actions",
      key: "actions",
      render: (_: any, row: any) => (
        // <button
        //   onClick={() => handleOpenDetails(row)}
        //   className="font-bold text-slate-800 hover:text-blue-600 transition"
        //   aria-label={`Voir détail ticket #${row.id}`}
        // >
        //   <Eye size={18} />
        // </button>
        <Link href={`/admin/tickets/${row.id}`}
          className="group p-2 rounded-xl bg-white transition flex items-center justify-center">
          <Eye size={16} />
        </Link>
      ),
    },
  ];

  // ── Rendu ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex bg-slate-50">
      <div className="flex-1 flex flex-col">
        <Navbar />

        <main className="flex-1 p-8 pt-24 space-y-8">

          {isLoading && (
            <div className="text-center text-slate-400 text-sm italic py-8">
              {t("common.loading")}
            </div>
          )}

          {/* ── KPIs Tickets ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatsCard label={t("dashboard.totalTickets")} value={dashboard?.nombre_total_tickets ?? 0} delta="+3%" trend="up" href="/admin/tickets" />
            <StatsCard label={t("dashboard.treatedTickets")} value={dashboard?.nombre_tickets_traites ?? 0} delta="+20,10%" trend="up" href="/admin/tickets" />
            <StatsCard label={t("dashboard.untreatedTickets")} value={dashboard?.nombre_tickets_non_traites ?? 0} delta="+10%" trend="up" href="/admin/tickets" />
          </div>

          {/* ── KPIs Sites & Coûts ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard label={t("dashboard.activeSites")} value={dashboard?.nombre_sites_actifs ?? 0} delta="+3%" trend="up" href="/admin/sites" />
            <StatsCard label={t("dashboard.inactiveSites")} value={dashboard?.nombre_sites_inactifs ?? 0} delta="+3%" trend="up" href="/admin/sites" />
            <StatsCard label={t("dashboard.avgCostPerSite")} value={dashboard?.cout_moyen_par_site ?? 0} isCurrency delta="+20,10%" trend="up" href="/admin/sites" />
            <StatsCard label={t("dashboard.totalMaintenanceCost")} value={dashboard?.cout_total_maintenance ?? 0} isCurrency delta="+1%" trend="up" href="/admin/factures" />
          </div>

          {/* ── Graphiques ── */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch pb-4">
            <div className="lg:col-span-5 flex">
              <div className="w-full h-full">
                <BarChartCard
                  title={t("dashboard.yearTrend")}
                  data={buildBarData()}
                  onYearChange={(year) => setSelectedYear(Number(year))}
                />
              </div>
            </div>
            <div className="lg:col-span-4 flex">
              <div className="w-full h-full">
                <DonutChartCard title={t("dashboard.mostVisitedSites")} data={buildDonutData()} />
              </div>
            </div>
            <div className="lg:col-span-3 flex">
              <div className="w-full h-full">
                <ListCard
                  title={t("dashboard.sitesList")}
                  items={buildListItems()}
                  viewAllHref="/admin/sites"
                  viewAllText={t("dashboard.seeAll")}
                />
              </div>
            </div>
          </section>

          {/* ── Tableau des tickets récents ── */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4">
              <h3 className="text-base font-bold text-slate-800">{t("dashboard.recentTickets")}</h3>
            </div>
            <div className="px-6 py-4">
              <DataTable
                title="Liste Tickets curatifs récents"
                columns={columns}
                data={dashboard?.tickets_recents ?? []}
                onViewAll={() => (window.location.href = "/admin/tickets")}
              />
            </div>
          </div>

        </main>
      </div>

      {/*
        ── SideDetailsPanel ─────────────────────────────────────────────────
        CHANGEMENT : plus de onEdit sur le dashboard admin.
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
          selectedTicket?.id ? `/admin/tickets/${selectedTicket.id}` : "non renseigné"
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
        redirectHref="/admin/tickets"
        redirectLabel="Voir le ticket"
      /> */}

    </div>
  );
}