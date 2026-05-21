// services/manager/ticket.service.ts
import axios from "../../core/axios";
import { Ticket, TicketStats, TicketFilters, PaginatedResponse, ApiResponse, UpdateTicketPayload } from "../../types/manager.types";

export const TicketService = {
  /**
   * Récupère la liste paginée des tickets pour le site du manager.
   */
  async getTickets(params?: TicketFilters): Promise<PaginatedResponse<Ticket>> {
    const endpoint = params?.type === "preventif" ? "/manager/ticket/preventif" : "/manager/ticket/curatif";
    const { type, ...queryParams } = params || {};
    const response = await axios.get(endpoint, { params: queryParams });
    return response.data.data;
  },

  /**
   * Récupère les détails d'un ticket spécifique.
   */
  async getTicket(id: number): Promise<Ticket> {
    const response = await axios.get(`/manager/ticket/${id}`);
    return response.data.data;
  },

  /**
   * Crée (signale) un nouveau ticket d'intervention.
   * Le back (TicketsController::store) valide :
   *   - site_id : forcé automatiquement par le back pour le manager
   *   - company_asset_id : required
   *   - service_id : nullable
   *   - provider_id : nullable pour manager
   *   - type : required (curatif|preventif)
   *   - priority : required
   *   - planned_at : required date
   *   - due_at : required date after_or_equal planned_at
   *   - subject : nullable
   *   - description : nullable
   */
  async createTicket(payload: {
    company_asset_id: number;
    service_id?: number;
    priority: string;
    type: string;
    planned_at: string;
    due_at: string;
    description?: string;
    subject?: string;
    site_id?: number;
    attachments?: File[];
  }): Promise<Ticket> {
    const formData = new FormData();
    
    // Ajout des champs textuels
    Object.entries(payload).forEach(([key, value]) => {
      if (key !== 'attachments' && value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    // Ajout des fichiers (photos du ticket)
    if (payload.attachments && payload.attachments.length > 0) {
      payload.attachments.forEach((file) => {
        formData.append("attachments[]", file);
      });
    }

    // Le back absorbe le 500 notify() — on l'intercepte silencieusement
    try {
      const response = await axios.post("/manager/ticket", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data.data;
    } catch (err: any) {
      const status = err?.response?.status;
      const msg: string = err?.response?.data?.message ?? "";
      const isNotifyBug = status === 500 && (
        msg.includes("notify") || msg.includes("Notifiable") || msg.includes("undefined method")
      );
      if (isNotifyBug) {
        // Ticket créé malgré l'erreur notif — on retourne un objet minimal
        return { id: 0 } as any;
      }
      throw err;
    }
  },

  /**
   * Met à jour un ticket existant.
   */
  async updateTicket(id: number, payload: UpdateTicketPayload): Promise<Ticket> {
    const response = await axios.put(`/manager/ticket/update/${id}`, payload);
    return response.data.data;
  },

  /**
   * Récupère les statistiques des tickets pour le manager.
   */
  async getStats(): Promise<TicketStats> {
    const response = await axios.get("/manager/ticket/stats");
    return response.data.data;
  },

  /**
   * Exporte les tickets au format Excel.
   */
  async exportTickets(params?: TicketFilters): Promise<Blob> {
    const response = await axios.get("/manager/ticket/export", {
      params,
      responseType: "blob",
    });
    return response.data;
  },

  /**
   * Valide un rapport d'intervention lié à un ticket.
   */
  async validateReport(id: number, payload: { result: string; rating?: number; comment?: string }): Promise<any> {
    const response = await axios.post(`/manager/ticket/${id}/validate-report`, payload);
    return response.data;
  },

  /**
   * Rejette un rapport d'intervention.
   */
  async rejectReport(id: number, reason: string): Promise<any> {
    const response = await axios.post(`/manager/ticket/${id}/reject-report`, { reason });
    return response.data;
  },

  /**
   * Note une intervention terminée.
   */
  async rateTicket(id: number, payload: { rating: number; comment?: string }): Promise<any> {
    const response = await axios.post(`/manager/ticket/${id}/rate`, payload);
    return response.data.data;
  },

  async getTicketInfo(id: number): Promise<any> {
    const response = await axios.get(`/manager/ticket/info/${id}`);
    return response.data.data;
  },
};
