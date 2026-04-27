"use client";

// ═══════════════════════════════════════════════════════════════
// hooks/manager/usePlannings.ts
// Liste paginée des plannings + stats + export
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from "react";
import { PlanningService } from "../../services/manager/planning.service";
import type {
  Planning,
  PlanningStats,
  PlanningFilters,
  PaginatedResponse,
} from "../../types/manager.types";

interface UsePlanningsReturn {
  plannings: Planning[];
  stats: PlanningStats | null;
  meta: PaginatedResponse<Planning>["meta"] | null;
  filters: PlanningFilters;
  isLoading: boolean;
  error: string | null;
  setFilters: (f: Partial<PlanningFilters>) => void;
  refresh: () => void;
  exportPlannings: () => Promise<void>;
}

export function usePlannings(
  initialFilters: PlanningFilters = {}
): UsePlanningsReturn {
  const [plannings, setPlannings] = useState<Planning[]>([]);
  const [stats, setStats] = useState<PlanningStats | null>(null);
  const [meta, setMeta] =
    useState<PaginatedResponse<Planning>["meta"] | null>(null);
  const [filters, setFiltersState] = useState<PlanningFilters>({
    page: 1,
    per_page: 15,
    ...initialFilters,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [paginatedData, statsData] = await Promise.all([
        PlanningService.getPlannings(filters),
        PlanningService.getStats(),
      ]);
      setPlannings(paginatedData.items);
      setMeta(paginatedData.meta);
      setStats(statsData);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ??
          "Impossible de charger les plannings."
      );
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const setFilters = (partial: Partial<PlanningFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...partial, page: 1 }));
  };

  const exportPlannings = async () => {
    try {
      const blob = await PlanningService.exportPlannings(filters);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `plannings_${Date.now()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Erreur export plannings", err);
    }
  };

  return {
    plannings,
    stats,
    meta,
    filters,
    isLoading,
    error,
    setFilters,
    refresh: fetchAll,
    exportPlannings,
  };
}