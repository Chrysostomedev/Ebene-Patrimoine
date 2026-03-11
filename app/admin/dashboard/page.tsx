"use client";

import { useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import StatsCard from "@/components/StatsCard";
import ListCard from "@/components/ListCard";
import DonutChartCard from "@/components/DonutChartCard";
import BarChartCard from "@/components/BarChartCard";
import DataTable from "@/components/DataTable";
import SideDetailsPanel from "@/components/SideDetailsPanel";
import { Eye } from "lucide-react";

import { useDashboard } from "../../../hooks/admin/useDashboard";

const MOIS_LABELS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"];
const DONUT_COLORS = ["#df1414", "#07ad07", "#606eee", "#050f6b", "#f97316"];
const BAR_COLORS = [
  "#0f2505ff", "#3fa121ff", "#02460bff", "#066325ff",
  "#128545ff", "#4a5568", "#718096", "#969799",
  "#5cb94aff", "#c4f0d6ff", "#e2e8f0", "#94a3b8",
];

const STATUS_LABELS: Record<string, string> = {
  signalez: "Signalé", validé: "Validé", assigné: "Assigné",
  en_cours: "En cours", rapporté: "Rapporté", évalué: "Évalué", clos: "Clôturé",
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

export default function Dashboard() {
  const { dashboard, isLoading } = useDashboard();
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // ── BarChart : 12 mois filtrés par année sélectionnée ──
  const buildBarData = () => {
    if (!dashboard?.tendance_annuelle_maintenance) return [];
    const filtered = dashboard.tendance_annuelle_maintenance.filter(i => i.annee === selectedYear);
    const map: Record<number, number> = {};
    filtered.forEach(i => { map[i.mois] = i.total; });
    return MOIS_LABELS.map((label, i) => ({
      label,
      value: map[i + 1] ?? 0,
      color: BAR_COLORS[i] ?? "#0F172A",
    }));
  };

  // ── Donut : top sites ──
  const buildDonutData = () =>
    (dashboard?.sites_les_plus_frequentes ?? []).map((site, i) => ({
      label: site.nom,
      value: site.total_tickets,
      color: DONUT_COLORS[i % DONUT_COLORS.length],
    }));

  // ── ListCard : top sites avec id pour le lien /admin/sites/details/[id] ──
  const buildListItems = () =>
    (dashboard?.sites_les_plus_frequentes ?? []).map(site => ({
      id: site.site_id,           // ← id transmis au ListCard pour construire le lien
      name: site.nom,
      subText: `${site.total_tickets} ticket${site.total_tickets > 1 ? "s" : ""}`,
    }));

  // ── Side panel ──
  const handleOpenDetails = (ticket: any) => {
    const statusColor =
      ticket.status === "clos" ? "#000" :
      ticket.status === "en_cours" ? "#f97316" :
      ticket.status === "évalué" ? "#22c55e" : "#64748b";

    setSelectedTicket({
      title: ticket.subject ?? `Ticket #${ticket.id}`,
      reference: `#${ticket.id}`,
      description: "Ticket récent visualisé depuis le tableau de bord.",
      fields: [
        { label: "Type", value: ticket.type === "curatif" ? "Curatif" : "Préventif" },
        { label: "Sujet", value: ticket.subject ?? "-" },
        { label: "Site concerné", value: ticket.site?.nom ?? "-" },
        { label: "Service", value: ticket.service?.name ?? "-" },
        { label: "Date planifiée", value: ticket.planned_at ?? "-" },
        { label: "Statut", value: STATUS_LABELS[ticket.status] ?? ticket.status, isStatus: true, statusColor },
      ],
    });
    setIsDetailsOpen(true);
  };

  // ── Colonnes DataTable ──
  const columns = [
    { header: "ID ticket", key: "id", render: (_: any, row: any) => `#${row.id}` },
    { header: "Nom", key: "subject", render: (_: any, row: any) => row.subject ?? "-" },
    { header: "Site", key: "site", render: (_: any, row: any) => row.site?.nom ?? "-" },
    { header: "Service", key: "service", render: (_: any, row: any) => row.service?.name ?? "-" },
    { header: "Type", key: "type", render: (_: any, row: any) => row.type === "curatif" ? "Curatif" : "Préventif" },
    {
      header: "Statut", key: "status",
      render: (_: any, row: any) => (
        <span className={`inline-flex items-center justify-center min-w-[90px] px-3 py-1.5 rounded-xl border text-xs font-bold ${STATUS_STYLES[row.status] || ""}`}>
          {STATUS_LABELS[row.status] ?? row.status}
        </span>
      ),
    },
    {
      header: "Actions", key: "actions",
      render: (_: any, row: any) => (
        <button onClick={() => handleOpenDetails(row)} className="font-bold text-slate-800 hover:text-blue-600 transition">
          <Eye size={18} />
          </button>
      ),
    },
  ];

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <Sidebar />
      <div className="flex-1 flex flex-col pl-64">
        <Navbar />
        <main className="flex-1 p-8 pt-24 space-y-8">

          {isLoading && (
            <div className="text-center text-slate-400 text-sm italic py-8">Chargement...</div>
          )}

          {/* KPIs Tickets — 3 cartes, pas de FCFA ici */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatsCard label="Nombre total de tickets" value={dashboard?.nombre_total_tickets ?? 0} delta="+3%" trend="up" />
            <StatsCard label="Tickets traités" value={dashboard?.nombre_tickets_traites ?? 0} delta="+20,10%" trend="up" />
            <StatsCard label="Tickets non traités" value={dashboard?.nombre_tickets_non_traites ?? 0} delta="+10%" trend="up" />
          </div>

          {/* KPIs Sites — 4 cartes, coûts avec isCurrency=true */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard label="Sites actifs" value={dashboard?.nombre_sites_actifs ?? 0} delta="+3%" trend="up" />
            <StatsCard label="Sites inactifs" value={dashboard?.nombre_sites_inactifs ?? 0} delta="+3%" trend="up" />
            {/* isCurrency=true → formate en K/M FCFA sans virgule */}
            <StatsCard
              label="Coût moyen par site"
              value={dashboard?.cout_moyen_par_site ?? 0}
              isCurrency
              delta="+20,10%"
              trend="up"
            />
            <StatsCard
              label="Coût total de maintenance"
              value={dashboard?.cout_total_maintenance ?? 0}
              isCurrency
              delta="+1%"
              trend="up"
            />
          </div>

          {/* Graphiques */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch pb-4">
            {/* tendance de l'année en fonction des tickets */}
  <div className="lg:col-span-5 flex">
    <div className="w-full h-full">
      <BarChartCard
        title="Tendance de l'année "
        data={buildBarData()}
        onYearChange={(year) => setSelectedYear(Number(year))}
      />
    </div>
  </div>

  <div className="lg:col-span-4 flex">
    <div className="w-full h-full">
      <DonutChartCard
        title="Sites les plus fréquentés(interventions)"
        data={buildDonutData()}
      />
    </div>
  </div>

  <div className="lg:col-span-3 flex">
    <div className="w-full h-full">
      <ListCard
        title="Listes des sites"
        items={buildListItems()}
        viewAllHref="/admin/sites"
        viewAllText="Voir tous"
      />
    </div>
  </div>
</section>
          {/* Tickets récents avec lien voir tous */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
  {/* Header */}
  <div className="px-6 py-4 bg-transparent">
    <h3 className="text-base font-bold text-slate-800 ">
      Listes tickets récents
    </h3>
  </div>

  {/* Table */}
  <div className="px-6 py-4">
    <DataTable
      columns={columns}
      data={dashboard?.tickets_recents ?? []}
      onViewAll={() => (window.location.href = "/admin/tickets")}
    />
  </div>
</div>

        </main>
      </div>

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