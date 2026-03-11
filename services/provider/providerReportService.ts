import axiosInstance from "@core/axios";

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
  // Statuts BD : pending | validated
  status: "pending" | "validated" | string;
  // Types BD : curatif | preventif
  intervention_type?: "curatif" | "preventif" | string;
  // Résultat (étape 4 logique métier) : ras | anomalie | resolu
  result?: "ras" | "anomalie" | "resolu" | string;
  description?: string;
  findings?: string;
  start_date?: string;
  end_date?: string;
  ticket_id?: number;
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
  ticket_id: number;
  intervention_type: "curatif" | "preventif";
  result: "ras" | "anomalie" | "resolu";
  description?: string;
  findings?: string;
  start_date: string;
  end_date?: string;
  // attachments[] → file_type auto-détecté (PDF→document, image→photo)
  attachments?: File[];
}

export interface UpdateReportPayload extends Partial<Omit<CreateReportPayload, "ticket_id">> {}

// ─── Constantes UI ────────────────────────────────────────────────────────────

export const STATUS_LABELS: Record<string, string> = {
  pending:   "En attente",
  validated: "Validé",
};

export const STATUS_STYLES: Record<string, string> = {
  validated: "border-black bg-black text-white",
  pending:   "border-slate-300 bg-slate-100 text-slate-700",
};

export const STATUS_DOT: Record<string, string> = {
  pending:   "#f59e0b",
  validated: "#22c55e",
};

export const TYPE_LABELS: Record<string, string> = {
  curatif:   "Curatif",
  preventif: "Préventif",
};

export const TYPE_STYLES: Record<string, string> = {
  curatif:   "bg-orange-50 text-orange-600 border border-orange-200",
  preventif: "bg-blue-50   text-blue-600   border border-blue-200",
};

export const RESULT_LABELS: Record<string, string> = {
  ras:      "RAS",
  anomalie: "Anomalie détectée",
  resolu:   "Résolu",
};

export const RESULT_STYLES: Record<string, string> = {
  ras:      "bg-green-50   text-green-600   border border-green-200",
  anomalie: "bg-red-50     text-red-600     border border-red-200",
  resolu:   "bg-emerald-50 text-emerald-600 border border-emerald-200",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const formatDate = (iso?: string | null): string => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
};

export const formatDateTime = (iso?: string | null): string => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

export const getAttachmentUrl = (path: string): string => {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? "")
    .replace("/api/V1", "").replace("/api", "");
  return `${base}/storage/${path}`;
};

export const getProviderName = (p?: ReportProvider | null) =>
  p?.company_name ?? p?.name ?? "—";

export const getSiteName = (s?: ReportSite | null) =>
  s?.nom ?? s?.name ?? "—";

/** Un rapport non-validé peut être modifié par le prestataire */
export const isEditable = (r: InterventionReport) => r.status !== "validated";

// ─── Service ──────────────────────────────────────────────────────────────────

const BASE = "/provider/intervention-report";

export const providerReportService = {

  /**
   * GET /provider/intervention-report
   * Backend filtre automatiquement sur provider_id (rôle PROVIDER)
   * Retourne un tableau (index() renvoie get() sans pagination)
   */
  getReports: async (): Promise<InterventionReport[]> => {
    const res = await axiosInstance.get(BASE);
    const d   = res.data?.data ?? res.data;
    if (Array.isArray(d))       return d;
    if (Array.isArray(d?.data)) return d.data;
    return [];
  },

  /**
   * GET /provider/intervention-report/stats
   * Stats filtrées sur provider_id authentifié
   */
  getStats: async (): Promise<ReportStats> => {
    const res = await axiosInstance.get(`${BASE}/stats`);
    return res.data?.data ?? res.data;
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
    const form = new FormData();
    form.append("ticket_id",         String(payload.ticket_id));
    form.append("intervention_type", payload.intervention_type);
    form.append("result",            payload.result);
    form.append("start_date",        payload.start_date);
    if (payload.end_date)    form.append("end_date",     payload.end_date);
    if (payload.description) form.append("description", payload.description);
    if (payload.findings)    form.append("findings",    payload.findings);

    if (payload.attachments?.length) {
      payload.attachments.forEach(f => form.append("attachments[]", f));
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
    if (payload.intervention_type !== undefined)
      form.append("intervention_type", payload.intervention_type);
    if (payload.result !== undefined)
      form.append("result", payload.result);
    if (payload.start_date)  form.append("start_date",  payload.start_date);
    if (payload.end_date)    form.append("end_date",    payload.end_date);
    if (payload.description) form.append("description", payload.description);
    if (payload.findings)    form.append("findings",    payload.findings);

    if (payload.attachments?.length) {
      payload.attachments.forEach(f => form.append("attachments[]", f));
    }

    const res = await axiosInstance.put(`${BASE}/${id}`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data?.data ?? res.data;
  },

  /** Export XLSX (scoping provider_id côté backend) */
  exportXlsx: async (): Promise<void> => {
    const res = await axiosInstance.get(`${BASE}/export`, { responseType: "blob" });
    const url = URL.createObjectURL(new Blob([res.data]));
    const a   = document.createElement("a");
    a.href     = url;
    a.download = `rapports_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  },
};