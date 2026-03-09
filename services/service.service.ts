// services/service.service.ts
import axios from "../core/axios";

export interface Service {
  id: number;
  name: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export const ServiceService = {
  // GET /admin/services — retourne un tableau direct (pas paginé)
  async getServices(): Promise<Service[]> {
    const response = await axios.get("/admin/service");
    return response.data.data;
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
};