import axiosInstance from "../../core/axios";
import { resolveStorageUrl } from "../../lib/url";
import { formatDate } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReportTicket {
  id: number;
  subject?: string;
  type?: string;
  status?: string;
  reference?: string;
}

export interface ReportProvider {
  id: number;
  company_name?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
}

export interface ReportSite {
  id: number;
  nom?: string;
  name?: string;
}

export interface ReportAttachment {
  id: number;
  file_path: string;
  // "document" si PDF, "photo" si image — logique du service Laravel
  file_type: "document" | "photo" | string;
}

export interface ReportValidator {
  id: number;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

export interface InterventionReport {
  id: number;
  // Statuts BD : pending | validated | submitted
  status: "pending" | "validated" | "submitted" | string;
  // Types BD : curatif | preventif
  intervention_type?: "curatif" | "preventif" | string;
  // Résultat : RAS | anomalie
  result?: "RAS" | "anomalie" | string;
  description?: string;
  findings?: string;
  action_taken?: string;
  start_date?: string;
  end_date?: string;
  ticket_id?: number;
  planning_id?: number;
  provider_id?: number;
  site_id?: number;
  validated_by?: number;
  validated_at?: string;
  rating?: number | null;
  manager_comment?: string;
  created_at?: string;
  updated_at?: string;
  // Relations
  ticket?: ReportTicket;
  planning?: { id: number; codification?: string; date_debut?: string };
  provider?: ReportProvider;
  site?: ReportSite;
  attachments?: ReportAttachment[];
  validator?: ReportValidator;
}

export interface ReportStats {
  total_reports: number;
  validated_reports: number;
  pending_reports: number;
  average_rating: number | string;
  reports_by_type?: { intervention_type: string; count: number }[];
}

// Payload création — conforme à InterventionReportRequest + store()
export interface CreateReportPayload {
  ticket_id?: number;          // optionnel si rapport préventif depuis planning
  planning_id?: number;        // pour les rapports préventifs liés à un planning
  intervention_type?: "curatif" | "preventif"; // auto-résolu par le back selon ticket_id/planning_id
  result?: "RAS" | "anomalie"; // valeurs exactes attendues par le back (nullable)
  findings: string;            // requis par le back
  action_taken?: string;       // nullable côté back
  description?: string;
  start_date?: string;
  end_date?: string;
  anomaly_detected?: boolean;
  anomaly_description?: string;
  attachments?: File[];
  asset_results?: any[];
}

export interface UpdateReportPayload extends Partial<Omit<CreateReportPayload, "ticket_id" | "planning_id">> { }

// ─── Constantes UI ────────────────────────────────────────────────────────────

export const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  submitted: "Soumis",
  validated: "Validé",
  rejected: "Rejeté",
  planifié: "Planifié",
  en_cours: "En cours",
  rapporté: "Rapporté",
  validé: "Validé",
  clos: "Clôturé",
  rejeté: "Rejeté",
  anomalie: "Anomalie",
};

export const STATUS_STYLES: Record<string, string> = {
  validated: "border-emerald-200 bg-emerald-50 text-emerald-700",
  validé: "border-emerald-200 bg-emerald-50 text-emerald-700",
  submitted: "border-amber-200 bg-amber-50 text-amber-700",
  pending: "border-slate-200 bg-slate-50 text-slate-500",
  rejected: "border-red-200 bg-red-50 text-red-700",
  rejeté: "border-red-200 bg-red-50 text-red-700",
  planifié: "border-blue-200 bg-blue-50 text-blue-700",
  en_cours: "border-amber-200 bg-amber-50 text-amber-700",
  rapporté: "border-violet-200 bg-violet-50 text-violet-700",
  clos: "border-slate-200 bg-slate-50 text-slate-500",
  anomalie: "border-orange-200 bg-orange-50 text-orange-700",
};

export const STATUS_DOT: Record<string, string> = {
  pending: "#94a3b8",
  submitted: "#f59e0b",
  validated: "#10b981",
  validé: "#10b981",
  rejected: "#ef4444",
  rejeté: "#ef4444",
  planifié: "#3b82f6",
  en_cours: "#f59e0b",
  rapporté: "#8b5cf6",
  clos: "#94a3b8",
  anomalie: "#f97316",
};

export const TYPE_LABELS: Record<string, string> = {
  curatif: "Curatif",
  preventif: "Préventif",
};

export const TYPE_STYLES: Record<string, string> = {
  curatif: "bg-orange-50 text-orange-600 border border-orange-200",
  preventif: "bg-blue-50   text-blue-600   border border-blue-200",
};

export const RESULT_LABELS: Record<string, string> = {
  RAS: "RAS",
  anomalie: "Anomalie détectée",
};

export const RESULT_STYLES: Record<string, string> = {
  RAS: "bg-green-50   text-green-600   border border-green-200",
  anomalie: "bg-red-50     text-red-600     border border-red-200",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export { formatDate };


export const getAttachmentUrl = (path: string): string => resolveStorageUrl(path);

export const getProviderName = (p?: ReportProvider | null) =>
  p?.company_name ?? p?.name ?? "—";

export const getSiteName = (s?: ReportSite | null) =>
  s?.nom ?? s?.name ?? "—";

/**
 * Résout le nom complet d'un acteur (First + Last)
 */
export const getActorName = (user?: any | null) => {
  if (!user) return null;
  const fname = user.first_name || "";
  const lname = user.last_name || "";
  const fullName = `${fname} ${lname}`.trim();
  if (fullName) return fullName;
  return user.name || user.company_name || "—";
};

/** Un rapport non-validé peut être modifié par le prestataire */
export const isEditable = (r: InterventionReport) => r.status !== "validated";

// ─── Service ──────────────────────────────────────────────────────────────────

const BASE = "/provider/intervention-report";

export const providerReportService = {

  /**
   * GET /provider/intervention-report
   * Filtres supportés par le back : intervention_type, status, site_id,
   * planning_id, ticket_id, result, date_debut, date_fin, per_page
   */
  getReports: async (params?: {
    intervention_type?: string;
    status?: string;
    site_id?: number;
    planning_id?: number;
    ticket_id?: number;
    result?: string;
    date_debut?: string;
    date_fin?: string;
    per_page?: number;
    page?: number;
  }): Promise<{ items: InterventionReport[]; meta?: any; stats?: any }> => {
    let url = BASE;
    const type = params?.intervention_type || (params as any)?.type;
    
    // Nettoyage des paramètres redondants
    const cleanParams = { ...params };
    if (type === "curatif") url += "/curatif";
    else if (type === "preventif") url += "/preventif";
    
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
   * ── NOUVEAU : RAPPORT D'ENTRETIEN GLOBAL RELATIF À UN PLANNING POUR LE PRESTATAIRE ──
   * GET /provider/intervention-report/preventif/global
   */
  getReportsGlobal: async (params?: any): Promise<{ items: InterventionReport[]; meta?: any; stats?: any }> => {
    const res = await axiosInstance.get(`${BASE}/preventif/global`, { params });
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
   * ── NOUVEAU : RAPPORT PRÉVENTIF INDIVIDUEL D'ANOMALIE (TICKET) POUR LE PRESTATAIRE ──
   * GET /provider/intervention-report/preventif/ticket
   */
  getReportsTicket: async (params?: any): Promise<{ items: InterventionReport[]; meta?: any; stats?: any }> => {
    const res = await axiosInstance.get(`${BASE}/preventif/ticket`, { params });
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
   * GET /provider/intervention-report/stats
   * Stats filtrées sur provider_id authentifié
   */
  getStats: async (params?: {
    intervention_type?: string;
    status?: string;
    date_debut?: string;
    date_fin?: string;
  }): Promise<ReportStats> => {
    const cleanParams = { ...params };
    if ((cleanParams as any).type) delete (cleanParams as any).type;
    
    const res = await axiosInstance.get(`${BASE}/stats`, { params: cleanParams });
    const d = res.data?.data ?? res.data;
    return {
      total_reports: d?.total_reports ?? d?.total ?? 0,
      validated_reports: d?.validated_reports ?? d?.validated ?? 0,
      pending_reports: d?.pending_reports ?? d?.pending ?? 0,
      average_rating: d?.average_rating ?? d?.rating ?? 0,
      reports_by_type: d?.reports_by_type ?? [],
    };
  },

  /**
   * GET /provider/intervention-report/{id}
   * Relations chargées : ticket, provider, site, attachments, validator
   * 403 si le rapport n'appartient pas au provider auth
   */
  getReportById: async (id: number): Promise<InterventionReport> => {
    const res = await axiosInstance.get(`${BASE}/${id}`);
    return res.data?.data ?? res.data;
  },

  /**
   * POST /provider/intervention-report
   * Logique métier section 6.1 :
   * - ticket_id obligatoire (ticket EN_COURS / IN_TREATMENT)
   * - provider_id auto-rempli par le backend depuis auth()->provider->id
   * - attachments[] → stockés dans reports/attachments/
   *   file_type = "document" si PDF, "photo" si image
   * - Après création : notif gestionnaire + admins
   */
  createReport: async (payload: CreateReportPayload): Promise<InterventionReport> => {
    // Flux curatif : ticket_id obligatoire, on démarre l'intervention si besoin
    if (payload.ticket_id) {
      try {
        const ticketRes = await axiosInstance.get(`/provider/ticket/${payload.ticket_id}`);
        const ticket = ticketRes.data?.data ?? ticketRes.data;
        const status = (ticket?.status ?? "").toUpperCase();
        if (status === "ASSIGNÉ" || status === "ASSIGNE") {
          await axiosInstance.post(`/provider/ticket/${payload.ticket_id}/start`);
        }
      } catch { /* non bloquant */ }
    }
    // Flux préventif depuis planning : pas de .start(), planning_id envoyé à la place

    const form = new FormData();
    if (payload.ticket_id) form.append("ticket_id", String(payload.ticket_id));
    if (payload.planning_id) form.append("planning_id", String(payload.planning_id));
    if (payload.intervention_type) form.append("intervention_type", payload.intervention_type);
    if (payload.result) form.append("result", payload.result);
    if (payload.start_date) form.append("start_date", payload.start_date);
    form.append("findings", payload.findings ?? "");
    if (payload.action_taken) form.append("action_taken", payload.action_taken);
    form.append("anomaly_detected", String(payload.anomaly_detected ?? false));
    if (payload.end_date) form.append("end_date", payload.end_date);
    if (payload.description) form.append("description", payload.description);
    if (payload.anomaly_description) form.append("anomaly_description", payload.anomaly_description);

    if (payload.asset_results) {
      payload.asset_results.forEach((res: any, i: number) => {
        form.append(`asset_results[${i}][asset_id]`, String(res.asset_id));
        form.append(`asset_results[${i}][status]`, res.status);
        if (res.comment) form.append(`asset_results[${i}][comment]`, res.comment);
      });
    }

    if (payload.attachments) {
      const attData = payload.attachments as any;
      const files = Array.isArray(attData) ? attData : (attData.files || []);
      files.forEach((f: any) => form.append("attachments[]", f));
    }

    const res = await axiosInstance.post(BASE, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data?.data ?? res.data;
  },

  /**
   * PUT /provider/intervention-report/{id}
   * 422 si rapport déjà validé
   * 403 si provider_id ≠ auth
   * Nouveaux attachments ajoutés (sans supprimer les anciens — comportement service Laravel)
   */
  updateReport: async (id: number, payload: UpdateReportPayload): Promise<InterventionReport> => {
    const form = new FormData();
    form.append("_method", "PUT");
    if (payload.intervention_type !== undefined)
      form.append("intervention_type", payload.intervention_type);
    if (payload.result !== undefined)
      form.append("result", payload.result);
    if (payload.start_date) form.append("start_date", payload.start_date);
    if (payload.end_date) form.append("end_date", payload.end_date);
    if (payload.action_taken) form.append("action_taken", payload.action_taken);
    if (payload.findings) form.append("findings", payload.findings);
    if (payload.anomaly_detected !== undefined)
      form.append("anomaly_detected", String(payload.anomaly_detected));

    if (payload.asset_results) {
      payload.asset_results.forEach((res: any, i: number) => {
        form.append(`asset_results[${i}][asset_id]`, String(res.asset_id));
        form.append(`asset_results[${i}][status]`, res.status);
        if (res.comment) form.append(`asset_results[${i}][comment]`, res.comment);
      });
    }

    if (payload.attachments) {
      const attData = payload.attachments as any;
      if (attData.files) {
        attData.files.forEach((f: File) => form.append("attachments[]", f));
      }
      if (attData.existingIds) {
        attData.existingIds.forEach((id: any) => form.append("existing_attachments[]", String(id)));
      }
      if (Array.isArray(payload.attachments)) {
        payload.attachments.forEach(f => form.append("attachments[]", f));
      }
    }

    const res = await axiosInstance.post(`${BASE}/${id}`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data?.data ?? res.data;
  },

  /** Export XLSX (scoping provider_id côté backend) */
  exportXlsx: async (): Promise<void> => {
    const res = await axiosInstance.get(`${BASE}/export`, { responseType: "blob" });
    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement("a");
    a.href = url;
    a.download = `rapports_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  },
};