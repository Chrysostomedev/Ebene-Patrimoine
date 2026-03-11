"use client";

import { useState } from "react";
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

/* -------------------------------------------------------------------------- */
/*                               STATIC MOCK DATA                             */
/* -------------------------------------------------------------------------- */

const mockServices = [
  { id: 1, name: "Maintenance électrique" },
  { id: 2, name: "Maintenance climatisation" },
];

const mockProvider = {
  id: 1,
  company_name: "SOUDOTEC",
  city: "Abidjan",
  street: "Cocody Angré",
  neighborhood: "Angré 8ème tranche",
  service_id: 1,
  service: { name: "Maintenance électrique" },
  rating: 4,
  is_active: true,
  date_entree: "2023-01-10",
  description: "Prestataire spécialisé dans les installations électriques.",
  user: {
    first_name: "Jean",
    last_name: "Kouassi",
    phone: "0700000000",
    email: "contact@soudotec.ci",
  },
};

const mockStats = {
  total_tickets: 15,
  in_progress_tickets: 3,
  closed_tickets: 9,
  rating: 4,
};

const mockTickets = [
  {
    id: 101,
    subject: "Panne générateur",
    type: "curatif",
    status: "en_cours",
    site: { nom: "Siège Canal+" },
    asset: { designation: "Générateur principal" },
    planned_at: "2026-03-15",
    due_at: "2026-03-16",
    description: "Le générateur ne démarre plus.",
  },
  {
    id: 102,
    subject: "Inspection climatisation",
    type: "preventif",
    status: "clos",
    site: { nom: "Boutique Canal+" },
    asset: { designation: "Climatiseur LG" },
    planned_at: "2026-03-10",
    due_at: "2026-03-11",
    description: "Inspection annuelle.",
  },
];

/* -------------------------------------------------------------------------- */
/*                                  CONSTANTS                                 */
/* -------------------------------------------------------------------------- */

const STATUS_LABELS: Record<string, string> = {
  en_cours: "En cours",
  clos: "Clôturé",
};

const STATUS_STYLES: Record<string, string> = {
  en_cours: "border-orange-400 text-orange-500 bg-orange-50",
  clos: "bg-black text-white border-black",
};

/* -------------------------------------------------------------------------- */
/*                                   PAGE                                     */
/* -------------------------------------------------------------------------- */

export default function ProviderDetailsPage() {

  const params = useParams();
  const providerId = Number(params.id);

  /* ------------------------------- STATE ---------------------------------- */

  const [tickets] = useState(mockTickets);
  const [ticketPage, setTicketPage] = useState(1);

  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const provider = mockProvider;
  const providerStats = mockStats;

  /* ------------------------------- KPIS ----------------------------------- */

  const kpis = [
    { label: "Total tickets", value: providerStats.total_tickets, delta: "+3%", trend: "up" as const },
    { label: "Tickets en cours", value: providerStats.in_progress_tickets, delta: "+3%", trend: "up" as const },
    { label: "Tickets clôturés", value: providerStats.closed_tickets, delta: "+3%", trend: "up" as const },
    { label: "Note", value: `${providerStats.rating}/5`, delta: "+0%", trend: "up" as const },
  ];

  /* ---------------------------- SIDE PANEL -------------------------------- */

  const handleOpenDetails = (ticket: any) => {

    const statusColor =
      ticket.status === "clos" ? "#000" : "#f97316";

    setSelectedTicket({
      title: ticket.subject,
      reference: `#${ticket.id}`,
      description: ticket.description,
      fields: [
        { label: "Type", value: ticket.type },
        { label: "Site", value: ticket.site.nom },
        { label: "Patrimoine", value: ticket.asset.designation },
        { label: "Date planifiée", value: ticket.planned_at },
        { label: "Date limite", value: ticket.due_at },
        {
          label: "Statut",
          value: STATUS_LABELS[ticket.status],
          isStatus: true,
          statusColor,
        },
      ],
    });

    setIsDetailsOpen(true);
  };

  /* ----------------------------- DATA TABLE ------------------------------- */

  const columns = [
    { header: "ID", key: "id", render: (_: any, row: any) => `#${row.id}` },
    { header: "Sujet", key: "subject", render: (_: any, row: any) => row.subject },
    { header: "Site", key: "site", render: (_: any, row: any) => row.site.nom },
    { header: "Patrimoine", key: "asset", render: (_: any, row: any) => row.asset.designation },
    { header: "Type", key: "type", render: (_: any, row: any) => row.type },
    {
      header: "Statut",
      key: "status",
      render: (_: any, row: any) => (
        <span className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${STATUS_STYLES[row.status]}`}>
          {STATUS_LABELS[row.status]}
        </span>
      ),
    },
    {
      header: "Actions",
      key: "actions",
      render: (_: any, row: any) => (
        <button
          onClick={() => handleOpenDetails(row)}
          className="text-slate-800 hover:text-blue-600"
        >
          <Eye size={18} />
        </button>
      ),
    },
  ];

  const ticketActions = [
    {
      label: "Filtrer",
      icon: Filter,
      onClick: () => {},
      variant: "secondary" as const,
    },
    {
      label: "Exporter",
      icon: Upload,
      onClick: () => {},
      variant: "secondary" as const,
    },
    {
      label: "Nouveau Ticket",
      icon: TicketPlus,
      onClick: () => setIsTicketModalOpen(true),
      variant: "primary" as const,
    },
  ];

  /* -------------------------------------------------------------------------- */
  /*                                   RENDER                                   */
  /* -------------------------------------------------------------------------- */

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 flex flex-col pl-64">

        <Navbar />

        <main className="mt-20 p-8 space-y-8">

          {/* HEADER PROVIDER */}

          <div className="bg-white flex justify-between p-6 rounded-2xl border">

            <div className="space-y-4">

              <Link
                href="/admin/prestataires"
                className="flex items-center gap-2 text-slate-500"
              >
                <ChevronLeft size={18} /> Retour
              </Link>

              <div>

                <h1 className="text-5xl font-black">
                  {provider.company_name}
                </h1>

                <div className="flex items-center gap-2 text-slate-400 mt-1">
                  <MapPin size={18} />
                  <span>{provider.city}</span>
                </div>

              </div>

            </div>

            <div className="flex flex-col gap-4">

              <div className="bg-slate-50 p-6 rounded-xl border space-y-3">

                <div className="flex items-center gap-2">
                  <Phone size={16} />
                  {provider.user.phone}
                </div>

                <div className="flex items-center gap-2">
                  <Mail size={16} />
                  {provider.user.email}
                </div>

                <div className="flex gap-1 mt-2">

                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      size={20}
                      className={
                        i < provider.rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-slate-200"
                      }
                    />
                  ))}

                </div>

              </div>

              <button
                onClick={() => setIsEditModalOpen(true)}
                className="bg-slate-900 text-white py-3 px-6 rounded-xl flex items-center gap-2"
              >
                <Pencil size={16} /> Modifier
              </button>

            </div>

          </div>

          {/* KPIs */}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis.map((kpi, i) => <StatsCard key={i} {...kpi} />)}
          </div>

          {/* ACTIONS */}

          <div className="flex justify-end">
            <ActionGroup actions={ticketActions} />
          </div>

          {/* TABLE TICKETS */}

          <div className="bg-white rounded-[32px] border shadow-sm">

            <DataTable columns={columns} data={tickets} title="Tickets assignés" />

            <div className="p-6 border-t flex justify-end">
              <Paginate
                currentPage={ticketPage}
                totalPages={1}
                onPageChange={setTicketPage}
              />
            </div>

          </div>

        </main>

      </div>

      {/* SIDE PANEL */}

      <SideDetailsPanel
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title={selectedTicket?.title}
        reference={selectedTicket?.reference}
        fields={selectedTicket?.fields || []}
        descriptionContent={selectedTicket?.description}
      />

      {/* MODALS STATIQUES */}

      <ReusableForm
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Modifier le prestataire"
        subtitle="Mode statique"
        fields={[]}
        onSubmit={() => setIsEditModalOpen(false)}
        submitLabel="Mettre à jour"
      />

      <ReusableForm
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        title="Créer un ticket"
        subtitle="Mode statique"
        fields={[]}
        onSubmit={() => setIsTicketModalOpen(false)}
        submitLabel="Créer"
      />

    </div>
  );
}