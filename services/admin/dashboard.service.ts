// services/admin/dashboard.service.ts
import axios from "../../core/axios";
import { TicketService, TicketStats } from "./ticket.service";

// ─────────────────────────────────────────────────────────────────────────────
// INTERFACES BRUTES — structure exacte retournée par Laravel
// ─────────────────────────────────────────────────────────────────────────────

/** Résultat de calculateTrend() Laravel : { indicator, value, delta, trend } */
export interface TrendKpi {
  indicator: string;
  value:     number;
  delta?:    number;
  trend?:    "up" | "down" | "stable";
}

/** Réponse brute de GET /dashboard/global */
interface GlobalDashboardRaw {
  kpis: {
    total_tickets:    TrendKpi;
    cout_maintenance: TrendKpi;
    sites_actifs:     { indicator: string; value: number };
  };
  tickets_stats_par_statut:      Record<string, number>;       // clés MAJUSCULES coté Laravel
  tendance_annuelle_maintenance: { annee: number; mois: number; total: number }[];
  sites_les_plus_frequentes:     { site_id: number; nom: string; total_tickets: number }[];
  tickets_recents: {
    id:         number;
    subject?:   string;
    status:     string;
    type:       string;
    planned_at: string;
    site?:    { id: number; nom: string };
    service?: { id: number; name: string };
  }[];
}

/** Réponse brute de GET /dashboard/administration */
interface AdminDashboardRaw {
  kpis: {
    sites_actifs:           { indicator: string; value: number };
    cout_total_maintenance: TrendKpi;
    total_equipements:      { indicator: string; value: number };
    tickets_en_cours:       TrendKpi;
  };
  flux_tickets: {
    "signalé": number;    // = repartition_par_statut['SIGNALÉ'] côté Laravel
    "clôturé": number;    // = repartition_par_statut['CLOS']
  };
  evolution_patrimoine:      { annee: number; mois: number; total: number }[];
  sites_les_plus_frequentes: { site_id: number; nom: string; total_tickets: number }[];
  actifs_les_plus_critiques: any[];
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERFACES NORMALISÉES — ce que les composants React consomment
// ─────────────────────────────────────────────────────────────────────────────

export interface GlobalDashboard {
  // Tickets
  nombre_total_tickets:       number;
  nombre_tickets_traites:     number;
  nombre_tickets_non_traites: number;

  // Sites
  nombre_sites_actifs:   number;
  nombre_sites_inactifs: number;

  // Coûts
  cout_moyen_par_site:    number;
  cout_total_maintenance: number;
  cout_moyen_par_ticket:  number;
  cout_global_tickets:    number;

  // Délais — données fines uniquement dans /ticket/stats
  delais_moyen_traitement_heures:   number | null;
  delais_minimal_traitement_heures: number | null;
  delais_maximal_traitement_heures: number | null;

  // Graphiques
  tendance_annuelle_maintenance:   { annee: number; mois: number; total: number }[];
  sites_les_plus_frequentes:       { site_id: number; nom: string; total_tickets: number }[];
  repartition_par_statut:          Record<string, number>;
  tickets_en_cours_par_patrimoine: TicketStats["tickets_en_cours_par_patrimoine"];

  // Table
  tickets_recents: GlobalDashboardRaw["tickets_recents"];
}

export interface AdminDashboard {
  // Sites
  nombre_total_sites_actifs:   number;
  nombre_total_sites_inactifs: number;
  cout_moyen_par_sites:        number;
  cout_total_maintenance:      number;

  // Patrimoine
  nombre_total_equipements:  number;
  nombre_total_prestataires: number;
  nombre_total_factures:     string | number;

  // Tickets
  nombre_tickets_en_attente: number;
  nombre_tickets_en_cours:   number;
  nombre_tickets_clotures:   number;

  // Délais
  delais_moyen_traitement_heures:   number | null;
  delais_minimal_traitement_heures: number | null;
  delais_maximal_traitement_heures: number | null;

  // Graphiques
  evolution_patrimoine:            { annee: number; mois: number; total: number }[];
  sites_les_plus_frequentes:       { site_id: number; nom: string; total_tickets: number }[];
  actifs_les_plus_critiques:       any[];
  tickets_en_cours_par_patrimoine: TicketStats["tickets_en_cours_par_patrimoine"];
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — lecture robuste d'un statut quelle que soit la casse
// Laravel renvoie "SIGNALÉ", "CLOS" etc. dans repartition_par_statut
// mais les tickets eux-mêmes ont "signalez", "clos" dans leur champ status.
// On teste toutes les variantes connues pour éviter tout zéro silencieux.
// ─────────────────────────────────────────────────────────────────────────────
function getStatut(map: Record<string, number>, ...keys: string[]): number {
  for (const key of keys) {
    if (map[key] !== undefined) return map[key];
  }
  return 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAPPERS
// ─────────────────────────────────────────────────────────────────────────────

function mapGlobalDashboard(
  raw:         GlobalDashboardRaw,
  ticketStats: TicketStats,
): GlobalDashboard {
  const coutTotal   = raw.kpis?.cout_maintenance?.value ?? 0;
  const sitesActifs = raw.kpis?.sites_actifs?.value     ?? 0;

  // Source prioritaire pour les totaux : ticketStats (endpoint dédié, plus fiable)
  const totalTickets = ticketStats.nombre_total_tickets ?? raw.kpis?.total_tickets?.value ?? 0;
  const traites      = ticketStats.nombre_total_tickets_clotures ?? 0;

  // repartition_par_statut depuis ticketStats — clés MAJUSCULES
  const rep = ticketStats.repartition_par_statut ?? {};

  return {
    // Tickets
    nombre_total_tickets:       totalTickets,
    nombre_tickets_traites:     traites,
    nombre_tickets_non_traites: Math.max(0, totalTickets - traites),

    // Sites
    nombre_sites_actifs:   sitesActifs,
    nombre_sites_inactifs: 0, // non exposé par ce endpoint

    // Coûts
    cout_total_maintenance: ticketStats.cout_global_tickets ?? coutTotal,
    cout_moyen_par_site:    sitesActifs > 0
      ? Math.round((ticketStats.cout_global_tickets ?? coutTotal) / sitesActifs)
      : 0,
    cout_moyen_par_ticket: ticketStats.cout_moyen_par_ticket ?? 0,
    cout_global_tickets:   ticketStats.cout_global_tickets   ?? 0,

    // Délais — seulement dans ticketStats
    delais_moyen_traitement_heures:   ticketStats.delais_moyen_traitement_heures   ?? null,
    delais_minimal_traitement_heures: ticketStats.delais_minimal_traitement_heures ?? null,
    delais_maximal_traitement_heures: ticketStats.delais_maximal_traitement_heures ?? null,

    // Graphiques
    tendance_annuelle_maintenance:   raw.tendance_annuelle_maintenance ?? [],
    sites_les_plus_frequentes:       raw.sites_les_plus_frequentes     ?? [],
    repartition_par_statut:          rep,
    tickets_en_cours_par_patrimoine: ticketStats.tickets_en_cours_par_patrimoine ?? [],

    // Table
    tickets_recents: raw.tickets_recents ?? [],
  };
}

function mapAdminDashboard(
  raw:         AdminDashboardRaw,
  ticketStats: TicketStats,
): AdminDashboard {
  const sitesActifs = raw.kpis?.sites_actifs?.value          ?? 0;
  const coutTotal   = raw.kpis?.cout_total_maintenance?.value ?? 0;
  const equipements = raw.kpis?.total_equipements?.value      ?? 0;

  const rep = ticketStats.repartition_par_statut ?? {};

  // Tickets en attente = SIGNALÉ + VALIDÉ (non encore pris en charge)
  const enAttente =
    getStatut(rep, "SIGNALÉ",  "signalez", "SIGNALE", "signalé") +
    getStatut(rep, "VALIDÉ",   "validé",   "VALIDE");

  // Tickets en cours = ASSIGNÉ + EN_COURS
  const enCours =
    getStatut(rep, "ASSIGNÉ",  "assigné",  "ASSIGNE") +
    getStatut(rep, "EN_COURS", "en_cours");

  const clotures = getStatut(rep, "CLOS", "clos");

  const coutFinal = ticketStats.cout_global_tickets ?? coutTotal;

  return {
    // Sites
    nombre_total_sites_actifs:   sitesActifs,
    nombre_total_sites_inactifs: 0,
    cout_moyen_par_sites:        sitesActifs > 0 ? Math.round(coutFinal / sitesActifs) : 0,
    cout_total_maintenance:      coutFinal,

    // Patrimoine
    nombre_total_equipements:  equipements,
    nombre_total_prestataires: 0,   // non exposé par ce endpoint
    nombre_total_factures:     "N/A",

    // Tickets — on préfère ticketStats (source dédiée) avec fallback raw
    nombre_tickets_en_attente: ticketStats.nombre_total_tickets
      ? enAttente
      : (raw.flux_tickets?.["signalé"] ?? 0),
    nombre_tickets_en_cours: ticketStats.nombre_total_tickets_en_cours
      ?? (raw.kpis?.tickets_en_cours?.value ?? enCours),
    nombre_tickets_clotures: ticketStats.nombre_total_tickets_clotures ?? clotures,

    // Délais
    delais_moyen_traitement_heures:   ticketStats.delais_moyen_traitement_heures   ?? null,
    delais_minimal_traitement_heures: ticketStats.delais_minimal_traitement_heures ?? null,
    delais_maximal_traitement_heures: ticketStats.delais_maximal_traitement_heures ?? null,

    // Graphiques
    evolution_patrimoine:            raw.evolution_patrimoine      ?? [],
    sites_les_plus_frequentes:       raw.sites_les_plus_frequentes ?? [],
    actifs_les_plus_critiques:       raw.actifs_les_plus_critiques ?? [],
    tickets_en_cours_par_patrimoine: ticketStats.tickets_en_cours_par_patrimoine ?? [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export const DashboardService = {
  /**
   * Dashboard global — appels en PARALLÈLE pour minimiser la latence.
   * /dashboard/global  +  /ticket/stats  lancés simultanément.
   */
  async getGlobalDashboard(): Promise<GlobalDashboard> {
    const [dashRes, ticketStats] = await Promise.all([
      axios.get("/admin/dashboard/global"),
      TicketService.getStats(),
    ]);

    // Laravel peut wrapper dans .data ou pas selon le Resource utilisé
    const raw: GlobalDashboardRaw = dashRes.data?.data ?? dashRes.data;

    return mapGlobalDashboard(raw, ticketStats);
  },

  /**
   * Dashboard administration — même stratégie parallèle.
   */
  async getAdminDashboard(): Promise<AdminDashboard> {
    const [dashRes, ticketStats] = await Promise.all([
      axios.get("/admin/dashboard/administration"),
      TicketService.getStats(),
    ]);

    const raw: AdminDashboardRaw = dashRes.data?.data ?? dashRes.data;

    return mapAdminDashboard(raw, ticketStats);
  },
};