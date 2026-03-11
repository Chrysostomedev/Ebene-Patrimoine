import axiosInstance from "@core/axios";

// ─── Types miroir exact du backend Laravel ────────────────────────────────────

export interface QuoteTicket {
  id: number;
  subject?: string;
  title?: string;
  reference?: string;
  status?: string;
  type?: string;
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
  history?: QuoteHistory[];
  created_at?: string;
  updated_at?: string;
  approved_at?: string;
  rejected_at?: string;
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
}

export interface CreateQuotePayload {
  ticket_id: number;
  description?: string;
  tax_rate?: number;
  items: QuoteItem[];
  pdf_file?: File;
}

// ─── Statuts — valeurs EXACTES de la BD ──────────────────────────────────────

export const ALL_STATUSES = ["draft", "en attente", "approuvé", "rejeté", "en révision"];

export const STATUS_LABELS: Record<string, string> = {
  "draft":       "Brouillon",
  "en attente":  "En attente",
  "approuvé":    "Approuvé",
  "rejeté":      "Rejeté",
  "en révision": "En révision",
};

export const STATUS_STYLES: Record<string, string> = {
  "draft":       "border-slate-300  bg-slate-100  text-slate-600",
  "en attente":  "border-amber-300  bg-amber-50   text-amber-700",
  "approuvé":    "border-green-400  bg-green-50   text-green-700",
  "rejeté":      "border-red-400    bg-red-50     text-red-600",
  "en révision": "border-blue-400   bg-blue-50    text-blue-700",
};

export const STATUS_DOT: Record<string, string> = {
  "draft":       "#94a3b8",
  "en attente":  "#f59e0b",
  "approuvé":    "#22c55e",
  "rejeté":      "#ef4444",
  "en révision": "#3b82f6",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatCurrency(amount?: number | null): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "decimal", minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount) + " FCFA";
}

export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

export function getPdfUrl(path: string): string {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? "").replace("/api/V1", "").replace("/api", "");
  return `${base}/storage/${path}`;
}

// ─── Service ──────────────────────────────────────────────────────────────────

const BASE = "/provider/quote";

export const providerQuoteService = {

  /**
   * GET /provider/quote
   * Le backend filtre automatiquement sur le provider_id authentifié
   * Retourne un tableau direct OU une réponse paginée
   */
  getQuotes: async (filters?: QuoteFilters): Promise<Quote[]> => {
    const res = await axiosInstance.get(BASE, { params: filters });
    const d   = res.data?.data ?? res.data;
    // Gestion tableau direct ou paginé
    if (Array.isArray(d)) return d;
    if (Array.isArray(d?.data)) return d.data;
    if (Array.isArray(d?.items)) return d.items;
    return [];
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

    payload.items.forEach((item, i) => {
      form.append(`items[${i}][designation]`, item.designation);
      form.append(`items[${i}][quantity]`,    String(item.quantity));
      form.append(`items[${i}][unit_price]`,  String(item.unit_price));
    });

    if (payload.pdf_file) form.append("quote_pdf", payload.pdf_file);

    const res = await axiosInstance.post(BASE, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data?.data ?? res.data;
  },

  exportXlsx: async (): Promise<void> => {
    const res = await axiosInstance.get(`${BASE}/export`, { responseType: "blob" });
    const url  = URL.createObjectURL(new Blob([res.data]));
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `devis_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  },
};