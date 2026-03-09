// ============================================================
// services/planningService.ts
// Calqué sur la vraie réponse API (Postman)
// ============================================================

import api from "../core/axios";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PlanningStatus = "planifie" | "en_cours" | "en_retard" | "realise";

export interface PlanningUser {
  id: number;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
}

export interface PlanningProvider {
  id: number;
  company_name: string;       // ← "SOUDOTEC" (pas user.name)
  city: string;
  is_active: boolean;
  user_id: number;
  user?: PlanningUser;
}

export interface PlanningSite {
  id: number;
  nom: string;                // ← "nom" et non "name" !
  responsable_name: string;
  email: string;
  localisation: string;
  status: string;
}

export interface Planning {
  id: number;
  codification: string;
  date_debut: string;         // "2024-03-18T10:00:00.000000Z"
  date_fin: string;
  description: string | null;
  responsable_name: string;
  responsable_phone: string | null;
  status: PlanningStatus;
  provider_id: number;
  site_id: number;
  created_at: string;
  updated_at: string;
  site?: PlanningSite;
  provider?: PlanningProvider;
}

export interface PlanningStats {
  total: number;
  planifie: number;
  en_cours: number;
  en_retard: number;
  realise: number;
  non_realise: number;
}

export interface PlanningMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface PlanningListResponse {
  items: Planning[];
  meta: PlanningMeta;
}

export interface PlanningFilters {
  site_id?: number;
  provider_id?: number;
  status?: PlanningStatus;
  date_debut?: string;
  date_fin?: string;
  per_page?: number;
  page?: number;
}

export interface CreatePlanningPayload {
  codification: string;
  date_debut: string;
  date_fin: string;
  description?: string;
  responsable_name: string;
  responsable_phone?: string;
  provider_id: number;
  site_id: number;
  status?: PlanningStatus;
}

export type UpdatePlanningPayload = Partial<CreatePlanningPayload>;

// ─── Unwrap Laravel response ──────────────────────────────────────────────────
// Laravel répond : { success, message, data: { items, meta } | Planning | Stats }
function unwrap<T>(response: any): T {
  return response?.data?.data ?? response?.data ?? response;
}

function cleanParams(filters: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== undefined && v !== null && v !== "")
  );
}

// ─── Service Functions ────────────────────────────────────────────────────────

export async function fetchPlannings(
  filters: PlanningFilters = {}
): Promise<PlanningListResponse> {
  const response = await api.get("/admin/planning", { params: cleanParams(filters) });
  return unwrap<PlanningListResponse>(response);
}

export async function fetchPlanningStats(): Promise<PlanningStats> {
  const response = await api.get("/admin/planning/stats");
  return unwrap<PlanningStats>(response);
}

export async function fetchPlanningById(id: number): Promise<Planning> {
  const response = await api.get(`/admin/planning/${id}`);
  return unwrap<Planning>(response);
}

export async function createPlanning(payload: CreatePlanningPayload): Promise<Planning> {
  const response = await api.post("/admin/planning", payload);
  return unwrap<Planning>(response);
}

export async function updatePlanning(id: number, payload: UpdatePlanningPayload): Promise<Planning> {
  const response = await api.put(`/admin/planning/${id}`, payload);
  return unwrap<Planning>(response);
}

export async function deletePlanning(id: number): Promise<void> {
  await api.delete(`/admin/planning/${id}`);
}

// ─── Helpers métier ───────────────────────────────────────────────────────────

export const STATUS_COLORS: Record<PlanningStatus, string> = {
  planifie:  "#000000",
  en_cours:  "#0ea5e9",
  en_retard: "#ef4444",
  realise:   "#22c55e",
};

export const STATUS_BG: Record<PlanningStatus, string> = {
  planifie:  "#f1f5f9",
  en_cours:  "#e0f2fe",
  en_retard: "#fef2f2",
  realise:   "#f0fdf4",
};

export const STATUS_LABELS: Record<PlanningStatus, string> = {
  planifie:  "Planifié",
  en_cours:  "En cours",
  en_retard: "En retard",
  realise:   "Réalisé",
};

/** "2024-03-18T10:00:00.000000Z" → "18/03/2024" */
export function formatDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

/** "2024-03-18T10:00:00.000000Z" → "10:00" */
export function formatTime(iso: string): string {
  if (!iso) return "—";
  const timePart = iso.split("T")[1];
  return timePart ? timePart.slice(0, 5) : "—";
}

/** Nom complet du prestataire depuis l'objet provider */
export function getProviderName(provider?: PlanningProvider): string {
  if (!provider) return "—";
  if (provider.company_name) return provider.company_name;
  if (provider.user) return `${provider.user.first_name} ${provider.user.last_name}`;
  return `Prestataire #${provider.id}`;
}

/** Nom du site — champ "nom" dans l'API */
export function getSiteName(site?: PlanningSite): string {
  if (!site) return "—";
  return site.nom ?? `Site #${site.id}`;
}

/** true si le planning couvre la date donnée (date_debut ≤ date ≤ date_fin) */
export function isPlanningOnDate(planning: Planning, date: Date): boolean {
  const start = new Date(planning.date_debut);
  const end   = new Date(planning.date_fin);
  const d     = new Date(date.toDateString());
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return d >= start && d <= end;
}

/** Groupe les plannings par "YYYY-MM-DD" de leur date_debut */
export function groupPlanningsByDate(plannings: Planning[]): Record<string, Planning[]> {
  return plannings.reduce<Record<string, Planning[]>>((acc, p) => {
    const key = p.date_debut.split("T")[0];
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});
}