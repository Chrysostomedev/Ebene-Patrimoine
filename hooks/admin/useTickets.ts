// hooks/useTickets.ts
import { useState, useEffect } from "react";
import { TicketService, Ticket, TicketStats } from "../../services/admin/ticket.service";

export const useTickets = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ current_page: number; last_page: number; per_page: number; total: number } | null>(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<{
    search?: string;
    status?: string;
    priority?: string;
    type?: string;
    site_id?: number;
  }>({ type: "curatif" });

  const fetchTickets = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await TicketService.getTickets({ page, per_page: 15, ...filters });
      setTickets(data.items);
      setMeta(data.meta);
    } catch (err: any) {
      setError(err.message || "Erreur lors de la récupération des tickets");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await TicketService.getStats();
      setStats(data);
    } catch (err) {
      console.error("Erreur stats tickets:", err);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [page, filters]);

  useEffect(() => {
    fetchStats();
  }, []);

  const changePage = (newPage: number) => setPage(newPage);

  const applyFilters = (newFilters: typeof filters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const assignTicket = async (id: number, providerId: number) => {
    try {
      await TicketService.assignTicket(id, providerId);
      // Mise à jour immédiate dans la liste locale
      setTickets(prev => prev.map(t =>
        t.id === id ? { ...t, status: "ASSIGNÉ", provider_id: providerId } : t
      ));
      // Refetch après un court délai pour laisser le back se stabiliser
      setTimeout(() => { fetchTickets(); fetchStats(); }, 800);
      return true;
    } catch (err: any) {
      const status = err?.response?.status;
      const msg: string = err?.response?.data?.message ?? err?.message ?? "";
      // 422 ou 500 avec bug notify → ticket assigné quand même
      const isNotifyBug = (status === 422 || status === 500) && (
        msg.includes("notify") || msg.includes("Notifiable") || msg.includes("undefined method")
      );
      if (isNotifyBug) {
        setTickets(prev => prev.map(t =>
          t.id === id ? { ...t, status: "ASSIGNÉ", provider_id: providerId } : t
        ));
        setTimeout(() => { fetchTickets(); fetchStats(); }, 800);
        return true;
      }
      const userMsg = status === 422
        ? (err?.response?.data?.errors
            ? Object.values(err.response.data.errors).flat().join(" | ")
            : msg || "Transition de statut impossible.")
        : msg || "Erreur lors de l'assignation.";
      setError(userMsg);
      return false;
    }
  };

  const closeTicket = async (id: number) => {
    setIsLoading(true);
    try {
      await TicketService.closeTicket(id);
      await Promise.all([fetchTickets(), fetchStats()]);
      return true;
    } catch (err: any) {
      setError(err.message || "Erreur lors de la clôture");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const validateReport = async (id: number, payload: { result: string; rating?: number; comment?: string }) => {
    setIsLoading(true);
    try {
      await TicketService.validateReport(id, payload);
      await Promise.all([fetchTickets(), fetchStats()]);
      return true;
    } catch (err: any) {
      setError(err.message || "Erreur lors de la validation");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    tickets,
    stats,
    isLoading,
    error,
    meta,
    page,
    filters,
    fetchTickets,
    fetchStats,
    setPage: changePage,
    applyFilters,
    assignTicket,
    closeTicket,
    validateReport,
  };
};