// ═══════════════════════════════════════════════════════════════
// services/manager/ticket.service.ts
// Appels API → /api/manager/ticket
// Manager : lecture + mise à jour statut uniquement
// ═══════════════════════════════════════════════════════════════

import api from "../../core/axios";
import type {
  ApiResponse,
  PaginatedResponse,
  Ticket,
  TicketStats,
  TicketFilters,
  UpdateTicketPayload,
} from "../../types/manager.types";

export const TicketService = {
  /** Liste paginée des tickets du site du manager. */
  async getTickets(filters: TicketFilters = {}): Promise<PaginatedResponse<Ticket>> {
    const { data } = await api.get<ApiResponse<PaginatedResponse<Ticket>>>(
      "/manager/ticket",
      { params: filters }
    );
    return data.data;
  },

  /** Détail complet d'un ticket. */
  async getTicket(id: number): Promise<Ticket> {
    const { data } = await api.get<ApiResponse<Ticket>>(`/manager/ticket/${id}`);
    return data.data;
  },

  /** Mise à jour partielle (statut, priorité, prestataire…). */
  async updateTicket(id: number, payload: UpdateTicketPayload): Promise<Ticket> {
    const { data } = await api.put<ApiResponse<Ticket>>(
      `/manager/ticket/update/${id}`,
      payload
    );
    return data.data;
  },

  /** Statistiques globales des tickets du site. */
  async getStats(): Promise<TicketStats> {
    const { data } = await api.get<ApiResponse<TicketStats>>("/manager/ticket/stats");
    return data.data;
  },

  /** Export Excel. */
  async exportTickets(filters: TicketFilters = {}): Promise<Blob> {
    const response = await api.get("/manager/ticket/export", {
      params: filters,
      responseType: "blob",
    });
    return response.data;
  },
};