/**
 * core/export.ts
 * Utilitaire d'export XLSX avec design CANAL+ (noir & blanc)
 * Utilise SheetJS (xlsx) déjà installé dans le projet
 */

import * as XLSX from "xlsx";

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

export interface ExportOptions {
  filename: string;
  sheetName?: string;
  title?: string;
}

/**
 * Exporte un tableau de données en XLSX avec le style CANAL+
 * Design : en-têtes noirs sur fond blanc, police bold, bordures fines
 */
export function exportToXlsx<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn[],
  options: ExportOptions
): void {
  const { filename, sheetName = "Données", title } = options;

  // Ligne de titre optionnelle
  const rows: any[][] = [];

  if (title) {
    rows.push([title]);
    rows.push([]); // ligne vide
  }

  // En-têtes
  rows.push(columns.map(c => c.header));

  // Données
  data.forEach(item => {
    rows.push(columns.map(c => {
      const val = item[c.key];
      if (val === null || val === undefined) return "—";
      if (typeof val === "boolean") return val ? "Oui" : "Non";
      return val;
    }));
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Largeurs de colonnes
  ws["!cols"] = columns.map(c => ({ wch: c.width ?? 20 }));

  // Fusion titre si présent
  if (title) {
    ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: columns.length - 1 } }];
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Métadonnées
  wb.Props = {
    Title: title || filename,
    Author: "CANAL+ Facility Management",
    CreatedDate: new Date(),
  };

  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * Télécharge un Blob XLSX reçu du backend
 * (pour les exports serveur-side)
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
