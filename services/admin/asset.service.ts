// services/asset.service.ts
import axios from "../../core/axios";

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
  asset_designation_id?: number;
  asset_capacity_id?: number;
  site_id: number;

  // Relations eager-loaded — Laravel sérialise subType() en "sub_type" (snake_case)
  type: { id: number; code: string; name: string } | null;
  sub_type: { id: number; code: string; name: string } | null; // snake_case JSON
  subType?: { id: number; code: string; name: string } | null; // alias rétrocompat
  site: { id: number; nom: string } | null;

  designation: string;
  codification: string;
  serial_number?: string | null;
  article_code?: string | null;
  status: "actif" | "inactif" | "hors_usage";
  criticite?: "critique" | "non_critique" | null;

  date_entree: string;
  valeur_entree: number;
  description?: string;

  created_at?: string;
  updated_at?: string;
}

export interface AssetStats {
  total_actifs: number;
  actifs_actifs: number;
  actifs_inactifs: number;
  total_actifs_critiques: number;
  actifs_non_critiques: number;
  valeur_totale_patrimoine: number;
  cout_actif_critique: number;
  total_tickets: number;
  delai_moyen_intervention: number;
}

// ─────────────────────────────────────────────────────────────
// SERVICE
// ─────────────────────────────────────────────────────────────

export const AssetService = {

  // ── Liste paginée + filtrée
  async getAssets(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    type_id?: number;
    sub_type_id?: number;
    status?: string;
    site_id?: number;
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
  async createAsset(payload: Record<string, any>): Promise<CompanyAsset> {
    const formData = new FormData();
    formData.append("product_type_code", "00");

    Object.entries(payload).forEach(([key, value]) => {
      if (key === "images") {
        if (Array.isArray(value)) {
          value.forEach(file => {
            if (file instanceof File) {
              formData.append("images[]", file);
            }
          });
        }
      } else if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    const response = await axios.post("/admin/asset", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return response.data.data;
  },

  // ── Modifier un asset
  async updateAsset(id: number, payload: Record<string, any>): Promise<CompanyAsset> {
    const formData = new FormData();
    formData.append("_method", "PUT");

    Object.entries(payload).forEach(([key, value]) => {
      if (key === "images") {
        const imgData = value as any;
        if (imgData?.files) {
          imgData.files.forEach((file: File) => formData.append("images[]", file));
        }
        if (imgData?.existingIds) {
          imgData.existingIds.forEach((id: any) => formData.append("existing_attachments[]", String(id)));
        }
        // Fallback si c'est encore un tableau brut
        if (Array.isArray(value)) {
          value.forEach(file => { if (file instanceof File) formData.append("images[]", file); });
        }
      } else if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    const response = await axios.post(`/admin/asset/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
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
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    const cd = (response.headers["content-disposition"] as string) ?? "";
    const m = cd.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
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
    return response.data.data ?? response.data;
  },

  // ── Télécharger le modèle d'import
  async downloadImportTemplate() {
    const response = await axios.get("/admin/import-templates/asset", {
      responseType: "blob",
    });
    
    // Le backend peut spécifier le nom du fichier dans le header Content-Disposition
    const contentDisposition = response.headers['content-disposition'];
    let filename = "Modele_Import_Patrimoines.xlsx";
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
      if (filenameMatch && filenameMatch.length === 2) {
        filename = filenameMatch[1];
      }
    }

    const url = URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};