// services/service.service.ts
import axios from "../../core/axios";
import { downloadBlob } from "../../core/export";

export interface Service {
  id: number;
  name: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export const ServiceService = {
  async getServices(params?: { search?: string; page?: number; per_page?: number }): Promise<{ data: Service[]; meta?: any }> {
    const response = await axios.get("/admin/service", { params });
    if (response.data.meta) {
      return { data: response.data.data, meta: response.data.meta };
    }
    return { data: response.data.data ?? response.data };
  },

  async createService(payload: { name: string; description?: string }): Promise<Service> {
    const response = await axios.post("/admin/service", payload);
    return response.data.data;
  },

  async updateService(id: number, payload: { name?: string; description?: string }): Promise<Service> {
    const response = await axios.put(`/admin/service/${id}`, payload);
    return response.data.data;
  },

  async deleteService(id: number): Promise<void> {
    await axios.delete(`/admin/service/${id}`);
  },

  /** GET /admin/service/export */
  async exportServices(): Promise<void> {
    const res = await axios.get("/admin/service/export", { responseType: "blob" });
    const blob = new Blob([res.data], {
      type: res.headers["content-type"] ?? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    downloadBlob(blob, `services`);
  },

  /** POST /admin/service/import */
  async importServices(file: File): Promise<Service[]> {
    const fd = new FormData();
    fd.append("file", file);
    const res = await axios.post("/admin/service/import", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data?.data ?? res.data;
  },

  downloadTemplate(): void {
    // Colonnes attendues par ServiceImport : nom (ou name), description
    const headers = ["nom", "description"];
    const csv = headers.join(";") + "\n";
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template_import_services.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};