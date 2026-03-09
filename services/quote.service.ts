// services/quote.service.ts
import axiosInstance from "../core/axios";

// ═══════════════════════════════════════════════════════════════════════════
// INTERFACES — Calquées sur le modèle Laravel Quote
// ═══════════════════════════════════════════════════════════════════════════

export interface QuoteItem {
  id?: number;
  designation: string;     // Libellé de la prestation
  quantity: number;        // Quantité
  unit_price: number;      // Prix unitaire HT
  total_price?: number;    // Auto-calculé côté Laravel : quantity × unit_price
}

export interface QuoteTicket {
  id: number;
  reference?: string;      // REF-2025-0001
  title?: string;
  subject?: string;
  description?: string;
  type?: string;
  status?: string;
}

export interface QuoteProvider {
  id: number;
  name: string;
  company_name?: string;
  email?: string;
  phone?: string;
}

export interface QuoteSite {
  id: number;
  nom?: string;
  name?: string;
  address?: string;
}

export interface QuoteHistory {
  id: number;
  quote_id: number;
  action: "created" | "submitted" | "approved" | "rejected" | "revision_requested" | "updated";
  performed_by: number;
  performed_by_name?: string;
  reason?: string | null;
  created_at: string;
}

export interface Quote {
  id: number;
  reference: string;                              // Q-2025-0001
  ticket_id: number;
  provider_id: number;
  site_id: number;
  description?: string | null;
  
  // Workflow statuses
  status: "pending" | "approved" | "rejected" | "revision";
  
  // Approbation
  approved_by?: number | null;
  approved_at?: string | null;
  
  // Rejet
  rejection_reason?: string | null;
  rejected_at?: string | null;
  
  // Révision
  revision_requested_at?: string | null;
  revision_reason?: string | null;

  // Calculs automatiques (via QuoteService::calculateTotals() Laravel)
  amount_ht?: number;           // Total HT
  tax_rate?: number;            // 18% (fixe Canal+ CI)
  tax_amount?: number;          // Montant TVA
  amount_ttc?: number;          // Total TTC

  // Traçabilité
  created_by?: number | null;   // Admin/Super-admin qui a créé
  created_from?: "admin" | "super-admin" | "provider";
  updated_by?: number | null;

  // Timestamps
  created_at?: string;
  updated_at?: string;

  // Relations eager-loaded (avec with() Laravel)
  items?: QuoteItem[];
  ticket?: QuoteTicket | null;
  provider?: QuoteProvider | null;
  site?: QuoteSite | null;
  history?: QuoteHistory[];     // Historique des actions
  
  // PDF paths si disponibles
  pdf_paths?: string[];
}

export interface QuoteStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  revision: number;
  total_approved_amount: number;
  total_pending_amount: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// PAYLOADS — Validation côté Laravel (QuoteRequest)
// ═══════════════════════════════════════════════════════════════════════════

export interface CreateQuotePayload {
  ticket_id: number;
  provider_id: number;
  site_id: number;
  description?: string;
  items: Array<{
    designation: string;
    quantity: number;
    unit_price: number;
  }>;
  created_by?: number;          // ID de l'utilisateur connecté (admin/super-admin)
  created_from?: "admin" | "super-admin";
}

export interface UpdateQuotePayload {
  description?: string;
  items?: Array<{
    id?: number;                // Si présent = update, sinon = create
    designation: string;
    quantity: number;
    unit_price: number;
  }>;
  updated_by?: number;
}

export interface ImportQuotePayload {
  file: File;                   // Excel/CSV contenant les devis
  ticket_id?: number;           // Optionnel : rattacher à un ticket spécifique
}

// ═══════════════════════════════════════════════════════════════════════════
// SERVICE QUOTE — Toutes les routes Laravel exposées
// ═══════════════════════════════════════════════════════════════════════════

export const QuoteService = {

  /**
   * GET /admin/quote
   * Liste tous les devis avec relations (ticket, provider, site, items, history)
   * Retourne un tableau trié par date décroissante côté Laravel (latest())
   */
  async getQuotes(): Promise<Quote[]> {
    const res = await axiosInstance.get("/admin/quote");
    return res.data.data;
  },

  /**
   * GET /admin/quote/:id
   * Détail d'un devis avec :
   * - items (lignes du devis)
   * - ticket (ticket lié)
   * - provider (prestataire)
   * - site (site d'intervention)
   * - history (historique des actions : création, approbation, rejet, révision)
   */
  async getQuote(id: number): Promise<Quote> {
    const res = await axiosInstance.get(`/admin/quote/${id}`);
    return res.data.data;
  },

  /**
   * GET /admin/quote/stats
   * KPIs globaux :
   * - total : nombre total de devis
   * - pending : devis en attente de validation
   * - approved : devis approuvés
   * - rejected : devis rejetés
   * - revision : devis en révision
   * - total_approved_amount : montant total des devis approuvés (TTC)
   * - total_pending_amount : montant total des devis en attente (TTC)
   */
  async getStats(): Promise<QuoteStats> {
    const res = await axiosInstance.get("/admin/quote/stats");
    return res.data.data;
  },

  /**
   * POST /admin/quote
   * Créer un nouveau devis (réservé admin/super-admin)
   * La référence (Q-2025-XXXX) et les totaux sont auto-générés côté Laravel
   * 
   * IMPORTANT : Cette route est bloquée pour les prestataires (403)
   * Seuls les admins peuvent créer des devis manuellement
   */
  async createQuote(payload: CreateQuotePayload): Promise<Quote> {
    const res = await axiosInstance.post("/admin/quote", payload);
    return res.data.data;
  },

  /**
   * PUT /admin/quote/:id
   * Modifier un devis existant (description + items)
   * 
   * RÈGLES MÉTIER :
   * - Interdit si status = "approved" (devis validé = immuable)
   * - Autorisé si status = "pending" ou "revision"
   */
  async updateQuote(id: number, payload: UpdateQuotePayload): Promise<Quote> {
    const res = await axiosInstance.put(`/admin/quote/${id}`, payload);
    return res.data.data;
  },

  /**
   * POST /admin/quote/import
   * Import massif de devis depuis Excel/CSV
   * Format attendu :
   * - ticket_id, provider_id, site_id, description
   * - Lignes items : designation | quantity | unit_price
   * 
   * Retourne un rapport d'import :
   * - success_count : nombre de devis créés
   * - errors : tableau des erreurs (ligne, raison)
   */
  async importQuotes(payload: ImportQuotePayload): Promise<{ success_count: number; errors: any[] }> {
    const formData = new FormData();
    formData.append("file", payload.file);
    if (payload.ticket_id) {
      formData.append("ticket_id", String(payload.ticket_id));
    }
    const res = await axiosInstance.post("/admin/quote/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.data;
  },

  /**
   * POST /admin/quote/:id/approve
   * Valider un devis (passage status → "approved")
   * 
   * EFFETS :
   * - approved_at = now()
   * - approved_by = user connecté
   * - Notification envoyée au prestataire
   * - Historique tracé (QuoteHistory)
   */
  async approveQuote(id: number): Promise<Quote> {
    const res = await axiosInstance.post(`/admin/quote/${id}/approve`);
    return res.data.data;
  },

  /**
   * POST /admin/quote/:id/reject
   * Rejeter un devis avec motif obligatoire
   * 
   * RÈGLES :
   * - reason obligatoire (min 10 caractères)
   * - Status → "rejected"
   * - Notification prestataire
   * - Peut être re-soumis par le prestataire (nouveau devis)
   */
  async rejectQuote(id: number, reason: string): Promise<Quote> {
    const res = await axiosInstance.post(`/admin/quote/${id}/reject`, { reason });
    return res.data.data;
  },

  /**
   * POST /admin/quote/:id/revision
   * Demander une révision au prestataire
   * 
   * WORKFLOW :
   * - Status → "revision"
   * - Raison facultative (ex: "Préciser le détail des pièces")
   * - Prestataire notifié
   * - Peut modifier et re-soumettre
   */
  async requestRevision(id: number, reason?: string): Promise<Quote> {
    const res = await axiosInstance.post(`/admin/quote/${id}/revision`, { reason });
    return res.data.data;
  },

  /**
   * DELETE /super-admin/quote/:id
   * Suppression définitive d'un devis
   * 
   * RÉSERVÉ SUPER-ADMIN UNIQUEMENT
   * Cascade :
   * - Suppression des items (QuoteItem)
   * - Suppression de l'historique (QuoteHistory)
   * - Mise à jour du ticket (si status = DEVIS_EN_ATTENTE)
   */
  async deleteQuote(id: number): Promise<void> {
    await axiosInstance.delete(`/super-admin/quote/${id}`);
  },

  /**
   * Récupère tous les devis liés à un ticket donné
   * Utile pour afficher l'historique complet des devis d'un ticket
   */
  async getQuotesByTicket(ticketId: number): Promise<Quote[]> {
    const res = await axiosInstance.get("/admin/quote", {
      params: { ticket_id: ticketId },
    });
    return res.data.data;
  },

  /**
   * Construit l'URL publique d'un PDF de devis
   * pdf_path = "quotes/Q-2025-0001.pdf" → APP_URL/storage/quotes/Q-2025-0001.pdf
   */
  getPdfUrl(pdfPath: string): string {
    const base = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ?? "";
    return `${base}/storage/${pdfPath}`;
  },
};