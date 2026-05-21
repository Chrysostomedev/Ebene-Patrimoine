import axiosInstance from "../../core/axios";
import { resolveStorageUrl } from "../../lib/url";
import { formatCurrency, formatDate } from "@/lib/utils";

// ─── Types miroir exact du backend Laravel ────────────────────────────────────

export interface QuoteTicket {
  id: number;
  subject?: string;
  title?: string;
  reference?: string;
  status?: string;
  type?: string;
}

export interface QuoteListResponse {
  items: Quote[];
  meta: {
    current_page: number;
    last_page:    number;
    total:        number;
    per_page:     number;
  };
}

export interface QuoteItem {
  id?: number;
  designation: string;
  quantity: number;
  unit_price: number;
  total_price?: number;
}

export interface QuoteHistory {
  id: number;
  action: string;
  from_status?: string;
  to_status?: string;
  comment?: string;
  reason?: string;
  performed_by_name?: string;
  created_at: string;
}

export interface Quote {
  id: number;
  reference: string;
  // Statuts bruts BD : draft | en attente | approuvé | rejeté | en révision
  status: string;
  amount_ht: number;
  tax_rate: number;
  tax_amount: number;
  amount_ttc: number;
  description?: string;
  rejection_reason?: string;
  items?: QuoteItem[];
  ticket?: QuoteTicket;
  ticket_id?: number;
  provider_id?: number;
  site?: { id: number; nom?: string; name?: string };
  site_id?: number;
  pdf_paths?: string[];
  attachments?: { id: number; file_path?: string; url: string; file_type?: string }[];
  history?: QuoteHistory[];
  created_at?: string;
  updated_at?: string;
  approved_at?: string;
  rejected_at?: string;
  revision_reason?: string;
  revision_requested_at?: string;
}

export interface QuoteStats {
  total: number;
  pending: number;   // "en attente"
  approved: number;  // "approuvé"
  rejected: number;  // "rejeté"
  revision: number;  // "en révision"
  total_approved_amount: number;
  total_pending_amount: number;
}

export interface QuoteFilters {
  status?: string;
  page?: number;
  per_page?: number;
  search?: string; // Ajouté
  date_debut?: string;  // YYYY-MM-DD — filtre date création >=
  date_fin?: string;    // YYYY-MM-DD — filtre date création <=
  site_id?: number;
  ticket_id?: number;
}

export interface CreateQuotePayload {
  ticket_id: number;
  description?: string;
  tax_rate?: number;
  items: QuoteItem[];
  attachments?: File[];
  amount_ht?: number; // Optionnel si on passe les items
}

// ─── Statuts — valeurs EXACTES de la BD ──────────────────────────────────────

export const ALL_STATUSES = ["draft", "en attente", "approuvé", "rejeté", "en révision"];

export const STATUS_LABELS: Record<string, string> = {
  "draft": "Brouillon",
  "DRAFT": "Brouillon",
  "en attente": "En attente",
  "EN ATTENTE": "En attente",
  "pending": "En attente",
  "PENDING": "En attente",
  "approuvé": "Approuvé",
  "APPROUVÉ": "Approuvé",
  "approved": "Approuvé",
  "APPROVED": "Approuvé",
  "validated": "Validé",
  "VALIDATED": "Validé",
  "rejeté": "Rejeté",
  "REJETÉ": "Rejeté",
  "rejected": "Rejeté",
  "REJECTED": "Rejeté",
  "rejété": "Rejeté",
  "REJÉTÉ": "Rejeté",
  "en révision": "En révision",
  "EN RÉVISION": "En révision",
  "revision": "En révision",
  "REVISION": "En révision",
};

export const STATUS_STYLES: Record<string, string> = {
  "draft": "border-slate-300  bg-slate-100  text-slate-600",
  "DRAFT": "border-slate-300  bg-slate-100  text-slate-600",
  "en attente": "border-amber-300  bg-amber-50   text-amber-700",
  "EN ATTENTE": "border-amber-300  bg-amber-50   text-amber-700",
  "pending": "border-amber-300  bg-amber-100  text-amber-700",
  "PENDING": "border-amber-300  bg-amber-100  text-amber-700",
  "approuvé": "border-green-400  bg-green-50   text-green-700",
  "APPROUVÉ": "border-green-400  bg-green-50   text-green-700",
  "approved": "border-green-400  bg-green-50   text-green-700",
  "APPROVED": "border-green-400  bg-green-50   text-green-700",
  "validated": "border-green-400  bg-green-100  text-green-700",
  "VALIDATED": "border-green-400  bg-green-100  text-green-700",
  "rejeté": "border-red-400    bg-red-50     text-red-600",
  "REJETÉ": "border-red-400    bg-red-50     text-red-600",
  "rejected": "border-red-400    bg-red-50     text-red-600",
  "REJECTED": "border-red-400    bg-red-50     text-red-600",
  "rejété": "border-red-400    bg-red-50     text-red-600",
  "REJÉTÉ": "border-red-400    bg-red-50     text-red-600",
  "en révision": "border-blue-400   bg-blue-50    text-blue-700",
  "EN RÉVISION": "border-blue-400   bg-blue-50    text-blue-700",
  "revision": "border-blue-400   bg-blue-50    text-blue-700",
  "REVISION": "border-blue-400   bg-blue-50    text-blue-700",
};

export const STATUS_DOT: Record<string, string> = {
  "draft": "#94a3b8",
  "DRAFT": "#94a3b8",
  "en attente": "#f59e0b",
  "EN ATTENTE": "#f59e0b",
  "pending": "#f59e0b",
  "PENDING": "#f59e0b",
  "approuvé": "#22c55e",
  "APPROUVÉ": "#22c55e",
  "approved": "#22c55e",
  "APPROVED": "#22c55e",
  "validated": "#22c55e",
  "VALIDATED": "#22c55e",
  "rejeté": "#ef4444",
  "REJETÉ": "#ef4444",
  "rejected": "#ef4444",
  "REJECTED": "#ef4444",
  "rejété": "#ef4444",
  "REJÉTÉ": "#ef4444",
  "en révision": "#3b82f6",
  "EN RÉVISION": "#3b82f6",
  "revision": "#3b82f6",
  "REVISION": "#3b82f6",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export { formatCurrency, formatDate };


export function getPdfUrl(path: string): string {
  return resolveStorageUrl(path);
}

// ─── Service ──────────────────────────────────────────────────────────────────

const BASE = "/provider/quote";

export const providerQuoteService = {

  /**
   * GET /provider/quote
   * Le backend filtre automatiquement sur le provider_id authentifié
   * Retourne un tableau direct OU une réponse paginée
   */
  getQuotes: async (filters?: QuoteFilters): Promise<QuoteListResponse> => {
    const res = await axiosInstance.get(BASE, { params: filters });
    const payload = res.data?.data ?? res.data;
    const items: Quote[] = payload?.items ?? payload?.data ?? (Array.isArray(payload) ? payload : []);
    const meta = payload?.meta ?? {
      current_page: payload?.current_page ?? 1,
      last_page:    payload?.last_page    ?? 1,
      total:        payload?.total        ?? items.length,
      per_page:     payload?.per_page     ?? 15,
    };
    return { items, meta };
  },

  getStats: async (): Promise<QuoteStats> => {
    const res = await axiosInstance.get(`${BASE}/stats`);
    return res.data?.data ?? res.data;
  },

  getQuoteById: async (id: number): Promise<Quote> => {
    const res = await axiosInstance.get(`${BASE}/${id}`);
    return res.data?.data ?? res.data;
  },

  /** POST avec FormData pour upload PDF optionnel */
  createQuote: async (payload: CreateQuotePayload): Promise<Quote> => {
    const form = new FormData();
    form.append("ticket_id", String(payload.ticket_id));
    if (payload.description) form.append("description", payload.description);
    form.append("tax_rate", String(payload.tax_rate ?? 18));

    if (payload.items) {
      payload.items.forEach((item, i) => {
        form.append(`items[${i}][designation]`, item.designation);
        form.append(`items[${i}][quantity]`, String(item.quantity));
        form.append(`items[${i}][unit_price]`, String(item.unit_price));
      });
    }

    if (payload.attachments) {
      const attData = payload.attachments as any;
      const files = Array.isArray(attData) ? attData : (attData.files || []);
      files.forEach((file: File, i: number) => {
        form.append(`attachments[${i}]`, file);
      });
    }

    const res = await axiosInstance.post(BASE, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data?.data ?? res.data;
  },

  updateQuote: async (id: number, payload: CreateQuotePayload): Promise<Quote> => {
    const form = new FormData();
    // Use _method=PUT for Laravel with FormData
    form.append("_method", "PUT");
    form.append("ticket_id", String(payload.ticket_id));
    if (payload.description) form.append("description", payload.description);
    form.append("tax_rate", String(payload.tax_rate ?? 18));

    if (payload.items) {
      payload.items.forEach((item, i) => {
        form.append(`items[${i}][designation]`, item.designation);
        form.append(`items[${i}][quantity]`, String(item.quantity));
        form.append(`items[${i}][unit_price]`, String(item.unit_price));
      });
    }

    if (payload.attachments) {
      const attData = payload.attachments as any;
      if (attData.files) {
        attData.files.forEach((file: File, i: number) => form.append(`attachments[${i}]`, file));
      }
      if (attData.existingIds) {
        attData.existingIds.forEach((id: any) => form.append("existing_attachments[]", String(id)));
      }
      if (Array.isArray(payload.attachments)) {
        payload.attachments.forEach((file, i) => form.append(`attachments[${i}]`, file));
      }
    }

    const res = await axiosInstance.post(`${BASE}/${id}`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data?.data ?? res.data;
  },

  exportXlsx: async (): Promise<void> => {
    const res = await axiosInstance.get(`${BASE}/export`, { responseType: "blob" });
    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement("a");
    a.href = url;
    a.download = `devis_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  },
};