"use client";

/**
 * RichContent — affiche du HTML produit par le RichTextEditor
 * avec les styles inline préservés (gras, couleur, fond, italique…)
 * Utilise dangerouslySetInnerHTML de façon sécurisée (contenu interne uniquement).
 */

interface RichContentProps {
  html?: string | null;
  className?: string;
  /** Si true, affiche un placeholder quand le contenu est vide */
  placeholder?: string;
}

export default function RichContent({ html, className = "", placeholder }: RichContentProps) {
  const clean = html?.trim();
  if (!clean) {
    return placeholder
      ? <span className="text-slate-400 text-sm italic">{placeholder}</span>
      : null;
  }
  return (
    <div
      className={`prose prose-sm max-w-none leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
