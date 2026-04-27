"use client";

import { useState } from "react";
import { useDashboard } from "../../../hooks/manager/useDashboard";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import StatsCard from "@/components/StatsCard";
import DonutChartCard from "@/components/DonutChartCard";
import BarChartCard from "@/components/BarChartCard";
import DataTable, { ColumnConfig } from "@/components/DataTable";
import SideDetailsPanel from "@/components/SideDetailsPanel";
import { Eye, AlertTriangle } from "lucide-react";

const MOIS_LABELS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"];

const DONUT_COLORS = ["#df1414", "#07ad07", "#606eee", "#050f6b", "#f97316", "#94a3b8", "#22c55e"];

const STATUS_DONUT_LABELS: Record<string, string> = {
  SIGNALÉ: "Signalé",
  VALIDÉ: "Validé",
  ASSIGNÉ: "Assigné",
  EN_COURS: "En cours",
  RAPPORTÉ: "Rapporté",
  ÉVALUÉ: "Évalué",
  CLOS: "Clôturé",
  // variantes minuscules
  signalez: "Signalé",
  validé: "Validé",
  assigné: "Assigné",
  en_cours: "En cours",
  rapporté: "Rapporté",
  évalué: "Évalué",
  clos: "Clôturé",
};

const BAR_COLORS = [
  "#01050e", "#041022", "#192535", "#2d3748",
  "#373e46", "#4a5568", "#718096", "#969799",
  "#a0aec0", "#cbd5e0", "#e2e8f0", "#94a3b8"
];

const STATUS_LABELS = {
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

export default function Dashboard() {
  const { stats, recentTickets, isLoading, error } = useDashboard();
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const router = useRouter();



  const buildBarData = () => {
    // Le backend renvoie déjà les volumes mensuels filtrés/agrégés
    const map: Record<number, number> = {};
    stats?.tendance_annuelle_maintenance?.forEach((i: any) => {
      if (i.annee === selectedYear) {
        map[i.mois] = i.total;
      }
    });

    return MOIS_LABELS.map((label, i) => ({
      label,
      value: map[i + 1] ?? 0,
      color: BAR_COLORS[i % BAR_COLORS.length],
    }));
  };

  // Répartition des tickets par statut — plus pertinent pour un manager mono-site
  const buildDonutData = () => {
    const statuts = stats?.tickets_stats_par_statut ?? {};
    return Object.entries(statuts)
      .filter(([, count]) => count > 0)
      .map(([key, count], i) => ({
        label: STATUS_DONUT_LABELS[key] ?? key,
        value: count as number,
        color: DONUT_COLORS[i % DONUT_COLORS.length],
      }));
  };

  const handleOpenDetails = (ticket: any) => {
    const status = (ticket.status || "").toUpperCase();
    const statusColor =
      status === "CLOS" ? "#000" :
        status === "EN_COURS" ? "#f97316" :
          status === "ÉVALUÉ" ? "#22c55e" : "#64748b";

    setSelectedTicket({
      title: ticket.subject ?? `Ticket #${ticket.id}`,
      reference: `#${ticket.id}`,
      description: "Ticket récent visualisé depuis le tableau de bord.",
      fields: [
        { label: "Codification", value: ticket.reference || ticket.asset?.codification || `#${ticket.id}` },
        { label: "Type", value: ticket.type === "curatif" ? "Curatif" : "Préventif" },
        { label: "Sujet", value: ticket.subject },
        { label: "Site concerné", value: ticket.site?.nom },
        { label: "Date soumise", value: ticket.planned_at ? new Date(ticket.planned_at).toLocaleString("fr-FR") : "-" },
        { label: "Date limite", value: ticket.due_at ? new Date(ticket.due_at).toLocaleString("fr-FR") : "-" },
        { label: "Statut", value: STATUS_LABELS[(ticket.status || "").toLowerCase() as keyof typeof STATUS_LABELS] || ticket.status, isStatus: true, statusColor }
      ]
    });

    setIsDetailsOpen(true);
  };

  const columns: ColumnConfig<any>[] = [
    {
      header: "Codification", key: "reference",
      render: (_: any, row: any) => (
        <span className="font-mono text-[10px] font-black text-slate-900 bg-slate-100 px-2 py-1 rounded-lg">
          {row.reference || `${row.code_ticket}`}
        </span>
      )
    },
    {
      header: "Sujet", key: "subject",
      render: (_: any, row: any) => (
        <div className="max-w-[180px]">
          <p className="text-sm font-bold text-slate-900 truncate">{row.subject}</p>
          <p className="text-[10px] text-slate-400 font-medium truncate uppercase tracking-widest">{row.asset?.designation}</p>
        </div>
      )
    },
    {
      header: "Type", key: "type",
      render: (_: any, row: any) => (
        <span className={`text-[10px] font-black uppercase tracking-widest ${row.type === 'curatif' ? 'text-orange-600' : 'text-blue-600'}`}>
          {row.type}
        </span>
      )
    },
    {
      header: "Date soumise", key: "planned_at",
      render: (_: any, row: any) => {
        if (!row.planned_at) return <span className="text-slate-400 text-xs">-</span>;
        const d = new Date(row.planned_at);
        return (
          <div className="text-xs text-slate-600">
            <div className="font-bold">{d.toLocaleDateString("fr-FR")}</div>
            <div className="text-slate-400">{d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</div>
          </div>
        );
      }
    },
    {
      header: "Statut", key: "status",
      render: (_: any, row: any) => (
        <span className={`inline-flex items-center px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-tight ${STATUS_STYLES[(row.status || "").toLowerCase()] || STATUS_STYLES.signalez}`}>
          {STATUS_LABELS[(row.status || "").toLowerCase() as keyof typeof STATUS_LABELS] || row.status}
        </span>
      )
    },
    {
      header: "Actions", key: "actions",
      render: (_: any, row: any) => (
        <button
          onClick={() => router.push(`/manager/tickets/${row.id}`)}
          className="font-bold text-slate-800 hover:text-blue-600 transition"
          aria-label={`Voir détail ticket #${row.id}`}
        >
          <Eye size={18} />
        </button>
      )
    }
  ];

  return (
    <>
      <div className="flex-1 flex flex-col ">
        <Navbar />
        <main className="flex-1 p-8 pt-24 space-y-8">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (error || !stats) ? (
            <div className="flex h-64 items-center justify-center">
              <div className="text-red-500 font-bold bg-white p-8 rounded-2xl shadow-sm border border-red-100 text-center">
                <AlertTriangle className="mx-auto mb-4 text-red-400" size={40} />
                <p>{error || "Une erreur est survenue lors du chargement du tableau de bord."}</p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatsCard label="Nombre total de tickets" value={stats.kpis.nombre_total_tickets} href="/manager/tickets" />
                <StatsCard label="Tickets traités" value={stats.kpis.nombre_tickets_traités} href="/manager/tickets" />
                <StatsCard label="Tickets non traités" value={stats.kpis.nombre_tickets_non_traités} href="/manager/tickets" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <StatsCard label="Mes prestataires" value={stats.kpis.nombre_prestataires} href="/manager/prestataires" />
                <StatsCard label="Coût de maintenance de mon site" value={stats.kpis.cout_global_maintenance} isCurrency href="/manager/factures" />
              </div>

              <section className="grid grid-cols-1 lg:grid-cols-8 gap-12">
                <div className="lg:col-span-4">
                  <BarChartCard
                    title="Tendance de l'année"
                    data={buildBarData()}
                    onYearChange={(year) => setSelectedYear(Number(year))}
                  />
                </div>
                <div className="lg:col-span-4">
                  <DonutChartCard
                    title="Répartition des tickets par statut"
                    data={buildDonutData()}
                  />
                </div>
              </section>

              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4">
                  <h3 className="text-base font-bold text-slate-800">
                    Listes tickets récents
                  </h3>
                </div>
                <div className="px-6 py-4">
                  <DataTable
                    title="Tickets récents"
                    columns={columns}
                    data={recentTickets}
                    onViewAll={() => window.location.href = "/manager/tickets"}
                  />
                </div>
              </div>
            </>
          )}
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
    </>
  );
}