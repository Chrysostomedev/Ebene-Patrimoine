// services/sub-type-asset.service.ts
import axios from "../../core/axios";
import { downloadBlob } from "../../core/export";

export interface SubTypeAsset {
  id: number;
  type_company_asset_id: number;
  type: { id: number; code: string; name: string } | null;
  name: string;
  code: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export const SubTypeAssetService = {
  async getSubTypes() {
    const response = await axios.get(`/admin/sub-type-asset`);
    return response.data.data as SubTypeAsset[];
  },

  async getSubType(id: number) {
    const response = await axios.get(`/admin/sub-type-asset/${id}`);
    return response.data.data as SubTypeAsset;
  },

  async createSubType(payload: { type_company_asset_id: number; name: string; code: string; description?: string }) {
    const response = await axios.post(`/admin/sub-type-asset`, payload);
    return response.data.data as SubTypeAsset;
  },

  async updateSubType(id: number, payload: Partial<{ type_company_asset_id: number; name: string; code: string; description?: string }>) {
    const response = await axios.put(`/admin/sub-type-asset/${id}`, payload);
    return response.data.data as SubTypeAsset;
  },

  async deleteSubType(id: number) {
    const response = await axios.delete(`/admin/sub-type-asset/${id}`);
    return response.data.success as boolean;
  },

  /** GET /admin/sub-type-asset/export */
  async exportSubTypes(): Promise<void> {
    const res = await axios.get("/admin/sub-type-asset/export", { responseType: "blob" });
    const blob = new Blob([res.data], {
      type: res.headers["content-type"] ?? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    downloadBlob(blob, `sous_types_patrimoine`);
  },

  /** POST /admin/sub-type-asset/import */
  async importSubTypes(file: File): Promise<{ filename: string }> {
    const fd = new FormData();
    fd.append("file", file);
    const res = await axios.post("/admin/sub-type-asset/import", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data?.data ?? res.data;
  },

  downloadTemplate(): void {
    // Colonnes attendues par SubTypesImport : nom, code, type_asset, description
    const headers = ["nom", "code", "type_asset", "description"];
    const csv = headers.join(";") + "\n";
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template_import_sous_types.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
