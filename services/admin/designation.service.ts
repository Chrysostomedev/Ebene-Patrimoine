// services/admin/designation.service.ts
import axios from "../../core/axios";
import { downloadBlob } from "../../core/export";

export interface Designation {
  id: number;
  sub_type_company_asset_id: number;
  sub_type?: { id: number; name: string; code: string } | null;
  name: string;
  code: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export const DesignationService = {
  async getDesignations(params?: { sub_type_company_asset_id?: number }) {
    const response = await axios.get(`/admin/asset-designation`, { params });
    return response.data.data as Designation[];
  },

  async getDesignation(id: number) {
    const response = await axios.get(`/admin/asset-designation/${id}`);
    return response.data.data as Designation;
  },

  async createDesignation(payload: { sub_type_company_asset_id: number; name: string; code: string; description?: string }) {
    const response = await axios.post(`/admin/asset-designation`, payload);
    return response.data.data as Designation;
  },

  async updateDesignation(id: number, payload: Partial<{ sub_type_company_asset_id: number; name: string; code: string; description?: string }>) {
    const response = await axios.put(`/admin/asset-designation/${id}`, payload);
    return response.data.data as Designation;
  },

  async deleteDesignation(id: number) {
    const response = await axios.delete(`/admin/asset-designation/${id}`);
    return response.data.success as boolean;
  },

  /** GET /admin/asset-designation/export */
  async exportDesignations(): Promise<void> {
    const res = await axios.get("/admin/asset-designation/export", { responseType: "blob" });
    const blob = new Blob([res.data], {
      type: res.headers["content-type"] ?? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    downloadBlob(blob, `designations_patrimoine`);
  },

  /** POST /admin/asset-designation/import */
  async importDesignations(file: File): Promise<{ filename: string }> {
    const fd = new FormData();
    fd.append("file", file);
    const res = await axios.post("/admin/asset-designation/import", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data?.data ?? res.data;
  },

  downloadTemplate(): void {
    const headers = ["nom", "code", "sub_type", "description"];
    const csv = headers.join(";") + "\n";
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template_import_designations.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
