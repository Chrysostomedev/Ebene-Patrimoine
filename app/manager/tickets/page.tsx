"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Eye, Filter, Download, X,
  Wrench, User, Tag, AlertTriangle, CheckCircle2,
  CalendarDays, MapPin, Search, Plus, Clock, Star
} from "lucide-react";

import ReusableForm from "@/components/ReusableForm";
import Navbar from "@/components/Navbar";
import DataTable, { ColumnConfig } from "@/components/DataTable";
import StatsCard from "@/components/StatsCard";
import Paginate from "@/components/Paginate";
import PageHeader from "@/components/PageHeader";
import { FieldConfig } from "@/components/ReusableForm";

import { useTickets } from "../../../hooks/manager/useTickets";
import { useTicketActions } from "../../../hooks/manager/useTicketActions";
import { AssetService } from "../../../services/manager/asset.service";
import { ServiceService } from "../../../services/manager/service.service";
import { Ticket, Asset } from "../../../types/manager.types";
import { Service } from "../../../services/manager/service.service";
import { useToast } from "../../../contexts/ToastContext";



// ── HELPERS ──
import { formatDate, formatCurrency, formatHeures, formatNumber } from "@/lib/utils";


// ── STATUTS & PRIORITÉS ──
const STATUS_LABELS: Record<string, string> = {
  'SIGNALÉ': "Signalé", 'VALIDÉ': "Validé", 'ASSIGNÉ': "Assigné", 'EN_COURS': "En cours",
  'EN_TRAITEMENT': "En cours", 'RAPPORTÉ': "Rapporté", 'ÉVALUÉ': "Évalué", 'CLOS': "Clôturé",
  'signalez': "Signalé", 'validé': "Validé", 'assigné': "Assigné", 'en_cours': "En cours",
  'rapporté': "Rapporté", 'évalué': "Évalué", 'clos': "Clôturé",
};

const STATUS_STYLES: Record<string, string> = {
  'SIGNALÉ': "border-slate-300 bg-slate-100 text-slate-700",
  'VALIDÉ': "border-blue-400 bg-blue-50 text-blue-700",
  'ASSIGNÉ': "border-violet-400 bg-violet-50 text-violet-700",
  'EN_COURS': "border-orange-400 bg-orange-50 text-orange-600",
  'EN_TRAITEMENT': "border-orange-400 bg-orange-50 text-orange-600",
  'RAPPORTÉ': "border-amber-400 bg-amber-50 text-amber-700",
  'ÉVALUÉ': "border-emerald-500 bg-emerald-50 text-emerald-700",
  'CLOS': "border-emerald-200 bg-emerald-50 text-emerald-600",
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

// ── COMPOSANTS INTERNES ──
function StatusBadge({ status }: { status: string }) {
  const s = status?.toUpperCase() || 'SIGNALÉ';
  return (
    <span className={`inline-flex items-center px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-tight ${STATUS_STYLES[s] || STATUS_STYLES['SIGNALÉ']}`}>
      {STATUS_LABELS[s] || s}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const p = priority?.toLowerCase() || 'moyenne';
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight ${PRIORITY_STYLES[p] || PRIORITY_STYLES['moyenne']}`}>
      {PRIORITY_LABELS[p] || p}
    </span>
  );
}

function TicketSidePanel({
  ticket,
  onClose,
  onRate
}: {
  ticket: Ticket | null;
  onClose: () => void;
  onRate: (id: number) => void;
}) {
  if (!ticket) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[500px] bg-white z-50 shadow-2xl flex flex-col rounded-l-[2.5rem] overflow-hidden animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-8 pt-8 shrink-0">
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-2xl transition-colors"><X size={20} className="text-slate-400" /></button>
          <div className="flex items-center gap-2">
            <StatusBadge status={ticket.status} />
          </div>
        </div>

        <div className="px-8 pt-6 pb-4 shrink-0">
          <h2 className="text-3xl font-black text-slate-900 leading-tight">{ticket.subject || `Ticket #${ticket.id}`}</h2>
          <div className="flex items-center gap-3 mt-4">
            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black border uppercase tracking-widest ${ticket.type === "curatif" ? "bg-orange-50 text-orange-700 border-orange-100" : "bg-blue-50 text-blue-700 border-blue-100"}`}>
              {ticket.type}
            </span>
            <PriorityBadge priority={ticket.priority} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8 scrollbar-hide">
          <div className="space-y-3">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Description du problème</h3>
            <div className="bg-slate-50/50 rounded-[2rem] p-6 border border-slate-100 text-sm text-slate-700 leading-relaxed font-medium">
              <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: ticket.description || "Aucune description fournie" }} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="flex items-start gap-4 p-5 rounded-[1.5rem] bg-white border border-slate-100 group">
              <div className="bg-slate-900 p-3 rounded-2xl text-white"><MapPin size={18} /></div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Site & Actif</p>
                <p className="text-sm font-bold text-slate-900">{ticket.site?.nom}</p>
                <p className="text-xs text-slate-500 font-medium">{ticket.asset?.designation} ({ticket.asset?.codification || ticket.asset?.code})</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-5 rounded-[1.5rem] bg-white border border-slate-100">
              <div className="bg-slate-900 p-3 rounded-2xl text-white"><User size={18} /></div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Prestataire Assigné</p>
                <p className="text-sm font-bold text-slate-900">{ticket.provider?.company_name || ticket.provider?.name || "En attente d'assignation"}</p>
                <p className="text-xs text-slate-500 font-medium">{ticket.service?.name || "-"}</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-5 rounded-[1.5rem] bg-white border border-slate-100">
              <div className="bg-slate-900 p-3 rounded-2xl text-white"><CalendarDays size={18} /></div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Dates clés</p>
                <p className="text-sm font-bold text-slate-900">Plani. : {formatDate(ticket.planned_at)}</p>
                <p className="text-xs text-slate-500 font-medium">Échéance : {formatDate(ticket.due_at)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-8 py-8 border-t border-slate-100 shrink-0 bg-slate-50/30">
          {ticket.status === 'RAPPORTÉ' && (
            <button
              onClick={() => onRate(ticket.id)}
              className="w-full py-4 rounded-2xl bg-slate-900 text-white text-sm font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-slate-200"
            >
              Noter l'intervention
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// ── PAGE PRINCIPALE ──
export default function TicketsPage() {
  const {
    tickets, stats, meta, filters, isLoading, setFilters, refresh, exportTickets
  } = useTickets({ type: "curatif" });

  const { toast } = useToast();

  const { createTicket, rateTicket, isSubmitting, error, success } = useTicketActions({
    onSuccess: () => {
      setIsModalOpen(false);
      setIsRateOpen(false);
      refresh();
      toast.success("Le ticket a été créé avec succès.");
    }
  });


  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isRateOpen, setIsRateOpen] = useState(false);
  const [rateTicketId, setRateTicketId] = useState<number | null>(null);
  const [rateValue, setRateValue] = useState(0);
  const [rateHovered, setRateHovered] = useState(0);
  const [rateComment, setRateComment] = useState("");

  const [assets, setAssets] = useState<Asset[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  // Tracker le site_id de l'actif sélectionné pour l'injecter dans le payload
  const [selectedAssetSiteId, setSelectedAssetSiteId] = useState<number | null>(null);

  useEffect(() => {
    const fetchReferences = async () => {
      try {
        const [assetsData, servicesData] = await Promise.all([
          AssetService.getAssets({ per_page: 100 }),
          ServiceService.getServices(),
        ]);
        setAssets(assetsData.items);
        setServices(servicesData);
      } catch (err) {
        console.error("Erreur chargement références", err);
      }
    };
    fetchReferences();
  }, []);

  const ticketFields: FieldConfig[] = [
    {
      name: "subject",
      label: "Sujet du ticket",
      type: "text",
      placeholder: "Ex: Panne climatisation bureau 204",
      required: true,
      icon: <Tag size={18} />
    },
    {
      name: "type",
      label: "Type",
      type: "select",
      options: [
        { label: "Curatif", value: "curatif" },
        { label: "Préventif", value: "preventif" },
      ],
      required: true,
      icon: <Wrench size={18} />
    },
    {
      name: "priority",
      label: "Priorité",
      type: "select",
      options: [
        { label: "Faible", value: "faible" },
        { label: "Moyenne", value: "moyenne" },
        { label: "Haute", value: "haute" },
        { label: "Critique", value: "critique" },
      ],
      required: true,
      icon: <AlertTriangle size={18} />
    },
    {
      name: "company_asset_id",
      label: "Patrimoine concerné",
      type: "select",
      options: assets.map(a => ({ label: `${a.designation} (${(a as any).codification || a.code || "N/A"})`, value: String(a.id) })),
      required: true,
      icon: <CheckCircle2 size={18} />
    },
    // {
    //   name: "service_id",
    //   label: "Service métier",
    //   type: "select",
    //   options: services.map(s => ({ label: s.name, value: String(s.id) })),
    //   icon: <Tag size={18} />
    // },
    // {
    //   name: "planned_at",
    //   label: "Début souhaité",
    //   type: "date",
    //   disablePastDates: true,
    //   required: true,
    //   icon: <CalendarDays size={18} />
    // },

    {
      name: "description",
      label: "Détails supplémentaires",
      type: "rich-text",
      placeholder: "Décrivez précisément le problème constaté...",
      required: true,
      gridSpan: 2,   // ← pleine largeur ✓
    },
    {
      name: "attachments",
      label: "Photo justificative",
      type: "image-upload",
      required: false,
      gridSpan: 2,
    },


  ];

  const kpis = useMemo(() => [
    { label: "Coût moyen / ticket", value: stats?.cout_moyen_par_ticket ?? 0, isCurrency: true, trend: "up" as const },
    { label: "Total tickets site", value: stats?.nombre_total_tickets ?? 0, trend: "up" as const },
    { label: "Tickets en cours", value: stats?.nombre_total_tickets_en_cours ?? 0, trend: "up" as const },
    { label: "Délai moyen (h)", value: stats?.delais_moyen_traitement_heures ?? 0, trend: "down" as const },
  ], [stats]);

  const columns: ColumnConfig<Ticket>[] = [
    {
      header: "Code",
      key: "id",
      render: (_: any, row: Ticket) => (
        <span className="font-mono text-[10px] font-black text-slate-900 bg-slate-100 px-2 py-1 rounded-lg">
          {row.code_ticket || `${row.id}`}
        </span>
      )
    },
    {
      header: "Sujet",
      key: "subject",
      render: (_: any, row: Ticket) => (
        <div className="max-w-[200px]">
          <p className="text-sm font-bold text-slate-900 truncate">{row.subject}</p>
          <p className="text-[10px] text-slate-400 font-medium truncate uppercase tracking-widest">{row.asset?.designation}</p>
        </div>
      )
    },
    {
      header: "Type",
      key: "type",
      render: (_: any, row: Ticket) => (
        <span className={`text-[10px] font-black uppercase tracking-widest ${row.type === 'curatif' ? 'text-orange-600' : 'text-blue-600'}`}>
          {row.type}
        </span>
      )
    },
    { header: "Statut", key: "status", render: (_: any, row: Ticket) => <StatusBadge status={row.status} /> },
    { header: "Priorité", key: "priority", render: (_: any, row: Ticket) => <PriorityBadge priority={row.priority} /> },
    {
      header: "Actions",
      key: "actions",
      render: (_: any, row: Ticket) => (

        <div className="flex items-center gap-2">

          <Link href={`/manager/tickets/${row.id}`} className="group p-2 rounded-xl bg-white hover:bg-black border border-slate-200 hover:border-black transition flex items-center justify-center">
            <Eye size={14} className="text-slate-600 group-hover:text-white transition-all" />
          </Link>
        </div>
      )
    },
  ];

  return (
    <>
      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar />
        <main className="mt-20 p-8 space-y-10 overflow-y-auto h-[calc(100vh-80px)]">
          <PageHeader
            title="Mes tickets"
            subtitle="Gérez les signalements curatifs et le suivi des maintenances"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis.map((k, i) => <StatsCard key={i} {...k} />)}
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-2 border-b border-slate-200/60">

            <div className="flex items-end gap-4 w-full md:w-auto">
              <button
                onClick={exportTickets}
                className="flex items-center justify-center gap-3 px-6 py-4 rounded-[1.5rem] bg-white border border-slate-100 text-slate-700 text-sm font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm group"
              >
                <Download size={16} className="group-hover:-translate-y-0.5 transition-transform" />
                Export
              </button>
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex flex-1 md:flex-none items-center justify-center gap-3 px-8 py-4 rounded-[2rem] bg-slate-900 text-white text-sm font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-200 group active:scale-95"
              >
                <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                Nouveau Ticket
              </button>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
            <DataTable
              title="Liste des interventions"
              columns={columns}
              data={tickets}
            />
            <div className="p-8 border-t border-slate-50 flex flex-col sm:flex-row items-center justify-between gap-6 bg-slate-50/30">
              <p className="text-xs text-slate-400 font-black uppercase tracking-[0.1em]">
                Page {meta?.current_page || 1} sur {meta?.last_page || 1} · {meta?.total || 0} résultats
              </p>
              <Paginate
                currentPage={meta?.current_page || 1}
                totalPages={meta?.last_page || 1}
                onPageChange={(p) => setFilters({ page: p })}
              />
            </div>
          </div>
        </main>
      </div>

      <TicketSidePanel
        ticket={isDetailsOpen ? selectedTicket : null}
        onClose={() => setIsDetailsOpen(false)}
        onRate={(id) => {
          setRateTicketId(id);
          setRateValue(0);
          setRateComment("");
          setIsDetailsOpen(false);
          setIsRateOpen(true);
        }}
      />

      {/* ── Modale notation ── */}
      {isRateOpen && rateTicketId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsRateOpen(false)} />
          <div className="relative bg-white rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-50">
              <div>
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Noter l'intervention</h2>
                <p className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-widest">Ticket #{rateTicketId}</p>
              </div>
              <button onClick={() => setIsRateOpen(false)} className="p-2 hover:bg-slate-50 rounded-2xl transition">
                <X size={18} className="text-slate-400" />
              </button>
            </div>
            <div className="px-8 py-6 space-y-6">
              {/* Étoiles */}
              <div className="space-y-3">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] block">Note de satisfaction (facultatif)</label>
                <div className="flex gap-3 justify-center py-4 bg-slate-50 rounded-3xl">
                  {Array.from({ length: 5 }, (_, i) => {
                    const val = i + 1;
                    const active = val <= (rateHovered || rateValue);
                    return (
                      <button key={i}
                        onMouseEnter={() => setRateHovered(val)}
                        onMouseLeave={() => setRateHovered(0)}
                        onClick={() => setRateValue(rateValue === val ? 0 : val)}
                        className={`transition-all duration-200 ${active ? "scale-110" : "scale-100"}`}>
                        <Star size={36} className={active ? "fill-yellow-400 text-yellow-400" : "fill-slate-200 text-slate-200"} />
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Commentaire */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] block">Commentaire (facultatif)</label>
                <textarea
                  value={rateComment}
                  onChange={e => setRateComment(e.target.value)}
                  rows={3}
                  placeholder="Ex: Travaux bien exécutés, site laissé propre..."
                  className="w-full px-5 py-4 rounded-2xl border border-slate-100 text-sm text-slate-900 placeholder-slate-300 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all bg-slate-50/20 resize-none"
                />
              </div>
            </div>
            <div className="px-8 py-6 border-t border-slate-50 flex gap-3">
              <button onClick={() => setIsRateOpen(false)} className="flex-1 py-3.5 rounded-2xl border border-slate-200 text-slate-600 text-sm font-black uppercase tracking-widest hover:bg-white transition-all">
                Annuler
              </button>
              <button
                disabled={isSubmitting}
                onClick={async () => {
                  if (rateTicketId) {
                    await rateTicket(rateTicketId, { rating: rateValue || undefined, comment: rateComment || undefined } as any);
                    setIsRateOpen(false);
                    refresh();
                  }
                }}
                className="flex-1 py-3.5 rounded-2xl bg-slate-900 text-white text-sm font-black uppercase tracking-widest hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Star size={15} />}
                Valider
              </button>
            </div>
          </div>
        </div>
      )}

      <ReusableForm
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedAssetSiteId(null); }}
        title="Signaler un Problème"
        subtitle="Détaillez le dysfonctionnement pour une intervention rapide"
        fields={ticketFields}
        initialValues={{ type: 'curatif', priority: 'moyenne' }}
        isSubmitting={isSubmitting}
        error={error}
        success={success}
        onFieldChange={(name, value) => {
          if (name === "company_asset_id" && value) {
            const asset = assets.find(a => String(a.id) === String(value));
            setSelectedAssetSiteId((asset as any)?.site_id ?? null);
          }
        }}
        onSubmit={(values: Record<string, any>) => {
          // Injection site_id depuis l'actif sélectionné
          const siteId = selectedAssetSiteId
            ?? assets.find(a => String(a.id) === String(values.company_asset_id))?.site_id
            ?? null;

          createTicket({ ...values, site_id: siteId } as any);
        }}

        submitLabel="Envoyer le ticket"
      />
    </>
  );
}