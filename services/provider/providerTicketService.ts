import axiosInstance from "../../core/axios";

// ─── Types — miroir exact du backend Laravel ──────────────────────────────────

export interface TicketSite     { nom: string; }
export interface TicketProvider { company_name: string; }
export interface TicketAsset    { designation: string; codification: string; }
export interface TicketService  { name: string; }
export interface TicketCategory { name: string; }

export interface Ticket {
  id: number;
  subject?: string;
  status: string;
  type: string;
  priority: string;
  site?: TicketSite;
  provider?: TicketProvider;
  asset?: TicketAsset;
  service?: TicketService;
  category?: TicketCategory;
  description?: string;
  planned_at?: string;
  due_at?: string;
  resolved_at?: string | null;
  closed_at?: string | null;
  created_at?: string;
  cout?: number;
  images?: string[];
}

export interface TicketMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface TicketListResponse {
  items: Ticket[];
  meta: TicketMeta;
}

export interface TicketStats {
  cout_moyen_par_ticket: number;
  total: number;
  en_cours: number;
  clotures: number;
  nombre_tickets_par_mois: number;
  delais_moyen_traitement_heures: number | null;
  delais_minimal_traitement_heures: number | null;
  delais_maximal_traitement_heures: number | null;
}

// Statuts que le PROVIDER peut appliquer (lecture du controller)
// update autorisé : status in [en_cours, rapporté]
export type ProviderUpdatableStatus = "en_cours" | "rapporté";

// ─── Endpoints ────────────────────────────────────────────────────────────────
const BASE = "/provider/ticket";

// ─── Service ──────────────────────────────────────────────────────────────────
export const providerTicketService = {

  /**
   * GET /provider/ticket
   * Le controller applique automatiquement provider_id = auth provider
   * Supporte : page, per_page, status, type, priority, site_id
   */
  getTickets: async (params?: Record<string, any>): Promise<TicketListResponse> => {
    const response = await axiosInstance.get(BASE, { params });
    const data = response.data?.data ?? response.data;
    return {
      items: data?.items ?? [],
      meta:  data?.meta  ?? { current_page: 1, last_page: 1, per_page: 15, total: 0 },
    };
  },

  /**
   * GET /provider/ticket/:id
   * Le controller vérifie que ticket.provider_id === auth provider → 403 sinon
   */
  getTicketById: async (id: number): Promise<Ticket> => {
    const response = await axiosInstance.get(`${BASE}/${id}`);
    return response.data?.data ?? response.data;
  },

  /**
   * GET /provider/ticket/stats
   * Stats filtrées automatiquement par provider_id côté Laravel
   */
  getStats: async (): Promise<TicketStats> => {
    const response = await axiosInstance.get(`${BASE}/stats`);
    return response.data?.data ?? response.data;
  },

  /**
   * PUT /provider/ticket/:id
   * PROVIDER peut uniquement mettre à jour le statut : en_cours | rapporté
   * Le controller bloque toute modif sur un ticket non assigné au provider
   */
  updateTicketStatus: async (id: number, status: ProviderUpdatableStatus): Promise<Ticket> => {
    const response = await axiosInstance.put(`${BASE}/${id}`, { status });
    return response.data?.data ?? response.data;
  },
};