"use client";

/**
 * AttachmentViewer — affiche les pièces jointes (photos + PDFs)
 * retournées par le back dans les rapports, devis, factures, patrimoines.
 *
 * Structure attendue (union de tous les modèles back) :
 *   { id, url?, file_path?, path?, file_type?: "photo"|"document", ... }
 *
 * Règle URL : utilise `url` en priorité (accessor Laravel),
 * sinon construit depuis `file_path` ou `path`.
 */

import { useState } from "react";
import { FileText, Download, Eye, X, Image as ImageIcon, ZoomIn } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? "")
  .replace("/api/V1", "")
  .replace("/api/v1", "")
  .replace("/api", "");

export function resolveUrl(att: any): string {
  if (!att) return "";
  let p = "";
  if (typeof att === "string") {
    p = att;
  } else {
    p = att.url || att.file_path || att.path || att.original_url || "";
  }
  if (!p) return "";

  // 1. Si c'est déjà une URL absolue avec "http", on corrige les doublons ou /api/v1/storage
  if (p.startsWith("http")) {
    try {
      const urlObj = new URL(p);
      let pathName = urlObj.pathname;
      // Normalisation globale : supprimer /api/v1 ou /api/V1 si présent devant /storage ou /attachments
      pathName = pathName.replace(/\/api\/v[12]\/storage\//i, "/storage/");
      pathName = pathName.replace(/\/api\/v[12]\/attachments\//i, "/storage/attachments/");

      // Si l'URL contient encore /api/v1/ au début du path, on le nettoie
      if (pathName.startsWith("/api/v1/")) {
        pathName = pathName.replace("/api/v1/", "/");
      }
      return `${urlObj.origin}${pathName}`;
    } catch {
      return p;
    }
  }

  // 2. Format relatif (ex: public/attachments/xyz ou storage/xyz)
  let cleanP = p;

  // Parfois l'API renvoie une chaîne qui commence par api/v1/storage ou storage
  cleanP = cleanP.replace(/^\/?api\/v[12]\/storage\//i, "");
  cleanP = cleanP.replace(/^\/?api\/v[12]\//i, "");
  cleanP = cleanP.replace(/^\/?storage\//i, "");
  cleanP = cleanP.replace(/^public\//i, ""); // Si stocké sous 'public/' dans DB Laravel

  // // Cas particulier : si 'v1/' est resté au début
  // if (cleanP.toLowerCase().startsWith("v1/")) {
  //   cleanP = cleanP.substring(3);
  // }

  if (cleanP.startsWith("/")) cleanP = cleanP.substring(1);
  return `${BASE}/storage/${cleanP}`;
}

export function isImage(att: any): boolean {
  if (typeof att === "object" && att !== null) {
    if (att.file_type === "photo" || att.type === "image") return true;
    if (att.file_type === "document" || att.type === "pdf") return false;
  }
  const url = resolveUrl(att);
  return /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url);
}

export function isPdf(att: any): boolean {
  if (typeof att === "object" && att !== null) {
    if (att.file_type === "document" || att.type === "pdf") return true;
  }
  const url = resolveUrl(att);
  return /\.pdf(\?|$)/i.test(url);
}

function fileName(att: any): string {
  if (typeof att === "string") return att.split("/").pop() ?? "fichier";
  const p = att?.file_path ?? att?.path ?? att?.url ?? att?.name ?? "";
  return p.split("/").pop() ?? `fichier-${att?.id ?? ""}`;
}

// ─── PDF Preview Modal ────────────────────────────────────────────────────────

function PdfModal({ url, name, onClose }: { url: string; name: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-black/95 animate-in fade-in duration-200">
      <div className="flex items-center justify-between px-6 py-4 bg-black border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-red-600 flex items-center justify-center shrink-0">
            <FileText size={14} className="text-white" />
          </div>
          <p className="text-white font-bold text-sm truncate max-w-[400px]">{name}</p>
        </div>
        <div className="flex items-center gap-3">
          <a href={url} download target="_blank" rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition">
            <Download size={14} /> Télécharger
          </a>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition">
            <X size={18} className="text-white" />
          </button>
        </div>
      </div>
      <div className="flex-1">
        <iframe src={`${url}#toolbar=0`} className="w-full h-full border-0" title={name} />
      </div>
    </div>
  );
}

// ─── Image Lightbox ───────────────────────────────────────────────────────────

function ImageModal({ url, name, onClose }: { url: string; name: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 animate-in fade-in duration-200" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 transition">
        <X size={20} className="text-white" />
      </button>
      <a href={url} download target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
        className="absolute top-4 right-16 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition">
        <Download size={14} /> Télécharger
      </a>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={name}
        className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl shadow-2xl"
        onClick={e => e.stopPropagation()}
        onError={e => console.error("[AttachmentViewer] erreur image:", url, e)}
      />
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface AttachmentViewerProps {
  /** Tableau de pièces jointes (ReportAttachment, TicketAttachment, InvoiceAttachment, etc.) */
  attachments?: any[];
  /** PDF unique (Quote.pdf_path, Invoice.pdf_path) */
  singlePdf?: string | null;
  /** URL du PDF unique (Invoice.url) */
  singlePdfUrl?: string | null;
  /** Titre de la section */
  title?: string;
  /** Affichage compact (sans titre, inline) */
  compact?: boolean;
  className?: string;
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function AttachmentViewer({
  attachments = [],
  singlePdf,
  singlePdfUrl,
  title,
  compact = false,
  className = "",
}: AttachmentViewerProps) {
  const [pdfModal, setPdfModal] = useState<{ url: string; name: string } | null>(null);
  const [imageModal, setImageModal] = useState<{ url: string; name: string } | null>(null);

  // Construire la liste complète
  const allItems: any[] = [...attachments];

  // Ajouter le PDF unique s'il existe
  const pdfUrl = singlePdfUrl ?? (singlePdf ? resolveUrl(singlePdf) : null);
  if (pdfUrl) {
    allItems.push({ _single: true, url: pdfUrl, file_type: "document", file_path: singlePdf ?? "document.pdf" });
  }

  const images = allItems.filter(a => isImage(a));
  const docs = allItems.filter(a => isPdf(a) || (!isImage(a) && a.file_type === "document"));

  const hasContent = images.length > 0 || docs.length > 0;

  if (!hasContent) {
    if (compact) return null;
    return (
      <div className={`border border-dashed border-slate-200 rounded-2xl px-5 py-5 flex items-center gap-3 text-slate-400 ${className}`}>
        <FileText size={16} className="shrink-0" />
        <p className="text-sm font-medium">Aucune pièce jointe</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {title && !compact && (
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
          {title} ({allItems.length})
        </p>
      )}

      {/* ── Photos ── */}
      {images.length > 0 && (
        <div>
          {!compact && images.length > 0 && (
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Photos ({images.length})
            </p>
          )}
          <div className={`grid gap-2 ${compact ? "grid-cols-4" : "grid-cols-3"}`}>
            {images.map((att, i) => {
              const url = resolveUrl(att);
              const name = fileName(att);
              return (
                <button
                  key={att.id ?? i}
                  onClick={() => setImageModal({ url, name })}
                  className="relative aspect-square rounded-xl overflow-hidden border border-slate-100 hover:opacity-80 transition group"
                  title={name}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={name}
                    className="w-full h-full object-cover"
                    onError={e => {
                      console.error("[AttachmentViewer] erreur image:", url);
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
                    <ZoomIn size={20} className="text-white opacity-0 group-hover:opacity-100 transition" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Documents PDF ── */}
      {docs.length > 0 && (
        <div>
          {!compact && (
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Documents ({docs.length})
            </p>
          )}
          <div className="space-y-2">
            {docs.map((att, i) => {
              const url = resolveUrl(att);
              const name = fileName(att);
              return (
                <div key={att.id ?? i} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50">
                  <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                    <FileText size={16} className="text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{name}</p>
                    <p className="text-[10px] text-slate-400">PDF</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setPdfModal({ url, name })}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-bold hover:bg-white transition"
                    >
                      <Eye size={12} /> Aperçu
                    </button>
                    <a
                      href={url}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-black transition"
                    >
                      <Download size={12} />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modales */}
      {pdfModal && <PdfModal url={pdfModal.url} name={pdfModal.name} onClose={() => setPdfModal(null)} />}
      {imageModal && <ImageModal url={imageModal.url} name={imageModal.name} onClose={() => setImageModal(null)} />}
    </div>
  );
}
