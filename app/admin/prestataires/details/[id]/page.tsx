"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Filter, Upload, ChevronLeft, MapPin, Phone, Mail, Star,
  Eye, TicketPlus, CalendarDays, CalendarCheck, Pencil,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import Paginate from "@/components/Paginate";
import StatsCard from "@/components/StatsCard";
import ActionGroup from "@/components/ActionGroup";
import ReusableForm from "@/components/ReusableForm";
import DataTable from "@/components/DataTable";
import SideDetailsPanel from "@/components/SideDetailsPanel";

import { ProviderService, ProviderDetail } from "../../../../../services/admin/provider.service";
import { useServices } from "../../../../../hooks/admin/useServices";
import { useToast } from "@/contexts/ToastContext";
import { exportToXlsx } from "../../../../../core/export";

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

  const ticketActions = [
    {
      label: "Exporter",
      icon: Upload,
      onClick: handleExportTickets,
    },
  ];

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
  const { toast } = useToast();


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

      // Champs responsable via users wrapper
      const usersData: any = {};
      if (formData["users.first_name"]) usersData.first_name = formData["users.first_name"];
      if (formData["users.last_name"]) usersData.last_name = formData["users.last_name"];
      if (formData["users.email"]) usersData.email = formData["users.email"];
      if (formData["users.phone"]) usersData.phone = formData["users.phone"];
      if (Object.keys(usersData).length > 0) payload.users = usersData;

      await ProviderService.updateProvider(providerId, payload);
      toast.success("Prestataire mis à jour avec succès");
      setIsEditModalOpen(false);
      fetchDetail();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Erreur lors de la mise à jour";
      toast.error(msg);
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
        { label: "Date soumise", value: ticket.planned_at ?? "-" },
        { label: "Date limite", value: ticket.due_at ?? "-" },
        { label: "Statut", value: STATUS_LABELS[ticket.status] ?? ticket.status, isStatus: true, statusColor },
      ],
    });
    setIsDetailsOpen(true);
  };

  // ── Colonnes DataTable ──
  const columns = [
    { header: "Référence", key: "id", render: (_: any, row: any) => `${row.code_ticket}` },
    { header: "Sujet", key: "subject", render: (_: any, row: any) => row.subject ?? "-" },
    { header: "Site", key: "site", render: (_: any, row: any) => row.site?.nom ?? "-" },
    { header: "Patrimoine", key: "asset", render: (_: any, row: any) => row.company_asset?.designation ?? "-" },
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
      render: (_: any, row: any) => {
        const detailHref = row.type === "preventif"
          ? `/admin/preventif/${row.id}`
          : `/admin/tickets/${row.id}`;
        return (
          <Link href={detailHref} className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition" title="Voir les détails">
            <Eye size={18} />
          </Link>
        );
      },
    },
  ];

  function handleExportTickets() {
    try {
      const data = tickets.map((t: any) => ({
        id: t.code_ticket ?? `#${t.id}`,
        subject: t.subject ?? "—",
        site: t.site?.nom ?? "—",
        asset: t.company_asset?.designation ?? "—",
        type: t.type === "curatif" ? "Curatif" : "Préventif",
        status: STATUS_LABELS[t.status] ?? t.status,
      }));

      exportToXlsx(data, [
        { header: "Référence", key: "id", width: 16 },
        { header: "Sujet", key: "subject", width: 28 },
        { header: "Site", key: "site", width: 20 },
        { header: "Patrimoine", key: "asset", width: 24 },
        { header: "Type", key: "type", width: 14 },
        { header: "Statut", key: "status", width: 14 },
      ], {
        filename: `tickets_prestataire_${providerId}`,
        sheetName: "Tickets",
        title: `Tickets du prestataire - ${provider?.company_name ?? ""}`,
      });
      toast.success("Export téléchargé.");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'export.");
    }
  }

  // ── Champs formulaire modification prestataire ──
  // Identique à la création mais sans le mot de passe
  const editFields = [
    // ── BLOC 1 : Informations société ──
    { name: "company_name", label: "Nom du prestataire", type: "text", placeholder: "CANAL+" },
    {
      name: "service_id", label: "Service", type: "select",
      options: services.map(s => ({ label: s.name, value: String(s.id) })),
    },
    { name: "city", label: "Ville", type: "text", placeholder: "Abidjan" },
    { name: "street", label: "Rue / Adresse", type: "text", placeholder: "Rue 200" },
    { name: "date_entree", label: "Date d'entrée", type: "date" },

    // ── BLOC 2 : Responsable compte ──
    { name: "users.last_name", label: "Nom du responsable", type: "text" },
    { name: "users.first_name", label: "Prénom", type: "text" },
    { name: "users.email", label: "Email du responsable", type: "email" },
    { name: "users.phone", label: "Téléphone", type: "tel", placeholder: "00101454545" },

    // Description pleine largeur
    { name: "description", label: "Description", type: "rich-text", gridSpan: 2, placeholder: "Description du prestataire" },

    // ── BLOC 3 : Médias ──
    {
      name: "logo", label: "Logo du prestataire",
      type: "image-upload", gridSpan: 1, maxImages: 1,
    },
    {
      name: "images", label: "Photos supplémentaires",
      type: "image-upload", gridSpan: 1, maxImages: 3,
    },
  ];  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="mt-20 p-8 space-y-8">


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
                  <span className={`px-3 py-0.5 rounded-full text-[10px] font-bold ${provider?.is_active ? "bg-green-600 text-white" : "bg-slate-200 text-slate-500"
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
                    {provider?.phone ?? "-"}
                  </div>
                  <div className="flex items-center gap-3 text-slate-600 font-semibold text-[15px]">
                    <div className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-100">
                      <Mail size={16} className="text-slate-900" />
                    </div>
                    {provider?.email ?? "-"}
                  </div>
                </div>

                {/* Note étoiles */}
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-2xl font-black text-slate-900 leading-none">
                    {provider?.rating ? `${provider.rating}/5` : providerStats?.rating ? `${providerStats.rating}/5` : "N/A"}
                  </span>
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }, (_, i) => {
                      const note = Number(provider?.rating ?? providerStats?.rating ?? 0);
                      return (
                        <Star key={i} size={24} className={
                          i < Math.floor(note)
                            ? "fill-yellow-400 text-yellow-400"
                            : i < note
                              ? "fill-yellow-200 text-yellow-300"
                              : "fill-slate-200 text-slate-200"
                        } />
                      );
                    })}
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

          {/* ── Actions & Filtres tickets ── */}
          <div className="flex items-center justify-between gap-4 flex-wrap bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2">
              <label htmlFor="status-filter" className="text-sm font-bold text-slate-700">
                Filtrer par statut :
              </label>
              <select
                id="status-filter"
                value={ticketFilter || ""}
                onChange={(e) => {
                  setTicketFilter(e.target.value || undefined);
                  setTicketPage(1);
                }}
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-shadow cursor-pointer hover:bg-slate-100"
              >
                <option value="">Tous les statuts</option>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
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
          street: provider?.street ?? "",
          service_id: String(provider?.service_id ?? ""),
          date_entree: provider?.date_entree ?? "",
          "users.last_name": provider?.last_name ?? (provider as any)?.user?.last_name ?? "",
          "users.first_name": provider?.first_name ?? (provider as any)?.user?.first_name ?? "",
          "users.email": provider?.email ?? (provider as any)?.user?.email ?? "",
          "users.phone": provider?.phone ?? (provider as any)?.user?.phone ?? "",
          description: provider?.description ?? "",
        }}
        onSubmit={handleUpdate}
        submitLabel="Mettre à jour"
      />


    </div>
  );
}