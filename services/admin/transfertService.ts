/**
 * services/admin/transfertService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Service de transferts inter-sites — branché sur les routes Laravel :
 *
 *   GET    /admin/asset-transfers           → liste paginée + filtres
 *   GET    /admin/asset-transfers/stats     → KPIs dashboard
 *   GET    /admin/asset-transfers/export    → téléchargement Excel
 *   GET    /admin/asset-transfers/{id}      → détail d'un transfert
 *   POST   /admin/asset/{id}/transfer       → initier un nouveau transfert
 *   PUT    /admin/asset-transfers/{id}/status → changer statut (effectué | annulé)
 *   POST   /admin/asset-transfers/import    → import masse (fichier ou JSON)
 *
 * Même routes pour super-admin et admin (préfixe géré par AuthService._prefix()).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import axiosInstance from "../../core/axios";

// ─── Types alignés sur le modèle Laravel HistoryTransferSiteAssets ────────────

export type TransferStatus = "en_cours" | "effectué" | "annulé";

export interface TransferSite {
  id: number;
  nom: string;
}

export interface TransferAsset {
  id: number;
  designation: string;
  codification: string;
  type?: string; // type ou catégorie de l'actif
}

export interface TransferActor {
  id: number;
  first_name?: string;
  last_name?: string;
  email?: string;
}

/** Un transfert tel que retourné par Laravel (avec relations chargées) */
export interface TransferRecord {
  id: number;
  company_asset_id: number;
  from_site_id: number;
  to_site_id: number;
  transferred_by: number;
  transferred_by_type: string;
  transfer_date: string;       // ISO 8601
  reason: string | null;
  status: TransferStatus;
  created_at: string;
  updated_at: string;

  // Relations eager-loaded
  asset?: TransferAsset;
  fromSite?: TransferSite;
  toSite?: TransferSite;
  actor?: TransferActor;
}

/** KPIs retournés par /stats */
export interface TransferStats {
  total_transfers: number;
  completed_transfers: number;
  pending_transfers: number;
  involved_sites_count: number;
}

/** Réponse paginée Laravel */
export interface PaginatedTransfers {
  data: TransferRecord[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

/** Filtres acceptés par index() */
export interface TransferFilters {
  status?: TransferStatus | "";
  company_asset_id?: number;
  search?: string;
  per_page?: number;
  page?: number;
}

/** Payload pour initier un transfert → POST /admin/asset/{id}/transfer */
export interface InitiateTransferPayload {
  company_asset_id: number;
  to_site_id: number;
  reason?: string;
}

/** Payload pour mettre à jour le statut */
export interface UpdateStatusPayload {
  status: "effectué" | "annulé";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Construit le nom complet de l'acteur depuis ses champs */
export const getActorName = (actor?: TransferActor): string => {
  if (!actor) return "N/A";
  const full = `${actor.first_name ?? ""} ${actor.last_name ?? ""}`.trim();
  return full || actor.email || "N/A";
};

/** Formatte une date ISO en français */
export const formatTransferDate = (iso: string, withTime = false): string => {
  const d = new Date(iso);
  const date = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  if (!withTime) return date;
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${date} à ${time}`;
};

// ─── Service ─────────────────────────────────────────────────────────────────
export const transfertService = {

  // ── Liste paginée ────────────────────────────────────────────────────────
  /**
   * GET /admin/asset-transfers?status=...&page=...&per_page=...
   * Retourne une liste paginée de transferts avec assets, sites et acteurs.
   */
  getAll: async (filters: TransferFilters = {}): Promise<PaginatedTransfers> => {
    // Nettoyage : on n'envoie pas les clés vides
    const params: Record<string, string | number> = {};
    if (filters.status)            params.status            = filters.status;
    if (filters.company_asset_id)  params.company_asset_id  = filters.company_asset_id;
    if (filters.search)            params.search            = filters.search;
    if (filters.per_page)          params.per_page          = filters.per_page;
    if (filters.page)              params.page              = filters.page;

    const response = await axiosInstance.get("/admin/asset-transfers", { params });
    // Laravel retourne { success, data: { data, current_page, ... }, message }
    return response.data?.data as PaginatedTransfers;
  },

  // ── KPIs ─────────────────────────────────────────────────────────────────
  /**
   * GET /admin/asset-transfers/stats
   * Retourne les compteurs pour le dashboard.
   */
  getStats: async (): Promise<TransferStats> => {
    const response = await axiosInstance.get("/admin/asset-transfers/stats");
    return response.data?.data as TransferStats;
  },

  // ── Détail ────────────────────────────────────────────────────────────────
  /**
   * GET /admin/asset-transfers/{id}
   * Retourne un transfert complet avec toutes ses relations.
   */
  getById: async (id: number): Promise<TransferRecord> => {
    const response = await axiosInstance.get(`/admin/asset-transfers/${id}`);
    return response.data?.data as TransferRecord;
  },

  // ── Initier ───────────────────────────────────────────────────────────────
  /**
   * POST /admin/asset/{assetId}/transfer
   * Crée un nouveau transfert en statut "en_cours".
   * Le back valide : company_asset_id, to_site_id, reason (nullable).
   */
  initiate: async (assetId: number, payload: Omit<InitiateTransferPayload, "company_asset_id">): Promise<TransferRecord> => {
    const response = await axiosInstance.post(`/admin/asset/${assetId}/transfer`, {
      company_asset_id: assetId,
      to_site_id: payload.to_site_id,
      reason: payload.reason ?? null,
    });
    return response.data?.data as TransferRecord;
  },

  // ── Changer le statut ─────────────────────────────────────────────────────
  /**
   * PUT /admin/asset-transfers/{id}/status
   * Passe le statut à "effectué" (déplace l'actif) ou "annulé".
   * Le back valide : status|required|in:effectué,annulé
   */
  updateStatus: async (id: number, status: "effectué" | "annulé"): Promise<TransferRecord> => {
    const response = await axiosInstance.put(`/admin/asset-transfers/${id}/status`, { status });
    return response.data?.data as TransferRecord;
  },

  // ── Export Excel ──────────────────────────────────────────────────────────
  /**
   * GET /admin/asset-transfers/export?status=...
   * Laravel retourne un fichier Excel — on le télécharge via blob.
   */
  export: async (filters: Pick<TransferFilters, "status"> = {}): Promise<void> => {
    const params: Record<string, string> = {};
    if (filters.status) params.status = filters.status;

    const response = await axiosInstance.get("/admin/asset-transfers/export", {
      params,
      responseType: "blob",
    });

    // Déclenchement du téléchargement côté navigateur
    const url      = window.URL.createObjectURL(new Blob([response.data]));
    const link     = document.createElement("a");
    const filename = `transferts_${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.href      = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // ── Import ────────────────────────────────────────────────────────────────
  /**
   * POST /admin/asset-transfers/import
   * Accepte soit un fichier (FormData) soit un tableau JSON.
   */
  importFile: async (file: File): Promise<unknown> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await axiosInstance.post("/admin/asset-transfers/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data?.data;
  },

  importJson: async (transfers: InitiateTransferPayload[]): Promise<unknown> => {
    const response = await axiosInstance.post("/admin/asset-transfers/import", { transfers });
    return response.data?.data;
  },
};