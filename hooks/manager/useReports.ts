"use client";

// ═══════════════════════════════════════════════════════════════
// hooks/manager/useReports.ts
// Liste paginée des rapports + stats + export
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from "react";
import { ReportService } from "../../services/manager/report.service";
import type {
  InterventionReport,
  ReportStats,
  ReportFilters,
  PaginatedResponse,
} from "../../types/manager.types";

interface UseReportsReturn {
  reports: InterventionReport[];
  stats: ReportStats | null;
  meta: PaginatedResponse<InterventionReport>["meta"] | null;
  filters: ReportFilters;
  isLoading: boolean;
  error: string | null;
  setFilters: (f: Partial<ReportFilters>) => void;
  refresh: () => void;
  exportReports: () => Promise<void>;
}

export function useReports(
  initialFilters: ReportFilters = {}
): UseReportsReturn {
  const [reports, setReports] = useState<InterventionReport[]>([]);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [meta, setMeta] =
    useState<PaginatedResponse<InterventionReport>["meta"] | null>(null);
  const [filters, setFiltersState] = useState<ReportFilters>({
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
        ReportService.getReports(filters),
        ReportService.getStats(filters),
      ]);
      setReports(paginatedData.items);
      setMeta(paginatedData.meta);
      setStats(statsData);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ??
          "Impossible de charger les rapports."
      );
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const setFilters = (partial: Partial<ReportFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...partial, page: 1 }));
  };

  const exportReports = async () => {
    try {
      const blob = await ReportService.exportReports(filters);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rapports_${Date.now()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Erreur export rapports", err);
    }
  };

  return {
    reports,
    stats,
    meta,
    filters,
    isLoading,
    error,
    setFilters,
    refresh: fetchAll,
    exportReports,
  };
}