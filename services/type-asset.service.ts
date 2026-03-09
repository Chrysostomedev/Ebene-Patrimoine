// services/type-asset.service.ts
import axios from "../core/axios";

export interface TypeAsset {
  id: number;
  name: string;
  code: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

// Service pour gérer les appels API pour les types de patrimoine
export const TypeAssetService = {
  // Récupérer la liste paginée de types
  async getTypes(page: number = 1, perPage: number = 15) {
    const response = await axios.get(`/admin/type-asset`, {
      params: { page, per_page: perPage },
    });
    return response.data;
  },

  // Récupérer un type par ID
  async getType(id: number) {
    const response = await axios.get(`/admin/type-asset/${id}`);
    return response.data.data;
  },

  // Créer un nouveau type
  async createType(payload: { name: string; code: string; description?: string }) {
    const response = await axios.post(`/admin/type-asset`, payload);
    return response.data.data;
  },

  // Mettre à jour un type existant
  async updateType(id: number, payload: Partial<{ name: string; code: string; description?: string }>) {
    const response = await axios.put(`/admin/type-asset/${id}`, payload);
    return response.data.data;
  },

  // Supprimer un type
  async deleteType(id: number) {
    const response = await axios.delete(`/admin/type-asset/${id}`);
    return response.data.success;
  },
};
