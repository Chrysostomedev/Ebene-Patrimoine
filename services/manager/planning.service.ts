// ═══════════════════════════════════════════════════════════════
// services/manager/planning.service.ts
// Appels API → /api/manager/planning
// Lecture seule + export — filtrage site géré côté backend
// ═══════════════════════════════════════════════════════════════

import api from "../../core/axios";
import type {
  ApiResponse,
  PaginatedResponse,
  Planning,
  PlanningStats,
  PlanningFilters,
} from "../../types/manager.types";

export const PlanningService = {
  /**
   * Liste paginée des plannings du site du manager.
   */
  async getPlannings(
    filters: PlanningFilters = {}
  ): Promise<PaginatedResponse<Planning>> {
    const { data } = await api.get<ApiResponse<PaginatedResponse<Planning>>>(
      "/manager/planning",
      { params: filters }
    );
    return data.data;
  },

  /**
   * Détail d'un planning.
   */
  async getPlanning(id: number): Promise<Planning> {
    const { data } = await api.get<ApiResponse<Planning>>(
      `/manager/planning/${id}`
    );
    return data.data;
  },

  /**
   * Statistiques des plannings du site.
   */
  async getStats(): Promise<PlanningStats> {
    const { data } = await api.get<ApiResponse<PlanningStats>>(
      "/manager/planning/stats"
    );
    return data.data;
  },

  /**
   * Export Excel des plannings.
   */
  async exportPlannings(filters: PlanningFilters = {}): Promise<Blob> {
    const response = await api.get("/manager/planning/export", {
      params: filters,
      responseType: "blob",
    });
    return response.data;
  },
};