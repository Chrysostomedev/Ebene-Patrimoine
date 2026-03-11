// services/invoice.service.ts
import axiosInstance from "../../core/axios";

// ═══════════════════════════════════════════════════════════════════════════
// INTERFACES — Calquées sur le modèle Laravel Invoice
// ═══════════════════════════════════════════════════════════════════════════

export interface InvoiceProvider {
  id: number;
  company_name?: string;
  email?: string;
  service_id?: number;
  rating?: string;
  is_active?: boolean;
}

export interface InvoiceSite {
  id: number;
  nom?: string;
  responsable_name?: string;
  email?: string;
  localisation?: string;
  status?: string;
}

export interface InvoiceReport {
  id: number;
  ticket_id?: number;
  intervention_date?: string;
  intervention_type?: "preventive" | "curative";
  findings?: string;
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
  
  payment_status: "pending" | "paid" | "overdue" | "cancelled";
  payment_date?: string | null;
  payment_method?: string | null;
  payment_reference?: string | null;
  
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
  amount_ht: number;
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
  return {
    ...invoice,
    amount_ht: typeof invoice.amount_ht === "string" ? parseFloat(invoice.amount_ht) : invoice.amount_ht,
    tax_amount: typeof invoice.tax_amount === "string" ? parseFloat(invoice.tax_amount) : invoice.tax_amount,
    amount_ttc: typeof invoice.amount_ttc === "string" ? parseFloat(invoice.amount_ttc) : invoice.amount_ttc,
    // ✅ Normalisation nom relation : intervention_report → interventionReport
    interventionReport: invoice.intervention_report ?? invoice.interventionReport,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════════════════

export const InvoiceService = {

  /**
   * GET /admin/invoice
   * ⚠️ CORRECTION : Backend retourne { data: { items: [...], meta: {...} } }
   */
  async getInvoices(): Promise<Invoice[]> {
    const res = await axiosInstance.get("/admin/invoice");
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
    formData.append("amount_ht", String(payload.amount_ht));
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
    await axiosInstance.delete(`/super-admin/invoice/${id}`);
  },

  async markAsPaid(id: number, payload?: MarkAsPaidPayload): Promise<Invoice> {
    const res = await axiosInstance.post(`/admin/invoice/${id}/mark-paid`, payload ?? {});
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

  getPdfUrl(pdfPath: string): string {
    const base = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ?? "";
    return `${base}/storage/${pdfPath}`;
  },
};