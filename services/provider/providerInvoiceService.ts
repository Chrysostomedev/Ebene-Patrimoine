import axiosInstance from "../../core/axios";
import { resolveStorageUrl } from "../../lib/url";
import { formatCurrency, formatDate } from "@/lib/utils";

// ─── Types — miroir exact du modèle Laravel Invoice ──────────────────────────
// Relations chargées par le backend : interventionReport, quote, provider, site, attachments

export interface InvoiceProvider {
  id: number;
  company_name?: string;   // provider.company_name (champ principal)
  name?: string;
  email?: string;
  phone?: string;
}

export interface InvoiceSite {
  id: number;
  nom?: string;   // site.nom (champ principal Laravel)
  name?: string;
}

export interface InvoiceReport {
  id: number;
  reference?: string;
  description?: string;
  findings?: string;
  start_date?: string;
  end_date?: string;
  provider_id?: number;
  site_id?: number;
}

export interface InvoiceQuote {
  id: number;
  reference?: string;
  amount_ht?: number;
  tax_amount?: number;
  amount_ttc?: number;
  status?: string;
}

export interface InvoiceAttachment {
  id: number;
  file_path: string;
  file_type?: string;
}

export interface Invoice {
  id: number;
  reference: string;
  // Statuts BD exacts : pending | paid | overdue | cancelled
  payment_status: "pending" | "paid" | "overdue" | "cancelled" | string;
  invoice_date?: string;
  due_date?: string;
  payment_date?: string;
  payment_method?: string;
  payment_reference?: string;
  // Les montants viennent parfois en string depuis Laravel (decimal cast)
  amount_ht: number | string;
  tax_amount: number | string;
  amount_ttc: number | string;
  comment?: string;
  pdf_path?: string;     // chemin relatif storage : "invoices/xxx.pdf"
  report_id?: number;
  quote_id?: number;
  provider_id?: number;
  site_id?: number;
  imported_by?: number;
  // Relations eager-loaded
  interventionReport?: InvoiceReport;
  intervention_report?: InvoiceReport;   // alias possible selon le modèle
  quote?: InvoiceQuote;
  provider?: InvoiceProvider;
  site?: InvoiceSite;
  attachments?: InvoiceAttachment[];
  created_at?: string;
  updated_at?: string;
}

export interface InvoiceStats {
  total_invoices: number;
  total_paid: number;
  total_unpaid: number;
  total_amount: number | string;
  total_paid_amount: number | string;
  total_unpaid_amount: number | string;
}

export interface InvoiceMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface InvoiceListResponse {
  items: Invoice[];
  meta: InvoiceMeta;
}

export interface InvoiceFilters {
  status?: string;
  payment_status?: string;
  page?: number;
  per_page?: number;
  search?: string; // Ajouté
  date_debut?: string;  // YYYY-MM-DD — filtre invoice_date >=
  date_fin?: string;    // YYYY-MM-DD — filtre invoice_date <=
  site_id?: number;
  intervention_type?: "curatif" | "preventif";
}

/**
 * Payload de création — calqué sur InvoiceRequest + createFromReport()
 * Le backend récupère provider_id depuis $report->provider_id
 * Les montants sont optionnels si un devis approuvé existe sur le rapport
 */
export interface CreateInvoicePayload {
  report_id?: number;
  quote_id?: number;
  amount_ht?: number;
  tax_amount?: number;
  amount_ttc?: number;
  comment?: string;
  invoice_date?: string | null;
  due_date?: string | null;
  pdf_file?: File;          // → champ "pdf_file" → stocké dans pdf_path
  attachments?: File[];     // → justificatifs multiples → invoices/attachments/
}

// ─── Statuts BD exacts ────────────────────────────────────────────────────────

export const ALL_STATUSES = ["pending", "paid", "overdue", "cancelled", "rejected"] as const;

export const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  paid: "Validée",
  overdue: "En retard",
  cancelled: "Annulée",
  rejected: "Rejetée",
};

export const STATUS_STYLES: Record<string, string> = {
  paid: "border-emerald-200 bg-emerald-50 text-emerald-600",
  pending: "border-amber-200 bg-amber-50 text-amber-600",
  overdue: "border-rose-200 bg-rose-50 text-rose-600",
  cancelled: "border-slate-200 bg-slate-50 text-slate-500",
  rejected: "border-red-200 bg-red-50 text-red-600",
};

export const STATUS_DOT: Record<string, string> = {
  pending: "#d97706",
  paid: "#10b981",
  overdue: "#f43f5e",
  cancelled: "#64748b",
  rejected: "#ef4444",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Normalise string|number → number (les decimals Laravel peuvent arriver en string) */
export function toNum(v?: number | string | null): number {
  if (v == null) return 0;
  return typeof v === "string" ? parseFloat(v) || 0 : v;
}

export {
  formatCurrency as formatMontant,
  formatDate,
  formatCurrency
};


export function getPdfUrl(path: string): string {
  return resolveStorageUrl(path);
}

export function getProviderName(p?: InvoiceProvider | null): string {
  return p?.company_name ?? p?.name ?? "—";
}

export function getSiteName(s?: InvoiceSite | null): string {
  return s?.nom ?? s?.name ?? "—";
}

/** Retourne le rapport lié (gère les 2 noms de relation possibles) */
export function getReport(inv: Invoice): InvoiceReport | undefined {
  return inv.interventionReport ?? inv.intervention_report;
}

// ─── Service ──────────────────────────────────────────────────────────────────
// Routes : GET invoice/stats · GET invoice · GET invoice/{id} · POST invoice

const BASE = "/provider/invoice";

export const providerInvoiceService = {

  /**
   * GET /provider/invoice
   * Le backend pagine et filtre automatiquement sur provider_id (rôle PROVIDER)
   * Retourne { items, meta } via BaseController::Response
   */
  getInvoices: async (filters?: InvoiceFilters): Promise<InvoiceListResponse> => {
    const res = await axiosInstance.get(BASE, { params: filters });
    const d = res.data?.data ?? res.data;

    // Mapping Laravel pagination
    const items: Invoice[] = d?.items ?? (Array.isArray(d) ? d : []);
    const meta: InvoiceMeta = {
      current_page: d?.meta?.current_page ?? 1,
      last_page: d?.meta?.last_page ?? 1,
      per_page: d?.meta?.per_page ?? 15,
      total: d?.meta?.total ?? 0,
    };
    return { items, meta };
  },

  /**
   * GET /provider/invoice/stats
   * Retourne { total_invoices, total_paid, total_unpaid, total_amount, ... }
   */
  getStats: async (): Promise<InvoiceStats> => {
    const res = await axiosInstance.get(`${BASE}/stats`);
    return res.data?.data ?? res.data;
  },

  /**
   * GET /provider/invoice/{id}
   * Charge avec : interventionReport, quote, provider, site, attachments
   */
  getInvoiceById: async (id: number): Promise<Invoice> => {
    const res = await axiosInstance.get(`${BASE}/${id}`);
    return res.data?.data ?? res.data;
  },

  /**
   * POST /provider/invoice
   * createFromReport() — le backend déduit provider_id depuis InterventionReport
   * Si un devis approuvé existe sur le rapport → montants repris du devis automatiquement
   * Si pas de devis → on envoie amount_ht / tax_amount / amount_ttc manuellement
   * Le champ pdf_file → stocké via pdf_path
   */
  createInvoice: async (payload: CreateInvoicePayload): Promise<Invoice> => {
    const form = new FormData();
    if (payload.report_id) form.append("report_id", String(payload.report_id));
    if ((payload as any).ticket_id) form.append("ticket_id", String((payload as any).ticket_id));
    if (payload.quote_id) form.append("quote_id", String(payload.quote_id));
    if (payload.amount_ht != null) form.append("amount_ht", String(payload.amount_ht));
    if (payload.tax_amount != null) form.append("tax_amount", String(payload.tax_amount));
    if (payload.amount_ttc != null) form.append("amount_ttc", String(payload.amount_ttc));
    if (payload.comment) form.append("comment", payload.comment);
    if (payload.invoice_date) form.append("invoice_date", payload.invoice_date);
    if (payload.due_date) form.append("due_date", payload.due_date);

    if (payload.pdf_file) {
      form.append("pdf_file", payload.pdf_file);
    }
    if (payload.attachments?.length) {
      payload.attachments.forEach(p => form.append("attachments[]", p));
    }

    const res = await axiosInstance.post(BASE, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data?.data ?? res.data;
  },

  updateInvoice: async (id: number, payload: Partial<CreateInvoicePayload>): Promise<Invoice> => {
    const form = new FormData();
    form.append("_method", "PUT");
    if (payload.report_id) form.append("report_id", String(payload.report_id));
    if (payload.amount_ht != null) form.append("amount_ht", String(payload.amount_ht));
    if (payload.tax_amount != null) form.append("tax_amount", String(payload.tax_amount));
    if (payload.amount_ttc != null) form.append("amount_ttc", String(payload.amount_ttc));
    if (payload.comment) form.append("comment", payload.comment);
    if (payload.pdf_file) form.append("pdf_file", payload.pdf_file);

    const res = await axiosInstance.post(`${BASE}/${id}`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data?.data ?? res.data;
  },

  /** Export XLSX — scoping provider_id appliqué côté backend */
  exportXlsx: async (): Promise<void> => {
    const res = await axiosInstance.get(`${BASE}/export`, { responseType: "blob" });
    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement("a");
    a.href = url;
    a.download = `factures_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  },
};