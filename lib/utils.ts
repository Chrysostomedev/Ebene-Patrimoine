// Pour le formatage des dates et consorts, il faut utiliser le format français (fr-FR) . 

/**
 * Formate une date en chaîne de caractères (JJ/MM/AAAA [à HH:mm])
 */
export function formatDate(iso?: string | null | Date, options?: Intl.DateTimeFormatOptions): string {
  if (!iso) return "-";

  // Conversion robuste en objet Date
  let d: Date;
  if (iso instanceof Date) {
    d = iso;
  } else {
    // Si c'est une chaîne, on s'assure qu'elle est bien interprétée (ISO standard)
    // Remplacer l'espace par 'T' pour un format ISO standard si c'est une chaîne date-heure "YYYY-MM-DD HH:mm:ss"
    let str = String(iso).trim();
    if (str.includes(" ") && !str.includes("T")) {
      str = str.replace(" ", "T");
    }
    d = new Date(str);
  }

  if (isNaN(d.getTime())) return typeof iso === "string" ? iso : "-";

  if (options) {
    return d.toLocaleDateString("fr-FR", options);
  }

  const date = d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const time = d.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Si l'heure est 00:00, on n'affiche que la date pour rester propre,
  // SAUF si l'utilisateur veut explicitement voir l'heure ou si c'est un champ temporel critique.
  // Ici, on retourne la date et l'heure si elle n'est pas à minuit pile.
  return time === "00:00" ? date : `${date} ${time}`;
}


/**
 * Formate un montant en FCFA
 */
export function formatCurrency(amount?: number | string | null): string {
  if (amount === undefined || amount === null || amount === "") return "-";
  const val = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(val)) return String(amount);

  return val.toLocaleString("fr-FR") + " FCFA";
}

/**
 * Formate un nombre d'heures (Durée)
 */
export function formatHeures(h?: number | null | string): string {
  if (h === undefined || h === null || h === "") return "-";
  const val = typeof h === "string" ? parseFloat(h) : h;
  if (isNaN(val)) return String(h);
  return `${val.toLocaleString("fr-FR")}h`;
}

/**
 * Formate un nombre avec séparateurs de milliers
 */
export function formatNumber(n?: number | null | string): string {
  if (n === undefined || n === null || n === "") return "-";
  const val = typeof n === "string" ? parseFloat(n) : n;
  if (isNaN(val)) return String(n);
  return val.toLocaleString("fr-FR");
}

