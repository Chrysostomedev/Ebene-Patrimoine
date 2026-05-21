// services/admin/capacity.service.ts
import axios from "../../core/axios";
import { downloadBlob } from "../../core/export";

export interface Capacity {
  id: number;
  asset_designation_id: number;
  designation?: { id: number; name: string; code: string } | null;
  name: string;
  code: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export const CapacityService = {
  async getCapacities(params?: { asset_designation_id?: number }) {
    const response = await axios.get(`/admin/asset-capacity`, { params });
    return response.data.data as Capacity[];
  },

  async getCapacity(id: number) {
    const response = await axios.get(`/admin/asset-capacity/${id}`);
    return response.data.data as Capacity;
  },

  async createCapacity(payload: { asset_designation_id: number; name: string; code: string; description?: string }) {
    const response = await axios.post(`/admin/asset-capacity`, payload);
    return response.data.data as Capacity;
  },

  async updateCapacity(id: number, payload: Partial<{ asset_designation_id: number; name: string; code: string; description?: string }>) {
    const response = await axios.put(`/admin/asset-capacity/${id}`, payload);
    return response.data.data as Capacity;
  },

  async deleteCapacity(id: number) {
    const response = await axios.delete(`/admin/asset-capacity/${id}`);
    return response.data.success as boolean;
  },

  /** GET /admin/asset-capacity/export */
  async exportCapacities(): Promise<void> {
    const res = await axios.get("/admin/asset-capacity/export", { responseType: "blob" });
    const blob = new Blob([res.data], {
      type: res.headers["content-type"] ?? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    downloadBlob(blob, `capacites_patrimoine`);
  },

  /** POST /admin/asset-capacity/import */
  async importCapacities(file: File): Promise<{ filename: string }> {
    const fd = new FormData();
    fd.append("file", file);
    const res = await axios.post("/admin/asset-capacity/import", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data?.data ?? res.data;
  },

  downloadTemplate(): void {
    const headers = ["nom", "code", "designation", "description"];
    const csv = headers.join(";") + "\n";
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template_import_capacites.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
