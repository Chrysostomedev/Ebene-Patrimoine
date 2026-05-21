// ============================================================
// services/planningService.ts
// ============================================================

import api from "../../core/axios";
import { formatDate as globalFormatDate } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PlanningStatus = "PLANIFIÉ" | "EN_COURS" | "EN_RETARD" | "RÉALISÉ";

export interface PlanningUser {
  id: number;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
}

export interface PlanningProvider {
  id: number;
  company_name: string;
  city: string;
  is_active: boolean;
  user_id: number;
  user?: PlanningUser;
}

export interface PlanningSite {
  id: number;
  nom: string;
  responsable_name: string;
  email: string;
  localisation: string;
  status: string;
}

export interface Planning {
  id: number;
  codification?: string;
  date_debut: string;
  date_fin: string;
  description: string | null;
  responsable_name?: string;
  responsable_phone?: string | null;
  status: PlanningStatus;
  provider_id: number;
  site_id: number;
  created_at: string;
  updated_at: string;
  site?: PlanningSite & { manager?: any };
  provider?: PlanningProvider;
  asset?: any;
  company_asset?: any;
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

// FIX — codification et responsable_name passent en optionnels
// Le back (PlanningServices.php) auto-remplit responsable_name depuis le site
// et codification doit être nullable en base (ou généré via un observer)
export interface CreatePlanningPayload {
  codification?: string;        // optionnel — généré côté back
  date_debut: string;
  // date_fin:           string;
  description?: string;
  responsable_name?: string;        // optionnel — auto-rempli depuis site.responsable_name
  responsable_phone?: string;
  provider_id: number;
  site_id: number;
  company_asset_id?: number;
  status?: PlanningStatus;
}

export type UpdatePlanningPayload = Partial<CreatePlanningPayload>;

// ─── Unwrap Laravel response ──────────────────────────────────────────────────
function unwrap<T>(response: any): T {
  return response?.data?.data ?? response?.data ?? response;
}

function cleanParams(filters: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== undefined)
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
  // FIX — on retire les clés undefined avant d'envoyer
  const clean = cleanParams(payload as Record<string, any>);
  const response = await api.post("/admin/planning", clean);
  return unwrap<Planning>(response);
}

export async function updatePlanning(id: number, payload: UpdatePlanningPayload): Promise<Planning> {
  const clean = cleanParams(payload as Record<string, any>);
  const response = await api.put(`/admin/planning/${id}`, clean);
  return unwrap<Planning>(response);
}

export async function deletePlanning(id: number): Promise<void> {
  await api.delete(`/admin/planning/${id}`);
}

// ─── Helpers métier ───────────────────────────────────────────────────────────

export const STATUS_COLORS: Record<PlanningStatus, string> = {
  PLANIFIÉ: "#64748b", // Gris (slate-500)
  EN_COURS: "#0ea5e9", // Sky (Bleu clair)
  EN_RETARD: "#ef4444", // Rouge
  RÉALISÉ: "#22c55e", // Vert
};

export const STATUS_BG: Record<PlanningStatus, string> = {
  PLANIFIÉ: "#f1f5f9", // slate-100
  EN_COURS: "#e0f2fe",
  EN_RETARD: "#fef2f2",
  RÉALISÉ: "#f0fdf4",
};

export const STATUS_LABELS: Record<PlanningStatus, string> = {
  PLANIFIÉ: "Planifié",
  EN_COURS: "En cours",
  EN_RETARD: "En retard",
  RÉALISÉ: "Réalisé",
};

export function formatDate(iso: string): string {
  if (!iso) return "—";
  return globalFormatDate(iso);
}

export function formatTime(iso: string): string {
  if (!iso) return "—";
  // Utiliser globalFormatDate avec options pour n'avoir que l'heure
  return globalFormatDate(iso, { hour: "2-digit", minute: "2-digit" });
}

export function getProviderName(provider?: PlanningProvider): string {
  if (!provider) return "—";
  if (provider.company_name) return provider.company_name;
  if (provider.user) return `${provider.user.first_name} ${provider.user.last_name}`;
  return `Prestataire #${provider.id}`;
}

export function getSiteName(site?: PlanningSite): string {
  if (!site) return "—";
  return site.nom ?? `Site ${site.id}`;
}

export function isPlanningOnDate(planning: Planning, date: Date): boolean {
  if (!planning.date_debut) return false;
  
  const start = new Date(planning.date_debut);
  // Si date_fin est absente, on prend date_debut pour que l'event soit visible au moins ce jour-là
  const end = new Date(planning.date_fin || planning.date_debut);
  
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0);
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);
  
  return d >= s && d <= e;
}

export function groupPlanningsByDate(plannings: Planning[]): Record<string, Planning[]> {
  return plannings.reduce<Record<string, Planning[]>>((acc, p) => {
    const key = p.date_debut.split("T")[0];
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});
}