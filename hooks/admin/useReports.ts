// hooks/useReports.ts
import { useState, useCallback, useEffect } from "react";
import {
  InterventionReport,
  ReportStats,
  ReportService,
  CreateReportPayload,
  UpdateReportPayload,
  ValidateReportPayload,
  RejectReportPayload,
} from "../../services/admin/report.service";

// ═══════════════════════════════════════════════════════════════════════════
// INTERFACE DU HOOK
// ═══════════════════════════════════════════════════════════════════════════

interface UseReportsReturn {
  // État
  reports: InterventionReport[];
  stats: ReportStats | null;
  meta: any;
  isLoading: boolean;
  statsLoading: boolean;
  error: string | null;
  filters: Record<string, any>;

  // Actions
  setFilters: (f: Record<string, any>) => void;
  fetchReports: () => Promise<void>;
  fetchStats: () => Promise<void>;
  resetFilters: () => void;
  fetchReportsByTicket: (ticketId: number) => Promise<InterventionReport[]>;
  fetchReportsByProvider: (providerId: number) => Promise<InterventionReport[]>;
  createReport: (payload: CreateReportPayload) => Promise<InterventionReport>;
  updateReport: (id: number, payload: UpdateReportPayload) => Promise<InterventionReport>;
  deleteReport: (id: number) => Promise<void>;

  // Actions validation
  validateReport: (id: number, payload: ValidateReportPayload) => Promise<void>;
  rejectReport: (id: number, payload: RejectReportPayload) => Promise<void>;

  // Gestion pièces jointes
  deleteAttachment: (reportId: number, attachmentId: number) => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export const useReports = (initialFilters: Record<string, any> = {}): UseReportsReturn => {
  // ── États ──────────────────────────────────────────────────────────────────
  const [reports, setReports] = useState<InterventionReport[]>([]);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [meta, setMeta] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<Record<string, any>>(initialFilters);

  const setFilters = useCallback((f: Record<string, any>) => {
    setFiltersState(prev => ({ ...prev, ...f }));
  }, []);

  // ── Récupération liste rapports ────────────────────────────────────────────
  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Nettoyage des filtres pour l'API
      const apiParams: Record<string, any> = { per_page: 15, ...filters };
      const requestedType = filters.type || filters.intervention_type;

      // Le type demandé (preventif / curatif) est directement transmis à l'API pour un filtrage serveur précis et cohérent
      if (requestedType) {
        apiParams.intervention_type = requestedType;
      }

      const response = await ReportService.getReports(apiParams);
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

      const sorted = [...items].sort(
        (a, b) => new Date(b.created_at ?? "").getTime() - new Date(a.created_at ?? "").getTime()
      );
      setReports(sorted);
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
    } catch (err: any) {
      const message = err?.response?.data?.message ?? "Erreur lors de la récupération des rapports.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // ── Récupération statistiques ──────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const params: Record<string, any> = {};
      const t = filters.type || filters.intervention_type;
      if (t) {
        params.intervention_type = t;
        params.type = t;
      }
      
      // Sécurité : Scoping par provider_id si prestataire ou manager (si ID présent dans localStorage)
      const userId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;
      const userRole = typeof window !== "undefined" ? localStorage.getItem("user_role") : null;
      if (userRole === "PROVIDER" && userId) params.provider_id = userId;

      if (filters.status) params.status = filters.status;
      if (filters.date_debut) params.date_debut = filters.date_debut;
      if (filters.date_fin) params.date_fin = filters.date_fin;
      
      const data = await ReportService.getStats(params);
      
      // Smart Filter : si le back renvoie un total global, on essaie de filtrer par le breakdown type
      let finalStats = { ...data };
      if (t && finalStats.reports_by_type) {
        const matching = finalStats.reports_by_type.find((i: any) => i.intervention_type === t);
        if (matching) finalStats.total_reports = matching.count;
      }

      setStats(prev => {
        // Si on a déjà des stats cohérentes venant de fetchReports, on ne garde que les champs "globaux" (ex: average_rating)
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
    } catch (err: any) {
      console.warn("Erreur stats rapports:", err?.response?.data?.message);
    } finally {
      setStatsLoading(false);
    }
  }, [filters]);

  // Synchronisation automatique
  useEffect(() => {
    fetchReports();
    fetchStats();
  }, [fetchReports, fetchStats]);

  const resetFilters = useCallback(() => {
    setFiltersState(initialFilters);
  }, [initialFilters]);

  // ── Récupération rapports d'un ticket ──────────────────────────────────────
  /**
   * Récupère tous les rapports liés à un ticket spécifique
   * Utile pour afficher l'historique complet des interventions
   */
  const fetchReportsByTicket = useCallback(async (ticketId: number): Promise<InterventionReport[]> => {
    try {
      const response = await ReportService.getReportsByTicket(ticketId);
      let data: InterventionReport[] = [];

      if (Array.isArray(response)) {
        data = response;
      } else if (response && typeof response === 'object' && Array.isArray((response as any).items)) {
        data = (response as any).items;
      }

      return data.sort(
        (a, b) => new Date(b.created_at ?? "").getTime() - new Date(a.created_at ?? "").getTime()
      );
    } catch (err: any) {
      console.error("Erreur fetchReportsByTicket:", err);
      return [];
    }
  }, []);

  // ── Récupération rapports d'un prestataire ─────────────────────────────────
  /**
   * Récupère tous les rapports d'un prestataire spécifique
   * Utile pour l'évaluation de performance du prestataire
   */
  const fetchReportsByProvider = useCallback(async (providerId: number): Promise<InterventionReport[]> => {
    try {
      const response = await ReportService.getReportsByProvider(providerId);
      let data: InterventionReport[] = [];

      if (Array.isArray(response)) {
        data = response;
      } else if (response && typeof response === 'object' && Array.isArray((response as any).items)) {
        data = (response as any).items;
      }

      return data.sort(
        (a, b) => new Date(b.created_at ?? "").getTime() - new Date(a.created_at ?? "").getTime()
      );
    } catch (err: any) {
      console.error("Erreur fetchReportsByProvider:", err);
      return [];
    }
  }, []);

  // ── Création rapport ────────────────────────────────────────────────────────
  /**
   * Créer un nouveau rapport d'intervention
   * Supporte l'upload multi-fichiers (photos + PDF)
   * Rafraîchit automatiquement la liste et les stats après création
   */
  const createReport = useCallback(
    async (payload: CreateReportPayload): Promise<InterventionReport> => {
      const newReport = await ReportService.createReport(payload);
      // Rafraîchissement auto de la liste
      await fetchReports();
      await fetchStats();
      return newReport;
    },
    [fetchReports, fetchStats]
  );

  // ── Mise à jour rapport ─────────────────────────────────────────────────────
  /**
   * Modifier un rapport existant
   * Interdit si status = "validated" (rapport validé = immuable)
   * Les nouvelles pièces jointes s'ajoutent aux existantes
   */
  const updateReport = useCallback(
    async (id: number, payload: UpdateReportPayload): Promise<InterventionReport> => {
      const updated = await ReportService.updateReport(id, payload);
      // Mise à jour optimiste dans la liste locale
      setReports((prev) => prev.map((r) => (r.id === id ? updated : r)));
      return updated;
    },
    []
  );

  // ── Suppression rapport ─────────────────────────────────────────────────────
  /**
   * Supprimer un rapport d'intervention
   * Interdit si une facture est liée
   * Rafraîchit automatiquement la liste et les stats
   */
  const deleteReport = useCallback(
    async (id: number): Promise<void> => {
      await ReportService.deleteReport(id);
      // Suppression optimiste de la liste locale
      setReports((prev) => prev.filter((r) => r.id !== id));
      await fetchStats();
    },
    [fetchStats]
  );

  // ── Validation rapport ──────────────────────────────────────────────────────
  /**
   * Valider un rapport avec notation (1-5 étoiles) et commentaire
   * Status → "validated", validated_at = now()
   * 
   * EFFETS MÉTIER :
   * - Si rating >= 4 : Score prestataire augmenté
   * - Si rapport RAS : Ticket fermé automatiquement
   * - Si anomalie détectée : Nouveau ticket curatif créé
   * 
   * Mise à jour optimiste locale + rafraîchissement stats
   */
  const validateReport = useCallback(
    async (id: number, payload: ValidateReportPayload): Promise<void> => {
      await ReportService.validateReport(id, payload);
      // Mise à jour optimiste immédiate dans l'UI
      setReports((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
              ...r,
              status: "validated" as const,
              rating: payload.rating ?? r.rating,
              manager_comment: payload.comment ?? r.manager_comment,
              validated_at: new Date().toISOString(),
            }
            : r
        )
      );
      await fetchStats();
    },
    [fetchStats]
  );

  // ── Rejet rapport ───────────────────────────────────────────────────────────
  /**
   * Rejeter un rapport avec motif obligatoire
   * Status → "rejected", prestataire peut corriger et re-soumettre
   */
  const rejectReport = useCallback(
    async (id: number, payload: RejectReportPayload): Promise<void> => {
      const targetReport = reports.find((r) => r.id === id);
      const ticketId = targetReport?.ticket_id || (targetReport as any)?.ticket?.id;
      if (!ticketId) {
        throw new Error("Impossible de rejeter le rapport : ID de ticket introuvable.");
      }
      await ReportService.rejectReport(ticketId, payload);
      // Mise à jour optimiste
      setReports((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
              ...r,
              status: "rejected" as const,
              rejection_reason: payload.reason,
              rejected_at: new Date().toISOString(),
            }
            : r
        )
      );
      await fetchStats();
    },
    [reports, fetchStats]
  );

  // ── Suppression pièce jointe ────────────────────────────────────────────────
  /**
   * Supprimer une pièce jointe spécifique d'un rapport
   * Met à jour localement la liste des attachments du rapport
   */
  const deleteAttachment = useCallback(async (reportId: number, attachmentId: number): Promise<void> => {
    await ReportService.deleteAttachment(reportId, attachmentId);
    // Suppression optimiste de l'attachment dans la liste locale
    setReports((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? { ...r, attachments: r.attachments?.filter((att) => att.id !== attachmentId) }
          : r
      )
    );
  }, []);

  // ── Return ──────────────────────────────────────────────────────────────────
  return {
    // État
    reports,
    stats,
    meta,
    isLoading,
    statsLoading,
    error,
    filters,

    // Actions CRUD
    fetchReports,
    fetchStats,
    fetchReportsByTicket,
    fetchReportsByProvider,
    createReport,
    updateReport,
    deleteReport,

    // Actions validation
    validateReport,
    rejectReport,

    // Gestion pièces jointes
    deleteAttachment,

    // Filtres
    setFilters,
    resetFilters,
  };
};