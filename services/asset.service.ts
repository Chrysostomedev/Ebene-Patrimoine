// services/asset.service.ts
import axios from "../core/axios";

// ─────────────────────────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────────────────────────

/**
 * Clés réelles retournées par Laravel après eager loading :
 *   - relation type()    → clé JSON "type"
 *   - relation subType() → clé JSON "subType"   (camelCase car méthode camelCase)
 *   - relation site()    → clé JSON "site"       (site.nom, pas site.name)
 *   - manager.phone_number (pas manager.phone)
 */
export interface CompanyAsset {
  id: number;
  type_company_asset_id: number;
  sub_type_company_asset_id: number;

  // Relations eager-loaded — clés exactes du back Laravel
  type:    { id: number; code: string; name: string } | null;
  subType: { id: number; code: string; name: string } | null;
  site:    { id: number; nom: string } | null;

  designation:  string;
  codification: string;
  status: "actif" | "inactif" | "hors_usage";
  criticite?: "critique" | "non_critique" | null;

  date_entree:   string;
  valeur_entree: number;
  description?:  string;

  created_at?: string;
  updated_at?: string;
}

export interface AssetStats {
  total_actifs:               number;
  actifs_actifs:              number;
  actifs_inactifs:            number;
  actifs_hors_usage:          number;
  valeur_totale_patrimoine:   number;
  valeur_moyenne_actif:       number;
  cout_moyen_entretien:       number;
  total_actifs_critiques:     number;
  total_actifs_non_critiques: number;
  actif_le_plus_critique:     string | null;
  nombre_total_tickets:     number;
  cout_actifs_critiques:      number;
  actifs_critiques_top3: {
    asset_id:        number;
    designation:     string;
    codification:    string;
    status:          string;
    tickets_ouverts: number;
  }[];
  delai_intervention_critique_heures: number | null;
  delai_moyen_global_heures:          number | null;
}

// ─────────────────────────────────────────────────────────────
// SERVICE
// ─────────────────────────────────────────────────────────────

export const AssetService = {

  // ── Liste paginée + filtrée
  async getAssets(params?: {
    page?:        number;
    per_page?:    number;
    search?:      string;
    type_id?:     number;
    sub_type_id?: number;
    status?:      string;
    site_id?:     number;
  }): Promise<{
    items: CompanyAsset[];
    meta: { current_page: number; last_page: number; per_page: number; total: number };
  }> {
    const response = await axios.get("/admin/asset", { params });
    return response.data.data;
  },

  // ── Détail d'un asset
  async getAssetById(id: number): Promise<CompanyAsset> {
    const response = await axios.get(`/admin/asset/${id}`);
    return response.data.data;
  },

  // ── Stats
  async getStats(): Promise<AssetStats> {
    const response = await axios.get("/admin/asset/stats");
    return response.data.data;
  },

  // ── Créer un asset
  // Note: product_type_code est géré côté back (valeur par défaut '00' si absent)
  //       codification est GÉNÉRÉE AUTOMATIQUEMENT par le back — ne pas l'envoyer
  async createAsset(payload: {
    type_company_asset_id:     number;
    sub_type_company_asset_id: number;
    site_id:                   number;
    designation:               string;
    status:    "actif" | "inactif" | "hors_usage";
    criticite?: "critique" | "non_critique";
    date_entree:   string;
    valeur_entree: number;
    description?:  string;
  }): Promise<CompanyAsset> {
    // product_type_code par défaut '00' si non fourni (back l'accepte)
    const body = { product_type_code: "00", ...payload };
    const response = await axios.post("/admin/asset", body);
    return response.data.data;
  },

  // ── Modifier un asset
  async updateAsset(id: number, payload: Partial<{
    type_company_asset_id:     number;
    sub_type_company_asset_id: number;
    site_id:      number;
    designation:  string;
    codification: string;
    status:    "actif" | "inactif" | "hors_usage";
    criticite: "critique" | "non_critique";
    date_entree:   string;
    valeur_entree: number;
    description:   string;
  }>): Promise<CompanyAsset> {
    const response = await axios.put(`/admin/asset/${id}`, payload);
    return response.data.data;
  },

  // ── Supprimer un asset
  async deleteAsset(id: number): Promise<boolean> {
    const response = await axios.delete(`/admin/asset/${id}`);
    return response.data.success as boolean;
  },

  // ── Export Excel (téléchargement direct)
  async exportAssets(params?: { site_id?: number; type_id?: number; status?: string }) {
    const response = await axios.get("/admin/asset/export", {
      params,
      responseType: "blob",
    });
    const url  = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href  = url;
    const cd   = (response.headers["content-disposition"] as string) ?? "";
    const m    = cd.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    link.setAttribute(
      "download",
      m?.[1]?.replace(/['"]/g, "") ?? `actifs_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // ── Import depuis Excel/CSV
  async importAssets(file: File): Promise<{ filename: string }> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await axios.post("/admin/asset/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data.data;
  },

  // ── Télécharger le template d'import
  // Génère un fichier Excel vide avec les bons headers côté client
  downloadImportTemplate() {
    // Colonnes attendues par AssetsImport (back)
    const headers = [
      "designation",      // requis
      "site",             // requis — nom exact du site
      "type_asset",       // nom du type (TypeCompanyAsset.name)
      "sous_type_asset",  // nom du sous-type (SubTypeCompanyAsset.name)
      "statut",           // actif | inactif | hors_usage
      "criticite",        // critique | non_critique
      "valeur_entree",    // nombre
      "date_entree",      // dd/mm/yyyy
      "codification",     // optionnel — auto-généré si absent
      "code_type_produit",// optionnel — 2 caractères, ex: 03
    ];

    // Construction CSV simple (toujours lisible par Excel)
    const csv = headers.join(";") + "\n";
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href  = url;
    link.download = "template_import_patrimoines.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};