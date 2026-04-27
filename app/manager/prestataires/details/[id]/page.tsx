"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, MapPin, Phone, Mail, Star, Eye, Filter,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Paginate from "@/components/Paginate";
import StatsCard from "@/components/StatsCard";
import DataTable from "@/components/DataTable";
import SideDetailsPanel from "@/components/SideDetailsPanel";

import { ProviderService } from "../../../../../services/manager/provider.service";
import type { Provider, ProviderStats } from "../../../../../services/manager/provider.service";

/* ── Statuts ─────────────────────────────────────────────────────────────── */
const STATUS_LABELS: Record<string, string> = {
  SIGNALÉ: "Signalé", VALIDÉ: "Validé", ASSIGNÉ: "Assigné",
  EN_COURS: "En cours", RAPPORTÉ: "Rapporté", ÉVALUÉ: "Évalué", CLOS: "Clôturé",
  signalez: "Signalé", validé: "Validé", assigné: "Assigné",
  en_cours: "En cours", rapporté: "Rapporté", évalué: "Évalué", clos: "Clôturé",
};
const STATUS_STYLES: Record<string, string> = {
  SIGNALÉ: "border-slate-300 bg-slate-100 text-slate-700",
  VALIDÉ: "border-blue-400 bg-blue-50 text-blue-700",
  ASSIGNÉ: "border-violet-400 bg-violet-50 text-violet-700",
  EN_COURS: "border-orange-400 bg-orange-50 text-orange-600",
  RAPPORTÉ: "border-amber-400 bg-amber-50 text-amber-700",
  ÉVALUÉ: "border-green-500 bg-green-50 text-green-700",
  CLOS: "bg-black text-white border-black",
};

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function ProviderDetailsPage() {
  const params = useParams();
  const providerId = Number(params.id);
  const router = useRouter();

  const [provider, setProvider] = useState<Provider | null>(null);
  const [providerStats, setProviderStats] = useState<ProviderStats | null>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [ticketMeta, setTicketMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [ticketPage, setTicketPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  /* ── Fetch provider depuis les tickets du site ─────────────────────────── */
  const fetchProvider = useCallback(async () => {
    setIsLoading(true);
    try {
      const { provider: p, stats } = await ProviderService.getProvider(providerId);
      setProvider(p);
      setProviderStats(stats);
    } catch (e) {
      console.error("Erreur chargement prestataire", e);
    } finally {
      setIsLoading(false);
    }
  }, [providerId]);

  /* ── Fetch tickets du prestataire ──────────────────────────────────────── */
  const fetchTickets = useCallback(async () => {
    try {
      const result = await ProviderService.getProviderTickets(providerId, {
        page: ticketPage, per_page: 10,
      });
      setTickets(result.items ?? []);
      setTicketMeta(result.meta ?? { current_page: 1, last_page: 1, total: 0 });
    } catch (e) {
      console.error("Erreur chargement tickets prestataire", e);
    }
  }, [providerId, ticketPage]);

  useEffect(() => { fetchProvider(); }, [fetchProvider]);
  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  /* ── KPIs ──────────────────────────────────────────────────────────────── */
  const kpis = [
    { label: "Total tickets", value: providerStats?.total_tickets ?? 0, delta: "", trend: "up" as const },
    { label: "Tickets en cours", value: providerStats?.in_progress_tickets ?? 0, delta: "", trend: "up" as const },
    { label: "Tickets clôturés", value: providerStats?.closed_tickets ?? 0, delta: "", trend: "up" as const },
    { label: "Note", value: providerStats?.rating ? `${providerStats.rating}/5` : "N/A", delta: "", trend: "up" as const },
  ];

  /* ── SidePanel ticket ──────────────────────────────────────────────────── */
  const handleOpenDetails = (ticket: any) => {
    const s = (ticket.status || "").toUpperCase();
    const statusColor = s === "CLOS" ? "#000" : s === "EN_COURS" ? "#f97316" : "#64748b";
    setSelectedTicket({
      title: ticket.subject ?? `Ticket #${ticket.id}`,
      reference: `#${ticket.id}`,
      description: ticket.description ?? "",
      fields: [
        { label: "Type", value: ticket.type === "curatif" ? "Curatif" : "Préventif" },
        { label: "Site", value: ticket.site?.nom ?? "-" },
        { label: "Patrimoine", value: ticket.asset?.designation ?? "-" },
        { label: "Date soumise", value: ticket.planned_at ? new Date(ticket.planned_at).toLocaleString("fr-FR") : "-" },
        { label: "Date limite", value: ticket.due_at ? new Date(ticket.due_at).toLocaleString("fr-FR") : "-" },
        { label: "Statut", value: STATUS_LABELS[ticket.status] ?? ticket.status, isStatus: true, statusColor },
      ],
    });
    setIsDetailsOpen(true);
  };

  /* ── Colonnes ──────────────────────────────────────────────────────────── */
  const columns = [
    { header: "Code", key: "code_ticket", render: (_: any, row: any) => `${row.code_ticket}` },
    { header: "Sujet", key: "subject", render: (_: any, row: any) => <span className="font-medium text-sm">{row.subject ?? "-"}</span> },
    { header: "Site", key: "site", render: (_: any, row: any) => row.site?.nom ?? "-" },
    { header: "Patrimoine", key: "asset", render: (_: any, row: any) => row.asset?.designation ?? "-" },
    { header: "Type", key: "type", render: (_: any, row: any) => row.type === "curatif" ? "Curatif" : "Préventif" },
    {
      header: "Statut", key: "status",
      render: (_: any, row: any) => {
        const s = (row.status || "").toUpperCase();
        return (
          <span className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${STATUS_STYLES[s] ?? STATUS_STYLES.SIGNALÉ}`}>
            {STATUS_LABELS[s] ?? row.status}
          </span>
        );
      },
    },
    {
      header: "Actions", key: "actions",
      render: (_: any, row: any) => (
        <button
          onClick={() => router.push(`/manager/tickets/details/${row.id}`)}
          className="p-2 hover:bg-slate-900 hover:text-white border border-slate-100 rounded-xl transition text-slate-400"
          title="Voir la fiche complète"
        >
          <Eye size={18} />
        </button>
      ),
    },
  ];

  /* ── Render ────────────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col flex-1">
      <Navbar />

      <main className="mt-20 p-8 space-y-8">

        {/* Header prestataire */}
        <div className="bg-white flex flex-col md:flex-row md:items-start justify-between gap-6 p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="space-y-4">
            <Link href="/manager/prestataires" className="flex items-center gap-2 text-slate-500 hover:text-black transition text-sm font-medium">
              <ChevronLeft size={18} /> Retour
            </Link>
            {isLoading ? (
              <div className="w-64 h-10 bg-slate-100 rounded-xl animate-pulse" />
            ) : (
              <div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">
                  {provider?.company_name ?? "Prestataire"}
                </h1>
                <div className="flex items-center gap-2 text-slate-400 mt-1">
                  <MapPin size={16} />
                  <span className="font-medium">{provider?.city ?? "-"}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-slate-500 font-medium">{provider?.service?.name ?? "-"}</span>
                  <span className={`px-3 py-0.5 rounded-full text-[10px] font-bold ${provider?.is_active ? "bg-green-600 text-white" : "bg-slate-200 text-slate-500"}`}>
                    {provider?.is_active ? "Actif" : "Inactif"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Contact + note */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 min-w-[260px] space-y-3">
            <div className="flex items-center gap-3 text-slate-600 text-sm font-medium">
              <Phone size={15} className="text-slate-400" />
              {provider?.user?.phone ?? "-"}
            </div>
            <div className="flex items-center gap-3 text-slate-600 text-sm font-medium">
              <Mail size={15} className="text-slate-400" />
              {provider?.user?.email ?? "-"}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xl font-black text-slate-900">
                {providerStats?.rating ? `${providerStats.rating}/5` : "N/A"}
              </span>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} size={18} className={
                    i < Math.floor(providerStats?.rating ?? 0)
                      ? "fill-yellow-400 text-yellow-400"
                      : "fill-slate-200 text-slate-200"
                  } />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpis.map((k, i) => <StatsCard key={i} {...k} />)}
        </div>

        {/* Table tickets */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <DataTable columns={columns} data={tickets} title="Tickets assignés" />
          {ticketMeta.last_page > 1 && (
            <div className="p-6 border-t border-slate-50 flex justify-end">
              <Paginate
                currentPage={ticketMeta.current_page}
                totalPages={ticketMeta.last_page}
                onPageChange={setTicketPage}
              />
            </div>
          )}
        </div>

      </main>

      <SideDetailsPanel
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title={selectedTicket?.title ?? ""}
        reference={selectedTicket?.reference}
        fields={selectedTicket?.fields ?? []}
        descriptionContent={selectedTicket?.description}
      />
    </div>
  );
}
