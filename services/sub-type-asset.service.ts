// services/sub-type-asset.service.ts
import axios from "../core/axios";

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

  async createSubType(payload: {
    type_company_asset_id: number;
    name: string;
    code: string;
    description?: string;
  }) {
    const response = await axios.post(`/admin/sub-type-asset`, payload);
    return response.data.data as SubTypeAsset;
  },

  async updateSubType(
    id: number,
    payload: Partial<{
      type_company_asset_id: number;
      name: string;
      code: string;
      description?: string;
    }>
  ) {
    const response = await axios.put(`/admin/sub-type-asset/${id}`, payload);
    return response.data.data as SubTypeAsset;
  },

  async deleteSubType(id: number) {
    const response = await axios.delete(`/admin/sub-type-asset/${id}`);
    return response.data.success as boolean;
  },
};
