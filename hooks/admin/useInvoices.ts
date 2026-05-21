// hooks/useInvoices.ts
import { useState, useCallback, useEffect, useRef } from "react";
import {
  Invoice,
  InvoiceStats,
  InvoiceService,
  CreateInvoicePayload,
  MarkAsPaidPayload,
} from "../../services/admin/invoice.service";

interface UseInvoicesReturn {
  invoices: Invoice[];
  stats: InvoiceStats | null;
  isLoading: boolean;
  statsLoading: boolean;
  error: string | null;
  meta: any;
  page: number;
  setPage: (p: number) => void;
  search: string;
  setSearch: (s: string) => void;
  filters: any;
  setFilters: (f: any) => void;

  fetchInvoices: (params?: any) => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchInvoicesByReport: (reportId: number) => Promise<Invoice[]>;
  createInvoice: (payload: CreateInvoicePayload) => Promise<Invoice>;
  deleteInvoice: (id: number) => Promise<void>;
  markAsPaid: (id: number, payload?: MarkAsPaidPayload) => Promise<void>;
}

export const useInvoices = (initialPage = 1, initialSearch = ""): UseInvoicesReturn => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [meta, setMeta] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(initialPage);
  const [search, setSearchState] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [filters, setFiltersState] = useState<any>({ status: undefined });

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Récupération liste factures ────────────────────────────────────────────
  const fetchInvoices = useCallback(async (customParams?: any) => {
    setIsLoading(true);
    setError(null);
    try {
      const queryParams = {
        page: customParams?.page ?? page,
        search: customParams?.search !== undefined ? customParams.search : debouncedSearch,
        status: customParams?.status !== undefined ? customParams.status : filters.status,
        site_id: customParams?.site_id !== undefined ? customParams.site_id : filters.site_id,
        provider_id: customParams?.provider_id !== undefined ? customParams.provider_id : filters.provider_id,
        per_page: 10,
      };

      const res = await InvoiceService.getInvoicesPaginated(queryParams);
      
      const sorted = [...res.items].sort(
        (a, b) => new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime()
      );
      
      setInvoices(sorted);
      setMeta(res.meta);
    } catch (err: any) {
      const message = err?.response?.data?.message ?? "Erreur lors de la récupération des factures.";
      setError(message);
      console.error("❌ Erreur fetchInvoices:", err);
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, filters.status, filters.site_id, filters.provider_id]);

  // Debounce search input
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search]);

  // Re-fetch when page, debouncedSearch or status changes
  useEffect(() => {
    fetchInvoices();
  }, [page, debouncedSearch, filters.status, filters.site_id, filters.provider_id, fetchInvoices]);

  const setSearch = useCallback((s: string) => {
    setSearchState(s);
  }, []);

  const setFilters = useCallback((f: any) => {
    setFiltersState(f);
    setPage(1);
  }, []);

  // ── Récupération statistiques ──────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await InvoiceService.getStats();
      setStats(data);
    } catch (err: any) {
      console.warn("⚠️ Erreur stats factures:", err?.response?.data?.message);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // ── Récupération factures d'un rapport ─────────────────────────────────────
  const fetchInvoicesByReport = useCallback(async (reportId: number): Promise<Invoice[]> => {
    try {
      const data = await InvoiceService.getInvoicesByReport(reportId);
      return data.sort(
        (a, b) => new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime()
      );
    } catch (err: any) {
      console.error("❌ Erreur fetchInvoicesByReport:", err);
      return [];
    }
  }, []);

  // ── Création facture ────────────────────────────────────────────────────────
  const createInvoice = useCallback(
    async (payload: CreateInvoicePayload): Promise<Invoice> => {
      const newInvoice = await InvoiceService.createInvoice(payload);
      await fetchInvoices();
      await fetchStats();
      return newInvoice;
    },
    [fetchInvoices, fetchStats]
  );

  // ── Suppression facture ─────────────────────────────────────────────────────
  const deleteInvoice = useCallback(
    async (id: number): Promise<void> => {
      await InvoiceService.deleteInvoice(id);
      setInvoices((prev) => prev.filter((inv) => inv.id !== id));
      await fetchStats();
    },
    [fetchStats]
  );

  // ── Marquer comme payée ─────────────────────────────────────────────────────
  const markAsPaid = useCallback(
    async (id: number, payload?: MarkAsPaidPayload): Promise<void> => {
      await InvoiceService.markAsPaid(id, payload);
      
      // ✅ Mise à jour optimiste
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === id
            ? {
                ...inv,
                payment_status: "paid" as const,
                payment_date: payload?.payment_date ?? new Date().toISOString(),
                payment_method: payload?.payment_method ?? inv.payment_method,
                payment_reference: payload?.payment_reference ?? inv.payment_reference,
              }
            : inv
        )
      );
      
      await fetchStats();
    },
    [fetchStats]
  );

  return {
    invoices,
    stats,
    isLoading,
    statsLoading,
    error,
    meta,
    page,
    setPage,
    search,
    setSearch,
    filters,
    setFilters,
    fetchInvoices,
    fetchStats,
    fetchInvoicesByReport,
    createInvoice,
    deleteInvoice,
    markAsPaid,
  };
};