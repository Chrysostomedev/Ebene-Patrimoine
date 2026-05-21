// ═══════════════════════════════════════════════════════════════
// services/manager/service.service.ts
// ═══════════════════════════════════════════════════════════════

import api from "../../core/axios";
import type { ApiResponse } from "../../types/manager.types";

export interface Service {
  id: number;
  name: string;
  description?: string;
  created_at?: string;
}

export const ServiceService = {
  /**
   * Liste tous les services métiers disponibles pour le manager.
   * Stratégie : extrait les services uniques depuis les tickets du site.
   * (Pas de route /manager/service ni accès à /admin/service pour le manager)
   */
  async getServices(): Promise<Service[]> {
    try {
      // Récupère les tickets pour en extraire les services uniques
      const { data } = await api.get("/manager/ticket", {
        params: { page: 1, per_page: 200 },
      });
      const tickets: any[] = data?.data?.items ?? [];
      const map = new Map<number, Service>();
      for (const t of tickets) {
        if (t.service?.id && !map.has(t.service.id)) {
          map.set(t.service.id, { id: t.service.id, name: t.service.name });
        }
      }
      return Array.from(map.values());
    } catch {
      return [];
    }
  },
};
