// ═══════════════════════════════════════════════════════════════
// services/manager/asset.service.ts
//
// Routes Laravel disponibles pour le MANAGER :
//   GET  /manager/asset/stats        → statistiques du patrimoine
//   GET  /manager/asset/export       → export Excel (blob)
//   GET  /manager/asset              → liste paginée (filtré par site)
//   GET  /manager/asset/{asset}      → détail d'un actif
//
// Le backend applique automatiquement le filtre site_id du manager.
// ═══════════════════════════════════════════════════════════════

import api from "../../core/axios";
import type {
  ApiResponse,
  PaginatedResponse,
  Asset,
  AssetStats,
  AssetFilters,
} from "../../types/manager.types";

export const AssetService = {
  // ─────────────────────────────────────────────────────────────
  // LISTE PAGINÉE
  // GET /manager/asset?page=1&per_page=15&status=active&...
  // ─────────────────────────────────────────────────────────────
  async getAssets(
    filters: AssetFilters = {}
  ): Promise<PaginatedResponse<Asset>> {
    const { data } = await api.get<ApiResponse<PaginatedResponse<Asset>>>(
      "/manager/asset",
      { params: filters }
    );
    // Le backend retourne { items, meta } dans data.data
    return data.data;
  },

  // ─────────────────────────────────────────────────────────────
  // DÉTAIL
  // GET /manager/asset/{asset}
  // ─────────────────────────────────────────────────────────────
  async getAsset(id: number): Promise<Asset> {
    const { data } = await api.get<ApiResponse<Asset>>(
      `/manager/asset/${id}`
    );
    return data.data;
  },

  // ─────────────────────────────────────────────────────────────
  // STATISTIQUES
  // GET /manager/asset/stats
  // ─────────────────────────────────────────────────────────────
  async getStats(filters?: AssetFilters): Promise<AssetStats> {
    const { data } = await api.get<ApiResponse<any>>("/manager/asset/stats", { params: filters });
    const d = data?.data ?? data;
    
    // Normalise les champs pour correspondre à l'interface AssetStats et aux besoins du front
    return {
      total:          d?.total_actifs          ?? d?.total          ?? 0,
      active:         d?.actifs_actifs         ?? d?.active         ?? 0,
      in_maintenance: d?.actifs_inactifs       ?? d?.in_maintenance ?? 0,
      out_of_service: d?.actifs_hors_usage     ?? d?.out_of_service ?? 0,
      disposed:       d?.actifs_reformés       ?? d?.disposed       ?? 0,
      
      // Champs additionnels type Admin pour les cartes de stats
      total_actifs:               d?.total_actifs          ?? d?.total ?? 0,
      actifs_actifs:              d?.actifs_actifs         ?? d?.active ?? 0,
      actifs_inactifs:            d?.actifs_inactifs       ?? d?.in_maintenance ?? 0,
      actifs_hors_usage:          d?.actifs_hors_usage     ?? d?.out_of_service ?? 0,
      total_actifs_critiques:     d?.total_actifs_critiques ?? 0,
      total_actifs_non_critiques: d?.total_actifs_non_critiques ?? 0,
      valeur_totale_patrimoine:   d?.valeur_totale_patrimoine ?? d?.total_value ?? 0,
      cout_actifs_critiques:      d?.cout_actifs_critiques ?? 0,
      nombre_total_tickets:       d?.nombre_total_tickets ?? 0,
      delai_intervention_critique_heures: d?.delai_intervention_critique_heures ?? 0,
    } as any;
  },


  // ─────────────────────────────────────────────────────────────
  // EXPORT EXCEL
  // GET /manager/asset/export → Blob
  // ─────────────────────────────────────────────────────────────
  async exportAssets(filters: AssetFilters = {}): Promise<Blob> {
    const response = await api.get("/manager/asset/export", {
      params:       filters,
      responseType: "blob",
    });
    return response.data;
  },
};