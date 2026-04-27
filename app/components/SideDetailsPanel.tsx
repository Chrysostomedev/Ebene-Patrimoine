"use client";

/**
 * components/SideDetailsPanel.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * CHANGEMENTS vs version originale :
 *
 * 1. Footer conditionnel :
 *    - Si ni `onEdit` ni `redirectHref` ne sont fournis → pas de footer du tout
 *      (cas dashboard : on affiche juste les détails, aucun bouton inutile)
 *    - Si seulement `redirectHref` est fourni → un seul bouton "Voir le détail"
 *      qui redirige vers la page cible (ex: /provider/tickets/45)
 *    - Si `onEdit` est fourni (comportement historique) → les 2 boutons
 *      "Annuler" + "Modifier" sont affichés comme avant
 *    - Les deux peuvent coexister : redirectHref + onEdit → bouton redirect
 *      EN PLUS des 2 boutons (cas rare, prévu pour flexibilité)
 *
 * 2. Prop `redirectLabel` : libellé personnalisable du bouton de redirection
 *    (défaut : "Voir le détail")
 *
 * 3. Tout le reste est strictement identique à l'original.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { X, Copy, Check } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import FormButton from "./form/FormButton";
import { useLanguage } from "../../contexts/LanguageContext";

interface DetailField {
  label: string;
  value: string;
  isStatus?: boolean;
  statusColor?: string;
}

interface SideDetailsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  reference?: string;
  fields: DetailField[];
  descriptionContent?: string;
  /** Comportement historique : ouvre le formulaire d'édition inline */
  onEdit?: () => void;
  /**
   * Nouveau : redirige vers une autre page (ex: "/provider/tickets/45").
   * Si fourni SANS onEdit → un seul bouton de redirection dans le footer.
   * Si fourni AVEC onEdit  → s'affiche au-dessus des 2 boutons historiques.
   */
  redirectHref?: string;
  /** Libellé du bouton de redirection. Défaut : "Voir le détail" */
  redirectLabel?: string;
  /** Action personnalisée (bouton principal unique) */
  customAction?: () => void;
  customActionLabel?: string;
}

export default function SideDetailsPanel({
  isOpen,
  onClose,
  title,
  subtitle,
  reference,
  fields,
  descriptionContent,
  onEdit,
  redirectHref,
  redirectLabel = "Voir le détail",
  customAction,
  customActionLabel,
}: SideDetailsPanelProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    if (!reference) return;
    await navigator.clipboard.writeText(reference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const defaultSubtitle = subtitle ?? t("common.back");

  // ── Décide si le footer doit s'afficher ────────────────────────────────────
  // Footer visible uniquement si au moins une action est disponible
  const hasFooter = !!onEdit || !!redirectHref || !!customAction;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[9998]"
        onClick={onClose}
      />

      {/* Panneau latéral */}
      <div className="fixed right-0 top-0 h-full w-full max-w-[550px] bg-white z-[9999] shadow-2xl flex flex-col animate-in slide-in-from-right">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="p-8 pb-4 space-y-4">
          <div className="flex justify-start">
            <button
              onClick={onClose}
              className="p-2.5 hover:bg-slate-100 rounded-xl border border-slate-100 transition-colors"
            >
              <X size={22} className="text-slate-600" />
            </button>
          </div>
          <div className="text-left">
            <h2 className="text-[28px] font-black text-slate-900 leading-tight tracking-tight uppercase">
              {title}
            </h2>
            <p className="text-slate-500 text-[14px] mt-1 font-medium">{defaultSubtitle}</p>
          </div>
        </div>

        {/* ── Corps scrollable ─────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-8 py-4 space-y-6 custom-scrollbar">

          {/* Bloc référence avec copie */}
          {reference && (
            <div className="flex items-center justify-between p-5 bg-slate-50/80 border border-slate-100 rounded-2xl">
              <span className="text-slate-400 font-medium">{t("common.reference")}</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-lg tracking-wider">{reference}</span>
                <button
                  onClick={handleCopy}
                  className="p-1.5 hover:bg-white rounded-md transition-all border border-transparent hover:border-slate-200"
                >
                  {copied
                    ? <Check size={18} className="text-green-600" />
                    : <Copy size={18} className="text-slate-400" />
                  }
                </button>
              </div>
            </div>
          )}

          {/* Liste des champs */}
          <div className="space-y-1">
            {fields.map((field, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-4 border-b border-slate-50 last:border-0"
              >
                <span className="text-slate-400 text-[15px] font-medium">{field.label}</span>
                {field.isStatus ? (
                  <div
                    className="flex items-center gap-2 px-4 py-1.5 rounded-full border"
                    style={{
                      backgroundColor: `${field.statusColor}15`,
                      borderColor: `${field.statusColor}30`,
                    }}
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: field.statusColor || "#000" }}
                    />
                    <span
                      className="text-[13px] font-bold uppercase tracking-wide"
                      style={{ color: field.statusColor || "#334155" }}
                    >
                      {field.value}
                    </span>
                  </div>
                ) : (
                  <span className="text-slate-900 text-[15px] font-bold text-right ml-4">
                    {field.value}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Contenu description optionnel */}
          {descriptionContent && (
            <div className="space-y-3 pb-10">
              <div className="p-6 rounded-2xl border border-slate-100 bg-slate-50/30">
                <div
                  className="prose prose-sm max-w-none text-slate-600 text-[15px] leading-relaxed font-medium"
                  dangerouslySetInnerHTML={{ __html: descriptionContent }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Footer conditionnel ──────────────────────────────────────────────
            Règle :
            - Pas de onEdit ET pas de redirectHref ET pas de customAction → footer masqué (no buttons)
            - Seulement redirectHref              → 1 bouton "Voir le détail"
            - Seulement customAction              → 1 bouton d'action personnalisée
            - Seulement onEdit                    → 2 boutons "Annuler" + "Modifier"
            - Les deux fournis                    → géré au-dessus
        ─────────────────────────────────────────────────────────────────────── */}
        {hasFooter && (
          <div className="p-8 bg-white border-t border-slate-100 flex flex-col gap-3">

            {/* Bouton Custom (si fourni) */}
            {customAction && (
              <FormButton
                variant="primary"
                onClick={customAction}
                className="w-full bg-slate-900 border-slate-900 hover:bg-black hover:border-black text-white py-3.5"
              >
                {customActionLabel || "Action"}
              </FormButton>
            )}

            {/* Bouton de redirection (si redirectHref fourni) */}
            {redirectHref && !customAction && (
              <FormButton
                variant="primary"
                onClick={() => { onClose(); router.push(redirectHref); }}
                className="w-full"
              >
                {redirectLabel}
              </FormButton>
            )}

            {/* Boutons Annuler + Modifier (comportement historique, si onEdit fourni) */}
            {onEdit && !redirectHref && !customAction && (
              <div className="flex gap-4">
                <FormButton variant="secondary" onClick={onClose} className="flex-1">
                  {t("common.cancel")}
                </FormButton>
                <FormButton variant="primary" onClick={onEdit} className="flex-1">
                  {t("common.edit")}
                </FormButton>
              </div>
            )}

            {/* Les deux fournis : redirect + Annuler/Modifier */}
            {onEdit && redirectHref && !customAction && (
              <div className="flex gap-4">
                <FormButton variant="secondary" onClick={onClose} className="flex-1">
                  {t("common.cancel")}
                </FormButton>
                <FormButton variant="primary" onClick={onEdit} className="flex-1">
                  {t("common.edit")}
                </FormButton>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </>
  );
}