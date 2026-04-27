// hooks/useReports.ts
import { useState, useCallback } from "react";
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
  isLoading: boolean;
  statsLoading: boolean;
  error: string | null;

  // Actions CRUD
  fetchReports: () => Promise<void>;
  fetchStats: () => Promise<void>;
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

export const useReports = (): UseReportsReturn => {
  // ── États ──────────────────────────────────────────────────────────────────
  const [reports, setReports] = useState<InterventionReport[]>([]);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Récupération liste rapports ────────────────────────────────────────────
  /**
   * Charge la liste complète des rapports d'intervention avec relations
   * Trie par date de création décroissante (plus récent en haut)
   */
  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await ReportService.getReports();
      let data: InterventionReport[] = [];
      
      if (Array.isArray(response)) {
        data = response;
      } else if (response && typeof response === 'object' && Array.isArray((response as any).items)) {
        // Cas paginé : { items: [...], meta: {...} }
        data = (response as any).items;
      }
      
      // Tri par created_at décroissante côté front
      const sorted = [...data].sort(
        (a, b) => new Date(b.created_at ?? "").getTime() - new Date(a.created_at ?? "").getTime()
      );
      setReports(sorted);
    } catch (err: any) {
      const message = err?.response?.data?.message ?? "Erreur lors de la récupération des rapports.";
      setError(message);
      console.error("Erreur fetchReports:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Récupération statistiques ──────────────────────────────────────────────
  /**
   * Charge les KPIs globaux (total, validés, en attente, note moyenne)
   * Non bloquant : si erreur, on affiche juste un warning console
   */
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await ReportService.getStats();
      setStats(data);
    } catch (err: any) {
      // Stats non critiques : on log juste un warning
      console.warn("Erreur stats rapports:", err?.response?.data?.message);
    } finally {
      setStatsLoading(false);
    }
  }, []);

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
      await ReportService.rejectReport(id, payload);
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
    [fetchStats]
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
    isLoading,
    statsLoading,
    error,

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
  };
};