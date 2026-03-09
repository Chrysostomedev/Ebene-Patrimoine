// hooks/useTickets.ts
import { useState, useEffect } from "react";
import { TicketService, Ticket, TicketStats } from "../services/ticket.service";

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
  }>({});

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
  };
};