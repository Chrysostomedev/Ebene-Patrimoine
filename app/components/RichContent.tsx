"use client";

/**
 * RichContent — affiche du HTML produit par le RichTextEditor
 * avec les styles inline préservés (gras, couleur, fond, italique…)
 * Utilise dangerouslySetInnerHTML de façon sécurisée (contenu interne uniquement).
 */

interface RichContentProps {
  html?: string | null;
  content?: string | null; // Alias pour compatibilité
  className?: string;
  placeholder?: string;
  isTruncated?: boolean; // Pour affichage en une ligne (ex: DataTable)
}

export default function RichContent({ html, content, className = "", placeholder, isTruncated }: RichContentProps) {
  const raw = content || html;
  const clean = raw?.trim();

  if (!clean) {
    return placeholder
      ? <span className="text-slate-400 text-sm italic">{placeholder}</span>
      : null;
  }

  return (
    <div
      className={`prose prose-sm max-w-none leading-relaxed text-slate-700 ${className} ${
        isTruncated ? "line-clamp-1 truncate block" : ""
      }`}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
