/**
 * Utilitaires de formatage de dates — partagés entre toutes les pages
 */

/** Formate une date ISO en dd/mm/yyyy [à HH:mm] */
export const formatDate = (iso?: string | null): string => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const date = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return time === "00:00" ? date : `${date} à ${time}`;
};

/** Formate une date ISO en format long : "11 avril 2026" */
export const formatDateLong = (iso?: string | null): string => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
};

/** Formate une date ISO en format court : "11/04/2026" */
export const formatDateShort = (iso?: string | null): string => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

/** Formate uniquement l'heure : "14:30" */
export const formatTime = (iso?: string | null): string => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
};

/** Temps relatif : "il y a 5 min", "il y a 2 h", etc. */
export const timeAgo = (iso: string): string => {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)        return "À l'instant";
  if (diff < 3600)      return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400)     return `il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 7) return `il y a ${Math.floor(diff / 86400)} j`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
};
