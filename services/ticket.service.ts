// services/ticket.service.ts
import axios from "../core/axios";

export interface Ticket {
  id: number;
  site_id: number;
  company_asset_id: number;
  service_id: number;
  provider_id: number;
  user_id: number;
  type: "curatif" | "preventif";
  priority: "faible" | "moyenne" | "haute" | "critique";
  status: "signalez" | "validé" | "assigné" | "en_cours" | "rapporté" | "évalué" | "clos";
  subject?: string;
  description?: string;
  planned_at: string;
  due_at: string;
  resolved_at?: string;
  closed_at?: string;
  cout?: number;
  site?: { id: number; nom: string };
  asset?: { id: number; designation: string; codification: string };
  service?: { id: number; name: string };
  provider?: { id: number; name: string };
  user?: { id: number; name: string };
  created_at?: string;
  updated_at?: string;
}

export interface TicketStats {
  nombre_total_tickets: number;
  nombre_total_tickets_en_cours: number;
  nombre_total_tickets_clotures: number;
  nombre_total_tickets_resolus: number;
  nombre_tickets_par_mois: number;
  cout_moyen_par_ticket: number;
  cout_global_tickets: number;
  delais_moyen_traitement_heures: number | null;
  delais_minimal_traitement_heures: number | null;
  delais_maximal_traitement_heures: number | null;
  repartition_par_statut: Record<string, number>;
  tickets_en_cours_par_patrimoine: { asset_id: number; designation: string; codification: string; tickets_en_cours: number }[];
  volumes_mensuels_tickets: { annee: number; mois: number; total: number }[];
}

export const TicketService = {
  async getTickets(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    status?: string;
    priority?: string;
    type?: string;
    site_id?: number;
    company_asset_id?: number;
  }): Promise<{ items: Ticket[]; meta: { current_page: number; last_page: number; per_page: number; total: number } }> {
    const response = await axios.get("/admin/ticket", { params });
    return response.data.data;
  },

  async getTicket(id: number): Promise<Ticket> {
    const response = await axios.get(`/admin/ticket/${id}`);
    return response.data.data;
  },

  async createTicket(payload: {
    site_id: number;
    company_asset_id: number;
    service_id: number;
    provider_id: number;
    type: "curatif" | "preventif";
    priority: "faible" | "moyenne" | "haute" | "critique";
    planned_at: string;
    due_at: string;
    subject?: string;
    description?: string;
  }): Promise<Ticket> {
    const response = await axios.post("/admin/ticket", payload);
    return response.data.data;
  },

  async updateTicket(id: number, payload: Partial<{
    status: string;
    priority: string;
    provider_id: number;
    planned_at: string;
    subject: string;
    description: string;
    type: string;
  }>): Promise<Ticket> {
    const response = await axios.put(`/admin/ticket/${id}`, payload);
    return response.data.data;
  },

  async deleteTicket(id: number): Promise<boolean> {
    const response = await axios.delete(`/admin/ticket/${id}`);
    return response.data.success;
  },

  async getStats(): Promise<TicketStats> {
    const response = await axios.get("/admin/ticket/stats");
    return response.data.data;
  },
};