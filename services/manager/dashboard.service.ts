// ═══════════════════════════════════════════════════════════════
// services/manager/dashboard.service.ts
// Appels API → GET /api/manager/dashboard/stats
// ═══════════════════════════════════════════════════════════════

import api from "../../core/axios";
import type { ApiResponse, ManagerDashboardStats } from "../../types/manager.types";

export const DashboardService = {
  /**
   * Récupère toutes les stats du dashboard manager.
   * Le backend filtre automatiquement par site du manager connecté.
   */
  async getStats(): Promise<ManagerDashboardStats> {
    const { data } = await api.get<ApiResponse<any>>(
      "/manager/dashboard/stats"
    );
    const raw = data.data;
    return {
      ...raw,
      tendance_annuelle_maintenance: raw.tendance_annuelle_maintenance ?? raw.tendances_annee ?? [],
    };
  },
};