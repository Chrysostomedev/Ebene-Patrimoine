import { useState, useEffect, useCallback } from "react";
import { InvoiceService } from "../../services/manager/invoice.service";
import type { Invoice, InvoiceFilters, InvoiceStats, PaginatedResponse } from "../../types/manager.types";

export function useInvoices(initialFilters: InvoiceFilters = {}) {
  const [data, setData] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [meta, setMeta] = useState<PaginatedResponse<Invoice>["meta"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<InvoiceFilters>({
    page: 1,
    per_page: 15,
    ...initialFilters,
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [paginatedData, statsData] = await Promise.all([
        InvoiceService.getInvoices(filters),
        InvoiceService.getStats(),
      ]);
      setData(paginatedData.items);
      setMeta(paginatedData.meta);
      setStats(statsData);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Erreur lors du chargement des factures");
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const setFilters = (partial: Partial<InvoiceFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...partial, page: 1 }));
  };

  const search = (value: string) => {
    setFilters({ search: value } as any);
  };

  const exportInvoices = async () => {
    try {
      const blob = await InvoiceService.exportInvoices(filters);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `factures_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Erreur export factures", err);
    }
  };

  return {
    invoices: data,
    stats,
    meta,
    filters,
    isLoading,
    error,
    setFilters,
    search,
    refresh: fetchData,
    exportInvoices,
  };
}