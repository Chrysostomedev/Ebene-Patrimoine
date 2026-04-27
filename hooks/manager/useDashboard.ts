// hooks/manager/useDashboard.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardService } from "../../services/manager/dashboard.service";
import { TicketService } from "../../services/manager/ticket.service";
import type { ManagerDashboardStats, Ticket } from "../../types/manager.types";

interface UseDashboardReturn {
  stats: ManagerDashboardStats | null;
  recentTickets: Ticket[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useDashboard(): UseDashboardReturn {
  const [stats, setStats] = useState<ManagerDashboardStats | null>(null);
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [statsData, ticketsData] = await Promise.all([
        DashboardService.getStats(),
        TicketService.getTickets({ per_page: 5 }),
      ]);
      setStats(statsData);
      setRecentTickets(ticketsData.items);
    } catch (err: any) {
      console.error("Dashboard data fetch error:", err);
      setError(err?.response?.data?.message ?? "Erreur lors du chargement des données du tableau de bord.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    stats,
    recentTickets,
    isLoading,
    error,
    refresh: fetchData,
  };
}