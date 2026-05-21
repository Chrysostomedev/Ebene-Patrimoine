// services/type-asset.service.ts
import axios from "../../core/axios";
import { downloadBlob } from "../../core/export";

export interface TypeAsset {
  id: number;
  name: string;
  code: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export const TypeAssetService = {
  async getTypes(page: number = 1, perPage: number = 15) {
    const response = await axios.get(`/admin/type-asset`, { params: { page, per_page: perPage } });
    return response.data;
  },

  async getType(id: number) {
    const response = await axios.get(`/admin/type-asset/${id}`);
    return response.data.data;
  },

  async createType(payload: { name: string; code: string; description?: string }) {
    const response = await axios.post(`/admin/type-asset`, payload);
    return response.data.data;
  },

  async updateType(id: number, payload: Partial<{ name: string; code: string; description?: string }>) {
    const response = await axios.put(`/admin/type-asset/${id}`, payload);
    return response.data.data;
  },

  async deleteType(id: number) {
    const response = await axios.delete(`/admin/type-asset/${id}`);
    return response.data.success;
  },

  /** GET /admin/type-asset/export → télécharge le fichier Excel */
  async exportTypes(): Promise<void> {
    const res = await axios.get("/admin/type-asset/export", { responseType: "blob" });
    const blob = new Blob([res.data], {
      type: res.headers["content-type"] ?? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    downloadBlob(blob, `types_patrimoine`);
  },

  /** POST /admin/type-asset/import → envoie le fichier Excel */
  async importTypes(file: File): Promise<{ filename: string }> {
    const fd = new FormData();
    fd.append("file", file);
    const res = await axios.post("/admin/type-asset/import", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data?.data ?? res.data;
  },

  /** Télécharge le template CSV pour l'import types */
  downloadTemplate(): void {
    const headers = ["nom", "code", "description"];
    const csv = headers.join(";") + "\n";
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template_import_types.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
