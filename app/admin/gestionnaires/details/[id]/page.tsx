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
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, Phone, Mail, ShieldCheck,
  Pencil, UserCircle2, Activity, Clock, Hash,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import ReusableForm from "@/components/ReusableForm";
import { FieldConfig } from "@/components/ReusableForm";
import DataTable, { ColumnConfig } from "@/components/DataTable";
import Paginate from "@/components/Paginate";

import {
  ManagerService,
  Manager,
  ManagerDetail,
} from "../../../../../services/admin/manager.service";
import axiosInstance from "../../../../../core/axios";
import { formatDate } from "@/lib/utils";

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
  const params = useParams();
  const managerId = Number(params.id);

  // ── État manager ───────────────────────────────────────────────────────────
  const [detail, setDetail] = useState<ManagerDetail | null>(null);
  const [isLoadingManager, setIsLoading] = useState(false);

  // ── État logs d'activité ───────────────────────────────────────────────────
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsMeta, setLogsMeta] = useState({ last_page: 1, total: 0 });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { toast } = useToast();

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

  // ── Fetch logs d'activité du manager ──────────────────────────────────────
  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await axiosInstance.get("/admin/activity-log", {
        params: { user_id: managerId, per_page: 10, page: logsPage },
      });
      const d = res.data?.data ?? res.data;
      setLogs(d.data ?? []);
      setLogsMeta({ last_page: d.last_page ?? 1, total: d.total ?? 0 });
    } catch {
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  // ── Chargement au montage ──────────────────────────────────────────────────
  useEffect(() => {
    if (managerId) { fetchDetail(); fetchLogs(); }
  }, [managerId]);

  useEffect(() => {
    if (managerId) fetchLogs();
  }, [logsPage]);

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
  // PUT /admin/managers/{id} - tous les champs sont "sometimes" (optionnels)
  const handleUpdate = async (formData: any) => {
    try {
      const payload: any = {};
      if (formData.first_name) payload.first_name = formData.first_name;
      if (formData.last_name) payload.last_name = formData.last_name;
      if (formData.email) payload.email = formData.email;
      if (formData.phone) payload.phone = formData.phone;
      // password non géré dans l'update (pas dans la validation Laravel)

      await ManagerService.updateManager(managerId, payload);
      toast.success("Gestionnaire mis à jour avec succès");
      setIsEditModalOpen(false);
      fetchDetail();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Erreur lors de la mise à jour";
      toast.error(msg);
    }
  };

  /**
   * ── KPIs tickets - PRÉPARÉS pour future API ───────────────────────────────
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
  const editFields: FieldConfig[] = [
    { name: "first_name", label: "Prénom", type: "text" },
    { name: "last_name", label: "Nom de famille", type: "text" },
    { name: "email", label: "Email", type: "email" },
    { name: "phone", label: "Téléphone", type: "tel" },
    /**
     * ── Champ site - COMMENTÉ, préparé pour future API ──────────────────────
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
   * ── Colonnes DataTable tickets - PRÉPARÉES pour future API ───────────────
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
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="mt-20 p-8 space-y-8">


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
                    <span className={`px-3 py-0.5 rounded-full text-[10px] font-bold ${manager?.is_active !== false
                      ? "bg-green-600 text-white"
                      : "bg-slate-200 text-slate-500"
                      }`}>
                      {manager?.is_active !== false ? "Actif" : "Inactif"}
                    </span>
                  </div>
                </div>
              </div>

              {/*
               * ── Site géré - COMMENTÉ, préparé pour future API ────────────
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
                  {manager?.email ? (
                    <a href={`mailto:${manager.email}`} className="hover:underline hover:text-slate-900 transition-colors truncate">
                      {manager.email}
                    </a>
                  ) : "-"}
                </div>

                <div className="flex items-center gap-3 text-slate-600 font-semibold text-[15px]">
                  <div className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-100">
                    <Phone size={16} className="text-slate-900" />
                  </div>
                  {(manager?.phone ?? (manager as any)?.phone_number) ? (
                    <a href={`tel:${manager?.phone ?? (manager as any)?.phone_number}`} className="hover:underline hover:text-slate-900 transition-colors">
                      {manager?.phone ?? (manager as any)?.phone_number}
                    </a>
                  ) : "-"}
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
           * ── Section KPIs tickets - PRÉPARÉE pour future API ──────────────
           * TODO: Décommenter et brancher sur detail?.stats
           *
           * <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
           *   {kpis.map((kpi, i) => <StatsCard key={i} {...kpi} />)}
           * </div>
           */}

          {/*
           * ── Section tableau tickets - PRÉPARÉE pour future API ────────────
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

          {/* ── Logs d'activité du gestionnaire ──────────────────────────── */}
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-50 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center">
                <Activity size={16} className="text-white" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-sm">Journal d'activité</h3>
                <p className="text-xs text-slate-400">{logsMeta.total} action{logsMeta.total > 1 ? "s" : ""} enregistrée{logsMeta.total > 1 ? "s" : ""}</p>
              </div>
            </div>

            {logsLoading ? (
              <div className="py-12 text-center text-slate-400 text-sm">Chargement...</div>
            ) : logs.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm italic">Aucune activité enregistrée pour ce gestionnaire.</div>
            ) : (
              <>
                <div className="divide-y divide-slate-50">
                  {logs.map((log, i) => (
                    <div key={i} className="flex items-start gap-4 px-6 py-4 hover:bg-slate-50/50 transition">
                      <div className={`mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest shrink-0 ${log.action === "created" ? "bg-emerald-50 text-emerald-700" :
                        log.action === "updated" ? "bg-blue-50 text-blue-700" :
                          log.action === "deleted" ? "bg-red-50 text-red-700" :
                            "bg-slate-50 text-slate-700"
                        }`}>
                        {log.action}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{log.description || `${log.model_type?.split("\\").pop()} #${log.model_id}`}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Hash size={10} /> {log.model_type?.split("\\").pop()}
                          </span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock size={10} /> {formatDate(log.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {logsMeta.last_page > 1 && (
                  <div className="px-6 py-4 border-t border-slate-50 flex justify-end">
                    <Paginate currentPage={logsPage} totalPages={logsMeta.last_page} onPageChange={setLogsPage} />
                  </div>
                )}
              </>
            )}
          </div>

        </main>
      </div>

      {/*
       * ── SideDetailsPanel ticket - PRÉPARÉ pour future API ───────────────
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
          last_name: manager?.last_name ?? "",
          email: manager?.email ?? "",
          phone: manager?.phone ?? "",
        }}
        onSubmit={handleUpdate}
        submitLabel="Mettre à jour"
      />

    </div>
  );
}