// services/report.service.ts
import axiosInstance from "../../core/axios";
import { resolveStorageUrl } from "../../lib/url";

// ═══════════════════════════════════════════════════════════════════════════
// INTERFACES — Calquées sur le modèle Laravel InterventionReport
// ═══════════════════════════════════════════════════════════════════════════

export interface ReportAttachment {
  id: number;
  file_path: string;                              // Chemin relatif storage
  file_type: "document" | "photo";                // Type de pièce jointe
  file_size?: number;                             // Taille en octets
  mime_type?: string;                             // application/pdf, image/jpeg...
  created_at?: string;
}

export interface ReportTicket {
  id: number;
  reference?: string;                             // REF-2025-0001
  subject?: string;
  title?: string;
  description?: string;
  type?: "curatif" | "preventif";
  status?: string;
  priority?: string;
}

export interface ReportProvider {
  id: number;
  company_name?: string;
  name?: string;
  email?: string;
  phone?: string;
}

export interface ReportSite {
  id: number;
  nom?: string;
  name?: string;
  address?: string;
  city?: string;
}

export interface ReportValidator {
  id: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  role?: string;
}

export interface ReportHistory {
  id: number;
  report_id: number;
  action: "created" | "submitted" | "validated" | "rejected";
  performed_by: number;
  performed_by_name?: string;
  rating?: number | null;
  comment?: string | null;
  created_at: string;
}

export interface InterventionReport {
  id: number;
  ticket_id: number;
  provider_id: number;
  site_id: number;

  // Contenu du rapport
  description?: string;
  intervention_type?: "curatif" | "preventif";

  // Dates d'intervention
  start_date?: string;                            // Début intervention (ISO)
  end_date?: string;                              // Fin intervention (ISO)

  // Statut validation
  status?: "pending" | "validated" | "rejected" | "submitted";

  // Validation (gestionnaire de site)
  rating?: number | null;                         // Note de 1 à 5 étoiles
  manager_comment?: string | null;                // Commentaire du gestionnaire
  validated_by?: number | null;                   // ID du validateur
  validated_at?: string | null;                   // Date de validation

  // Rejet
  rejection_reason?: string | null;
  rejected_at?: string | null;

  // Traçabilité
  created_by?: number | null;
  created_from?: "admin" | "super-admin" | "provider";
  updated_by?: number | null;

  // Timestamps
  created_at?: string;
  updated_at?: string;

  // Relations eager-loaded
  ticket?: ReportTicket | null;
  provider?: ReportProvider | null;
  site?: ReportSite | null;
  attachments?: ReportAttachment[];               // Pièces jointes (photos + docs)
  validator?: ReportValidator | null;
  history?: ReportHistory[];                      // Historique des actions
  asset_results?: any[];                          // Résultats détaillés par patrimoine

  // Lien vers facture générée (si existe)
  invoice?: {
    id: number;
    reference: string;
    amount_ttc: number;
    payment_status: string;
  } | null;
}

export interface ReportStats {
  total_reports: number;
  validated_reports: number;
  pending_reports: number;
  rejected_reports: number;
  average_rating: number;                         // Note moyenne (0-5)
  reports_by_type: Array<{
    intervention_type: "curatif" | "preventif";
    count: number;
  }>;
  reports_by_status: Array<{
    status: "pending" | "validated" | "rejected";
    count: number;
  }>;
}

// ═══════════════════════════════════════════════════════════════════════════
// PAYLOADS — Validation côté Laravel (InterventionReportRequest)
// ═══════════════════════════════════════════════════════════════════════════

export interface CreateReportPayload {
  ticket_id: number;
  description?: string;
  intervention_type?: "curatif" | "preventif";
  start_date?: string;                            // Format : YYYY-MM-DD HH:mm:ss
  end_date?: string;
  attachments?: File[];                           // Photos + PDF
  created_by?: number;
  created_from?: "admin" | "super-admin";
}

export interface UpdateReportPayload {
  description?: string;
  intervention_type?: "curatif" | "preventif";
  start_date?: string;
  end_date?: string;
  attachments?: File[];                           // Nouvelles pièces jointes
  updated_by?: number;
}

export interface ValidateReportPayload {
  result: "RAS" | "ANOMALIE";                  // Obligatoire : Résultat de l'intervention
  rating?: number | null;                         // 1 à 5 étoiles (null = pas de note)
  comment?: string | null;                        // Commentaire du gestionnaire
}

export interface RejectReportPayload {
  reason: string;                                 // Motif obligatoire (min 10 caractères)
}

// ═══════════════════════════════════════════════════════════════════════════
// SERVICE REPORT — Toutes les routes Laravel
// ═══════════════════════════════════════════════════════════════════════════

export const ReportService = {

  /**
   * GET /admin/intervention-report
   * Liste tous les rapports d'intervention avec relations :
   * - ticket (ticket lié)
   * - provider (prestataire)
   * - site (site d'intervention)
   * - attachments (photos + documents)
   * - validator (gestionnaire ayant validé)
   * - history (historique des actions)
   * - invoice (facture générée si existe)
   * 
   * Triés par date décroissante (created_at DESC)
   */
  /**
   * GET /admin/intervention-report
   * Filtres supportés : intervention_type, status, site_id, provider_id,
   * planning_id, ticket_id, result, date_debut, date_fin, per_page
   */
  async getReports(params?: {
    intervention_type?: string;
    status?: string;
    site_id?: number;
    provider_id?: number;
    planning_id?: number;
    ticket_id?: number;
    result?: string;
    date_debut?: string;
    date_fin?: string;
  }): Promise<{ items: InterventionReport[]; meta?: any; stats?: any }> {
    let url = "/admin/intervention-report";
    const type = params?.intervention_type || (params as any)?.type;
    if (type === "curatif") url += "/curatif";
    else if (type === "preventif") url += "/preventif";

    const cleanParams = { ...params };
    if ((cleanParams as any).type) delete (cleanParams as any).type;

    const res = await axiosInstance.get(url, { params: cleanParams });
    const d = res.data?.data ?? res.data;

    let items: InterventionReport[] = [];
    if (Array.isArray(d?.items)) items = d.items;
    else if (Array.isArray(d?.data)) items = d.data;
    else if (Array.isArray(d)) items = d;

    return {
      items,
      meta: d?.meta ?? res.data?.meta ?? {
        current_page: d?.current_page ?? 1,
        last_page: d?.last_page || 1,
        total: d?.total ?? items.length
      },
      stats: d?.stats ?? res.data?.stats
    };
  },

  /**
   * ── NOUVEAU : RAPPORT D'ENTRETIEN GLOBAL RELATIF À UN PLANNING ──
   * GET /admin/intervention-report/preventif/global
   * Récupère la liste paginée et filtrable des rapports préventifs globaux par site.
   */
  async getReportsGlobal(params?: any): Promise<{ items: InterventionReport[]; meta?: any; stats?: any }> {
    const res = await axiosInstance.get("/admin/intervention-report/preventif/global", { params });
    const d = res.data?.data ?? res.data;

    let items: InterventionReport[] = [];
    if (Array.isArray(d?.items)) items = d.items;
    else if (Array.isArray(d?.data)) items = d.data;
    else if (Array.isArray(d)) items = d;

    return {
      items,
      meta: d?.meta ?? res.data?.meta ?? {
        current_page: d?.current_page ?? 1,
        last_page: d?.last_page || 1,
        total: d?.total ?? items.length
      },
      stats: d?.stats ?? res.data?.stats
    };
  },

  /**
   * ── NOUVEAU : RAPPORT PRÉVENTIF INDIVIDUEL D'ANOMALIE (TICKET) ──
   * GET /admin/intervention-report/preventif/ticket
   * Récupère la liste paginée et filtrable des rapports de tickets d'anomalies préventives.
   */
  async getReportsTicket(params?: any): Promise<{ items: InterventionReport[]; meta?: any; stats?: any }> {
    const res = await axiosInstance.get("/admin/intervention-report/preventif/ticket", { params });
    const d = res.data?.data ?? res.data;

    let items: InterventionReport[] = [];
    if (Array.isArray(d?.items)) items = d.items;
    else if (Array.isArray(d?.data)) items = d.data;
    else if (Array.isArray(d)) items = d;

    return {
      items,
      meta: d?.meta ?? res.data?.meta ?? {
        current_page: d?.current_page ?? 1,
        last_page: d?.last_page || 1,
        total: d?.total ?? items.length
      },
      stats: d?.stats ?? res.data?.stats
    };
  },

  /**
   * GET /admin/intervention-report/:id
   * Détail complet d'un rapport avec toutes les relations
   */
  async getReport(id: number): Promise<InterventionReport> {
    const res = await axiosInstance.get(`/admin/intervention-report/${id}`);
    return res.data.data;
  },

  /**
   * GET /admin/intervention-report/stats
   * KPIs globaux :
   * - total_reports : nombre total de rapports
   * - validated_reports : rapports validés
   * - pending_reports : rapports en attente
   * - rejected_reports : rapports rejetés
   * - average_rating : note moyenne (0-5)
   * - reports_by_type : répartition curatif/préventif
   * - reports_by_status : répartition par statut
   */
  async getStats(params?: {
    intervention_type?: string;
    status?: string;
    site_id?: number;
    provider_id?: number;
    date_debut?: string;
    date_fin?: string;
  }): Promise<ReportStats> {
    const res = await axiosInstance.get("/admin/intervention-report/stats", { params });
    return res.data.data;
  },

  /**
   * POST /admin/intervention-report
   * Créer un rapport d'intervention
   * Supporte upload multi-fichiers (photos + PDF) en multipart/form-data
   * 
   * IMPORTANT : Bloqué pour les prestataires (403)
   * Seuls admin/super-admin peuvent créer des rapports manuellement
   * 
   * VALIDATION :
   * - ticket_id : requis, doit exister
   * - intervention_type : curatif | preventif
   * - start_date < end_date
   * - attachments : max 10 fichiers, 10 Mo chacun
   */
  async createReport(payload: CreateReportPayload): Promise<InterventionReport> {
    const formData = new FormData();
    formData.append("ticket_id", String(payload.ticket_id));

    if (payload.description) formData.append("description", payload.description);
    if (payload.intervention_type) formData.append("intervention_type", payload.intervention_type);
    if (payload.start_date) formData.append("start_date", payload.start_date);
    if (payload.end_date) formData.append("end_date", payload.end_date);
    if (payload.created_by) formData.append("created_by", String(payload.created_by));
    if (payload.created_from) formData.append("created_from", payload.created_from);

    // Upload multiple files
    if (payload.attachments?.length) {
      payload.attachments.forEach((file) => {
        formData.append("attachments[]", file);
      });
    }

    const res = await axiosInstance.post("/admin/intervention-report", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.data;
  },

  /**
   * PUT /admin/intervention-report/:id
   * Modifier un rapport existant
   * 
   * RÈGLES MÉTIER :
   * - Interdit si status = "validated" (rapport validé = immuable)
   * - Autorisé si status = "pending" ou "rejected"
   * - Les nouvelles pièces jointes s'ajoutent aux existantes (pas de remplacement)
   */
  async updateReport(id: number, payload: UpdateReportPayload): Promise<InterventionReport> {
    const formData = new FormData();

    if (payload.description) formData.append("description", payload.description);
    if (payload.intervention_type) formData.append("intervention_type", payload.intervention_type);
    if (payload.start_date) formData.append("start_date", payload.start_date);
    if (payload.end_date) formData.append("end_date", payload.end_date);
    if (payload.updated_by) formData.append("updated_by", String(payload.updated_by));

    if (payload.attachments?.length) {
      payload.attachments.forEach((file) => {
        formData.append("attachments[]", file);
      });
    }

    const res = await axiosInstance.put(`/admin/intervention-report/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.data;
  },

  /**
   * DELETE /admin/intervention-report/:id
   * Supprimer un rapport d'intervention
   * 
   * RÈGLES :
   * - Interdit si une facture est liée (invoice_id NOT NULL)
   * - Cascade : suppression des pièces jointes + historique
   * - Fichiers physiques supprimés du storage
   */
  async deleteReport(id: number): Promise<void> {
    await axiosInstance.delete(`/admin/intervention-report/${id}`);
  },

  /**
   * POST /admin/intervention-report/:id/validate
   * Valider un rapport d'intervention avec notation
   * 
   * WORKFLOW :
   * - Status → "validated"
   * - validated_at = now()
   * - validated_by = user connecté (gestionnaire de site)
   * - rating (1-5) et comment stockés
   * - Notification prestataire
   * - Historique tracé (ReportHistory)
   * 
   * EFFETS MÉTIER :
   * - Si rating >= 4 : Score prestataire augmenté
   * - Si rapport RAS : Ticket fermé automatiquement
   * - Si anomalie détectée : Nouveau ticket curatif créé
   * - Déclenchement possible génération facture
   */
  /**
   * POST /admin/intervention-report/:id/validate
   * Fonctionne pour curatif ET préventif (le back détecte automatiquement)
   * result: "RAS" | "anomalie" (insensible à la casse côté back)
   * Si result = "anomalie" → ticket curatif généré automatiquement
   */
  async validateReport(id: number, payload: ValidateReportPayload): Promise<InterventionReport> {
    const res = await axiosInstance.post(`/admin/intervention-report/${id}/validate`, {
      result: payload.result,
      rating: payload.rating ?? null,
      comment: payload.comment || "Validé",
    });
    return res.data?.data ?? res.data;
  },

  /**
   * POST /admin/intervention-report/:id/reject
   * Rejeter un rapport avec motif obligatoire
   * 
   * WORKFLOW :
   * - Status → "rejected"
   * - rejection_reason stocké
   * - rejected_at = now()
   * - Prestataire notifié
   * - Peut corriger et re-soumettre
   */
  async rejectReport(ticketId: number, payload: RejectReportPayload): Promise<InterventionReport> {
    const res = await axiosInstance.post(`/admin/ticket/${ticketId}/reject-report`, {
      reason: payload.reason,
    });
    return res.data.data;
  },

  /**
   * Récupère tous les rapports liés à un ticket donné
   * Utile pour afficher l'historique complet des interventions d'un ticket
   */
  async getReportsByTicket(ticketId: number): Promise<InterventionReport[]> {
    const res = await axiosInstance.get("/admin/intervention-report", {
      params: { ticket_id: ticketId },
    });
    return res.data.data;
  },

  /**
   * Récupère tous les rapports d'un prestataire spécifique
   * Utile pour l'évaluation de performance
   */
  async getReportsByProvider(providerId: number): Promise<InterventionReport[]> {
    const res = await axiosInstance.get("/admin/intervention-report", {
      params: { provider_id: providerId },
    });
    return res.data.data;
  },

  /**
   * Construit l'URL publique d'une pièce jointe.
   */
  getAttachmentUrl(filePath: string): string {
    return resolveStorageUrl(filePath);
  },

  /**
   * Supprime une pièce jointe spécifique d'un rapport
   * Utile pour la gestion fine des fichiers
   */
  async deleteAttachment(reportId: number, attachmentId: number): Promise<void> {
    await axiosInstance.delete(`/admin/intervention-report/${reportId}/attachment/${attachmentId}`);
  },
};