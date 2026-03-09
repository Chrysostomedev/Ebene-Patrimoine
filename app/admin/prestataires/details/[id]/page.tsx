"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Filter, Upload, ChevronLeft, MapPin, Phone, Mail, Star,
  Eye, TicketPlus, CalendarDays, CalendarCheck, Pencil,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import Paginate from "@/components/Paginate";
import StatsCard from "@/components/StatsCard";
import ActionGroup from "@/components/ActionGroup";
import ReusableForm from "@/components/ReusableForm";
import DataTable from "@/components/DataTable";
import SideDetailsPanel from "@/components/SideDetailsPanel";

import { ProviderService, ProviderDetail } from "../../../../../services/provider.service";
import { useServices } from "../../../../../hooks/useServices";

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

export default function ProviderDetailsPage() {
  const params = useParams();
  const providerId = Number(params.id);
  const { services } = useServices();

  // ── State provider ──
  const [detail, setDetail] = useState<ProviderDetail | null>(null);
  const [isLoadingProvider, setIsLoadingProvider] = useState(false);

  // ── State tickets ──
  const [tickets, setTickets] = useState<any[]>([]);
  const [ticketMeta, setTicketMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [ticketPage, setTicketPage] = useState(1);
  const [ticketFilter, setTicketFilter] = useState<string | undefined>(undefined);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);

  // ── State modals ──
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [flash, setFlash] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showFlash = (type: "success" | "error", message: string) => {
    setFlash({ type, message });
    setTimeout(() => setFlash(null), 5000);
  };

  // ── Fetch provider + ses stats tickets ──
  const fetchDetail = async () => {
    setIsLoadingProvider(true);
    try {
      const result = await ProviderService.getProvider(providerId);
      setDetail(result);
    } catch (err) {
      console.error("Erreur chargement prestataire", err);
    } finally {
      setIsLoadingProvider(false);
    }
  };

  // ── Fetch tickets paginés du prestataire ──
  const fetchTickets = async () => {
    setIsLoadingTickets(true);
    try {
      const result = await ProviderService.getProviderTickets(providerId, {
        page: ticketPage,
        status: ticketFilter,
      });
      setTickets(result.items);
      setTicketMeta(result.meta);
    } catch (err) {
      console.error("Erreur chargement tickets", err);
    } finally {
      setIsLoadingTickets(false);
    }
  };

  useEffect(() => { if (providerId) fetchDetail(); }, [providerId]);
  useEffect(() => { if (providerId) fetchTickets(); }, [ticketPage, ticketFilter, providerId]);

  const provider = detail?.provider;
  const providerStats = detail?.stats;

  // ── Modifier le prestataire ──
  // UpdateProviderRequest accepte tous les champs en "sometimes"
  const handleUpdate = async (formData: any) => {
    try {
      const payload: any = {};
      if (formData.company_name) payload.company_name = formData.company_name;
      if (formData.city) payload.city = formData.city;
      if (formData.neighborhood) payload.neighborhood = formData.neighborhood;
      if (formData.street) payload.street = formData.street;
      if (formData.service_id) payload.service_id = Number(formData.service_id);
      if (formData.date_entree) payload.date_entree = formData.date_entree;
      if (formData.description) payload.description = formData.description;

      // users imbriqué — seulement si au moins un champ rempli
      const usersPayload: any = {};
      if (formData["users.first_name"]) usersPayload.first_name = formData["users.first_name"];
      if (formData["users.last_name"]) usersPayload.last_name = formData["users.last_name"];
      if (formData["users.email"]) usersPayload.email = formData["users.email"];
      if (formData["users.phone"]) usersPayload.phone = formData["users.phone"];
      if (formData["users.password"]) usersPayload.password = formData["users.password"];
      if (Object.keys(usersPayload).length > 0) payload.users = usersPayload;

      await ProviderService.updateProvider(providerId, payload);
      showFlash("success", "Prestataire mis à jour avec succès");
      setIsEditModalOpen(false);
      fetchDetail();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Erreur lors de la mise à jour";
      showFlash("error", msg);
    }
  };

  // ── KPIs depuis getProvider().stats ──
  const kpis = [
    { label: "Total tickets", value: providerStats?.total_tickets ?? 0, delta: "+3%", trend: "up" as const },
    { label: "Tickets en cours", value: providerStats?.in_progress_tickets ?? 0, delta: "+3%", trend: "up" as const },
    { label: "Tickets clôturés", value: providerStats?.closed_tickets ?? 0, delta: "+3%", trend: "up" as const },
    {
      label: "Note",
      value: providerStats?.rating ? `${providerStats.rating}/5` : "N/A",
      delta: "+0%", trend: "up" as const,
    },
  ];

  // ── Side panel ticket ──
  const handleOpenDetails = (ticket: any) => {
    const statusColor =
      ticket.status === "clos" ? "#000" :
      ticket.status === "en_cours" ? "#f97316" :
      ticket.status === "évalué" ? "#22c55e" : "#64748b";

    setSelectedTicket({
      title: ticket.subject ?? `Ticket #${ticket.id}`,
      reference: `#${ticket.id}`,
      description: ticket.description ?? "",
      fields: [
        { label: "Type", value: ticket.type === "curatif" ? "Curatif" : "Préventif" },
        { label: "Site", value: ticket.site?.nom ?? "-" },
        { label: "Patrimoine", value: ticket.asset?.designation ?? "-" },
        { label: "Date planifiée", value: ticket.planned_at ?? "-" },
        { label: "Date limite", value: ticket.due_at ?? "-" },
        { label: "Statut", value: STATUS_LABELS[ticket.status] ?? ticket.status, isStatus: true, statusColor },
      ],
    });
    setIsDetailsOpen(true);
  };

  // ── Colonnes DataTable ──
  const columns = [
    { header: "ID", key: "id", render: (_: any, row: any) => `#${row.id}` },
    { header: "Sujet", key: "subject", render: (_: any, row: any) => row.subject ?? "-" },
    { header: "Site", key: "site", render: (_: any, row: any) => row.site?.nom ?? "-" },
    { header: "Patrimoine", key: "asset", render: (_: any, row: any) => row.asset?.designation ?? "-" },
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

  const ticketActions = [
    {
      label: "Filtrer", icon: Filter,
      onClick: () => setTicketFilter(ticketFilter ? undefined : "en_cours"),
      variant: "secondary" as const,
    },
    { label: "Exporter", icon: Upload, onClick: () => {}, variant: "secondary" as const },
    { label: "Nouveau Ticket", icon: TicketPlus, onClick: () => setIsTicketModalOpen(true), variant: "primary" as const },
  ];

  // ── Champs formulaire modification prestataire ──
  const editFields = [
    { name: "company_name", label: "Nom du prestataire", type: "text", defaultValue: provider?.company_name },
    { name: "city", label: "Ville", type: "text", defaultValue: provider?.city },
    { name: "neighborhood", label: "Quartier", type: "text", defaultValue: provider?.neighborhood },
    { name: "street", label: "Rue / Adresse", type: "text", defaultValue: provider?.street },
    {
      name: "service_id", label: "Service", type: "select",
      options: services.map(s => ({ label: s.name, value: String(s.id) })),
      defaultValue: String(provider?.service_id ?? ""),
    },
    { name: "date_entree", label: "Date d'entrée", type: "date", defaultValue: provider?.date_entree },
    { name: "description", label: "Description", type: "rich-text", gridSpan: 2, defaultValue: provider?.description },
    { name: "users.first_name", label: "Prénom contact", type: "text", defaultValue: provider?.user?.first_name },
    { name: "users.last_name", label: "Nom contact", type: "text", defaultValue: provider?.user?.last_name },
    { name: "users.email", label: "Email contact", type: "email", defaultValue: provider?.user?.email },
    { name: "users.phone", label: "Téléphone", type: "text", defaultValue: provider?.user?.phone },
    { name: "users.password", label: "Nouveau mot de passe (optionnel)", type: "text" },
  ];

  // ── Champs formulaire nouveau ticket ──
  const ticketFields = [
    { name: "subject", label: "Sujet du ticket", type: "text", required: true },
    {
      name: "type", label: "Type de maintenance", type: "select", required: true,
      options: [{ label: "Curatif", value: "curatif" }, { label: "Préventif", value: "preventif" }],
    },
    {
      name: "priority", label: "Priorité", type: "select", required: true,
      options: [
        { label: "Faible", value: "faible" },
        { label: "Moyenne", value: "moyenne" },
        { label: "Haute", value: "haute" },
        { label: "Critique", value: "critique" },
      ],
    },
    { name: "planned_at", label: "Date planifiée", type: "date", required: true, icon: CalendarDays },
    { name: "due_at", label: "Date limite", type: "date", required: true, icon: CalendarCheck },
    { name: "description", label: "Description", type: "rich-text", gridSpan: 2 },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col pl-64">
        <Navbar />
        <main className="mt-20 p-8 space-y-8">

          {flash && (
            <div className={`px-6 py-4 rounded-2xl text-sm font-semibold ${
              flash.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}>{flash.message}</div>
          )}

          {/* ── Header profil prestataire ── */}
          <div className="bg-white flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="space-y-4">
              <Link
                href="/admin/prestataires"
                className="flex items-center gap-2 text-slate-500 hover:text-black transition-colors bg-white px-4 py-2 rounded-xl border border-slate-100 w-fit text-sm font-medium"
              >
                <ChevronLeft size={18} /> Retour
              </Link>
              <div>
                <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase">
                  {isLoadingProvider ? "Chargement..." : (provider?.company_name ?? "-")}
                </h1>
                <div className="flex items-center gap-2 text-slate-400 mt-1">
                  <MapPin size={18} />
                  <span className="font-medium text-lg">{provider?.city ?? "-"}</span>
                </div>
                {/* Service + statut */}
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-sm text-slate-500 font-medium">{provider?.service?.name ?? "-"}</span>
                  <span className={`px-3 py-0.5 rounded-full text-[10px] font-bold ${
                    provider?.is_active ? "bg-green-600 text-white" : "bg-slate-200 text-slate-500"
                  }`}>
                    {provider?.is_active ? "Actif" : "Inactif"}
                  </span>
                </div>
              </div>
            </div>

            {/* Bloc contact + note + bouton modifier */}
            <div className="flex flex-col gap-4">
              <div className="bg-slate-50/50 p-6 rounded-[24px] border border-slate-100 flex flex-col gap-4 min-w-[320px]">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3 text-slate-600 font-semibold text-[15px]">
                    <div className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-100">
                      <Phone size={16} className="text-slate-900" />
                    </div>
                    {provider?.user?.phone ?? "-"}
                  </div>
                  <div className="flex items-center gap-3 text-slate-600 font-semibold text-[15px]">
                    <div className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-100">
                      <Mail size={16} className="text-slate-900" />
                    </div>
                    {provider?.user?.email ?? "-"}
                  </div>
                </div>

                {/* Note étoiles */}
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-2xl font-black text-slate-900 leading-none">
                    {provider?.rating ? `${provider.rating}/5` : "N/A"}
                  </span>
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} size={24} className={
                        i < Math.floor(provider?.rating ?? 0)
                          ? "fill-yellow-400 text-yellow-400"
                          : "fill-slate-200 text-slate-200"
                      } />
                    ))}
                  </div>
                </div>
              </div>

              {/* Bouton modifier */}
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="flex items-center justify-center gap-2 bg-slate-900 text-white py-3 px-6 rounded-2xl font-bold hover:bg-black transition-colors"
              >
                <Pencil size={16} /> Modifier le prestataire
              </button>
            </div>
          </div>

          {/* ── KPIs ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis.map((kpi, i) => <StatsCard key={i} {...kpi} />)}
          </div>

          {/* ── Actions tickets ── */}
          <div className="flex justify-end">
            <ActionGroup actions={ticketActions} />
          </div>

          {/* ── DataTable tickets ── */}
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
            {isLoadingTickets ? (
              <div className="py-16 text-center text-slate-400 text-sm italic">Chargement...</div>
            ) : (
              <DataTable columns={columns} data={tickets} title="Tickets assignés" />
            )}
            <div className="p-6 border-t border-slate-50 flex justify-end">
              <Paginate currentPage={ticketPage} totalPages={ticketMeta.last_page} onPageChange={setTicketPage} />
            </div>
          </div>

        </main>
      </div>

      {/* Side panel détails ticket */}
      <SideDetailsPanel
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title={selectedTicket?.title || ""}
        reference={selectedTicket?.reference}
        fields={selectedTicket?.fields || []}
        descriptionContent={selectedTicket?.description}
      />

      {/* Modal modifier prestataire */}
      <ReusableForm
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Modifier le prestataire"
        subtitle="Modifiez les informations du prestataire"
        fields={editFields}
        initialValues={{
          company_name: provider?.company_name ?? "",
          city: provider?.city ?? "",
          neighborhood: provider?.neighborhood ?? "",
          street: provider?.street ?? "",
          service_id: String(provider?.service_id ?? ""),
          date_entree: provider?.date_entree ?? "",
          description: provider?.description ?? "",
          "users.first_name": provider?.user?.first_name ?? "",
          "users.last_name": provider?.user?.last_name ?? "",
          "users.email": provider?.user?.email ?? "",
          "users.phone": provider?.user?.phone ?? "",
        }}
        onSubmit={handleUpdate}
        submitLabel="Mettre à jour"
      />

      {/* Modal nouveau ticket */}
      <ReusableForm
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        title="Nouveau ticket"
        subtitle="Créer un ticket pour ce prestataire"
        fields={ticketFields}
        onSubmit={() => { setIsTicketModalOpen(false); fetchTickets(); }}
        submitLabel="Créer le ticket"
      />
    </div>
  );
}