// ═══════════════════════════════════════════════════════════════
// TYPES PARTAGÉS — MANAGER
// Reflète exactement la structure des réponses Laravel
// ═══════════════════════════════════════════════════════════════

// ── Pagination standard ─────────────────────────────────────────
export interface PaginatedResponse<T> {
  items: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

// ── Réponse API générique ───────────────────────────────────────
export interface ApiResponse<T> {
  data: T;
  message: string;
}

// ── Filtres communs ─────────────────────────────────────────────
export interface BaseFilters {
  page?: number;
  per_page?: number;
  search?: string;
}

// ════════════════════════════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════════════════════════════
export interface ManagerDashboardStats {
  site_info: {
    id: number;
    nom: string;
    responsable?: string;
  };
  kpis: {
    nombre_total_tickets: number;
    nombre_tickets_traités: number;
    nombre_tickets_non_traités: number;
    nombre_prestataires: number;
    cout_global_maintenance: number;
    nombre_sites?: number;
    nombre_sites_actifs?: number;
    nombre_sites_inactifs?: number;
    loyer_moyen?: number;
    nombre_equipements?: number;
  };
  tickets_stats_par_statut: Record<string, number>;
  tendance_annuelle_maintenance: Array<{
    annee: number;
    mois: number;
    total: number;
  }>;
  sites_les_plus_frequentes: Array<{
    site_id: number;
    nom: string;
    total_tickets: number;
  }>;
  prochains_plannings: any[];
}

// ════════════════════════════════════════════════════════════════
// SITE
// ════════════════════════════════════════════════════════════════
export interface ManagerSite {
  id: number;
  nom: string;
  name?: string;
  adresse?: string;
  ville?: string;
  localisation?: string;
  status?: string;
  manager_id: number;
  tickets_count?: number;
  created_at: string;
  updated_at: string;
}

export interface SiteStats {
  total_assets: number;
  total_tickets: number;
  total_plannings: number;
  active_providers: number;
  
  // Nouveaux champs multi-sites (back v2 / Dashboard)
  nombre_total_sites?: number;
  nombre_sites_assignes?: number;
  nombre_sites_actifs?: number;
  nombre_sites_inactifs?: number;
  cout_loyer_moyen_par_site?: number;
  loyer_moyen?: number; // alias back
  
  nombre_total_tickets?: number;
  nombre_tickets_traités?: number;
  nombre_tickets_non_traités?: number;
  nombre_prestataires?: number;
  cout_global_maintenance?: number;
  nombre_equipements?: number;
  
  tickets_par_site?: { site_id: number; nom: string; tickets_en_cours: number; tickets_clos: number }[];
  
  // Champs legacy
  total?: number;
  active?: number;
  in_maintenance?: number;
  total_value?: number;
}

// ════════════════════════════════════════════════════════════════
// PATRIMOINE (ASSETS)
// ════════════════════════════════════════════════════════════════
export interface Asset {
  id: number;
  designation: string;
  codification?: string;
  code?: string; // legacy alias
  serial_number?: string;
  product_type_code?: string;
  status: "actif" | "inactif" | "hors_usage" | "disposed" | "active" | "in_maintenance" | "out_of_service";
  criticite?: "critique" | "non_critique" | null;
  
  date_entree?: string;
  valeur_entree?: number;
  
  // legacy aliases for acquisition
  acquisition_date?: string;
  acquisition_value?: number;
  
  description?: string;
  site_id: number;
  type_company_asset_id?: number;
  sub_type_company_asset_id?: number;
  
  site?: {
    id: number;
    nom: string;
  };
  type?: {
    id: number;
    name: string;
    code?: string;
  };
  sub_type?: {
    id: number;
    name: string;
    code?: string;
  };
  
  // legacy relation names
  typeAsset?: {
    id: number;
    name: string;
  };
  subTypeAsset?: {
    id: number;
    name: string;
  };
  
  created_at: string;
  updated_at?: string;
  images?: any[];
  reports?: any[];
  attachments?: any[];
}


export interface AssetStats {
  total: number;
  active: number;
  in_maintenance: number;
  out_of_service: number;
  disposed: number;
  total_value?: number;
}

export interface AssetFilters extends BaseFilters {
  status?: string;
  type_asset_id?: number;
  sub_type_asset_id?: number;
  search?: string;
}

// ════════════════════════════════════════════════════════════════
// DEVIS (QUOTES)
// ════════════════════════════════════════════════════════════════
export interface QuoteItem {
  id?: number;
  designation: string;
  quantity: number;
  unit_price: number;
  total_price?: number;
}

export interface Quote {
  id: number;
  reference: string;
  status: "en attente" | "approved" | "rejected" | "validated" | "invalidated" | "revision" | "pending";
  description?: string;
  amount_ht: number;
  tax_rate: number;
  tax_amount: number;
  amount_ttc: number;
  total_amount_ttc?: number;
  provider_id: number;
  site_id: number;
  ticket_id?: number;
  created_at: string;
  updated_at?: string;
  approved_at?: string;
  revision_reason?: string;
  revision_requested_at?: string;
  provider: {
    id: number;
    name?: string;
    company_name?: string;
  };
  site: {
    id: number;
    nom: string;
    name?: string;
  };
  ticket?: {
    id: number;
    reference: string;
    subject: string;
    type?: string;
    status?: string;
  };
  items: QuoteItem[];
  history?: QuoteHistory[];
  pdf_paths?: string[];
  attachments?: { id: number; file_path?: string; url: string; file_type?: string }[];
}

export interface CreateQuotePayload {
  ticket_id: number;
  provider_id: number;
  site_id: number;
  description: string;
  items: QuoteItem[];
}

export interface UpdateQuotePayload extends Partial<CreateQuotePayload> {
  status?: string;
  rejection_reason?: string;
}

export interface QuoteHistory {
  id: number;
  action: string;
  performed_by_name: string;
  created_at: string;
}

export interface QuoteStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  total_quotes: number;
  total_pending: number;
  total_approved: number;
  total_rejected: number;
  total_amount: number;
  total_approved_amount?: number;
}

export interface QuoteFilters extends BaseFilters {
  status?: string;
  provider_id?: number;
  date_debut?: string;
  date_fin?: string;
}

// ════════════════════════════════════════════════════════════════
// FACTURES (INVOICES)
// ════════════════════════════════════════════════════════════════
export type InvoiceStatus = "paid" | "pending" | "overdue" | "cancelled" | "unpaid" | "rejected";

export interface Invoice {
  id: number;
  reference: string;
  status: InvoiceStatus;
  payment_status: InvoiceStatus;
  invoice_date: string;
  due_date?: string;
  payment_date?: string;
  payment_method?: string;
  payment_reference?: string;
  amount_ht: number;
  tax_amount: number;
  amount_ttc: number;
  total_amount_ttc?: number;
  report_id?: number;
  quote_id?: number;
  provider_id: number;
  site_id: number;
  pdf_path?: string;
  comment?: string;
  provider: {
    id: number;
    name?: string;
    company_name?: string;
    email?: string;
    phone?: string;
  };
  site: {
    id: number;
    nom?: string;
    name?: string;
  };
  interventionReport?: {
    id: number;
    reference?: string;
    description?: string;
    start_date?: string;
  };
  quote?: {
    id: number;
    reference: string;
  };
}

export interface InvoiceStats {
  total: number;
  paid: number;
  unpaid: number;
  total_invoices: number;
  total_paid: number;
  total_unpaid: number;
  total_amount: number;
  paid_amount: number;
  total_paid_amount: number;
  unpaid_amount: number;
  total_unpaid_amount: number;
}

export interface InvoiceFilters extends BaseFilters {
  status?: string;
  payment_status?: string;
  provider_id?: number;
  date_debut?: string;
  date_fin?: string;
}

// ════════════════════════════════════════════════════════════════
// PLANNING
// ════════════════════════════════════════════════════════════════
export interface Planning {
  id: number;
  site_id: number;
  provider_id: number;
  status: "scheduled" | "in_progress" | "completed" | "cancelled" | "planifie" | "realise" | "en_cours" | "en_retard";
  date_debut: string;
  date_fin: string;
  codification?: string;
  responsable_name?: string;
  responsable_phone?: string;
  description?: string;
  site: {
    id: number;
    nom: string;
    manager?: any;
  };
  provider: {
    id: number;
    name?: string;
    company_name?: string;
    user?: {
      name: string;
      email: string;
    };
  };
  asset?: any;
  company_asset?: any;
  created_at: string;
  updated_at: string;
}

export interface PlanningStats {
  total: number;
  upcoming: number;
  in_progress: number;
  completed: number;
  cancelled: number;
  realise?: number;
  planifie?: number;
  en_cours?: number;
  en_retard?: number;
  non_realise?: number;
}

export interface PlanningFilters extends BaseFilters {
  status?: string;
  provider_id?: number;
  date_debut?: string;
  date_fin?: string;
}

// ════════════════════════════════════════════════════════════════
// RAPPORTS D'INTERVENTION
// ════════════════════════════════════════════════════════════════
export type ProjectStatus = "draft" | "submitted" | "validated" | "rejected" | "pending";

export interface InterventionReport {
  id: number;
  reference?: string;
  status: ProjectStatus;
  intervention_type?: "curatif" | "preventif";
  result?: "ras" | "anomalie" | "resolu";
  description?: string;
  findings?: string;
  start_date?: string;
  end_date?: string;
  rating?: number;
  comment?: string; // added alias
  manager_comment?: string;
  validator_comment?: string;
  ticket_id?: number;
  provider_id: number;
  site_id: number;
  validated_by?: number;
  validated_at?: string;
  created_at: string;
  ticket?: {
    id: number;
    reference: string;
    subject: string;
  };
  provider: {
    id: number;
    name?: string;
    company_name?: string;
  };
  site: {
    id: number;
    nom: string;
    name?: string;
  };
  attachments?: ReportAttachment[];
}

export interface ReportAttachment {
  id: number;
  file_path: string;
  file_type: string;
}

export interface ReportStats {
  total: number;
  validated: number;
  pending: number;
  rejected: number;
  average_rating: number;
}

export interface ReportFilters extends BaseFilters {
  status?: string;
  provider_id?: number;
  date_debut?: string;
  date_fin?: string;
  intervention_type?: string;
}

export interface ValidateReportPayload {
  result?: string;
  rating?: number;
  comment?: string;
  manager_comment?: string;
}

// ════════════════════════════════════════════════════════════════
// TICKETS
// ════════════════════════════════════════════════════════════════
export interface Ticket {
  id: number;
  reference?: string;
  subject?: string;
  description?: string;
  status: string;
  priority: string;
  type: "curatif" | "preventif";
  site_id?: number;
  asset_id?: number;
  service_id?: number;
  provider_id?: number;
  planned_at?: string;
  due_at?: string;
  resolved_at?: string;
  closed_at?: string;
  created_at: string;
  updated_at?: string;
  site?: { id: number; nom: string };
  asset?: { id: number; designation: string; codification?: string; code?: string };
  service?: { id: number; name: string };
  provider?: { id: number; name?: string; company_name?: string };
  attachments?: any[];
  reports?: any[];
}

export interface TicketStats {
  cout_moyen_par_ticket: number;
  nombre_total_tickets: number;
  nombre_total_tickets_en_cours: number;
  nombre_total_tickets_clotures: number;
  nombre_tickets_par_mois: number;
  delais_moyen_traitement_heures: number;
  delais_minimal_traitement_heures: number;
  delais_maximal_traitement_heures: number;
}

export interface TicketFilters extends BaseFilters {
  status?: string;
  priority?: string;
  type?: string;
  provider_id?: number;
  date_debut?: string;
  date_fin?: string;
}