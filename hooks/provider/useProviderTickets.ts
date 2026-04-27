import { useState, useEffect, useCallback } from "react";
import {
  providerTicketService,
  Ticket,
  TicketStats,
  TicketMeta,
  canStartIntervention,
  canSubmitReport,
  canRequestDevis,
  isAlreadyReported,
} from "../../services/provider/providerTicketService";

export interface TicketFilters {
  page?:      number;
  per_page?:  number;
  status?:    string;
  type?:      string;
  priority?:  string;
}

interface UseProviderTicketsReturn {
  tickets:        Ticket[];
  stats:          TicketStats | null;
  meta:           TicketMeta | null;
  selectedTicket: Ticket | null;

  loading:        boolean;
  statsLoading:   boolean;
  updateLoading:  boolean;
  error:          string;
  updateError:    string;
  updateSuccess:  string;

  filters:        TicketFilters;
  setFilters:     (f: Partial<TicketFilters>) => void;

  openTicket:     (ticket: Ticket) => void;
  closeTicket:    () => void;

  // Actions métier — endpoints dédiés
  startIntervention: (id: number) => Promise<void>;
  requestDevis:      (id: number) => Promise<void>;
  refresh:           () => void;

  // Helpers UX
  canStart:       (t: Ticket) => boolean;
  canReport:      (t: Ticket) => boolean;
  canDevis:       (t: Ticket) => boolean;
  alreadyReported:(t: Ticket) => boolean;
}

export function useProviderTickets(): UseProviderTicketsReturn {
  const [tickets,        setTickets]        = useState<Ticket[]>([]);
  const [stats,          setStats]          = useState<TicketStats | null>(null);
  const [meta,           setMeta]           = useState<TicketMeta | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const [loading,       setLoading]       = useState(true);
  const [statsLoading,  setStatsLoading]  = useState(true);
  const [updateLoading, setUpdateLoading] = useState(false);

  const [error,         setError]         = useState("");
  const [updateError,   setUpdateError]   = useState("");
  const [updateSuccess, setUpdateSuccess] = useState("");

  // Filtre type=curatif envoyé directement à l'API — le back filtre côté serveur
  const [filters, setFiltersState] = useState<TicketFilters>({ page: 1, per_page: 15, type: "curatif" });

  const fetchTickets = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const result = await providerTicketService.getTickets(filters);
      setTickets(result.items);
      setMeta(result.meta);
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors du chargement des tickets.");
    } finally { setLoading(false); }
  }, [filters]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try { setStats(await providerTicketService.getStats()); }
    catch { /* non bloquant */ }
    finally { setStatsLoading(false); }
  }, []);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);
  useEffect(() => { fetchStats();   }, [fetchStats]);

  const setFilters = (partial: Partial<TicketFilters>) => {
    setFiltersState(prev => ({
      ...prev, ...partial,
      page: partial.page !== undefined ? partial.page : 1,
    }));
  };

  const openTicket  = (ticket: Ticket) => setSelectedTicket(ticket);
  const closeTicket = () => setSelectedTicket(null);

  const flash = (ok: boolean, successMsg: string, errMsg?: string) => {
    if (ok) {
      setUpdateSuccess(successMsg);
      setTimeout(() => setUpdateSuccess(""), 3000);
    } else {
      setUpdateError(errMsg ?? "Erreur.");
      setTimeout(() => setUpdateError(""), 4000);
    }
  };

  const updateLocal = (id: number, patch: Partial<Ticket>) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
    if (selectedTicket?.id === id) setSelectedTicket(prev => prev ? { ...prev, ...patch } : prev);
  };

  /** POST /provider/ticket/:id/start — PLANIFIÉ/ASSIGNÉ/DEVIS_APPROUVÉ → EN_COURS/EN_TRAITEMENT */
  const startIntervention = async (id: number) => {
    setUpdateLoading(true); setUpdateError(""); setUpdateSuccess("");
    try {
      const updated = await providerTicketService.startIntervention(id);
      updateLocal(id, { status: updated.status });
      flash(true, "Intervention démarrée avec succès.");
    } catch (err: any) {
      flash(false, "", err.response?.data?.message || "Erreur lors du démarrage.");
    } finally { setUpdateLoading(false); }
  };

  /** POST /provider/ticket/:id/request-devis — ASSIGNÉ → DEVIS_EN_ATTENTE */
  const requestDevis = async (id: number) => {
    setUpdateLoading(true); setUpdateError(""); setUpdateSuccess("");
    try {
      const updated = await providerTicketService.requestDevis(id);
      updateLocal(id, { status: updated.status });
      flash(true, "Demande de devis envoyée.");
    } catch (err: any) {
      flash(false, "", err.response?.data?.message || "Erreur lors de la demande de devis.");
    } finally { setUpdateLoading(false); }
  };

  return {
    tickets, stats, meta, selectedTicket,
    loading, statsLoading, updateLoading,
    error, updateError, updateSuccess,
    filters, setFilters,
    openTicket, closeTicket,
    startIntervention, requestDevis,
    refresh: fetchTickets,
    // Helpers UX
    canStart:        canStartIntervention,
    canReport:       canSubmitReport,
    canDevis:        canRequestDevis,
    alreadyReported: isAlreadyReported,
  };
}
