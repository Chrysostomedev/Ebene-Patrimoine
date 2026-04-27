// hooks/manager/useTickets.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { TicketService } from "../../services/manager/ticket.service";
import { Ticket, TicketStats, TicketFilters, PaginatedResponse } from "../../types/manager.types";

interface UseTicketsReturn {
  tickets: Ticket[];
  stats: TicketStats | null;
  meta: PaginatedResponse<Ticket>["meta"] | null;
  filters: TicketFilters;
  isLoading: boolean;
  error: string | null;
  setFilters: (f: Partial<TicketFilters>) => void;
  refresh: () => void;
  exportTickets: () => Promise<void>;
}

export function useTickets(initialFilters: TicketFilters = {}): UseTicketsReturn {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [meta, setMeta] = useState<PaginatedResponse<Ticket>["meta"] | null>(null);
  const [filters, setFiltersState] = useState<TicketFilters>({
    page: 1,
    per_page: 15,
    ...initialFilters,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [paginatedData, statsData] = await Promise.all([
        TicketService.getTickets(filters),
        TicketService.getStats(),
      ]);
      setTickets(paginatedData.items);
      setMeta(paginatedData.meta);
      setStats(statsData);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Impossible de charger les tickets.");
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const setFilters = (partial: Partial<TicketFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...partial, page: 1 }));
  };

  const exportTickets = async () => {
    try {
      const blob = await TicketService.exportTickets(filters);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tickets_${Date.now()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Erreur export tickets", err);
    }
  };

  return {
    tickets,
    stats,
    meta,
    filters,
    isLoading,
    error,
    setFilters,
    refresh: fetchAll,
    exportTickets,
  };
}