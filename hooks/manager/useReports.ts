import { useState, useEffect, useCallback, useRef } from "react";
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
  const [debouncedSearch, setDebouncedSearch] = useState<string | undefined>(initialFilters.search);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search query
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 400);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [filters.search]);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const apiFilters = { ...filters, search: debouncedSearch };
      const reqType = filters.type || filters.intervention_type;

      // Le type demandé (preventif / curatif) est directement transmis à l'API pour un filtrage serveur précis et cohérent
      if (reqType) {
        apiFilters.intervention_type = reqType;
      }

      const [paginatedData, statsData] = await Promise.all([
        ReportService.getReports(apiFilters),
        ReportService.getStats(filters),
      ]);

      // Normalisation des types en fonction du contexte (planning ou ticket préventif)
      let items = paginatedData.items.map(r => {
        const isPreventif = r.intervention_type === "preventif" || !!r.planning_id;
        return { ...r, intervention_type: isPreventif ? "preventif" : "curatif" };
      });

      // Filtrage de sécurité front si un type spécifique est demandé
      if (reqType) {
        items = items.filter(r => r.intervention_type === reqType);
      }

      setReports(items);
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
  }, [filters, debouncedSearch]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const setFilters = (partial: Partial<ReportFilters>) => {
    setFiltersState((prev) => {
      const next = { ...prev, ...partial };
      if (partial.search !== undefined) {
        next.page = 1;
      }
      return next;
    });
  };

  const exportReports = async () => {
    try {
      const blob = await ReportService.exportReports({ ...filters, search: debouncedSearch });
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