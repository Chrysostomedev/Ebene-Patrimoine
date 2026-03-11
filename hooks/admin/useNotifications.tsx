// hooks/useNotifications.ts
"use client";

import { useState, useEffect, useCallback } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

export type NotifSource =
  | "ticket"
  | "site"
  | "prestataire"
  | "patrimoine"
  | "facture"
  | "devis"
  | "utilisateur"
  | "système";

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

// ── Clé localStorage ─────────────────────────────────────────────────────────

const LS_KEY = "canalplus_notifications";

// ── Helpers ──────────────────────────────────────────────────────────────────

const load = (): Notification[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Notification[]) : seedNotifications();
  } catch {
    return seedNotifications();
  }
};

const save = (notifs: Notification[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(notifs));
};

// Données de démo — uniquement si localStorage vide
const seedNotifications = (): Notification[] => {
  const now = new Date();
  const ago = (minutes: number) =>
    new Date(now.getTime() - minutes * 60 * 1000).toISOString();

  const items: Notification[] = [
    {
      id: "notif-1",
      source: "ticket",
      title: "Nouveau ticket signalé",
      summary: "Un ticket curatif a été ouvert sur le site Abidjan Centre.",
      body: "Le prestataire Électricité Pro a signalé une panne électrique critique sur le site Abidjan Centre. Le ticket #104 est en attente de validation. Veuillez l'assigner à un technicien disponible dans les plus brefs délais.",
      entityId: 104,
      entityLabel: "Ticket #104",
      href: "/admin/tickets",
      read: false,
      createdAt: ago(5),
    },
    {
      id: "notif-2",
      source: "prestataire",
      title: "Prestataire activé",
      summary: "ACME Maintenance vient d'être activé sur la plateforme.",
      body: "Le prestataire ACME Maintenance (service : Climatisation) a été activé par l'administrateur. Son compte est désormais opérationnel et il peut recevoir des tickets d'intervention.",
      entityId: 12,
      entityLabel: "ACME Maintenance",
      href: "/admin/prestataires",
      read: false,
      createdAt: ago(22),
    },
    {
      id: "notif-3",
      source: "site",
      title: "Site mis à jour",
      summary: "Les informations du site Plateau ont été modifiées.",
      body: "Le responsable du site Plateau (réf. contrat : CTR-2024-089) a été mis à jour. Le nouveau responsable est M. Kouamé Yves. Les équipes ont été notifiées par email.",
      entityId: 7,
      entityLabel: "Site Plateau",
      href: "/admin/sites",
      read: false,
      createdAt: ago(60),
    },
    {
      id: "notif-4",
      source: "facture",
      title: "Facture en attente de validation",
      summary: "La facture FAC-2024-0178 dépasse l'échéance de 3 jours.",
      body: "La facture FAC-2024-0178 d'un montant de 1 250 000 FCFA est en retard de paiement depuis 3 jours. Veuillez la valider ou contacter le prestataire concerné pour régulariser la situation.",
      entityId: 178,
      entityLabel: "FAC-2024-0178",
      href: "/admin/factures",
      read: false,
      createdAt: ago(180),
    },
    {
      id: "notif-5",
      source: "patrimoine",
      title: "Patrimoine ajouté",
      summary: "Un nouveau groupe électrogène a été enregistré.",
      body: "Un nouveau patrimoine de type « Groupe Électrogène 250 KVA » (codification : GE-ABJ-0023) a été ajouté au site Cocody Danga. Sa valeur d'entrée est de 4 800 000 FCFA.",
      entityId: 89,
      entityLabel: "GE-ABJ-0023",
      href: "/admin/patrimoines",
      read: true,
      createdAt: ago(420),
    },
    {
      id: "notif-6",
      source: "utilisateur",
      title: "Nouvel administrateur créé",
      summary: "Un compte administrateur a été créé pour Konan Serge.",
      body: "L'administrateur Konan Serge (konan.serge@canalplus.ci) a été créé avec le rôle Admin. Il a reçu ses identifiants par email et peut désormais accéder à la plateforme.",
      entityId: 34,
      entityLabel: "Konan Serge",
      href: "/admin/roles",
      read: true,
      createdAt: ago(1440),
    },
    {
      id: "notif-7",
      source: "devis",
      title: "Devis soumis pour approbation",
      summary: "Le devis DEV-2024-0055 attend votre validation.",
      body: "Le prestataire Plomberie Générale a soumis le devis DEV-2024-0055 d'un montant de 890 000 FCFA pour des travaux de rénovation sur le site Marcory. Ce devis expire dans 5 jours.",
      entityId: 55,
      entityLabel: "DEV-2024-0055",
      href: "/admin/devis",
      read: true,
      createdAt: ago(2880),
    },
  ];

  save(items);
  return items;
};

// ── Hook ─────────────────────────────────────────────────────────────────────

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [initialized,   setInitialized]   = useState(false);

  // Charge depuis localStorage côté client uniquement
  useEffect(() => {
    setNotifications(load());
    setInitialized(true);
  }, []);

  const persist = useCallback((updated: Notification[]) => {
    setNotifications(updated);
    save(updated);
  }, []);

  // Marque une notification comme lue
  const markAsRead = useCallback((id: string) => {
    const updated = notifications.map(n =>
      n.id === id ? { ...n, read: true } : n
    );
    persist(updated);
  }, [notifications, persist]);

  // Marque toutes comme lues
  const markAllAsRead = useCallback(() => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    persist(updated);
  }, [notifications, persist]);

  // Supprime une notification
  const remove = useCallback((id: string) => {
    const updated = notifications.filter(n => n.id !== id);
    persist(updated);
  }, [notifications, persist]);

  // Ajoute une nouvelle notification (appelable depuis n'importe quelle page)
  const addNotification = useCallback((
    notif: Omit<Notification, "id" | "read" | "createdAt">
  ) => {
    const newNotif: Notification = {
      ...notif,
      id:        `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      read:      false,
      createdAt: new Date().toISOString(),
    };
    const updated = [newNotif, ...notifications];
    persist(updated);
  }, [notifications, persist]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    initialized,
    markAsRead,
    markAllAsRead,
    remove,
    addNotification,
  };
};