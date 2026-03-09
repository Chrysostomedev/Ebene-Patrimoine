"use client";

import { useState, useEffect, useRef } from "react";
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

import { useTickets } from "../../../hooks/useTickets";
import { useProviders } from "../../../hooks/useProviders";
import { useServices } from "../../../hooks/useServices";
import { useSites } from "../../../hooks/useSites";
import { useAssets } from "../../../hooks/useAssets";
import { TicketService, Ticket } from "../../../services/ticket.service";
import axiosInstance from "../../../core/axios";

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

const formatHeures = (h: number | null | undefined) =>
  h !== null && h !== undefined ? `${h}h` : "—";

const formatDate = (iso?: string | null): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const date = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return time === "00:00" ? date : `${date} à ${time}`;
};

// ═══════════════════════════════════════════════
// STATUTS
// ═══════════════════════════════════════════════

const STATUS_LABELS: Record<string, string> = {
  signalez: "Signalé",
  validé:   "Validé",
  assigné:  "Assigné",
  en_cours: "En cours",
  rapporté: "Rapporté",
  évalué:   "Évalué",
  clos:     "Clôturé",
};

const STATUS_STYLES: Record<string, string> = {
  signalez: "border-slate-300  bg-slate-100   text-slate-700",
  validé:   "border-blue-400   bg-blue-50     text-blue-700",
  assigné:  "border-violet-400 bg-violet-50   text-violet-700",
  en_cours: "border-orange-400 bg-orange-50   text-orange-600",
  rapporté: "border-amber-400  bg-amber-50    text-amber-700",
  évalué:   "border-green-500  bg-green-50    text-green-700",
  clos:     "border-black      bg-black       text-white",
};

const STATUS_DOT_COLORS: Record<string, string> = {
  signalez: "#94a3b8",
  validé:   "#3b82f6",
  assigné:  "#8b5cf6",
  en_cours: "#f97316",
  rapporté: "#f59e0b",
  évalué:   "#22c55e",
  clos:     "#000000",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center justify-center min-w-[90px] px-3 py-1.5 rounded-xl border text-xs font-bold ${STATUS_STYLES[status] ?? ""}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ═══════════════════════════════════════════════
// PRIORITÉ
// ═══════════════════════════════════════════════

const PRIORITY_STYLES: Record<string, string> = {
  faible:   "bg-slate-100 text-slate-600",
  moyenne:  "bg-blue-50   text-blue-700",
  haute:    "bg-orange-50 text-orange-700",
  critique: "bg-red-100   text-red-700",
};

const PRIORITY_LABELS: Record<string, string> = {
  faible: "Faible", moyenne: "Moyenne", haute: "Haute", critique: "Critique",
};

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${PRIORITY_STYLES[priority] ?? ""}`}>
      {PRIORITY_LABELS[priority] ?? priority}
    </span>
  );
}

// ═══════════════════════════════════════════════
// FILTER DROPDOWN
// ═══════════════════════════════════════════════

interface TicketFilters { status?: string; type?: string; priority?: string; }

function FilterDropdown({
  isOpen, onClose, filters, onApply,
}: {
  isOpen: boolean; onClose: () => void;
  filters: TicketFilters; onApply: (f: TicketFilters) => void;
}) {
  const [local, setLocal] = useState<TicketFilters>(filters);
  useEffect(() => { setLocal(filters); }, [filters]);
  if (!isOpen) return null;

  const Pill = ({ val, current, onClick, label }: { val: string; current?: string; onClick: () => void; label: string }) => (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-2 rounded-xl text-sm font-semibold transition ${
        (current ?? "") === val ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <span className="text-sm font-black text-slate-900 uppercase tracking-widest">Filtres</span>
        <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition">
          <X size={16} className="text-slate-500" />
        </button>
      </div>

      <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
        {/* Statut */}
        <div className="space-y-1.5">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Statut</p>
          <div className="flex flex-col gap-1.5">
            {[
              { val: "",         label: "Tous les statuts" },
              { val: "signalez", label: "Signalé"  },
              { val: "validé",   label: "Validé"   },
              { val: "assigné",  label: "Assigné"  },
              { val: "en_cours", label: "En cours" },
              { val: "rapporté", label: "Rapporté" },
              { val: "évalué",   label: "Évalué"   },
              { val: "clos",     label: "Clôturé"  },
            ].map(o => (
              <Pill key={o.val} val={o.val} current={local.status ?? ""} label={o.label}
                onClick={() => setLocal({ ...local, status: o.val || undefined })} />
            ))}
          </div>
        </div>

        {/* Type */}
        <div className="space-y-1.5">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Type</p>
          <div className="flex flex-col gap-1.5">
            {[
              { val: "",          label: "Tous les types" },
              { val: "curatif",   label: "Curatif"       },
              { val: "preventif", label: "Préventif"     },
            ].map(o => (
              <Pill key={o.val} val={o.val} current={local.type ?? ""} label={o.label}
                onClick={() => setLocal({ ...local, type: o.val || undefined })} />
            ))}
          </div>
        </div>

        {/* Priorité */}
        <div className="space-y-1.5">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Priorité</p>
          <div className="flex flex-col gap-1.5">
            {[
              { val: "",         label: "Toutes"   },
              { val: "faible",   label: "Faible"   },
              { val: "moyenne",  label: "Moyenne"  },
              { val: "haute",    label: "Haute"    },
              { val: "critique", label: "Critique" },
            ].map(o => (
              <Pill key={o.val} val={o.val} current={local.priority ?? ""} label={o.label}
                onClick={() => setLocal({ ...local, priority: o.val || undefined })} />
            ))}
          </div>
        </div>
      </div>

      <div className="px-5 py-4 border-t border-slate-100 flex gap-3">
        <button
          onClick={() => { setLocal({}); onApply({}); onClose(); }}
          className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition"
        >
          Réinitialiser
        </button>
        <button
          onClick={() => { onApply(local); onClose(); }}
          className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition"
        >
          Appliquer
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// TICKET SIDE PANEL
// ═══════════════════════════════════════════════

function TicketSidePanel({
  ticket, onClose, onEdit,
}: {
  ticket: Ticket | null; onClose: () => void; onEdit: () => void;
}) {
  if (!ticket) return null;

  const statusColor = STATUS_DOT_COLORS[ticket.status] ?? "#94a3b8";
  const statusLabel = STATUS_LABELS[ticket.status] ?? ticket.status;
  
  const [copied, setCopied] = useState(false);

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const providerName =
    (ticket as any).provider?.company_name ??
    (ticket as any).provider?.user?.name   ??
    (ticket as any).provider?.name         ??
    (ticket.provider_id ? `Prestataire #${ticket.provider_id}` : "—");

  const siteName    = ticket.site?.nom ?? "—";
  const assetLabel  = ticket.asset
    ? `${ticket.asset.designation}${ticket.asset.codification ? ` · ${ticket.asset.codification}` : ""}`
    : "—";
  const serviceName = ticket.service?.name ?? "—";

  const infoRows: Array<{ Icon: any; label: string; value?: string | null; custom?: React.ReactNode }> = [
    { 
      Icon: Tag, 
      label: "Référence", 
      custom: (
        <div className="flex items-center gap-2 group/id">
          <span className="text-sm font-black text-slate-900">#{ticket.id}</span>
          <button 
            onClick={() => handleCopyId(ticket.id.toString())}
            className={`p-1.5 rounded-lg border transition-all ${
              copied 
                ? "bg-green-50 border-green-200 text-green-600" 
                : "bg-slate-50 border-slate-100 text-slate-400 opacity-0 group-hover/id:opacity-100 hover:text-slate-600 hover:border-slate-300"
            }`}
            title="Copier l'identifiant"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
        </div>
      )
    },
    { Icon: MapPin,        label: "Site",            value: siteName },
    { Icon: Wrench,        label: "Patrimoine",      value: assetLabel },
    { Icon: CheckCircle2,  label: "Service",         value: serviceName },
    { Icon: User,          label: "Prestataire",     value: providerName },
    { Icon: AlertTriangle, label: "Priorité",        custom: <PriorityBadge priority={ticket.priority} /> },
    { Icon: CalendarDays,  label: "Date planifiée",  value: formatDate(ticket.planned_at) },
    { Icon: CalendarCheck, label: "Date limite",     value: formatDate(ticket.due_at) },
    ...(ticket.resolved_at ? [{ Icon: CheckCircle2, label: "Résolu le",   value: formatDate(ticket.resolved_at) }] : []),
    ...(ticket.closed_at   ? [{ Icon: Clock,        label: "Clôturé le",  value: formatDate(ticket.closed_at)   }] : []),
    ...(ticket.created_at  ? [{ Icon: Clock,        label: "Créé le",     value: formatDate(ticket.created_at)  }] : []),
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[460px] bg-white z-50 shadow-2xl flex flex-col rounded-l-3xl overflow-hidden">

        <div className="flex items-start px-6 pt-6 pb-0 shrink-0">
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-xl transition -ml-1">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        <div className="px-7 pt-4 pb-5 shrink-0">
          <h2 className="text-2xl font-black text-slate-900 leading-tight">
            {ticket.subject ?? `Ticket #${ticket.id}`}
          </h2>
          <div className="flex flex-wrap items-center gap-2 mt-2.5">
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
              ticket.type === "curatif"
                ? "bg-orange-50 text-orange-700 border-orange-200"
                : "bg-blue-50 text-blue-700 border-blue-200"
            }`}>
              {ticket.type === "curatif" ? "Curatif" : "Préventif"}
            </span>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black border ${STATUS_STYLES[ticket.status] ?? ""}`}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
              {statusLabel}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-7 pb-7 space-y-6">
          <div className="space-y-0">
            {infoRows.map((row, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0 gap-4">
                <div className="flex items-center gap-2 text-slate-400 shrink-0">
                  <row.Icon size={13} />
                  <p className="text-xs font-medium whitespace-nowrap">{row.label}</p>
                </div>
                {row.custom
                  ? row.custom
                  : <p className="text-sm font-bold text-slate-900 text-right truncate max-w-[60%]">{row.value ?? "—"}</p>
                }
              </div>
            ))}
            {ticket.cout !== undefined && ticket.cout !== null && (
              <div className="flex items-center justify-between py-3">
                <p className="text-xs text-slate-400 font-medium">Coût</p>
                <p className="text-sm font-bold text-slate-900">
                  {ticket.cout.toLocaleString("fr-FR")} FCFA
                </p>
              </div>
            )}
          </div>

          {ticket.description && (
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Description</p>
              <div
                className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-sm text-slate-700 leading-relaxed prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: ticket.description }}
              />
            </div>
          )}
        </div>

        <div className="px-7 py-5 border-t border-slate-100 shrink-0">
          <button
            onClick={onEdit}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition"
          >
            Modifier le ticket
          </button>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════
// PAGE PRINCIPALE
// ═══════════════════════════════════════════════

export default function TicketsPage() {
  const {
    tickets, stats, isLoading, meta, page,
    filters, fetchTickets, setPage, applyFilters,
  } = useTickets();

  const { providers } = useProviders();
  const { services }  = useServices();
  const { assets }    = useAssets();
  const { sites, fetchSites } = useSites();

  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (sites.length === 0) fetchSites(); }, []);

  const [isModalOpen,    setIsModalOpen]    = useState(false);
  const [editingTicket,  setEditingTicket]  = useState<Ticket | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isDetailsOpen,  setIsDetailsOpen]  = useState(false);
  const [filtersOpen,    setFiltersOpen]    = useState(false);
  const [flashMessage,   setFlashMessage]   = useState<{ type: "success"|"error"; message: string } | null>(null);
  const [importLoading,  setImportLoading]  = useState(false);
  const [exportLoading,  setExportLoading]  = useState(false);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node))
        setFiltersOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!flashMessage) return;
    const t = setTimeout(() => setFlashMessage(null), 5000);
    return () => clearTimeout(t);
  }, [flashMessage]);

  const showFlash = (type: "success"|"error", message: string) =>
    setFlashMessage({ type, message });

  const activeCount = [filters.status, filters.type, filters.priority].filter(Boolean).length;

  const handleOpenDetails = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setIsDetailsOpen(true);
  };

  const handleEdit = () => {
    if (!selectedTicket) return;
    setEditingTicket(selectedTicket);
    setIsDetailsOpen(false);
    setIsModalOpen(true);
  };

  const handleSubmit = async (formData: any) => {
    try {
      if (editingTicket) {
        await TicketService.updateTicket(editingTicket.id, formData);
        showFlash("success", "Ticket mis à jour avec succès.");
      } else {
        await TicketService.createTicket(formData);
        showFlash("success", "Ticket créé avec succès.");
      }
      await fetchTickets();
      setIsModalOpen(false);
      setEditingTicket(null);
    } catch (err: any) {
      showFlash("error", err?.response?.data?.message ?? err?.message ?? "Erreur serveur.");
    }
  };

  const handleExport = async () => {
    if (exportLoading) return;
    setExportLoading(true);
    try {
      const response = await axiosInstance.get("/admin/ticket/export", {
        params: {
          ...(filters.status   ? { status:   filters.status   } : {}),
          ...(filters.type     ? { type:     filters.type     } : {}),
          ...(filters.priority ? { priority: filters.priority } : {}),
        },
        responseType: "blob",
      });

      const blob = new Blob([response.data], {
        type: response.headers["content-type"] ??
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url   = URL.createObjectURL(blob);
      const link  = document.createElement("a");
      link.href   = url;
      const cd    = (response.headers["content-disposition"] as string) ?? "";
      const match = cd.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      link.download = match?.[1]?.replace(/['"]/g, "") ??
        `tickets_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      showFlash("success", "Export téléchargé avec succès.");
    } catch {
      showFlash("error", "Erreur lors de l'exportation.");
    } finally {
      setExportLoading(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImportLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      await axiosInstance.post("/admin/ticket/import", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await fetchTickets();
      showFlash("success", `"${file.name}" importé avec succès.`);
    } catch (err: any) {
      showFlash("error", err?.response?.data?.message ?? "Erreur lors de l'import.");
    } finally {
      setImportLoading(false);
    }
  };

  // ── Colonnes DataTable ──
  // Note : "Photos" affiche les images du ticket en vignettes empilées (max 3 + compteur)
  const columns = [
    {
      header: "Photos",
      key: "images",
      render: (_: any, row: Ticket) => {
        const imgs: string[] = (row as any).images ?? [];
        if (!imgs.length) return <span className="text-slate-300 text-xs">—</span>;
        return (
          <div className="flex items-center">
            {imgs.slice(0, 3).map((src, i) => (
              <div
                key={i}
                className="relative w-9 h-9 rounded-xl overflow-hidden bg-slate-100 ring-2 ring-white shrink-0"
                style={{ zIndex: 3 - i, marginLeft: i > 0 ? "-10px" : "0" }}
              >
                <img src={src} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
            {imgs.length > 3 && (
              <div
                className="w-9 h-9 rounded-xl bg-slate-100 ring-2 ring-white flex items-center justify-center shrink-0"
                style={{ zIndex: 0, marginLeft: "-10px" }}
              >
                <span className="text-[10px] font-bold text-slate-500">+{imgs.length - 3}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      header: "Codification", key: "id",
      render: (_: any, row: Ticket) =>
        <span className="font-black text-slate-900 text-sm">#{row.id}</span>,
    },
    {
      header: "Sujet", key: "subject",
      render: (_: any, row: Ticket) =>
        <span className="font-medium text-slate-900 text-sm max-w-[200px] truncate block">{row.subject ?? "—"}</span>,
    },
    {
      header: "Site", key: "site",
      render: (_: any, row: Ticket) => row.site?.nom ?? "—",
    },
    {
      header: "Prestataire", key: "provider",
      render: (_: any, row: Ticket) => {
        const name =
          (row as any).provider?.company_name ??
          (row as any).provider?.user?.name   ??
          (row as any).provider?.name         ??
          (row.provider_id ? `#${row.provider_id}` : "—");
        return <span className="text-sm text-slate-700">{name}</span>;
      },
    },
    {
      header: "Type", key: "type",
      render: (_: any, row: Ticket) => (
        <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold ${
          row.type === "curatif" ? "bg-orange-50 text-orange-700" : "bg-blue-50 text-blue-700"
        }`}>
          {row.type === "curatif" ? "Curatif" : "Préventif"}
        </span>
      ),
    },
    {
      header: "Priorité", key: "priority",
      render: (_: any, row: Ticket) => <PriorityBadge priority={row.priority} />,
    },
    {
      header: "Statut", key: "status",
      render: (_: any, row: Ticket) => <StatusBadge status={row.status} />,
    },
    {
      header: "Actions", key: "actions",
      render: (_: any, row: Ticket) => (
        <button
          onClick={() => handleOpenDetails(row)}
          className="flex items-center gap-2 font-bold text-slate-800 hover:text-gray-500 transition"
        >
          <Eye size={18} /> Aperçu
        </button>
      ),
    },
  ];

  // ── Formulaire création d'un ticket (tous les champs métier) ──
  const ticketFields: FieldConfig[] = [
    {
      name: "site_id", label: "Site", type: "select", required: true,
      options: sites.map((s: any) => ({ label: s.nom, value: String(s.id) })),
    },
    {
      name: "company_asset_id", label: "Patrimoine", type: "select", required: true,
      options: assets.map((a: any) => ({ label: `${a.designation} (${a.codification})`, value: String(a.id) })),
    },
    {
      name: "service_id", label: "Service", type: "select", required: true,
      options: services.map((s: any) => ({ label: s.name, value: String(s.id) })),
    },
    {
      name: "provider_id", label: "Prestataire", type: "select", required: true,
      options: providers.map((p: any) => ({
        label: p.company_name ?? p.user?.name ?? p.name ?? `Prestataire #${p.id}`,
        value: String(p.id),
      })),
    },
    {
      name: "type", label: "Type de maintenance", type: "select", required: true,
      options: [{ label: "Curatif", value: "curatif" }, { label: "Préventif", value: "preventif" }],
    },
    {
      name: "priority", label: "Priorité", type: "select", required: true,
      options: [
        { label: "Faible", value: "faible" }, { label: "Moyenne", value: "moyenne" },
        { label: "Haute", value: "haute" },   { label: "Critique", value: "critique" },
      ],
    },
    { name: "subject",    label: "Sujet",          type: "text" },
    { name: "planned_at", label: "Date planifiée", type: "date", required: true, icon: CalendarDays },
    { name: "due_at",     label: "Date limite",    type: "date", required: true, icon: CalendarCheck },
    // Description + Photos occupent toute la largeur (gridSpan: 2)
    {
      name: "description", label: "Description", type: "rich-text", gridSpan: 2,
      placeholder: "Décrivez le problème ou l'intervention",
    },
    {
      name: "images", label: "Photos", type: "image-upload", gridSpan: 2, maxImages: 3,
    },
  ];

  // ── Formulaire édition d'un ticket (statut + commentaire + photos) ──
  const editFields: FieldConfig[] = [
    {
      name: "status", label: "Statut", type: "select", required: true,
      options: Object.entries(STATUS_LABELS).map(([v, l]) => ({ label: l, value: v })),
    },
    {
      name: "priority", label: "Priorité", type: "select",
      options: [
        { label: "Faible", value: "faible" }, { label: "Moyenne", value: "moyenne" },
        { label: "Haute",  value: "haute"  }, { label: "Critique", value: "critique" },
      ],
    },
    // Commentaire + Photos pleine largeur
    { name: "description", label: "Commentaire", type: "rich-text", gridSpan: 2 },
    { name: "images",      label: "Photos",      type: "image-upload", gridSpan: 2, maxImages: 3 },
  ];

  // ── KPIs ──
  const kpis1 = [
    { label: "Coût moyen / ticket", value: stats?.cout_moyen_par_ticket ?? 0,         isCurrency: true, delta: "+0%", trend: "up" as const },
    { label: "Total tickets",       value: stats?.nombre_total_tickets ?? 0,           delta: "+0%",     trend: "up" as const },
    { label: "Tickets en cours",    value: stats?.nombre_total_tickets_en_cours ?? 0,  delta: "+0%",     trend: "up" as const },
    { label: "Tickets clôturés",    value: stats?.nombre_total_tickets_clotures ?? 0,  delta: "+0%",     trend: "up" as const },
  ];
  const kpis2 = [
    { label: "Tickets ce mois", value: stats?.nombre_tickets_par_mois ?? 0,                  delta: "+0%", trend: "up" as const },
    { label: "Délai moyen",     value: formatHeures(stats?.delais_moyen_traitement_heures),   delta: "+0%", trend: "up" as const },
    { label: "Délai minimal",   value: formatHeures(stats?.delais_minimal_traitement_heures), delta: "+0%", trend: "up" as const },
    { label: "Délai maximal",   value: formatHeures(stats?.delais_maximal_traitement_heures), delta: "+0%", trend: "up" as const },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />

        <main className="ml-64 mt-20 p-6 space-y-8">
          <PageHeader title="Tickets" subtitle="Suivez et gérez tous vos tickets d'intervention" />

          {/* Flash */}
          {flashMessage && (
            <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-xl shadow-lg text-sm font-semibold border ${
              flashMessage.type === "success"
                ? "text-green-700 bg-green-50 border-green-200"
                : "text-red-600 bg-red-100 border-red-300"
            }`}>
              {flashMessage.message}
            </div>
          )}

          {/* KPIs row 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis1.map((k, i) => <StatsCard key={i} {...k} />)}
          </div>

          {/* KPIs row 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis2.map((k, i) => <StatsCard key={i} {...k} />)}
          </div>

          {/* ── Barre d'actions ── */}
          <div className="flex items-center justify-between gap-3">
            {/* Gauche : badges filtres actifs */}
            <div className="flex items-center gap-2 flex-wrap min-h-[36px]">
              {activeCount === 0 && (
                <p className="text-xs text-slate-400 font-medium">Aucun filtre actif</p>
              )}
              {filters.status && (
                <span className="flex items-center gap-1.5 bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded-full">
                  {STATUS_LABELS[filters.status]}
                  <button onClick={() => applyFilters({ ...filters, status: undefined })} className="hover:opacity-70 transition"><X size={11} /></button>
                </span>
              )}
              {filters.type && (
                <span className="flex items-center gap-1.5 bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded-full">
                  {filters.type === "curatif" ? "Curatif" : "Préventif"}
                  <button onClick={() => applyFilters({ ...filters, type: undefined })} className="hover:opacity-70 transition"><X size={11} /></button>
                </span>
              )}
              {filters.priority && (
                <span className="flex items-center gap-1.5 bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded-full">
                  {PRIORITY_LABELS[filters.priority]}
                  <button onClick={() => applyFilters({ ...filters, priority: undefined })} className="hover:opacity-70 transition"><X size={11} /></button>
                </span>
              )}
            </div>

            {/* Droite : boutons d'action */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Importer */}
              <label className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-bold cursor-pointer hover:bg-slate-50 transition ${importLoading ? "opacity-60 cursor-wait" : ""}`}>
                {importLoading
                  ? <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
                  : <Download size={16} />
                }
                Importer
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" disabled={importLoading} onChange={handleImport} />
              </label>

              {/* Exporter */}
              <button
                onClick={handleExport}
                disabled={exportLoading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-bold hover:bg-slate-50 transition disabled:opacity-60 disabled:cursor-wait"
              >
                {exportLoading
                  ? <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
                  : <Upload size={16} />
                }
                Exporter
              </button>

              {/* Filtrer */}
              <div className="relative" ref={filterRef}>
                <button
                  onClick={() => setFiltersOpen(!filtersOpen)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition ${
                    filtersOpen || activeCount > 0
                      ? "bg-slate-900 text-white border-slate-900"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Filter size={16} />
                  Filtrer
                  {activeCount > 0 && (
                    <span className="ml-1 bg-white text-slate-900 text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                      {activeCount}
                    </span>
                  )}
                </button>
                <FilterDropdown
                  isOpen={filtersOpen}
                  onClose={() => setFiltersOpen(false)}
                  filters={filters}
                  onApply={(f) => { applyFilters(f); setFiltersOpen(false); }}
                />
              </div>

              {/* Nouveau Ticket */}
              <button
                onClick={() => { setEditingTicket(null); setIsModalOpen(true); }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition shadow-sm"
              >
                <TicketPlus size={16} /> Nouveau Ticket
              </button>
            </div>
          </div>

          {/* ── Table ── */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="py-16 text-center text-slate-400 text-sm">
                <span className="inline-block w-6 h-6 border-2 border-slate-200 border-t-slate-700 rounded-full animate-spin mb-3" />
                <p>Chargement des tickets...</p>
              </div>
            ) : tickets.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm">
                Aucun ticket{activeCount > 0 ? " correspondant aux filtres" : ""}.
              </div>
            ) : (
              <DataTable columns={columns} data={tickets} onViewAll={() => {}} />
            )}
            <div className="p-6 border-t border-slate-50 flex items-center justify-between bg-slate-50/30">
              <p className="text-xs text-slate-400">
                Page {page} sur {meta?.last_page ?? 1} · {meta?.total ?? 0} tickets
              </p>
              <Paginate currentPage={page} totalPages={meta?.last_page ?? 1} onPageChange={setPage} />
            </div>
          </div>
        </main>
      </div>

      {/* ── Ticket Side Panel ── */}
      <TicketSidePanel
        ticket={isDetailsOpen ? selectedTicket : null}
        onClose={() => { setIsDetailsOpen(false); setSelectedTicket(null); }}
        onEdit={handleEdit}
      />

      {/* ── Formulaire création / édition ── */}
      <ReusableForm
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingTicket(null); }}
        title={editingTicket ? "Modifier le ticket" : "Nouveau ticket"}
        subtitle={
          editingTicket
            ? "Modifiez le statut ou les informations du ticket"
            : "Remplissez les informations pour créer un ticket"
        }
        // En édition → editFields (statut + commentaire + photos)
        // En création → ticketFields (tous les champs métier + photos)
        fields={editingTicket ? editFields : ticketFields}
        initialValues={editingTicket ? {
          status:      editingTicket.status,
          priority:    editingTicket.priority,
          description: editingTicket.description ?? "",
        } : {}}
        onSubmit={handleSubmit}
        submitLabel={editingTicket ? "Mettre à jour" : "Créer le ticket"}
      />
    </div>
  );
}