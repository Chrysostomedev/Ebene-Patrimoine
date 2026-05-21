// ═══════════════════════════════════════════════════════════════
// services/manager/site.service.ts
// Appels API → /api/manager/site
// Le backend retourne uniquement le site du manager connecté.
// ═══════════════════════════════════════════════════════════════

import api from "../../core/axios";
import type { ApiResponse, PaginatedResponse, ManagerSite, SiteStats } from "../../types/manager.types";

export const SiteService = {
  /**
   * Récupère la liste des sites accessibles au manager.
   * (En pratique, un seul site est retourné côté backend.)
   */
  async getSites(): Promise<PaginatedResponse<ManagerSite>> {
    const { data } = await api.get<ApiResponse<PaginatedResponse<ManagerSite>>>("/manager/site");
    return data.data;
  },

  /**
   * Récupère les détails d'un site par ID.
   */
  async getSite(id: number): Promise<ManagerSite> {
    const { data } = await api.get<ApiResponse<ManagerSite>>(
      `/manager/site/${id}`
    );
    return data.data;
  },

  /**
   * Statistiques consolidées du manager (KPIs multi-sites).
   * Utilise l'endpoint du dashboard car c'est lui qui fournit les données agrégées.
   */
  async getStats(): Promise<SiteStats> {
    const { data } = await api.get<ApiResponse<any>>(
      "/manager/dashboard/stats"
    );
    const d = data.data;
    
    // Le dashboard renvoie { sites: [], kpis: { ... }, ... }
    if (d && d.kpis) {
      return {
        ...d.kpis,
        // Aligner les noms des champs pour le front
        nombre_total_sites: d.kpis.nombre_sites,
        nombre_sites_assignes: d.kpis.nombre_sites,
        nombre_sites_actifs: d.kpis.nombre_sites_actifs,
        nombre_sites_inactifs: d.kpis.nombre_sites_inactifs,
        cout_loyer_moyen_par_site: d.kpis.loyer_moyen,
        total_assets: d.kpis.nombre_equipements, // Fallback asset
        nombre_equipements: d.kpis.nombre_equipements,
        total_tickets: d.kpis.nombre_total_tickets,
        active_providers: d.kpis.nombre_prestataires,
      } as SiteStats;
    }
    
    return d as SiteStats;
  },



  /**
   * Export Excel des données du site.
   * Retourne un blob pour déclenchement du téléchargement côté client.
   */
  async exportSite(): Promise<Blob> {
    const response = await api.get("/manager/site/export", {
      responseType: "blob",
    });
    return response.data;
  },
};