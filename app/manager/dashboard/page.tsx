"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import StatsCard from "@/components/StatsCard";
import DonutChartCard from "@/components/DonutChartCard";
import BarChartCard from "@/components/BarChartCard";
import DataTable from "@/components/DataTable";
import SideDetailsPanel from "@/components/SideDetailsPanel";
import { Eye } from "lucide-react";

const MOIS_LABELS = ["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Aoû","Sep","Oct","Nov","Déc"];

const DONUT_COLORS = ["#df1414","#07ad07","#606eee","#050f6b","#f97316"];

const BAR_COLORS = [
  "#01050e","#041022","#192535","#2d3748",
  "#373e46","#4a5568","#718096","#969799",
  "#a0aec0","#cbd5e0","#e2e8f0","#94a3b8"
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

const STATUS_STYLES = {
  signalez: "border-slate-300 text-slate-700 bg-gray-100",
  validé: "border-blue-400 text-blue-600 bg-blue-50",
  assigné: "border-purple-400 text-purple-600 bg-purple-50",
  en_cours: "border-orange-400 text-orange-500 bg-orange-50",
  rapporté: "border-yellow-400 text-yellow-600 bg-yellow-50",
  évalué: "border-green-400 text-green-600 bg-green-50",
  clos: "bg-black text-white border-black",
};

/* ---------------------- */
/* DONNÉES STATIQUES */
/* ---------------------- */

const dashboard = {

  nombre_total_tickets: 245,
  nombre_tickets_traites: 180,
  nombre_tickets_non_traites: 65,

  nombre_sites_actifs: 12,
  nombre_sites_inactifs: 3,

  cout_total_maintenance: 2450000,

  tendance_annuelle_maintenance: [
    { mois:1,total:10,annee:2025 },
    { mois:2,total:14,annee:2025 },
    { mois:3,total:9,annee:2025 },
    { mois:4,total:20,annee:2025 },
    { mois:5,total:15,annee:2025 },
    { mois:6,total:18,annee:2025 },
    { mois:7,total:25,annee:2025 },
    { mois:8,total:21,annee:2025 },
    { mois:9,total:17,annee:2025 },
    { mois:10,total:12,annee:2025 },
    { mois:11,total:14,annee:2025 },
    { mois:12,total:16,annee:2025 },
  ],

  sites_les_plus_frequentes: [
    { site_id:1, nom:"Orange CI", total_tickets:45 },
    { site_id:2, nom:"MTN Plateau", total_tickets:38 },
    { site_id:3, nom:"Moov Marcory", total_tickets:26 },
    { site_id:4, nom:"Wave Cocody", total_tickets:18 },
  ],

  tickets_recents: [
    {
      id:1021,
      subject:"Panne groupe électrogène",
      type:"curatif",
      status:"en_cours",
      site:{ nom:"Orange CI" },
      service:{ name:"Maintenance électrique" },
      planned_at:"12/03/2026"
    },
    {
      id:1022,
      subject:"Inspection climatisation",
      type:"préventif",
      status:"validé",
      site:{ nom:"MTN Plateau" },
      service:{ name:"Climatisation" },
      planned_at:"10/03/2026"
    },
    {
      id:1023,
      subject:"Contrôle sécurité site",
      type:"préventif",
      status:"clos",
      site:{ nom:"Wave Cocody" },
      service:{ name:"Sécurité" },
      planned_at:"08/03/2026"
    }
  ]

};

export default function Dashboard() {

  const [selectedTicket,setSelectedTicket] = useState(null);
  const [isDetailsOpen,setIsDetailsOpen] = useState(false);
  const [selectedYear,setSelectedYear] = useState(2025);

  const buildBarData = () => {
    const filtered = dashboard.tendance_annuelle_maintenance.filter(
      i => i.annee === selectedYear
    );

    const map = {};
    filtered.forEach(i => { map[i.mois] = i.total });

    return MOIS_LABELS.map((label,i)=>({
      label,
      value: map[i+1] ?? 0,
      color: BAR_COLORS[i]
    }));
  };

  const buildDonutData = () =>
    dashboard.sites_les_plus_frequentes.map((site,i)=>({
      label: site.nom,
      value: site.total_tickets,
      color: DONUT_COLORS[i % DONUT_COLORS.length]
    }));

  const handleOpenDetails = (ticket) => {

    const statusColor =
      ticket.status === "clos" ? "#000" :
      ticket.status === "en_cours" ? "#f97316" :
      ticket.status === "évalué" ? "#22c55e" : "#64748b";

    setSelectedTicket({
      title: ticket.subject ?? `Ticket #${ticket.id}`,
      reference:`#${ticket.id}`,
      description:"Ticket récent visualisé depuis le tableau de bord.",
      fields:[
        { label:"Type",value:ticket.type },
        { label:"Sujet",value:ticket.subject },
        { label:"Site concerné",value:ticket.site?.nom },
        { label:"Service",value:ticket.service?.name },
        { label:"Date planifiée",value:ticket.planned_at },
        { label:"Statut",value:STATUS_LABELS[ticket.status],isStatus:true,statusColor }
      ]
    });

    setIsDetailsOpen(true);
  };

  const columns = [

    { header:"ID ticket",key:"id",render:(_,row)=>`#${row.id}` },

    { header:"Nom",key:"subject",render:(_,row)=>row.subject },

    { header:"Site",key:"site",render:(_,row)=>row.site?.nom },

    { header:"Service",key:"service",render:(_,row)=>row.service?.name },

    { header:"Type",key:"type",render:(_,row)=>row.type },

    {
      header:"Statut",
      key:"status",
      render:(_,row)=>(
        <span className={`inline-flex items-center justify-center min-w-[90px] px-3 py-1.5 rounded-xl border text-xs font-bold ${STATUS_STYLES[row.status]}`}>
          {STATUS_LABELS[row.status]}
        </span>
      )
    },

    {
      header:"Actions",
      key:"actions",
      render:(_,row)=>(
        <button
          onClick={()=>handleOpenDetails(row)}
          className="font-bold text-slate-800 hover:text-blue-600 transition"
        >
          <Eye size={18}/>
        </button>
      )
    }

  ];

  return (
    <div className="flex min-h-screen bg-zinc-50">

      <Sidebar />

      <div className="flex-1 flex flex-col pl-64">

        <Navbar />

        <main className="flex-1 p-8 pt-24 space-y-8">

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatsCard label="Nombre total de tickets" value={dashboard.nombre_total_tickets}/>
            <StatsCard label="Tickets traités" value={dashboard.nombre_tickets_traites}/>
            <StatsCard label="Tickets non traités" value={dashboard.nombre_tickets_non_traites}/>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatsCard label="Mes prestataires" value={dashboard.nombre_sites_actifs}/>
            <StatsCard label=" " value={dashboard.nombre_sites_inactifs}/>
            <StatsCard
              label="Coût de maintenance de mon site"
              value={dashboard.cout_total_maintenance}
              isCurrency
            />
          </div>

          <section className="grid grid-cols-1 lg:grid-cols-8 gap-12">

            <div className="lg:col-span-4">
              <BarChartCard
                title="Tendance de l'année"
                data={buildBarData()}
                onYearChange={(year)=>setSelectedYear(Number(year))}
              />
            </div>

            <div className="lg:col-span-4">
              <DonutChartCard
                title="Mes prestataires favoris"
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
                columns={columns}
                data={dashboard.tickets_recents}
                onViewAll={()=>window.location.href="/admin/tickets"}
              />

            </div>

          </div>

        </main>

      </div>

      <SideDetailsPanel
        isOpen={isDetailsOpen}
        onClose={()=>setIsDetailsOpen(false)}
        title={selectedTicket?.title || ""}
        reference={selectedTicket?.reference}
        fields={selectedTicket?.fields || []}
        descriptionContent={selectedTicket?.description}
      />

    </div>
  );
}