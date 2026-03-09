"use client";

/**
 * app/admin/gestionnaires/details/[id]/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Page de détails d'un gestionnaire.
 *
 * Ce que le backend expose sur GET /admin/managers/{id} :
 *   - User avec relations "manager" + "role"
 *   - Pas encore de stats ni de tickets par manager côté API
 *
 * Ce qui est PRÉPARÉ pour future API (commenté) :
 *   - Bloc tickets assignés au manager (DataTable + pagination)
 *   - Stats par manager (KPIs)
 *   - Filtre par site
 *
 * Ce qui est ACTIF :
 *   - Header profil manager (nom, rôle, email, téléphone, statut)
 *   - Formulaire modification (PUT /admin/managers/{id})
 *   - Bouton retour vers la liste
 *   - Flash message
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect } from "react";
import { useParams }           from "next/navigation";
import Link                    from "next/link";
import {
  ChevronLeft, Phone, Mail, ShieldCheck,
  Pencil, UserCircle2,
  /**
   * ── Icônes pour tickets — importées mais commentées pour future API ──────
   * Filter, Eye, TicketPlus, Upload,
   */
} from "lucide-react";

import Navbar          from "@/components/Navbar";
import Sidebar         from "@/components/Sidebar";
import ReusableForm    from "@/components/ReusableForm";
import ActionGroup     from "@/components/ActionGroup";
/**
 * ── Composants pour tickets — importés mais commentés pour future API ───────
 * import StatsCard      from "@/components/StatsCard";
 * import DataTable      from "@/components/DataTable";
 * import Paginate       from "@/components/Paginate";
 * import SideDetailsPanel from "@/components/SideDetailsPanel";
 */

import {
  ManagerService,
  Manager,
  ManagerDetail,
} from "../../../../../services/manager.service";

// ── Palette couleur avatar (identique à GestCard) ─────────────────────────────
const AVATAR_PALETTES = [
  { bg: "#f9fafb", text: "#111827", ring: "#e5e7eb" }, // ultra light
  { bg: "#f3f4f6", text: "#1f2937", ring: "#d1d5db" }, // light
  { bg: "#e5e7eb", text: "#111827", ring: "#9ca3af" }, // soft gray
  { bg: "#d1d5db", text: "#0f172a", ring: "#6b7280" }, // medium
  { bg: "#9ca3af", text: "#ffffff", ring: "#4b5563" }, // dark gray
  { bg: "#4b5563", text: "#ffffff", ring: "#1f2937" }, // deep gray
];

export default function GestionnaireDetailsPage() {
  const params      = useParams();
  const managerId   = Number(params.id);

  // ── État manager ───────────────────────────────────────────────────────────
  const [detail, setDetail]               = useState<ManagerDetail | null>(null);
  const [isLoadingManager, setIsLoading]  = useState(false);

  // ── État modals ────────────────────────────────────────────────────────────
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [flash, setFlash] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  /**
   * ── État tickets — PRÉPARÉ pour future API ────────────────────────────────
   * TODO: Décommenter quand GET /admin/managers/{id}/tickets sera disponible
   *
   * const [tickets, setTickets]       = useState<any[]>([]);
   * const [ticketMeta, setTicketMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
   * const [ticketPage, setTicketPage] = useState(1);
   * const [ticketFilter, setTicketFilter] = useState<string | undefined>(undefined);
   * const [isLoadingTickets, setIsLoadingTickets] = useState(false);
   * const [selectedTicket, setSelectedTicket]     = useState<any>(null);
   * const [isDetailsOpen, setIsDetailsOpen]       = useState(false);
   */

  // ── Flash message ──────────────────────────────────────────────────────────
  const showFlash = (type: "success" | "error", message: string) => {
    setFlash({ type, message });
    setTimeout(() => setFlash(null), 5000);
  };

  // ── Fetch détails manager ──────────────────────────────────────────────────
  const fetchDetail = async () => {
    setIsLoading(true);
    try {
      const result = await ManagerService.getManager(managerId);
      setDetail(result);
    } catch (err) {
      console.error("Erreur chargement gestionnaire", err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * ── Fetch tickets du manager — PRÉPARÉ pour future API ───────────────────
   * TODO: Décommenter quand la route sera disponible
   *
   * const fetchTickets = async () => {
   *   setIsLoadingTickets(true);
   *   try {
   *     const result = await ManagerService.getManagerTickets(managerId, {
   *       page: ticketPage,
   *       status: ticketFilter,
   *     });
   *     setTickets(result.items);
   *     setTicketMeta(result.meta);
   *   } catch (err) {
   *     console.error("Erreur chargement tickets manager", err);
   *   } finally {
   *     setIsLoadingTickets(false);
   *   }
   * };
   */

  // ── Chargement au montage ──────────────────────────────────────────────────
  useEffect(() => {
    if (managerId) fetchDetail();
  }, [managerId]);

  /**
   * ── Refetch tickets quand page ou filtre change — PRÉPARÉ ────────────────
   * useEffect(() => {
   *   if (managerId) fetchTickets();
   * }, [ticketPage, ticketFilter, managerId]);
   */

  const manager = detail?.manager;

  // ── Palette couleur avatar (basée sur l'id) ────────────────────────────────
  const palette = AVATAR_PALETTES[(managerId ?? 0) % AVATAR_PALETTES.length];

  // ── Initiales sécurisées ───────────────────────────────────────────────────
  const initials = [
    manager?.first_name?.charAt(0)?.toUpperCase(),
    manager?.last_name?.charAt(0)?.toUpperCase(),
  ].filter(Boolean).join("") || "?";

  const fullName = [manager?.first_name, manager?.last_name]
    .filter(Boolean).join(" ") || "Gestionnaire";

  // ── Mise à jour manager ────────────────────────────────────────────────────
  // PUT /admin/managers/{id} — tous les champs sont "sometimes" (optionnels)
  const handleUpdate = async (formData: any) => {
    try {
      const payload: any = {};
      if (formData.first_name) payload.first_name = formData.first_name;
      if (formData.last_name)  payload.last_name  = formData.last_name;
      if (formData.email)      payload.email      = formData.email;
      if (formData.phone)      payload.phone      = formData.phone;
      // password non géré dans l'update (pas dans la validation Laravel)

      await ManagerService.updateManager(managerId, payload);
      showFlash("success", "Gestionnaire mis à jour avec succès");
      setIsEditModalOpen(false);
      fetchDetail();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Erreur lors de la mise à jour";
      showFlash("error", msg);
    }
  };

  /**
   * ── KPIs tickets — PRÉPARÉS pour future API ───────────────────────────────
   * TODO: Décommenter et brancher sur detail?.stats quand disponible
   *
   * const kpis = [
   *   { label: "Total tickets",    value: detail?.stats?.total_tickets ?? 0,       delta: "+0%", trend: "up" as const },
   *   { label: "Tickets en cours", value: detail?.stats?.in_progress_tickets ?? 0, delta: "+0%", trend: "up" as const },
   *   { label: "Tickets clôturés", value: detail?.stats?.closed_tickets ?? 0,      delta: "+0%", trend: "up" as const },
   * ];
   */

  // ── Champs formulaire modification ────────────────────────────────────────
  // Correspond à la validation du update() Laravel (tous "sometimes")
  const editFields = [
    { name: "first_name", label: "Prénom",          type: "text",  defaultValue: manager?.first_name },
    { name: "last_name",  label: "Nom de famille",  type: "text",  defaultValue: manager?.last_name  },
    { name: "email",      label: "Email",            type: "email", defaultValue: manager?.email      },
    { name: "phone",      label: "Téléphone",        type: "text",  defaultValue: manager?.phone      },
    /**
     * ── Champ site — COMMENTÉ, préparé pour future API ──────────────────────
     * TODO: Décommenter quand l'API supportera l'assignation de site
     *
     * {
     *   name: "site_id",
     *   label: "Site assigné",
     *   type: "select",
     *   options: sites.map(s => ({ label: s.name, value: String(s.id) })),
     *   defaultValue: String(manager?.managed_site?.id ?? ""),
     * },
     */
  ];

  /**
   * ── Colonnes DataTable tickets — PRÉPARÉES pour future API ───────────────
   * TODO: Décommenter quand les tickets managers seront disponibles
   *
   * const columns = [
   *   { header: "ID",          key: "id",      render: (_: any, row: any) => `#${row.id}` },
   *   { header: "Sujet",       key: "subject", render: (_: any, row: any) => row.subject ?? "-" },
   *   { header: "Site",        key: "site",    render: (_: any, row: any) => row.site?.nom ?? "-" },
   *   { header: "Type",        key: "type",    render: (_: any, row: any) => row.type === "curatif" ? "Curatif" : "Préventif" },
   *   { header: "Statut",      key: "status",  render: (_: any, row: any) => (
   *     <span className="...">{row.status}</span>
   *   )},
   *   { header: "Actions",     key: "actions", render: (_: any, row: any) => (
   *     <button onClick={() => handleOpenDetails(row)}><Eye size={18} /></button>
   *   )},
   * ];
   */

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col pl-64">
        <Navbar />
        <main className="mt-20 p-8 space-y-8">

          {/* ── Flash message ─────────────────────────────────────────────── */}
          {flash && (
            <div className={`px-6 py-4 rounded-2xl text-sm font-semibold ${
              flash.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}>
              {flash.message}
            </div>
          )}

          {/* ── Header profil manager ──────────────────────────────────────── */}
          <div className="bg-white flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-2xl border border-slate-100 shadow-sm">

            {/* ── Colonne gauche : identité ──────────────────────────────── */}
            <div className="space-y-4">

              {/* Bouton retour */}
              <Link
                href="/admin/gestionnaires"
                className="flex items-center gap-2 text-slate-500 hover:text-black transition-colors bg-white px-4 py-2 rounded-xl border border-slate-100 w-fit text-sm font-medium"
              >
                <ChevronLeft size={18} /> Retour
              </Link>

              {/* Avatar + Nom */}
              <div className="flex items-center gap-4">
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-black ring-4 flex-shrink-0"
                  style={{
                    backgroundColor: palette.bg,
                    color: palette.text,
                    // @ts-ignore ring color via style inline car Tailwind ne supporte pas les valeurs dynamiques
                    "--tw-ring-color": palette.ring,
                  }}
                >
                  {initials}
                </div>
                <div>
                  <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                    {isLoadingManager ? "Chargement..." : fullName}
                  </h1>

                  {/* Badge rôle */}
                  <div className="flex items-center gap-1.5 mt-2">
                    <ShieldCheck size={14} style={{ color: palette.text }} />
                    <span
                      className="text-xs font-bold uppercase tracking-wider"
                      style={{ color: palette.text }}
                    >
                      {manager?.role?.name ?? "Manager"}
                    </span>
                  </div>

                  {/* Badge statut */}
                  <div className="mt-2">
                    <span className={`px-3 py-0.5 rounded-full text-[10px] font-bold ${
                      manager?.is_active !== false
                        ? "bg-green-600 text-white"
                        : "bg-slate-200 text-slate-500"
                    }`}>
                      {manager?.is_active !== false ? "Actif" : "Inactif"}
                    </span>
                  </div>
                </div>
              </div>

              {/*
               * ── Site géré — COMMENTÉ, préparé pour future API ────────────
               * TODO: Décommenter quand l'API retournera managed_site
               *
               * {manager?.managed_site && (
               *   <div className="flex items-center gap-2 text-slate-500">
               *     <MapPin size={16} />
               *     <span className="font-medium">{manager.managed_site.nom}</span>
               *   </div>
               * )}
               */}
            </div>

            {/* ── Colonne droite : contact + actions ────────────────────── */}
            <div className="flex flex-col gap-4">

              {/* Bloc contact */}
              <div className="bg-slate-50/50 p-6 rounded-[24px] border border-slate-100 flex flex-col gap-3 min-w-[280px]">

                <div className="flex items-center gap-3 text-slate-600 font-semibold text-[15px]">
                  <div className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-100">
                    <Mail size={16} className="text-slate-900" />
                  </div>
                  {manager?.email ?? "—"}
                </div>

                <div className="flex items-center gap-3 text-slate-600 font-semibold text-[15px]">
                  <div className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-100">
                    <Phone size={16} className="text-slate-900" />
                  </div>
                  {manager?.phone ?? "—"}
                </div>

                <div className="flex items-center gap-3 text-slate-600 font-semibold text-[15px]">
                  <div className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-100">
                    <UserCircle2 size={16} className="text-slate-900" />
                  </div>
                  ID Manager : #{manager?.manager?.id ?? "—"}
                </div>
              </div>

              {/* Bouton modifier */}
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="flex items-center justify-center gap-2 bg-slate-900 text-white py-3 px-6 rounded-2xl font-bold hover:bg-black transition-colors"
              >
                <Pencil size={16} /> Modifier le gestionnaire
              </button>
            </div>
          </div>

          {/*
           * ── Section KPIs tickets — PRÉPARÉE pour future API ──────────────
           * TODO: Décommenter et brancher sur detail?.stats
           *
           * <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
           *   {kpis.map((kpi, i) => <StatsCard key={i} {...kpi} />)}
           * </div>
           */}

          {/*
           * ── Section tableau tickets — PRÉPARÉE pour future API ────────────
           * TODO: Décommenter quand GET /admin/managers/{id}/tickets sera dispo
           *
           * <div className="flex justify-end">
           *   <ActionGroup actions={ticketActions} />
           * </div>
           *
           * <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
           *   {isLoadingTickets ? (
           *     <div className="py-16 text-center text-slate-400 text-sm italic">Chargement...</div>
           *   ) : (
           *     <DataTable columns={columns} data={tickets} title="Tickets assignés au manager" />
           *   )}
           *   <div className="p-6 border-t border-slate-50 flex justify-end">
           *     <Paginate currentPage={ticketPage} totalPages={ticketMeta.last_page} onPageChange={setTicketPage} />
           *   </div>
           * </div>
           */}

          {/* ── Placeholder "Tickets bientôt disponibles" ─────────────────── */}
          <div className="bg-white rounded-[32px] border border-dashed border-slate-200 p-12 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
              <ShieldCheck size={22} className="text-slate-400" />
            </div>
            <p className="text-slate-500 font-medium text-sm">
              Les tickets et statistiques associés à ce gestionnaire seront disponibles prochainement.
            </p>
            <p className="text-slate-400 text-xs">
              En attente de l'implémentation de la route{" "}
              <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                GET /admin/managers/{"{id}"}/tickets
              </code>
            </p>
          </div>

        </main>
      </div>

      {/*
       * ── SideDetailsPanel ticket — PRÉPARÉ pour future API ───────────────
       * <SideDetailsPanel
       *   isOpen={isDetailsOpen}
       *   onClose={() => setIsDetailsOpen(false)}
       *   title={selectedTicket?.title || ""}
       *   reference={selectedTicket?.reference}
       *   fields={selectedTicket?.fields || []}
       *   descriptionContent={selectedTicket?.description}
       * />
       */}

      {/* ── Modal modification gestionnaire ──────────────────────────────── */}
      <ReusableForm
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Modifier le gestionnaire"
        subtitle="Modifiez les informations du gestionnaire (seuls les champs renseignés seront mis à jour)."
        fields={editFields}
        initialValues={{
          first_name: manager?.first_name ?? "",
          last_name:  manager?.last_name  ?? "",
          email:      manager?.email      ?? "",
          phone:      manager?.phone      ?? "",
        }}
        onSubmit={handleUpdate}
        submitLabel="Mettre à jour"
      />

    </div>
  );
}