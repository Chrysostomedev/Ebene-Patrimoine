// services/site.service.ts
import axios from "../../core/axios";

// ─────────────────────────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────────────────────────

export interface Site {
  id:                number;
  nom:               string;
  email?:            string | null;
  status:            "active" | "inactive";
  effectifs?:        number | null;
  loyer?:            number | null;
  ref_contrat:       string;
  localisation?:     string | null;
  superficie?:       string | null;
  date_deb_contrat?: string | null;
  date_fin_contrat?: string | null;
  manager_id?:       number | null;
  manager?: {
    id:            number;
    first_name?:   string;
    last_name?:    string;
    name?:         string;
    email:         string;
    phone_number?: string;
    phone?:        string;
  } | null;
  // FIX: champs à plat parfois renvoyés directement par l'API
  responsable_name?:  string | null;
  phone_responsable?: string | null;
  created_at?:        string;
  updated_at?:        string;
  tickets_count?:     number;
}

export interface Manager {
  id:            number;
  first_name?:   string;
  last_name?:    string;
  name?:         string;
  email:         string;
  phone_number?: string;
  phone?:        string;
}

export interface SitesResponse {
  items: Site[];
  meta: {
    current_page: number;
    last_page:    number;
    per_page:     number;
    total:        number;
  };
}

export interface SiteFilters {
  search?:   string;
  status?:   string;
  page?:     number;
  per_page?: number;
}

// ─────────────────────────────────────────────────────────────
// HELPERS — résolution robuste des champs manager
// ─────────────────────────────────────────────────────────────

/** Retourne le nom du manager quelle que soit la structure du back */
export const resolveManagerName = (item: Site | Manager | null): string => {
  if (!item) return "—";
  // Objet manager imbriqué (Site) — priorité absolue
  if ("manager" in item && item.manager) {
    const m = item.manager;
    const full = [m.first_name, (m as any).last_name].filter(Boolean).join(" ").trim();
    if (full) return full;
    if (m.name)  return m.name;
    if (m.email) return m.email;
  }
  // Champ à plat responsable_name (Site)
  if ("responsable_name" in item && item.responsable_name) return item.responsable_name;
  // Manager directement (liste managers)
  if ("first_name" in item) {
    const full = [item.first_name, (item as any).last_name].filter(Boolean).join(" ").trim();
    if (full) return full;
  }
  if ("name" in item && (item as any).name) return (item as any).name;
  if ("email" in item && item.email)        return item.email;
  return "—";
};

/** Retourne le téléphone quelle que soit la structure du back */
export const resolveManagerPhone = (site: Site | null): string => {
  if (!site) return "—";
  return (
    site.phone_responsable          ??
    site.manager?.phone_number      ??
    site.manager?.phone             ??
    "—"
  );
};

/** Retourne l'email quelle que soit la structure du back */
export const resolveManagerEmail = (site: Site | null): string => {
  if (!site) return "—";
  return site.email ?? site.manager?.email ?? "—";
};

// ─────────────────────────────────────────────────────────────
// HELPERS — parsing sécurisé de la réponse API
// ─────────────────────────────────────────────────────────────

/**
 * FIX (Bug 1) : parse robustement la réponse de n'importe quel endpoint paginé.
 * Gère les shapes : { items, meta }, { data: { items, meta } }, tableau brut.
 */
const parsePaginatedResponse = (responseData: any): SitesResponse => {
  // Shape Laravel standard : { success, message, data: { items: [], meta: {} } }
  if (responseData?.data?.items !== undefined && responseData?.data?.meta) {
    return {
      items: Array.isArray(responseData.data.items) ? responseData.data.items : [],
      meta:  responseData.data.meta,
    };
  }
  // Shape directe : { items: [], meta: {} }
  if (responseData?.items !== undefined && responseData?.meta) {
    return {
      items: Array.isArray(responseData.items) ? responseData.items : [],
      meta:  responseData.meta,
    };
  }
  // Shape Laravel paginator brut dans data : { data: { data: [], current_page, last_page, total } }
  if (responseData?.data?.data !== undefined && responseData?.data?.current_page !== undefined) {
    const p = responseData.data;
    return {
      items: Array.isArray(p.data) ? p.data : [],
      meta:  { current_page: p.current_page, last_page: p.last_page, per_page: p.per_page, total: p.total },
    };
  }
  // Shape tableau brut dans data
  if (Array.isArray(responseData?.data)) {
    return {
      items: responseData.data,
      meta:  { current_page: 1, last_page: 1, per_page: responseData.data.length, total: responseData.data.length },
    };
  }
  // Shape tableau brut
  if (Array.isArray(responseData)) {
    return {
      items: responseData,
      meta:  { current_page: 1, last_page: 1, per_page: responseData.length, total: responseData.length },
    };
  }
  console.warn("[site.service] parsePaginatedResponse: shape inconnue", JSON.stringify(responseData)?.slice(0, 300));
  return { items: [], meta: { current_page: 1, last_page: 1, per_page: 10, total: 0 } };
};

/**
 * FIX (Bug 1) : parse robustement la réponse de /admin/users?role=manager.
 * Retourne toujours un Manager[].
 */
const parseManagersResponse = (responseData: any): Manager[] => {
  // Shape : { data: { items: [] } }
  if (Array.isArray(responseData?.data?.items))  return responseData.data.items;
  // Shape : { data: [] }
  if (Array.isArray(responseData?.data))         return responseData.data;
  // Shape : { items: [] }
  if (Array.isArray(responseData?.items))        return responseData.items;
  // Shape : tableau brut
  if (Array.isArray(responseData))               return responseData;

  console.warn("[site.service] parseManagersResponse: shape inconnue", responseData);
  return [];
};

// ─────────────────────────────────────────────────────────────
// SERVICE
// ─────────────────────────────────────────────────────────────

// ── Liste paginée
export const getSites = async (
  search?: string,
  page:     number = 1,
  per_page: number = 9,
): Promise<SitesResponse> => {
  const response = await axios.get("/admin/site", {
    params: { search, page, per_page },
  });
  return parsePaginatedResponse(response.data);
};

// ── Liste filtrée (objet complet) — enrichit les managers manquants
export const getSitesFiltered = async (
  filters: SiteFilters,
): Promise<SitesResponse> => {
  const response = await axios.get("/admin/site", { params: filters });
  const result = parsePaginatedResponse(response.data);

  // Enrichit les sites dont manager_id est défini mais manager est null
  const missingManagerIds = result.items
    .filter(s => s.manager_id && !s.manager)
    .map(s => s.manager_id as number);

  if (missingManagerIds.length > 0) {
    try {
      const mRes = await axios.get("/admin/managers", { params: { per_page: 1000 } });
      const raw = mRes.data?.data;
      const managers: any[] = Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : []);
      const managerMap = new Map(managers.map((m: any) => [m.id, m]));

      result.items = result.items.map(site => {
        if (site.manager_id && !site.manager) {
          const m = managerMap.get(site.manager_id);
          if (m) {
            site.manager = {
              id:           m.id,
              first_name:   m.first_name,
              last_name:    m.last_name,
              name:         [m.first_name, m.last_name].filter(Boolean).join(" ") || undefined,
              email:        m.email,
              phone_number: m.phone_number,
              phone:        m.phone_number ?? m.phone,
            };
          }
        }
        return site;
      });
    } catch { /* non bloquant */ }
  }

  return result;
};

// ── Créer un site
export const createSite = async (data: any): Promise<Site> => {
  const response = await axios.post("/admin/site", data);
  return response.data?.data ?? response.data;
};

// ── Mettre à jour un site
export const updateSite = async (id: number, data: any): Promise<Site> => {
  const response = await axios.put(`/admin/site/${id}`, data);
  return response.data?.data ?? response.data;
};

// ── Supprimer un site
export const deleteSite = async (id: number): Promise<boolean> => {
  const response = await axios.delete(`/admin/site/${id}`);
  return response.data?.success ?? true;
};

// ── Stats
export const getSiteStats = async () => {
  const response = await axios.get("/admin/site/stats");
  return response.data?.data ?? response.data;
};

// ── Managers pour les selects (Liste complète via endpoint dédié)
export const getManagers = async (): Promise<Manager[]> => {
  const response = await axios.get("/admin/select/managers");
  return response.data?.data ?? [];
};

// ── Sites pour les selects (Liste complète via endpoint dédié)
export const getSelectSites = async (): Promise<Site[]> => {
  const response = await axios.get("/admin/select/sites");
  return response.data?.data ?? [];
};

// ── Détail d'un site — enrichit avec le manager si nécessaire
export const getSiteById = async (id: number): Promise<Site> => {
  const response = await axios.get(`/admin/site/${id}`);
  const site: Site = response.data?.data ?? response.data;
  // Si manager_id est défini mais manager est null (bug morphique back),
  // on récupère le manager manuellement
  if (site.manager_id && !site.manager) {
    try {
      const mRes = await axios.get(`/admin/managers/${site.manager_id}`);
      const m = mRes.data?.data ?? mRes.data;
      if (m) site.manager = {
        id:            m.id,
        first_name:    m.first_name,
        last_name:     m.last_name,
        name:          [m.first_name, m.last_name].filter(Boolean).join(" ") || undefined,
        email:         m.email,
        phone_number:  m.phone_number,
        phone:         m.phone_number ?? m.phone,
      };
    } catch { /* non bloquant */ }
  }
  return site;
};

// ── Export Excel
export const exportSites = async (filters?: { status?: string }) => {
  const response = await axios.get("/admin/site/export", {
    params:       filters ?? {},
    responseType: "blob",
  });
  return response;
};

// ── Import Excel
export const importSites = async (file: File) => {
  const fd = new FormData();
  fd.append("file", file);
  const response = await axios.post("/admin/site/import", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

// ── Télécharger le template d'import sites
export const downloadSiteImportTemplate = () => {
 const headers = [
    "numero_site",        // ← était absent
    "nom",
    "ref_contrat",
    "status",             // ← était "statut"
    "responsable_name",   // ← était "responsable"
    "phone_responsable",  // ← était "telephone"
    "email",
    "effectifs",
    "loyer",
    "superficie",
    "localisation",       // ← était "localisation" ✓ mais vérifier
    "date_deb_contrat",   // ← était "date_debut_contrat"
    "date_fin_contrat",   // ← était "date_fin_contrat" ✓
    "manager_id",         // ← était "manager_email" (back attend un ID, pas un email)
  ];
  const csv  = headers.join(";") + "\n";
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href  = url;
  link.download = "template_import_sites.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};