"use client";

import { useState, useRef } from "react";
import { Check, Copy, Eye, Filter, Download, Upload, TicketPlus, X,
  CalendarCheck, CalendarDays, Clock, MapPin,
  Wrench, User, Tag, AlertTriangle, CheckCircle2,
} from "lucide-react";

import ReusableForm from "@/components/ReusableForm";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import DataTable from "@/components/DataTable";
import StatsCard from "@/components/StatsCard";
import Paginate from "@/components/Paginate";
import PageHeader from "@/components/PageHeader";
import { FieldConfig } from "@/components/ReusableForm";

// ── HELPERS ──
const formatHeures = (h?: number | null) => h != null ? `${h}h` : "—";
const formatDate = (iso?: string | null) => iso ?? "—";

// ── STATUTS & PRIORITÉS ──
const STATUS_LABELS: Record<string, string> = {
  signalez: "Signalé", validé: "Validé", assigné: "Assigné", en_cours: "En cours",
  rapporté: "Rapporté", évalué: "Évalué", clos: "Clôturé",
};
const STATUS_STYLES: Record<string, string> = {
  signalez: "border-slate-300 bg-slate-100 text-slate-700",
  validé: "border-blue-400 bg-blue-50 text-blue-700",
  assigné: "border-violet-400 bg-violet-50 text-violet-700",
  en_cours: "border-orange-400 bg-orange-50 text-orange-600",
  rapporté: "border-amber-400 bg-amber-50 text-amber-700",
  évalué: "border-green-500 bg-green-50 text-green-700",
  clos: "border-black bg-black text-white",
};
const STATUS_DOT_COLORS: Record<string, string> = {
  signalez: "#94a3b8", validé: "#3b82f6", assigné: "#8b5cf6", en_cours: "#f97316",
  rapporté: "#f59e0b", évalué: "#22c55e", clos: "#000000",
};
const PRIORITY_LABELS: Record<string, string> = {
  faible: "Faible", moyenne: "Moyenne", haute: "Haute", critique: "Critique",
};
const PRIORITY_STYLES: Record<string, string> = {
  faible: "bg-slate-100 text-slate-600",
  moyenne: "bg-blue-50 text-blue-700",
  haute: "bg-orange-50 text-orange-700",
  critique: "bg-red-100 text-red-700",
};

// ── BADGES ──
function StatusBadge({ status }: { status: string }) {
  return <span className={`inline-flex items-center px-3 py-1.5 rounded-xl border text-xs font-bold ${STATUS_STYLES[status]}`}>{STATUS_LABELS[status]}</span>;
}
function PriorityBadge({ priority }: { priority: string }) {
  return <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold ${PRIORITY_STYLES[priority]}`}>{PRIORITY_LABELS[priority]}</span>;
}

// ── FILTER DROPDOWN SIMPLIFIÉ ──
function FilterDropdown({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;
  return (
    <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl p-5">
      <p className="text-sm font-black uppercase tracking-widest">Filtres simulés</p>
      <button onClick={onClose} className="mt-3 px-3 py-1 rounded-xl border">Fermer</button>
    </div>
  );
}

// ── SIDE PANEL SIMPLIFIÉ ──
interface Ticket {
  id: number;
  subject?: string;
  status: string;
  priority: string;
  type: "curatif" | "preventif";
  site?: { nom: string };
  asset?: { designation: string; codification?: string };
  service?: { name: string };
  provider?: { name?: string; company_name?: string };
  planned_at?: string;
  due_at?: string;
  description?: string;
  resolved_at?: string;
  closed_at?: string;
  created_at?: string;
}
function TicketSidePanel({ ticket, onClose, onEdit }: { ticket: Ticket | null; onClose: () => void; onEdit: () => void }) {
  if (!ticket) return null;
  const statusColor = STATUS_DOT_COLORS[ticket.status];
  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[460px] bg-white z-50 shadow-2xl flex flex-col rounded-l-3xl overflow-hidden">
        <div className="flex items-start px-6 pt-6 pb-0 shrink-0">
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-xl transition -ml-1"><X size={18} /></button>
        </div>
        <div className="px-7 pt-4 pb-5 shrink-0">
          <h2 className="text-2xl font-black">{ticket.subject ?? `Ticket #${ticket.id}`}</h2>
          <div className="flex flex-wrap items-center gap-2 mt-2.5">
            <span className={`px-3 py-1 rounded-full text-[10px] font-black border ${ticket.type==="curatif"?"bg-orange-50 text-orange-700":"bg-blue-50 text-blue-700"}`}>
              {ticket.type==="curatif"?"Curatif":"Préventif"}
            </span>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black border ${STATUS_STYLES[ticket.status]}`}>
              <span className="w-1.5 h-1.5 rounded-full" style={{backgroundColor:statusColor}}/>
              {STATUS_LABELS[ticket.status]}
            </span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-7 pb-7 space-y-6">
          <p className="text-xs font-black uppercase tracking-widest mb-2">Description</p>
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-sm text-slate-700">{ticket.description ?? "—"}</div>
        </div>
        <div className="px-7 py-5 border-t border-slate-100 shrink-0">
          <button onClick={onEdit} className="w-full py-3.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition">Modifier le ticket</button>
        </div>
      </div>
    </>
  );
}

// ── PAGE PRINCIPALE ──
export default function TicketsPage() {
  const filterRef = useRef<HTMLDivElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // ── MOCK DATA ──
  const mockTickets: Ticket[] = [
    { id:1, subject:"Problème serveur", status:"en_cours", priority:"haute", type:"curatif", site:{nom:"Site A"}, asset:{designation:"Machine X"}, service:{name:"IT"}, provider:{name:"John Doe"}, description:"Serveur indisponible depuis 2h" },
    { id:2, subject:"Maintenance imprimante", status:"assigné", priority:"moyenne", type:"preventif", site:{nom:"Site B"}, asset:{designation:"Imprimante Y"}, service:{name:"Maintenance"}, provider:{company_name:"PrintCo"}, description:"Vérification annuelle" },
  ];
  const stats = { cout_moyen_par_ticket:5000, nombre_total_tickets:2, nombre_total_tickets_en_cours:1, nombre_total_tickets_clotures:0, nombre_tickets_par_mois:1, delais_moyen_traitement_heures:2, delais_minimal_traitement_heures:1, delais_maximal_traitement_heures:3 };

  const ticketFields: FieldConfig[] = [];
  const editFields: FieldConfig[] = [];

  const kpis1 = [
    { label: "Coût moyen / ticket", value: stats.cout_moyen_par_ticket, isCurrency:true, delta:"+0%", trend:"up" as const },
    { label: "Total tickets", value: stats.nombre_total_tickets, delta:"+0%", trend:"up" as const },
    { label: "Tickets en cours", value: stats.nombre_total_tickets_en_cours, delta:"+0%", trend:"up" as const },
    { label: "Tickets clôturés", value: stats.nombre_total_tickets_clotures, delta:"+0%", trend:"up" as const },
  ];
  const kpis2 = [
    { label:"Tickets ce mois", value: stats.nombre_tickets_par_mois, delta:"+0%", trend:"up" as const },
    { label:"Délai moyen", value: formatHeures(stats.delais_moyen_traitement_heures), delta:"+0%", trend:"up" as const },
    { label:"Délai minimal", value: formatHeures(stats.delais_minimal_traitement_heures), delta:"+0%", trend:"up" as const },
    { label:"Délai maximal", value: formatHeures(stats.delais_maximal_traitement_heures), delta:"+0%", trend:"up" as const },
  ];

  const columns = [
    { header:"Codification", key:"id", render:(_:any,row:Ticket)=>`#${row.id}` },
    { header:"Sujet", key:"subject", render:(_:any,row:Ticket)=>row.subject },
    { header:"Statut", key:"status", render:(_:any,row:Ticket)=><StatusBadge status={row.status}/> },
    { header:"Priorité", key:"priority", render:(_:any,row:Ticket)=><PriorityBadge priority={row.priority}/> },
    { header:"Actions", key:"actions", render:(_:any,row:Ticket)=><button onClick={()=>{setSelectedTicket(row); setIsDetailsOpen(true)}}><Eye size={18}/> Aperçu</button> },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="ml-64 mt-20 p-6 space-y-8">
          <PageHeader title="Tickets" subtitle="Suivez et gérez tous vos tickets d'intervention" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis1.map((k,i)=><StatsCard key={i} {...k}/>)}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis2.map((k,i)=><StatsCard key={i} {...k}/>)}
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap min-h-[36px]">
              <p className="text-xs text-slate-400 font-medium">Aucun filtre actif</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition shadow-sm"><TicketPlus size={16}/> Nouveau Ticket</button>
              <div className="relative" ref={filterRef}>
                <button onClick={()=>setFiltersOpen(!filtersOpen)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border bg-white text-slate-700 text-sm font-bold hover:bg-slate-50 transition">
                  <Filter size={16}/> Filtrer
                </button>
                <FilterDropdown isOpen={filtersOpen} onClose={()=>setFiltersOpen(false)} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <DataTable columns={columns} data={mockTickets} onViewAll={()=>{}} />
            <div className="p-6 border-t border-slate-50 flex items-center justify-between bg-slate-50/30">
              <p className="text-xs text-slate-400">Page 1 sur 1 · {mockTickets.length} tickets</p>
              <Paginate currentPage={1} totalPages={1} onPageChange={()=>{}} />
            </div>
          </div>
        </main>
      </div>

      <TicketSidePanel ticket={isDetailsOpen ? selectedTicket : null} onClose={()=>setIsDetailsOpen(false)} onEdit={()=>{}} />
      <ReusableForm isOpen={isModalOpen} onClose={()=>setIsModalOpen(false)} title={editingTicket?"Modifier le ticket":"Nouveau ticket"} subtitle={editingTicket?"Modifiez le ticket":"Remplissez les informations"} fields={editingTicket?editFields:ticketFields} initialValues={{}} onSubmit={()=>{}} submitLabel={editingTicket?"Mettre à jour":"Créer le ticket"} />
    </div>
  );
}