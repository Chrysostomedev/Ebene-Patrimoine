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
        DashboardService.getStats().catch(err => {
          if (err?.response?.status === 403) {
            return {
              site_info: { id: 0, nom: "Aucun site assigné" },
              kpis: {
                nombre_total_tickets: 0,
                nombre_tickets_traités: 0,
                nombre_tickets_non_traités: 0,
                nombre_prestataires: 0,
                cout_global_maintenance: 0,
                nombre_sites: 0,
                nombre_sites_actifs: 0,
                nombre_sites_inactifs: 0,
                loyer_moyen: 0,
                nombre_equipements: 0
              },
              tickets_stats_par_statut: {},
              tendance_annuelle_maintenance: [],
              sites_les_plus_frequentes: [],
              prochains_plannings: []
            };
          }
          throw err;
        }),
        TicketService.getTickets({ per_page: 5 }).catch(err => {
          if (err?.response?.status === 403) {
            return { items: [], meta: { current_page: 1, last_page: 1, per_page: 5, total: 0 } };
          }
          throw err;
        }),
      ]);
      setStats(statsData);
      setRecentTickets(ticketsData.items);
    } catch (err: any) {
      console.error("Dashboard data fetch error:", err);
      if (err?.response?.status === 403) {
        setError(null);
      } else {
        setError(err?.response?.data?.message ?? "Erreur lors du chargement des données du tableau de bord.");
      }
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