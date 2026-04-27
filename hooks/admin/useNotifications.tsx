// hooks/useNotifications.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import api from "../../core/axios"; // Adjust path as needed
import { authService } from "../../services/AuthService";

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
  | "rapport";

export interface Notification {
  id:          string;
  source:      NotifSource;
  title:       string;
  summary:     string;       
  body:        string;       
  entityId?:   number;       
  entityLabel?:string;       
  href?:       string;       
  read:        boolean;
  createdAt:   string;       
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [initialized,   setInitialized]   = useState(false);
  const [unreadCount,   setUnreadCount]   = useState(0);

  // Déterminez le préfixe de l'API en fonction du rôle
  const apiPrefix = useMemo(() => {
    const role = authService.getRole();
    if (role === "MANAGER") return "/manager";
    if (role === "PROVIDER") return "/provider";
    return "/admin";
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await api.get(`${apiPrefix}/notifications`);
      // L'API Laravel Paginator renvoie ça sous data.data.data
      const items = Array.isArray(data?.data?.data) 
        ? data.data.data 
        : (Array.isArray(data?.data) ? data.data : []);
      
      const parsed: Notification[] = items.map((n: any) => {
        const notifData = n.data || {};
        const sourceStr = (notifData.type || notifData.source || "système").toLowerCase();
        let source: NotifSource = "système";
        if (sourceStr.includes("ticket")) source = "ticket";
        else if (sourceStr.includes("rapport") || sourceStr.includes("report")) source = "rapport";
        else if (sourceStr.includes("site")) source = "site";
        else if (sourceStr.includes("prestataire") || sourceStr.includes("provider")) source = "prestataire";
        else if (sourceStr.includes("patrimoine") || sourceStr.includes("asset")) source = "patrimoine";
        else if (sourceStr.includes("facture") || sourceStr.includes("invoice")) source = "facture";
        else if (sourceStr.includes("devis") || sourceStr.includes("quote")) source = "devis";
        else if (sourceStr.includes("user") || sourceStr.includes("utilisateur")) source = "utilisateur";

        // Génération automatique du lien de navigation selon le rôle + source + type
        const role = authService.getRole();
        const prefix = role === "MANAGER" ? "/manager" : role === "PROVIDER" ? "/provider" : "/admin";
        const entityId = notifData.id || notifData.entity_id || notifData.ticket_id || notifData.asset_id || notifData.report_id;
        const interventionType = (notifData.intervention_type || notifData.type_rapport || "").toLowerCase();
        const isPreventif = interventionType.includes("preventif") || interventionType.includes("prév");

        let autoHref = notifData.url || notifData.action_url || notifData.href;
        if (!autoHref) {
          if (source === "ticket") {
            autoHref = entityId ? `${prefix}/tickets/${entityId}` : `${prefix}/tickets`;
          } else if (source === "rapport") {
            // Rapport préventif → entretien, curatif → rapports
            if (isPreventif) {
              autoHref = `${prefix}/entretien`;
            } else {
              autoHref = entityId ? `${prefix}/rapports/${entityId}` : `${prefix}/rapports`;
            }
          } else if (source === "devis")      autoHref = entityId ? `${prefix}/devis/${entityId}` : `${prefix}/devis`;
          else if (source === "facture")      autoHref = entityId ? `${prefix}/factures/${entityId}` : `${prefix}/factures`;
          else if (source === "site")         autoHref = `${prefix}/sites`;
          else if (source === "patrimoine")   autoHref = `${prefix}/patrimoines`;
          else if (source === "prestataire")  autoHref = `${prefix}/prestataires`;
        }

        return {
          id: n.id,
          source: source,
          title: notifData.title || notifData.message || "Nouvelle notification",
          summary: notifData.summary || notifData.title || notifData.message || "",
          body: notifData.body || notifData.description || notifData.message || "",
          entityId: notifData.id || notifData.entity_id,
          entityLabel: notifData.label || notifData.reference,
          href: autoHref,
          read: n.read_at !== null,
          createdAt: n.created_at,
        };
      });

      setNotifications(parsed);
      setUnreadCount(parsed.filter(n => !n.read).length);
    } catch (error) {
      console.error("Erreur chargement notifications:", error);
    } finally {
      setInitialized(true);
    }
  }, [apiPrefix]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    // Optimistic UI update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    try {
      await api.post(`${apiPrefix}/notifications/${id}/read`);
    } catch (e) {
      console.error(e);
      // Rollback on fail
      fetchNotifications();
    }
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await api.post(`${apiPrefix}/notifications/read-all`);
    } catch (e) {
      console.error(e);
      fetchNotifications();
    }
  };

  const remove = async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    try {
      await api.delete(`${apiPrefix}/notifications/${id}`);
      fetchNotifications();
    } catch (e) {
      console.error(e);
      fetchNotifications();
    }
  };

  const addNotification = useCallback((
    notif: Omit<Notification, "id" | "read" | "createdAt">
  ) => {
    // Uniquement pour usage manuel dans l'UI si besoin interne
    const newNotif: Notification = {
      ...notif,
      id:        `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      read:      false,
      createdAt: new Date().toISOString(),
    };
    setNotifications(prev => [newNotif, ...prev]);
    setUnreadCount(prev => prev + 1);
  }, []);

  return {
    notifications,
    unreadCount,
    initialized,
    markAsRead,
    markAllAsRead,
    remove,
    addNotification,
    refresh: fetchNotifications
  };
};