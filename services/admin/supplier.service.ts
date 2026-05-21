/**
 * services/admin/supplier.service.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Service HTTP pour les fournisseurs (Suppliers).
 *
 * Routes Laravel protégées par middleware admin :
 *   GET    /admin/suppliers          → index()   — liste tous les fournisseurs
 *   POST   /admin/suppliers          → store()   — crée un fournisseur
 *   GET    /admin/suppliers/{id}     → show()    — détails d'un fournisseur
 *   PUT    /admin/suppliers/{id}     → update()  — modifier un fournisseur
 *   DELETE /admin/suppliers/{id}     → destroy() — supprimer un fournisseur
 * ─────────────────────────────────────────────────────────────────────────────
 */

import axios from "../../core/axios";

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface SupplierRelation {
  id: number;
  user_id: number;
  email: string;
}

export interface Supplier {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  is_active?: boolean;
  role_id?: number;
  role?: { id: number; name: string };
  supplier?: SupplierRelation;
}

export interface CreateSupplierPayload {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  password?: string;
}

export interface UpdateSupplierPayload {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  status?: "actif" | "inactif" | "active" | "inactive";
}

// ── SupplierService ───────────────────────────────────────────────────────────

export const SupplierService = {

  async getSuppliers(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    is_active?: boolean;
  }): Promise<Supplier[]> {
    const response = await axios.get("/admin/suppliers", { params });
    return response.data.data ?? [];
  },

  async getSupplier(id: number): Promise<Supplier> {
    const response = await axios.get(`/admin/suppliers/${id}`);
    return response.data.data;
  },

  async createSupplier(payload: CreateSupplierPayload): Promise<Supplier> {
    const response = await axios.post("/admin/suppliers", payload);
    return response.data.data;
  },

  async updateSupplier(id: number, payload: UpdateSupplierPayload): Promise<Supplier> {
    const response = await axios.put(`/admin/suppliers/${id}`, payload);
    return response.data.data;
  },

  async deleteSupplier(id: number): Promise<boolean> {
    const response = await axios.delete(`/admin/suppliers/${id}`);
    return response.data.success ?? true;
  },

  async activateSupplier(id: number): Promise<Supplier> {
    const response = await axios.put(`/admin/suppliers/activate/${id}`);
    return response.data.data;
  },

  async deactivateSupplier(id: number): Promise<Supplier> {
    const response = await axios.put(`/admin/suppliers/desactivate/${id}`);
    return response.data.data;
  },
  
  async getStats(): Promise<any> {
    const response = await axios.get("/admin/suppliers/stats");
    return response.data.data;
  }
};
