import { useState, useEffect, useCallback } from "react";
import {
  providerNotificationService,
  ApiNotification,
  NotificationResponse,
} from "../../services/provider/providerNotificationService";

// ── Types ────────────────────────────────────────────────────────────────────

export type NotifSource =
  | "ticket"
  | "site"
  | "prestataire"
  | "patrimoine"
  | "facture"
  | "devis"
  | "utilisateur"
  | "système"
  | string;

export interface Notification {
  id:          string;
  source:      NotifSource;
  title:       string;
  summary:     string;       // ligne courte affichée dans la liste
  body:        string;       // texte complet affiché dans le détail
  entityId?:   number;       // ID de l'entité liée (ticket, site, etc.)
  entityLabel?:string;       // ex: "Ticket #42", "Site Abidjan Centre"
  href?:       string;       // lien de navigation optionnel
  read:        boolean;
  createdAt:   string;       // ISO string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function mapApiToFrontend(api: ApiNotification): Notification {
  const sourceStr = (api.data?.source || "système").toLowerCase();
  let source: NotifSource = "système";
  if (sourceStr.includes("ticket"))    source = "ticket";
  else if (sourceStr.includes("rapport") || sourceStr.includes("report")) source = "rapport";
  else if (sourceStr.includes("devis") || sourceStr.includes("quote"))    source = "devis";
  else if (sourceStr.includes("facture") || sourceStr.includes("invoice")) source = "facture";
  else if (sourceStr.includes("planning")) source = "planning";

  // Génération automatique du lien selon la source (provider)
  const entityId = api.data?.entity_id;
  let autoHref = api.data?.href;
  if (!autoHref) {
    if (source === "ticket")   autoHref = "/provider/tickets";
    else if (source === "rapport") autoHref = "/provider/rapports";
    else if (source === "devis")   autoHref = "/provider/devis";
    else if (source === "facture") autoHref = "/provider/factures";
    else if (source === "planning") autoHref = "/provider/planning";
  }

  return {
    id:          api.id,
    source,
    title:       api.data?.title   || "Notification",
    summary:     api.data?.summary || api.data?.message || "Vous avez une nouvelle notification",
    body:        api.data?.body    || api.data?.message || "",
    entityId:    typeof api.data?.entity_id === "number" ? api.data.entity_id : undefined,
    entityLabel: api.data?.entity_label,
    href:        autoHref,
    read:        !!api.read_at,
    createdAt:   api.created_at,
  };
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [loading,       setLoading]       = useState(false);
  const [initialized,   setInitialized]   = useState(false);

  // Charge depuis l'API
  const fetchNotifications = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await providerNotificationService.getNotifications(page);
      const mapped = res.data.map(mapApiToFrontend);
      setNotifications(mapped);
      
      // Update unread count (on peut aussi appeler le endpoint unread)
      const unreadRes = await providerNotificationService.getUnreadNotifications();
      setUnreadCount(unreadRes.length);
    } catch (error) {
      console.error("Erreur lors du chargement des notifications:", error);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Marque une notification comme lue
  const markAsRead = useCallback(async (id: string) => {
    try {
      await providerNotificationService.markAsRead(id);
      setNotifications(prev => prev.map(n =>
        n.id === id ? { ...n, read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Erreur markAsRead:", error);
    }
  }, []);

  // Marque toutes comme lues
  const markAllAsRead = useCallback(async () => {
    try {
      await providerNotificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Erreur markAllAsRead:", error);
    }
  }, []);

  // Supprime une notification
  const remove = useCallback(async (id: string) => {
    try {
      await providerNotificationService.deleteNotification(id);
      const wasRead = notifications.find(n => n.id === id)?.read;
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (!wasRead) setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Erreur remove notification:", error);
    }
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    loading,
    initialized,
    markAsRead,
    markAllAsRead,
    remove,
    refresh: fetchNotifications,
  };
};