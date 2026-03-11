import axiosInstance from "../../core/axios";

// ─── Types — miroir exact du JSON Laravel ─────────────────────────────────────

export interface ProviderInfo {
  name: string;
  code: string;
}

export interface TicketStats {
  total: number;
  en_cours: number;
  clotures: number;
}

export interface DevisStats {
  total: number;
  en_attente: number;
  montant_total: number;
}

export interface FactureStats {
  total: number;
  payees: number;
  en_attente: number;
  montant_total: number;
}

export interface DashboardStats {
  tickets:  TicketStats;
  devis:    DevisStats;
  factures: FactureStats;
}

// Colonnes brutes retournées par la table plannings Laravel
export interface Intervention {
  id: number;
  title?: string;
  description?: string;
  date_debut: string;   // ISO datetime ex: "2026-03-15T09:00:00"
  date_fin?: string;
  site?: string;
  location?: string;
  status?: string;
}

// Ticket récent retourné par le dashboard
export interface RecentTicket {
  id: number;
  subject?: string;
  status: string;
  type: string;
  site?: { nom: string };
  category?: { name: string };
  service?: { name: string };
  planned_at?: string;
}

export interface ProviderDashboardData {
  provider_info:            ProviderInfo;
  stats:                    DashboardStats;
  prochaines_interventions: Intervention[];
  tickets_recents:          RecentTicket[];   // à ajouter côté Laravel si absent
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const providerDashboardService = {

  /**
   * GET /api/V1/provider/dashboard
   * Le token Bearer est injecté automatiquement par axiosInstance.
   */
  getDashboard: async (): Promise<ProviderDashboardData> => {
    const response = await axiosInstance.get("/provider/dashboard");
    // Supporte les deux formats : { data: { data: ... } } ou { data: ... }
    return response.data?.data ?? response.data;
  },
};