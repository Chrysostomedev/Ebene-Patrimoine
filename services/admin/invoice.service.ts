// services/invoice.service.ts
import axiosInstance from "../../core/axios";
import { resolveStorageUrl } from "../../lib/url";

// ═══════════════════════════════════════════════════════════════════════════
// INTERFACES — Calquées sur le modèle Laravel Invoice
// ═══════════════════════════════════════════════════════════════════════════

export interface InvoiceProvider {
  id: number;
  company_name?: string;
  name?: string;        // Fallback or Display name
  email?: string;
  phone?: string;
  service_id?: number;
  rating?: string;
  is_active?: boolean;
}

export interface InvoiceSite {
  id: number;
  nom?: string;
  name?: string;        // Alias for nom
  responsable_name?: string;
  email?: string;
  localisation?: string;
  status?: string;
}

export interface InvoiceReport {
  id: number;
  ticket_id?: number;
  reference?: string;   // Added
  intervention_date?: string;
  start_date?: string;  // Added
  end_date?: string;    // Added
  intervention_type?: "preventive" | "curative";
  findings?: string;
  description?: string; // Added (findings alias)
  action_taken?: string;
  status?: string;
  rating?: number;
}

export interface Invoice {
  id: number;
  reference: string;
  report_id: number;
  quote_id?: number | null;
  provider_id: number;
  site_id: number;

  invoice_date: string;
  due_date: string;

  // ✅ CORRECTION : Montants peuvent être string depuis Laravel
  amount_ht: number | string;
  tax_amount: number | string;
  amount_ttc: number | string;

  payment_status: "pending" | "paid" | "overdue" | "cancelled" | "rejected" | string;
  payment_date?: string | null;
  payment_method?: string | null;
  payment_reference?: string | null;
  reason?: string | null; 

  pdf_path?: string | null;
  url?: string | null;
  comment?: string | null;
  imported_by?: number | null;

  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;

  // ✅ CORRECTION : Backend renvoie "intervention_report" (snake_case)
  intervention_report?: InvoiceReport | null;
  interventionReport?: InvoiceReport | null;  // Alias pour compatibilité
  provider?: InvoiceProvider | null;
  site?: InvoiceSite | null;
  quote?: any | null;                         // Added quote relation
}

export interface InvoiceStats {
  total_invoices: number;
  total_paid: number;
  total_unpaid: number;
  total_overdue?: number;
  total_amount: number;
  total_paid_amount: number;
  total_unpaid_amount: number;
}

// ✅ Structure paginée retournée par Laravel
interface PaginatedResponse<T> {
  items: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface CreateInvoicePayload {
  report_id: number;
  invoice_date: string;
  due_date: string;
  amount_ht?: number; // Optionnel : le backend le calcule si absent
  tax_amount: number;
  amount_ttc: number;
  pdf?: File | null;
  created_by?: number;
}

export interface MarkAsPaidPayload {
  payment_date?: string;
  payment_method?: string;
  payment_reference?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER - Normalisation (string → number + alias relations)
// ═══════════════════════════════════════════════════════════════════════════

function normalizeInvoice(invoice: Invoice): Invoice {
  const norm = {
    ...invoice,
    amount_ht: typeof invoice.amount_ht === "string" ? parseFloat(invoice.amount_ht) : (invoice.amount_ht || 0),
    tax_amount: typeof invoice.tax_amount === "string" ? parseFloat(invoice.tax_amount) : (invoice.tax_amount || 0),
    amount_ttc: typeof invoice.amount_ttc === "string" ? parseFloat(invoice.amount_ttc) : (invoice.amount_ttc || 0),
    // ✅ Normalisation nom relation : intervention_report → interventionReport
    interventionReport: invoice.intervention_report ?? invoice.interventionReport,
  };

  // Double normalization for sub-fields if needed
  if (norm.interventionReport) {
    if (!norm.interventionReport.description) norm.interventionReport.description = norm.interventionReport.findings;
  }

  return norm;
}

// ═══════════════════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════════════════

export const InvoiceService = {

  async getInvoices(params?: any): Promise<Invoice[]> {
    const res = await axiosInstance.get("/admin/invoice", { params });
    const responseData = res.data.data;

    // ✅ Si structure paginée
    if (responseData && typeof responseData === "object" && "items" in responseData) {
      const paginated = responseData as PaginatedResponse<Invoice>;
      return paginated.items.map(normalizeInvoice);
    }

    // ✅ Si directement tableau (fallback)
    if (Array.isArray(responseData)) {
      return responseData.map(normalizeInvoice);
    }

    console.error("❌ Structure inattendue getInvoices:", responseData);
    return [];
  },

  async getInvoicesPaginated(params?: any): Promise<{ items: Invoice[]; meta: any }> {
    const res = await axiosInstance.get("/admin/invoice", { params });
    const responseData = res.data.data;

    if (responseData && typeof responseData === "object" && "items" in responseData) {
      const paginated = responseData as PaginatedResponse<Invoice>;
      return {
        items: paginated.items.map(normalizeInvoice),
        meta: paginated.meta,
      };
    }

    if (Array.isArray(responseData)) {
      return {
        items: responseData.map(normalizeInvoice),
        meta: {
          current_page: 1,
          last_page: 1,
          per_page: responseData.length,
          total: responseData.length,
        },
      };
    }

    return { items: [], meta: null };
  },

  async getInvoice(id: number): Promise<Invoice> {
    const res = await axiosInstance.get(`/admin/invoice/${id}`);
    return normalizeInvoice(res.data.data);
  },

  async getStats(): Promise<InvoiceStats> {
    const res = await axiosInstance.get("/admin/invoice/stats");
    return res.data.data;
  },

  async createInvoice(payload: CreateInvoicePayload): Promise<Invoice> {
    const formData = new FormData();
    formData.append("report_id", String(payload.report_id));
    formData.append("invoice_date", payload.invoice_date);
    formData.append("due_date", payload.due_date);
    if (payload.amount_ht !== undefined) {
      formData.append("amount_ht", String(payload.amount_ht));
    }
    formData.append("tax_amount", String(payload.tax_amount));
    formData.append("amount_ttc", String(payload.amount_ttc));
    if (payload.pdf) formData.append("pdf", payload.pdf);
    if (payload.created_by) formData.append("created_by", String(payload.created_by));

    const res = await axiosInstance.post("/admin/invoice", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return normalizeInvoice(res.data.data);
  },

  async deleteInvoice(id: number): Promise<void> {
    await axiosInstance.delete(`/admin/invoice/${id}`);
  },

  async markAsPaid(id: number, payload?: MarkAsPaidPayload): Promise<Invoice> {
    const res = await axiosInstance.post(`/admin/invoice/${id}/mark-paid`, payload ?? {});
    return normalizeInvoice(res.data.data);
  },

  async rejectInvoice(id: number, rejectionReason: string): Promise<Invoice> {
    const res = await axiosInstance.post(`/admin/invoice/${id}/reject`, {
      reason: rejectionReason,
    });
    return normalizeInvoice(res.data.data);
  },

  async getInvoicesByReport(reportId: number): Promise<Invoice[]> {
    const res = await axiosInstance.get("/admin/invoice", {
      params: { report_id: reportId },
    });
    const responseData = res.data.data;

    if (responseData && typeof responseData === "object" && "items" in responseData) {
      return (responseData as PaginatedResponse<Invoice>).items.map(normalizeInvoice);
    }
    if (Array.isArray(responseData)) {
      return responseData.map(normalizeInvoice);
    }
    return [];
  },

  /**
   * Récupère toutes les factures liées à un ticket via ses rapports
   */
  async getInvoicesByTicket(ticketId: number): Promise<Invoice[]> {
    const res = await axiosInstance.get("/admin/invoice", {
      params: { ticket_id: ticketId },
    });
    const responseData = res.data.data;

    if (responseData && typeof responseData === "object" && "items" in responseData) {
      return (responseData as PaginatedResponse<Invoice>).items.map(normalizeInvoice);
    }
    if (Array.isArray(responseData)) {
      return responseData.map(normalizeInvoice);
    }
    return [];
  },

  /**
   * Construit l'URL publique d'un PDF de facture
   */
  getPdfUrl(pdfPath: string): string {
    return resolveStorageUrl(pdfPath);
  },
};