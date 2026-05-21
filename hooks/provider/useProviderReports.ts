import { useState, useEffect, useCallback, useRef } from "react";
import {
  providerReportService,
  InterventionReport, ReportStats,
  CreateReportPayload, UpdateReportPayload,
} from "../../services/provider/providerReportService";

export type ReportFilterState = {
  status?: string;
  type?:   string;
  date_from?: string;
  date_to?:   string;
  page?:      number;
  search?:    string; // Ajouté
};

export interface UseProviderReportsReturn {
  // Données
  reports:         InterventionReport[];
  filteredReports: InterventionReport[];
  stats:           ReportStats | null;
  meta:            any;
  selectedReport:  InterventionReport | null;
  // Loaders
  loading:         boolean;
  statsLoading:    boolean;
  submitting:      boolean;
  // Messages
  error:           string;
  submitSuccess:   string;
  submitError:     string;
  // UI state
  isPanelOpen:  boolean;
  isCreateOpen: boolean;
  isEditOpen:   boolean;
  filters:      ReportFilterState;
  // Actions
  openPanel:    (r: InterventionReport) => void;
  closePanel:   () => void;
  openCreate:   () => void;
  closeCreate:  () => void;
  openEdit:     (r: InterventionReport) => void;
  closeEdit:    () => void;
  setFilters:   (f: ReportFilterState) => void;
  createReport: (p: CreateReportPayload)          => Promise<boolean>;
  updateReport: (id: number, p: UpdateReportPayload) => Promise<boolean>;
  exportXlsx:   () => Promise<void>;
  refresh:      () => void;
}

export function useProviderReports(initialFilters: ReportFilterState = {}): UseProviderReportsReturn {
  const [reports,        setReports]        = useState<InterventionReport[]>([]);
  const [stats,          setStats]          = useState<ReportStats | null>(null);
  const [meta,           setMeta]           = useState<any>(null);
  const [selectedReport, setSelectedReport] = useState<InterventionReport | null>(null);

  const [loading,      setLoading]      = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [submitting,   setSubmitting]   = useState(false);

  const [error,         setError]         = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [submitError,   setSubmitError]   = useState("");

  const [isPanelOpen,  setIsPanelOpen]  = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen,   setIsEditOpen]   = useState(false);
  const [filters,      setFiltersState] = useState<ReportFilterState>(initialFilters);
  const [debouncedSearch, setDebouncedSearch] = useState<string | undefined>(initialFilters.search);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── flash ──────────────────────────────────────────────────────────────────
  const flash = (type: "success" | "error", msg: string) => {
    if (type === "success") { setSubmitSuccess(msg); setTimeout(() => setSubmitSuccess(""), 4500); }
    else                    { setSubmitError(msg);   setTimeout(() => setSubmitError(""),   5000); }
  };

  // ── fetchReports ──────────────────────────────────────────────────────────
  const fetchReports = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params: Record<string, any> = { per_page: 10, page: filters.page || 1 };
      const requestedType = filters.type;
      
      // Le type demandé (preventif / curatif) est directement transmis à l'API pour un filtrage serveur précis et cohérent
      if (requestedType) {
        params.intervention_type = requestedType;
      }
      
      if (filters.status)    params.status            = filters.status;
      if (filters.date_from) params.date_debut        = filters.date_from;
      if (filters.date_to)   params.date_fin          = filters.date_to;
      if (debouncedSearch)   params.search            = debouncedSearch;
      
      const response = await providerReportService.getReports(params);
      let items = response.items;

      // Normalisation des types en fonction du contexte (planning ou ticket préventif)
      items = items.map(r => {
        const isPreventif = r.intervention_type === "preventif" || !!r.planning_id;
        return { ...r, intervention_type: isPreventif ? "preventif" : "curatif" };
      });

      // Sécurité Front : Filtrage par type si le backend a renvoyé des données mixtes
      if (requestedType) {
        items = items.filter(r => r.intervention_type === requestedType);
      }

      // Calcul du total intelligent
      let metaTotal = response.meta?.total ?? items.length;
      
      // Si on a un breakdown par type dans la réponse, c'est la source la plus fiable pour le total filtré
      if (requestedType && response.stats?.reports_by_type) {
        const matching = response.stats.reports_by_type.find((i: any) => i.intervention_type === requestedType);
        if (matching) metaTotal = matching.count;
      }

      setReports(items);
      setMeta({ ...response.meta, total: metaTotal });
      
      // Synchronisation rigoureuse des statistiques
      const isPending = (s: string) => ["submitted", "pending", "soumis"].includes(s?.toLowerCase());
      const isValidated = (s: string) => s?.toLowerCase() === "validated";

      const localValidated = items.filter(r => isValidated(r.status)).length;
      const localPending = items.filter(r => isPending(r.status)).length;

      setStats(prev => {
        const baseStats = response.stats || prev || { total_reports: 0, validated_reports: 0, pending_reports: 0, rejected_reports: 0, average_rating: 0 };
        
        // On force le total
        let newTotal = metaTotal;
        let newVal = baseStats.validated_reports;
        let newPen = baseStats.pending_reports;

        // Force la cohérence locale
        if (items.length >= metaTotal) {
          // Si on a tout en main, les calculs locaux sont les seuls vrais
          newVal = localValidated;
          newPen = localPending;
        } else {
          // Si paginé, on s'assure au moins de la cohérence visuelle
          if (newVal > metaTotal) newVal = localValidated;
          if (newPen > metaTotal) newPen = localPending;
          if (localPending > 0 && newPen === 0) newPen = localPending;
          if (localValidated > 0 && newVal === 0) newVal = localValidated;
        }

        return {
          ...baseStats,
          total_reports: newTotal,
          validated_reports: newVal,
          pending_reports: newPen,
          rejected_reports: items.length >= metaTotal ? items.filter(r => r.status === "rejected").length : (baseStats.rejected_reports ?? 0)
        };
      });
    } catch (e: any) {
      setError(e.response?.data?.message ?? e.response?.data?.error ?? "Erreur lors du chargement des rapports.");
    } finally { setLoading(false); }
  }, [filters, debouncedSearch]);

  // ── fetchStats ─────────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const params: Record<string, any> = {};
      const t = filters.type;
      if (t) {
        params.intervention_type = t;
      }

      if (filters.status)    params.status            = filters.status;
      if (filters.date_from) params.date_debut        = filters.date_from;
      if (filters.date_to)   params.date_fin          = filters.date_to;
      if (debouncedSearch)   params.search            = debouncedSearch;
      
      const resStats = await providerReportService.getStats(params);
      
      // Smart Filter : si le back renvoie un total global (ex: 37 au lieu de 8), on essaie de filtrer par type
      let finalStats = { ...resStats };
      if (t && finalStats.reports_by_type) {
        const matching = finalStats.reports_by_type.find((i: any) => i.intervention_type === t);
        if (matching) finalStats.total_reports = matching.count;
      }

      setStats(prev => {
        // Si fetchReports a déjà fourni des stats plus précises (filtrées par type/status), on ne met à jour que les champs globaux
        if (prev && prev.total_reports !== undefined && finalStats.total_reports > prev.total_reports && t) {
          return {
            ...prev,
            average_rating: finalStats.average_rating,
            reports_by_type: finalStats.reports_by_type,
            reports_by_status: finalStats.reports_by_status
          };
        }
        return finalStats;
      });
    }
    catch { /* non bloquant */ }
    finally { setStatsLoading(false); }
  }, [filters, debouncedSearch]);

  // Debounce search input
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 400);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [filters.search]);

  useEffect(() => {
    fetchReports();
    fetchStats();
  }, [filters, fetchReports, fetchStats]);

  const setFilters = (f: ReportFilterState) => {
    setFiltersState(prev => {
      const next = { ...prev, ...f };
      if (f.search !== undefined) {
        next.page = 1;
      }
      return next;
    });
  };

  const filteredReports = reports;

  // ── panel aperçu ───────────────────────────────────────────────────────────
  const openPanel  = (r: InterventionReport) => { setSelectedReport(r); setIsPanelOpen(true); };
  const closePanel = () => { setIsPanelOpen(false); setTimeout(() => setSelectedReport(null), 300); };

  // ── modale création ────────────────────────────────────────────────────────
  const openCreate  = () => setIsCreateOpen(true);
  const closeCreate = () => setIsCreateOpen(false);

  // ── modale édition ─────────────────────────────────────────────────────────
  const openEdit  = (r: InterventionReport) => { setSelectedReport(r); setIsEditOpen(true); };
  const closeEdit = () => { setIsEditOpen(false); setTimeout(() => setSelectedReport(null), 300); };

  // ── createReport ───────────────────────────────────────────────────────────
  const createReport = async (payload: CreateReportPayload): Promise<boolean> => {
    setSubmitting(true);
    try {
      const created = await providerReportService.createReport(payload);
      // Ajout optimiste en tête de liste
      setReports(prev => [created, ...prev]);
      flash("success", "Rapport soumis avec succès. Le gestionnaire a été notifié.");
      closeCreate();
      fetchStats();
      return true;
    } catch (e: any) {
      flash("error", e.response?.data?.message ?? e.response?.data?.error ?? "Erreur lors de la soumission.");
      return false;
    } finally { setSubmitting(false); }
  };

  // ── updateReport ───────────────────────────────────────────────────────────
  const updateReport = async (id: number, payload: UpdateReportPayload): Promise<boolean> => {
    setSubmitting(true);
    try {
      const updated = await providerReportService.updateReport(id, payload);
      setReports(prev => prev.map(r => r.id === id ? updated : r));
      setSelectedReport(prev => prev?.id === id ? updated : prev);
      flash("success", "Rapport mis à jour avec succès.");
      closeEdit();
      return true;
    } catch (e: any) {
      const status = e.response?.status;
      if (status === 422) flash("error", "Impossible de modifier un rapport déjà validé.");
      else if (status === 403) flash("error", "Accès refusé : ce rapport ne vous appartient pas.");
      else flash("error", e.response?.data?.message ?? "Erreur lors de la mise à jour.");
      return false;
    } finally { setSubmitting(false); }
  };

  // ── export ─────────────────────────────────────────────────────────────────
  const exportXlsx = async () => {
    try { await providerReportService.exportXlsx(); }
    catch { flash("error", "Erreur lors de l'export."); }
  };

  return {
    reports, filteredReports, stats, meta, selectedReport,
    loading, statsLoading, submitting,
    error, submitSuccess, submitError,
    isPanelOpen, isCreateOpen, isEditOpen, filters,
    openPanel, closePanel, openCreate, closeCreate, openEdit, closeEdit,
    setFilters, createReport, updateReport, exportXlsx,
    refresh: fetchReports,
  };
}