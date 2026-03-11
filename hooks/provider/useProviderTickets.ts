import { useState, useEffect, useCallback } from "react";
import {
  providerTicketService,
  Ticket,
  TicketStats,
  TicketMeta,
  ProviderUpdatableStatus,
} from "../services/providerTicketService";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TicketFilters {
  page?:      number;
  per_page?:  number;
  status?:    string;
  type?:      string;
  priority?:  string;
}

interface UseProviderTicketsReturn {
  // Data
  tickets:       Ticket[];
  stats:         TicketStats | null;
  meta:          TicketMeta | null;
  selectedTicket: Ticket | null;

  // States
  loading:       boolean;
  statsLoading:  boolean;
  updateLoading: boolean;
  error:         string;
  updateError:   string;
  updateSuccess: string;

  // Filters
  filters:       TicketFilters;
  setFilters:    (f: Partial<TicketFilters>) => void;

  // Actions
  openTicket:    (ticket: Ticket) => void;
  closeTicket:   () => void;
  updateStatus:  (id: number, status: ProviderUpdatableStatus) => Promise<void>;
  refresh:       () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useProviderTickets(): UseProviderTicketsReturn {
  const [tickets,        setTickets]        = useState<Ticket[]>([]);
  const [stats,          setStats]          = useState<TicketStats | null>(null);
  const [meta,           setMeta]           = useState<TicketMeta | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const [loading,        setLoading]        = useState(true);
  const [statsLoading,   setStatsLoading]   = useState(true);
  const [updateLoading,  setUpdateLoading]  = useState(false);

  const [error,          setError]          = useState("");
  const [updateError,    setUpdateError]    = useState("");
  const [updateSuccess,  setUpdateSuccess]  = useState("");

  const [filters, setFiltersState] = useState<TicketFilters>({ page: 1, per_page: 15 });

  // ── Fetch tickets ──────────────────────────────────────────────────────────
  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await providerTicketService.getTickets(filters);
      setTickets(result.items);
      setMeta(result.meta);
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors du chargement des tickets.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // ── Fetch stats ────────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const result = await providerTicketService.getStats();
      setStats(result);
    } catch {
      // Stats non bloquantes — on ignore silencieusement
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // ── Re-fetch quand les filtres changent ───────────────────────────────────
  useEffect(() => { fetchTickets(); }, [fetchTickets]);
  useEffect(() => { fetchStats();   }, [fetchStats]);

  // ── Mise à jour filtres ───────────────────────────────────────────────────
  const setFilters = (partial: Partial<TicketFilters>) => {
    setFiltersState((prev) => ({
      ...prev,
      ...partial,
      // Reset page à 1 si on change un filtre autre que page
      page: partial.page !== undefined ? partial.page : 1,
    }));
  };

  // ── Ouvrir / fermer panel ─────────────────────────────────────────────────
  const openTicket  = (ticket: Ticket) => setSelectedTicket(ticket);
  const closeTicket = () => setSelectedTicket(null);

  // ── Update statut ─────────────────────────────────────────────────────────
  const updateStatus = async (id: number, status: ProviderUpdatableStatus) => {
    setUpdateLoading(true);
    setUpdateError("");
    setUpdateSuccess("");

    try {
      const updated = await providerTicketService.updateTicketStatus(id, status);

      // Mise à jour optimiste dans la liste
      setTickets((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: updated.status } : t))
      );

      // Mise à jour du ticket sélectionné si ouvert
      if (selectedTicket?.id === id) {
        setSelectedTicket((prev) => prev ? { ...prev, status: updated.status } : prev);
      }

      setUpdateSuccess("Statut mis à jour avec succès.");
      setTimeout(() => setUpdateSuccess(""), 3000);

    } catch (err: any) {
      const msg = err.response?.data?.message || "Erreur lors de la mise à jour.";
      setUpdateError(msg);
      setTimeout(() => setUpdateError(""), 4000);
    } finally {
      setUpdateLoading(false);
    }
  };

  return {
    tickets,
    stats,
    meta,
    selectedTicket,
    loading,
    statsLoading,
    updateLoading,
    error,
    updateError,
    updateSuccess,
    filters,
    setFilters,
    openTicket,
    closeTicket,
    updateStatus,
    refresh: fetchTickets,
  };
}