// services/dashboard.service.ts
import axios from "../core/axios";

export interface GlobalDashboard {
  nombre_total_tickets: number;
  nombre_tickets_traites: number;
  nombre_tickets_non_traites: number;
  nombre_sites_actifs: number;
  nombre_sites_inactifs: number;
  cout_moyen_par_site: number;
  cout_total_maintenance: number;
  tendance_annuelle_maintenance: { annee: number; mois: number; total: number }[];
  sites_les_plus_frequentes: { site_id: number; nom: string; total_tickets: number }[];
  tickets_recents: {
    id: number;
    subject?: string;
    status: string;
    type: string;
    planned_at: string;
    site?: { id: number; nom: string };
    service?: { id: number; name: string };
  }[];
}

export interface AdminDashboard {
  nombre_total_sites_actifs: number;
  nombre_total_sites_inactifs: number;
  cout_moyen_par_sites: number;
  cout_total_maintenance: number;
  nombre_total_equipements: number;
  nombre_total_prestataires: number;
  nombre_total_factures: string | number;
  nombre_tickets_en_attente: number;
  nombre_tickets_en_cours: number;
  nombre_tickets_clotures: number;
  // Évolution équipements : [{annee, mois, total}] sur 12 derniers mois
  evolution_patrimoine: { annee: number; mois: number; total: number }[];
  sites_les_plus_frequentes: { site_id: number; nom: string; total_tickets: number }[];
  actifs_les_plus_critiques: any[];
}

export const DashboardService = {
  async getGlobalDashboard(): Promise<GlobalDashboard> {
    const response = await axios.get("/admin/dashboard/global");
    return response.data.data;
  },

  async getAdminDashboard(): Promise<AdminDashboard> {
    const response = await axios.get("/admin/dashboard/administration");
    return response.data.data;
  },
};