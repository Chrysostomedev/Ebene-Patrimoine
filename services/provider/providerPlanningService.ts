import axiosInstance from "../core/axios";

// ─── Types — miroir exact du backend Laravel ──────────────────────────────────

export interface PlanningProvider {
  id: number;
  company_name?: string;
  user?: { name?: string; first_name?: string; last_name?: string };
}

export interface PlanningSite {
  id: number;
  nom?: string;
  name?: string;
}

export interface Planning {
  id: number;
  codification: string;
  status: "planifie" | "en_cours" | "en_retard" | "realise" | string;
  date_debut: string;    // ISO datetime
  date_fin: string;      // ISO datetime
  description?: string;
  responsable_name: string;
  responsable_phone?: string;
  site?: PlanningSite;
  provider?: PlanningProvider;
  provider_id?: number;
  site_id?: number;
}

export interface PlanningStats {
  total:        number;
  planifie:     number;
  en_cours:     number;
  en_retard:    number;
  realise:      number;
  non_realise:  number;
}

export interface PlanningFilters {
  status?:     string;
  date_debut?: string;
  date_fin?:   string;
  site_id?:    number;
  page?:       number;
  per_page?:   number;
}

export interface PlanningListResponse {
  items: Planning[];
  meta: {
    current_page: number;
    last_page:    number;
    per_page:     number;
    total:        number;
  };
}

// ─── Helpers UI ───────────────────────────────────────────────────────────────

export const STATUS_COLORS: Record<string, string> = {
  planifie:   "#3b82f6",
  en_cours:   "#f97316",
  en_retard:  "#ef4444",
  realise:    "#22c55e",
};

export const STATUS_LABELS: Record<string, string> = {
  planifie:   "Planifié",
  en_cours:   "En cours",
  en_retard:  "En retard",
  realise:    "Réalisé",
};

export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

export function formatTime(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit", minute: "2-digit",
  });
}

export function getSiteName(site?: PlanningSite | null): string {
  return site?.nom ?? site?.name ?? "—";
}

export function getProviderName(provider?: PlanningProvider | null): string {
  if (!provider) return "—";
  if (provider.company_name) return provider.company_name;
  const u = provider.user;
  if (!u) return "—";
  return (u.name ?? `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim()) || "—";
}

/** Vérifie si un planning couvre un jour donné */
export function isPlanningOnDate(planning: Planning, date: Date): boolean {
  const start = new Date(planning.date_debut);
  const end   = new Date(planning.date_fin);
  const d     = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const s     = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const e     = new Date(end.getFullYear(),   end.getMonth(),   end.getDate());
  return d >= s && d <= e;
}

// ─── Service ─────────────────────────────────────────────────────────────────
// Le backend applique automatiquement provider_id = auth provider (PROVIDER role)

const BASE = "/provider/planning";

export const providerPlanningService = {

  /**
   * GET /provider/planning
   * Laravel filtre automatiquement sur provider_id de l'auth
   */
  getPlannings: async (filters?: PlanningFilters): Promise<PlanningListResponse> => {
    const response = await axiosInstance.get(BASE, { params: filters });
    const data = response.data?.data ?? response.data;
    return {
      items: data?.items ?? data?.data ?? (Array.isArray(data) ? data : []),
      meta:  data?.meta  ?? { current_page: 1, last_page: 1, per_page: 50, total: 0 },
    };
  },

  /**
   * GET /provider/planning/stats
   * Stats filtrées automatiquement par provider_id côté Laravel
   */
  getStats: async (): Promise<PlanningStats> => {
    const response = await axiosInstance.get(`${BASE}/stats`);
    return response.data?.data ?? response.data;
  },

  /**
   * GET /provider/planning/:id
   */
  getPlanningById: async (id: number): Promise<Planning> => {
    const response = await axiosInstance.get(`${BASE}/${id}`);
    return response.data?.data ?? response.data;
  },
};