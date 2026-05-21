// ═══════════════════════════════════════════════════════════════
// services/manager/invoice.service.ts
// Consommation des routes d'API pour les factures du manager.
// ═══════════════════════════════════════════════════════════════

import api from "../../core/axios";
import type {
  ApiResponse,
  PaginatedResponse,
  Invoice,
  InvoiceStats,
  InvoiceFilters,
} from "../../types/manager.types";
import { resolveStorageUrl } from "../../lib/url";

export const InvoiceService = {
  /**
   * Liste paginée des factures (filtrée uniquement sur ses sites)
   */
  async getInvoices(
    filters: InvoiceFilters = {}
  ): Promise<PaginatedResponse<Invoice>> {
    const { data } = await api.get<ApiResponse<PaginatedResponse<Invoice>>>(
      "/manager/invoice",
      {
        params: {
          page: filters.page ?? 1,
          per_page: filters.per_page ?? 15,
          payment_status: filters.payment_status,
          site_id: filters.site_id,
          search: filters.search,
        },
      }
    );
    // Le backend renvoie { success, message, data: { items: [...], meta: {...} } }
    return data.data as PaginatedResponse<Invoice>;
  },

  /**
   * Détails d'une facture spécifique
   */
  async getInvoice(id: number): Promise<Invoice> {
    const { data } = await api.get<ApiResponse<Invoice>>(`/manager/invoice/${id}`);
    return data.data as Invoice;
  },

  /**
   * Statistiques des factures (de son ou ses sites)
   */
  async getStats(): Promise<InvoiceStats> {
    const { data } = await api.get<ApiResponse<any>>("/manager/invoice/stats");
    const raw = data.data;
    return {
      total: raw.total_invoices ?? 0,
      paid: raw.total_paid ?? 0,
      unpaid: raw.total_unpaid ?? 0,
      total_invoices: raw.total_invoices ?? 0,
      total_paid: raw.total_paid ?? 0,
      total_unpaid: raw.total_unpaid ?? 0,
      total_amount: raw.total_amount ?? 0,
      paid_amount: raw.total_paid_amount ?? 0,
      total_paid_amount: raw.total_paid_amount ?? 0,
      unpaid_amount: raw.total_unpaid_amount ?? 0,
      total_unpaid_amount: raw.total_unpaid_amount ?? 0,
    };
  },

  /**
   * Récupère les factures liées à un rapport d'intervention.
   */
  async getInvoicesByReport(reportId: number): Promise<Invoice[]> {
    const { data } = await api.get<ApiResponse<PaginatedResponse<Invoice>>>(
      "/manager/invoice",
      {
        params: { report_id: reportId, per_page: 100 },
      }
    );
    return data.data.items || [];
  },

  /**
   * Exporter les factures (de ses sites)
   */
  async exportInvoices(filters: InvoiceFilters = {}): Promise<Blob> {
    const response = await api.get("/manager/invoice/export", {
      params: {
        payment_status: filters.payment_status,
        site_id: filters.site_id,
        search: filters.search,
      },
      responseType: "blob",
    });
    return new Blob([response.data]);
  },

  /**
   * Construit l'URL publique d'une facture.
   */
  getPdfUrl(pdfPath: string): string {
    return resolveStorageUrl(pdfPath);
  },
};
