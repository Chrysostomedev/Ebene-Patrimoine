"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import StatsCard from "@/components/StatsCard";
import DataTable from "@/components/DataTable";
import PageHeader from "@/components/PageHeader";
import { Eye, X, Copy, Check, Tag, Clock, MapPin, Wrench, AlertTriangle, CheckCircle2, RefreshCw, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";

import { useProviderTickets } from "../../../hooks/useProviderTickets";
import { Ticket, ProviderUpdatableStatus } from "../../../services/providerTicketService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatHeures = (h: number | null | undefined) =>
  h != null ? `${h}h` : "—";

const formatDate = (iso?: string | null): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const date = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return time === "00:00" ? date : `${date} à ${time}`;
};

// ─── Statuts ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  signalez: "Signalé",  validé: "Validé",   assigné: "Assigné",
  en_cours: "En cours", rapporté: "Rapporté", évalué: "Évalué", clos: "Clôturé",
};

const STATUS_STYLES: Record<string, string> = {
  signalez: "border-slate-300  bg-slate-100  text-slate-700",
  validé:   "border-blue-400   bg-blue-50    text-blue-700",
  assigné:  "border-violet-400 bg-violet-50  text-violet-700",
  en_cours: "border-orange-400 bg-orange-50  text-orange-600",
  rapporté: "border-amber-400  bg-amber-50   text-amber-700",
  évalué:   "border-green-500  bg-green-50   text-green-700",
  clos:     "border-black      bg-black      text-white",
};

const STATUS_DOT: Record<string, string> = {
  signalez: "#94a3b8", validé: "#3b82f6", assigné: "#8b5cf6",
  en_cours: "#f97316", rapporté: "#f59e0b", évalué: "#22c55e", clos: "#000",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center justify-center min-w-[90px] px-3 py-1.5 rounded-xl border text-xs font-bold ${STATUS_STYLES[status] ?? "border-gray-200 bg-gray-50 text-gray-600"}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

const PRIORITY_STYLES: Record<string, string> = {
  faible: "bg-slate-100 text-slate-600", moyenne: "bg-blue-50 text-blue-700",
  haute: "bg-orange-50 text-orange-700", critique: "bg-red-100 text-red-700",
};
const PRIORITY_LABELS: Record<string, string> = {
  faible: "Faible", moyenne: "Moyenne", haute: "Haute", critique: "Critique",
};

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${PRIORITY_STYLES[priority] ?? "bg-gray-100 text-gray-600"}`}>
      {PRIORITY_LABELS[priority] ?? priority}
    </span>
  );
}

// ─── Filtre select ────────────────────────────────────────────────────────────
function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-xs font-semibold text-gray-700 border border-gray-200 rounded-xl px-3 py-2 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 transition"
    >
      <option value="">{label}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProviderTicketsPage() {
  const {
    tickets, stats, meta, selectedTicket,
    loading, statsLoading, updateLoading,
    error, updateError, updateSuccess,
    filters, setFilters,
    openTicket, closeTicket, updateStatus, refresh,
  } = useProviderTickets();

  // ── Colonnes DataTable ────────────────────────────────────────────────────
  const columns = [
    {
      header: "Référence",
      key: "id",
      render: (_: any, row: Ticket) => <span className="font-black text-slate-900 text-sm">#{row.id}</span>,
    },
    {
      header: "Sujet",
      key: "subject",
      render: (_: any, row: Ticket) => (
        <span className="font-medium text-slate-900 text-sm max-w-[200px] truncate block">
          {row.subject ?? "—"}
        </span>
      ),
    },
    {
      header: "Site",
      key: "site",
      render: (_: any, row: Ticket) => <span className="text-sm text-slate-600">{row.site?.nom ?? "—"}</span>,
    },
    {
      header: "Type",
      key: "type",
      render: (_: any, row: Ticket) => (
        <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold ${row.type === "curatif" ? "bg-orange-50 text-orange-700" : "bg-blue-50 text-blue-700"}`}>
          {row.type === "curatif" ? "Curatif" : "Préventif"}
        </span>
      ),
    },
    {
      header: "Priorité",
      key: "priority",
      render: (_: any, row: Ticket) => <PriorityBadge priority={row.priority} />,
    },
    {
      header: "Statut",
      key: "status",
      render: (_: any, row: Ticket) => <StatusBadge status={row.status} />,
    },
    {
      header: "Planifié le",
      key: "planned_at",
      render: (_: any, row: Ticket) => <span className="text-xs text-slate-500">{formatDate(row.planned_at)}</span>,
    },
    {
      header: "Actions",
      key: "actions",
      render: (_: any, row: Ticket) => (
        <button
          onClick={() => openTicket(row)}
          className="flex items-center gap-1.5 text-sm font-bold text-slate-800 hover:text-blue-600 transition"
        >
          <Eye size={16} /> Aperçu
        </button>
      ),
    },
  ];

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis1 = [
    { label: "Coût moyen / ticket",  value: stats?.cout_moyen_par_ticket          ?? 0, isCurrency: true, delta: "", trend: "up" as const },
   // AVANt
// APRÈS
{ label: "Total tickets",    value: stats?.total    ?? 0, delta: "", trend: "up" as const },
{ label: "Tickets en cours", value: stats?.en_cours ?? 0, delta: "", trend: "up" as const },
{ label: "Tickets clôturés", value: stats?.clotures ?? 0, delta: "", trend: "up" as const },
  ];
  const kpis2 = [
    { label: "Tickets ce mois",      value: stats?.nombre_tickets_par_mois         ?? 0, delta: "", trend: "up" as const },
    { label: "Délai moyen",          value: formatHeures(stats?.delais_moyen_traitement_heures),    delta: "", trend: "up" as const },
    { label: "Délai minimal",        value: formatHeures(stats?.delais_minimal_traitement_heures),  delta: "", trend: "up" as const },
    { label: "Délai maximal",        value: formatHeures(stats?.delais_maximal_traitement_heures),  delta: "", trend: "up" as const },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Navbar />

        <main className="ml-64 mt-20 p-6 space-y-8">

          <div className="flex items-center justify-between">
            <PageHeader
              title="Mes Tickets"
              subtitle="Consultez et mettez à jour le statut de vos interventions"
            />
            <button
              onClick={refresh}
              disabled={loading}
              className="flex items-center gap-2 text-xs font-semibold text-gray-600 hover:text-gray-900 border border-gray-200 rounded-xl px-3 py-2 hover:border-gray-400 transition disabled:opacity-40"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              Actualiser
            </button>
          </div>

          {/* Erreur globale */}
          {error && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl text-sm">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
              <button onClick={refresh} className="ml-auto text-xs font-bold underline">Réessayer</button>
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {statsLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-3xl border border-slate-100 p-6 animate-pulse h-28" />
                ))
              : kpis1.map((k, i) => <StatsCard key={i} {...k} />)
            }
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {statsLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-3xl border border-slate-100 p-6 animate-pulse h-28" />
                ))
              : kpis2.map((k, i) => <StatsCard key={i} {...k} />)
            }
          </div>

          {/* Filtres */}
          <div className="flex flex-wrap gap-3 items-center">
            <FilterSelect
              label="Tous les statuts"
              value={filters.status ?? ""}
              onChange={(v) => setFilters({ status: v || undefined })}
              options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
            />
            <FilterSelect
              label="Tous les types"
              value={filters.type ?? ""}
              onChange={(v) => setFilters({ type: v || undefined })}
              options={[{ value: "curatif", label: "Curatif" }, { value: "preventif", label: "Préventif" }]}
            />
            <FilterSelect
              label="Toutes priorités"
              value={filters.priority ?? ""}
              onChange={(v) => setFilters({ priority: v || undefined })}
              options={Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label }))}
            />
            {(filters.status || filters.type || filters.priority) && (
              <button
                onClick={() => setFilters({ status: undefined, type: undefined, priority: undefined })}
                className="text-xs font-semibold text-gray-500 hover:text-gray-900 flex items-center gap-1 transition"
              >
                <X size={12} /> Réinitialiser
              </button>
            )}
          </div>

          {/* Table */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800">Liste de mes tickets</h3>
              {meta && (
                <span className="text-xs text-gray-400 font-medium">
                  {meta.total} ticket{meta.total > 1 ? "s" : ""}
                </span>
              )}
            </div>

            <div className="px-6 py-4">
              {loading ? (
                <div className="space-y-3 animate-pulse">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-12 bg-gray-100 rounded-xl" />
                  ))}
                </div>
              ) : (
                <DataTable columns={columns} data={tickets} />
              )}
            </div>

            {/* Pagination */}
            {meta && meta.last_page > 1 && (
              <div className="px-6 py-4 border-t border-slate-50 flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  Page {meta.current_page} / {meta.last_page}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilters({ page: meta.current_page - 1 })}
                    disabled={meta.current_page <= 1}
                    className="p-2 rounded-xl border border-gray-200 hover:border-gray-400 disabled:opacity-30 transition"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={() => setFilters({ page: meta.current_page + 1 })}
                    disabled={meta.current_page >= meta.last_page}
                    className="p-2 rounded-xl border border-gray-200 hover:border-gray-400 disabled:opacity-30 transition"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

        </main>
      </div>

      {/* Panel détail ticket */}
      {selectedTicket && (
        <TicketDetailPanel
          ticket={selectedTicket}
          onClose={closeTicket}
          onUpdateStatus={updateStatus}
          updateLoading={updateLoading}
          updateError={updateError}
          updateSuccess={updateSuccess}
        />
      )}
    </div>
  );
}

// ─── Panel détail ticket ──────────────────────────────────────────────────────

function TicketDetailPanel({
  ticket, onClose, onUpdateStatus, updateLoading, updateError, updateSuccess,
}: {
  ticket: Ticket;
  onClose: () => void;
  onUpdateStatus: (id: number, status: ProviderUpdatableStatus) => Promise<void>;
  updateLoading: boolean;
  updateError: string;
  updateSuccess: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(String(ticket.id));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Un PROVIDER peut passer un ticket à "en_cours" ou "rapporté"
  // uniquement si le ticket lui est assigné (le controller bloque sinon)
  const canMarkEnCours  = ticket.status === "assigné";
  const canMarkRapporte = ticket.status === "en_cours";

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[480px] bg-white z-50 shadow-2xl flex flex-col rounded-l-3xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-xl transition">
              <X size={16} className="text-slate-500" />
            </button>
            <span className="text-xs font-semibold text-slate-400">Détail du ticket</span>
          </div>
          <StatusBadge status={ticket.status} />
        </div>

        {/* Titre */}
        <div className="px-7 pt-5 pb-4 shrink-0">
          <h2 className="text-xl font-black text-slate-900 leading-tight">
            {ticket.subject ?? `Ticket #${ticket.id}`}
          </h2>
          <div className="flex flex-wrap items-center gap-2 mt-2.5">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${ticket.type === "curatif" ? "bg-orange-50 text-orange-700 border-orange-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
              {ticket.type === "curatif" ? "Curatif" : "Préventif"}
            </span>
            <PriorityBadge priority={ticket.priority} />
          </div>
        </div>

        {/* Corps */}
        <div className="flex-1 overflow-y-auto px-7 pb-7 space-y-5">

          {/* Référence */}
          <div className="flex items-center justify-between py-3 border-b border-slate-50">
            <div className="flex items-center gap-2 text-slate-400">
              <Tag size={13} />
              <span className="text-xs font-medium">Référence</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-slate-900">#{ticket.id}</span>
              <button onClick={handleCopy} className={`p-1.5 rounded-lg border transition ${copied ? "bg-green-50 border-green-200 text-green-600" : "bg-slate-50 border-slate-100 text-slate-400 hover:text-slate-600"}`}>
                {copied ? <Check size={11} /> : <Copy size={11} />}
              </button>
            </div>
          </div>

          {/* Infos */}
          {[
            { icon: <MapPin size={13} />,       label: "Site",            value: ticket.site?.nom ?? "—" },
            { icon: <Wrench size={13} />,       label: "Actif",           value: ticket.asset ? `${ticket.asset.designation} (${ticket.asset.codification})` : "—" },
            { icon: <AlertTriangle size={13} />,label: "Service",         value: ticket.service?.name ?? "—" },
            { icon: <Clock size={13} />,        label: "Planifié le",     value: formatDate(ticket.planned_at) },
            { icon: <Clock size={13} />,        label: "Échéance",        value: formatDate(ticket.due_at) },
            { icon: <CheckCircle2 size={13} />, label: "Résolu le",       value: formatDate(ticket.resolved_at) },
          ].map(({ icon, label, value }) => (
            <div key={label} className="flex items-start justify-between py-2.5 border-b border-slate-50 last:border-0 gap-4">
              <div className="flex items-center gap-2 text-slate-400 shrink-0">
                {icon}
                <span className="text-xs font-medium whitespace-nowrap">{label}</span>
              </div>
              <span className="text-xs font-semibold text-slate-700 text-right">{value}</span>
            </div>
          ))}

          {/* Description */}
          {ticket.description && (
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Description</p>
              <div
                className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-sm text-slate-700 leading-relaxed prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: ticket.description }}
              />
            </div>
          )}

          {/* Feedback update */}
          {updateError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-semibold">
              <AlertCircle size={13} /> {updateError}
            </div>
          )}
          {updateSuccess && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-xs font-semibold">
              <CheckCircle2 size={13} /> {updateSuccess}
            </div>
          )}

          {/* Actions statut PROVIDER */}
          {(canMarkEnCours || canMarkRapporte) && (
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
                Mettre à jour le statut
              </p>
              <div className="flex gap-3">
                {canMarkEnCours && (
                  <button
                    onClick={() => onUpdateStatus(ticket.id, "en_cours")}
                    disabled={updateLoading}
                    className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-xs font-bold hover:bg-orange-600 disabled:opacity-50 transition flex items-center justify-center gap-2"
                  >
                    {updateLoading ? <RefreshCw size={12} className="animate-spin" /> : null}
                    Démarrer l'intervention
                  </button>
                )}
                {canMarkRapporte && (
                  <button
                    onClick={() => onUpdateStatus(ticket.id, "rapporté")}
                    disabled={updateLoading}
                    className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-black disabled:opacity-50 transition flex items-center justify-center gap-2"
                  >
                    {updateLoading ? <RefreshCw size={12} className="animate-spin" /> : null}
                    Marquer comme rapporté
                  </button>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}