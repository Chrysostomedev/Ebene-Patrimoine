// ═══════════════════════════════════════════════════════════════
// services/manager/quote.service.ts
// Appels API → /api/manager/quote
// CRUD complet + actions métier : approve/reject/validate/convert
// ═══════════════════════════════════════════════════════════════

import api from "../../core/axios";
import type {
  ApiResponse,
  PaginatedResponse,
  Quote,
  QuoteStats,
  QuoteFilters,
  CreateQuotePayload,
  UpdateQuotePayload,
} from "../../types/manager.types";

export const QuoteService = {
  /**
   * Liste des devis du site du manager.
   * Le back retourne $query->get() (tableau non paginé) — on normalise.
   */
  async getQuotes(
    filters: QuoteFilters = {}
  ): Promise<PaginatedResponse<Quote>> {
    const { data } = await api.get("/manager/quote", { params: filters });
    const d = data?.data;
    // Normalise : tableau direct ou { items, meta }
    const items: Quote[] = Array.isArray(d) ? d
      : Array.isArray(d?.items) ? d.items
      : Array.isArray(d?.data)  ? d.data
      : [];
    return {
      items,
      meta: d?.meta ?? {
        current_page: 1,
        last_page:    1,
        per_page:     items.length,
        total:        items.length,
      },
    };
  },

  /**
   * Détail d'un devis avec ses items et son historique.
   */
  async getQuote(id: number): Promise<Quote> {
    const { data } = await api.get<ApiResponse<Quote>>(
      `/manager/quote/${id}`
    );
    return data.data;
  },

  /**
   * Statistiques des devis du site.
   */
  async getStats(filters: QuoteFilters = {}): Promise<QuoteStats> {
    const { data } = await api.get<ApiResponse<QuoteStats>>(
      "/manager/quote/stats",
      { params: filters }
    );
    return data.data;
  },

  /**
   * Créer un nouveau devis.
   */
  async createQuote(payload: CreateQuotePayload): Promise<Quote> {
    const { data } = await api.post<ApiResponse<Quote>>(
      "/manager/quote",
      payload
    );
    return data.data;
  },

  /**
   * Mettre à jour un devis existant.
   * Interdit si status = 'validated'.
   */
  async updateQuote(
    id: number,
    payload: UpdateQuotePayload
  ): Promise<Quote> {
    const { data } = await api.put<ApiResponse<Quote>>(
      `/manager/quote/${id}`,
      payload
    );
    return data.data;
  },

  /**
   * Supprimer un devis.
   */
  async deleteQuote(id: number): Promise<void> {
    await api.delete(`/manager/quote/${id}`);
  },

  // ── Actions métier ─────────────────────────────────────────────

  /** Approuver un devis (manager / admin) */
  async approveQuote(id: number): Promise<Quote> {
    const { data } = await api.post<ApiResponse<Quote>>(
      `/manager/quote/${id}/approve`
    );
    return data.data;
  },

  /** Rejeter un devis */
  async rejectQuote(id: number, reason?: string): Promise<Quote> {
    const { data } = await api.post<ApiResponse<Quote>>(
      `/manager/quote/${id}/reject`,
      { reason }
    );
    return data.data;
  },

  /** Valider un devis (comptable / admin) */
  async validateQuote(id: number): Promise<Quote> {
    const { data } = await api.post<ApiResponse<Quote>>(
      `/manager/quote/${id}/validate`
    );
    return data.data;
  },

  /** Invalider un devis */
  async invalidateQuote(id: number): Promise<Quote> {
    const { data } = await api.post<ApiResponse<Quote>>(
      `/manager/quote/${id}/invalidate`
    );
    return data.data;
  },

  /** Convertir un devis validé en facture */
  async convertToInvoice(id: number): Promise<{ invoice_id: number }> {
    const { data } = await api.post<ApiResponse<{ invoice_id: number }>>(
      `/manager/quote/${id}/convert-to-invoice`
    );
    return data.data;
  },

  /**
   * Export Excel des devis — utilise le vrai endpoint backend.
   * Route : GET /manager/quote/export (via commons.php)
   */
  async exportQuotes(filters: QuoteFilters = {}): Promise<Blob> {
    const response = await api.get("/manager/quote/export", {
      params: filters,
      responseType: "blob",
    });
    return response.data;
  },
};