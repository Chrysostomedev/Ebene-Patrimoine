import { useState, useEffect, useCallback } from "react";
import { QuoteService } from "../../services/manager/quote.service";
import type { Quote, QuoteFilters, QuoteStats, PaginatedResponse } from "../../types/manager.types";

export function useQuotes(initialFilters: QuoteFilters = {}) {
  const [data, setData] = useState<Quote[]>([]);
  const [stats, setStats] = useState<QuoteStats | null>(null);
  const [meta, setMeta] = useState<PaginatedResponse<Quote>["meta"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<QuoteFilters>({
    page: 1,
    per_page: 15,
    ...initialFilters,
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [paginatedData, statsData] = await Promise.all([
        QuoteService.getQuotes(filters),
        QuoteService.getStats(filters),
      ]);
      setData(paginatedData.items);
      setMeta(paginatedData.meta);
      setStats(statsData);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Erreur lors du chargement des devis");
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const setFilters = (partial: Partial<QuoteFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...partial, page: 1 }));
  };

  const exportQuotes = async () => {
    try {
      const blob = await QuoteService.exportQuotes(filters);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `devis_${Date.now()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Erreur export devis", err);
    }
  };

  return {
    quotes: data,
    stats,
    meta,
    filters,
    isLoading,
    error,
    setFilters,
    refresh: fetchData,
    exportQuotes,
  };
}