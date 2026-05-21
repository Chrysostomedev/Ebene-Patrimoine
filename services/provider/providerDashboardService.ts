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
    const raw = response.data?.data ?? response.data;

    // Normalise les prochaines interventions (peut être un tableau d'objets plannings bruts)
    const rawInterventions: any[] = raw?.prochaines_interventions ?? [];
    const interventions: Intervention[] = rawInterventions.map((item: any) => ({
      id:          item.id,
      title:       item.description ?? item.codification ?? `Planning #${item.id}`,
      description: item.description ?? null,
      date_debut:  item.date_debut,
      date_fin:    item.date_fin,
      site:        item.site?.nom ?? item.site_id ?? null,
      location:    item.site?.localisation ?? null,
      status:      item.status ?? null,
    }));

    // Normalise les tickets récents
    const rawTickets: any[] = raw?.tickets_recents ?? [];

    return {
      provider_info:            raw?.provider_info ?? { name: "", code: "" },
      stats:                    raw?.stats         ?? { tickets: { total: 0, en_cours: 0, clotures: 0 }, devis: { total: 0, en_attente: 0, montant_total: 0 }, factures: { total: 0, payees: 0, en_attente: 0, montant_total: 0 } },
      prochaines_interventions: interventions,
      tickets_recents:          rawTickets,
    };
  },
};