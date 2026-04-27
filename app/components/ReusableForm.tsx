
"use client";

import { useState } from "react";
import SideModal from "@/components/form/SideModal";
import FormButton from "@/components/form/FormButton";
import { FormField, Input, Select, PasswordInput, DateInput, DateRangeInput, RichTextEditor, ImageUpload, PdfUpload, PhoneInput, Checkbox, QuoteItemsInput } from "@/components/form/FormInput";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export interface FieldConfig {
  name: string;
  label: string;
  type: "text" | "password" | "date" | "date-range" | "select" | "email" | "number" | "rich-text" | "image-upload" | "pdf-upload" | "textarea" | "tel" | "checkbox" | "quote-items";
  placeholder?: string;
  required?: boolean;
  gridSpan?: 1 | 2;
  options?: { label: string; value: string | number }[];
  icon?: any;
  maxImages?: number;
  maxPDFs?: number;
  maxSizeMB?: number;
  disabled?: boolean;
  defaultValue?: any;
  disablePastDates?: boolean;
  accept?: string;
}

interface ReusableFormProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  fields: FieldConfig[];
  onSubmit: (formData: Record<string, any>) => void | Promise<any>;
  submitLabel?: string;
  cancelLabel?: string;
  initialValues?: Record<string, any>;
  onFieldChange?: (name: string, value: any, setter: (name: string, value: any) => void) => void;
  isSubmitting?: boolean;
  error?: string | null;
  success?: string | null;
}

export default function ReusableForm({
  isOpen,
  onClose,
  title,
  subtitle,
  fields,
  onSubmit,
  submitLabel = "Enregistrer",
  cancelLabel = "Annuler",
  initialValues = {},
  onFieldChange,
  isSubmitting = false,
  error = null,
  success = null,
}: ReusableFormProps) {
  const [localSubmitting, setLocalSubmitting] = useState(false);
  const [customValues, setCustomValues] = useState<Record<string, any>>({});

  // Combiné : spinner si l'un ou l'autre est actif
  const busy = isSubmitting || localSubmitting;

  // ── Helper : initialValues en priorité, sinon field.defaultValue, sinon "" ──
  // Pour les textarea, on strip le HTML pour afficher du texte propre
  const stripHtml = (html: string) =>
    html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

  const getDefault = (field: FieldConfig): any => {
    const raw = initialValues[field.name] ?? field.defaultValue ?? "";
    // textarea : strip HTML pour éviter l'affichage des balises
    if (field.type === "textarea" && typeof raw === "string") return stripHtml(raw);
    return raw;
  };

  const handleCustomChange = (name: string, value: any) => {
    setCustomValues((prev) => ({ ...prev, [name]: value }));
    onFieldChange?.(name, value, (n, v) => setCustomValues(prev => ({ ...prev, [n]: v })));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    const data = new FormData(e.currentTarget);
    const formDataObj = Object.fromEntries(data.entries());

    // Remplacer les valeurs natives par les customValues (utile pour les files array)
    Object.keys(customValues).forEach((key) => {
      formDataObj[key] = customValues[key];
    });

    setLocalSubmitting(true);
    try {
      await onSubmit(formDataObj);
    } finally {
      setLocalSubmitting(false);
    }
  };

  return (
    <SideModal isOpen={isOpen} onClose={onClose} title={title} subtitle={subtitle}>
      <form onSubmit={handleSubmit} className="flex flex-col h-[calc(100vh-180px)]">
        {/* Messages de retour API - Fixes en haut */}
        {(error || success) && (
          <div className="shrink-0 space-y-3 mb-4">
            {error && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="shrink-0 mt-0.5" size={16} />
                <div className="text-xs font-bold leading-relaxed">{error}</div>
              </div>
            )}
            {success && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 animate-in fade-in slide-in-from-top-1">
                <CheckCircle2 className="shrink-0 mt-0.5" size={16} />
                <div className="text-xs font-bold leading-relaxed">{success}</div>
              </div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">


          <div className="grid grid-cols-2 gap-x-4 gap-y-6 pb-8">
            {fields.map((field) => (
              <div
                key={field.name}
                className={field.gridSpan === 2 ? "col-span-2" : "col-span-1"}
              >
                <FormField label={field.label} required={field.required}>

                  {field.type === "image-upload" ? (
                    <ImageUpload
                      name={field.name}
                      maxImages={field.maxImages ?? 3}
                      maxSizeMB={field.maxSizeMB}
                      defaultValue={getDefault(field)}
                      onChange={(files: File[]) => handleCustomChange(field.name, files)}
                      isLoading={busy}
                    />


                  ) : field.type === "pdf-upload" ? (
                    <PdfUpload
                      name={field.name}
                      maxPDFs={field.maxPDFs ?? 1}
                      maxSizeMB={field.maxSizeMB}
                      defaultValue={getDefault(field)}
                      onChange={(files: File[]) => handleCustomChange(field.name, files)}
                      accept={field.accept}
                      placeholder={field.placeholder}
                      isLoading={busy}
                    />

                  ) : field.type === "quote-items" ? (
                    <QuoteItemsInput
                      name={field.name}
                      required={field.required}
                      disabled={field.disabled}
                      defaultValue={getDefault(field)}
                      onChange={(val: any) => handleCustomChange(field.name, val)}
                    />

                  ) : field.type === "select" ? (
                    <Select
                      name={field.name}
                      required={field.required}
                      disabled={field.disabled}
                      icon={field.icon}
                      // On utilise value si présent dans customValues pour permettre la réinitialisation par le parent
                      value={customValues[field.name] !== undefined ? String(customValues[field.name]) : undefined}
                      defaultValue={customValues[field.name] === undefined ? String(getDefault(field)) : undefined}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        handleCustomChange(field.name, e.target.value)
                      }
                    >
                      <option value="">Cliquez pour sélectionner</option>
                      {field.options?.map((opt, index) => (
                        <option key={`${opt.value}-${index}`} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </Select>

                  ) : field.type === "rich-text" ? (
                    <RichTextEditor
                      label={field.label}
                      name={field.name}
                      placeholder={field.placeholder}
                      defaultValue={getDefault(field)} // ✅ CORRIGÉ
                    />

                  ) : field.type === "password" ? (
                    <PasswordInput
                      name={field.name}
                      placeholder={field.placeholder}
                      required={field.required}
                      defaultValue={getDefault(field)} // ✅ CORRIGÉ
                    />

                  ) : field.type === "date" ? (
                    <DateInput
                      name={field.name}
                      required={field.required}
                      disabled={field.disabled}
                      disablePastDates={field.disablePastDates ?? false}
                      icon={field.icon}
                      defaultValue={getDefault(field)}
                    />

                  ) : field.type === "date-range" ? (
                    <DateRangeInput
                      name={field.name}
                      required={field.required}
                      disabled={field.disabled}
                      disablePastDates={field.disablePastDates ?? false}
                      defaultValue={getDefault(field)}
                    />

                  ) : field.type === "textarea" ? (
                    <textarea
                      name={field.name}
                      placeholder={field.placeholder}
                      required={field.required}
                      disabled={field.disabled}
                      defaultValue={getDefault(field)} // ✅ CORRIGÉ
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all min-h-[120px] resize-y text-sm font-medium"
                      onChange={(e) => onFieldChange?.(field.name, e.target.value)}
                    />

                  ) : field.type === "tel" ? (
                    <PhoneInput
                      name={field.name}
                      required={field.required}
                      disabled={field.disabled}
                      defaultValue={getDefault(field)} // ✅ CORRIGÉ
                      onChange={(val) => onFieldChange?.(field.name, val)}
                    />

                  ) : field.type === "checkbox" ? (
                    <Checkbox
                      name={field.name}
                      label={field.label}
                      required={field.required}
                      disabled={field.disabled}
                      defaultChecked={!!getDefault(field)}
                      onChange={(checked: boolean) => handleCustomChange(field.name, checked)}
                    />

                  ) : (
                    <Input
                      name={field.name}
                      type={field.type}
                      placeholder={field.placeholder}
                      required={field.required}
                      disabled={field.disabled}
                      defaultValue={getDefault(field)} // ✅ CORRIGÉ
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        onFieldChange?.(field.name, e.target.value)
                      }
                    />
                  )}

                </FormField>
              </div>
            ))}
          </div>
        </div>

        <div className="sticky bottom-0 bg-white pt-6 pb-2 border-t border-slate-100 flex gap-4 mt-auto">
          <FormButton type="button" variant="secondary" onClick={onClose} className="flex-1" disabled={busy}>
            {cancelLabel}
          </FormButton>
          <FormButton type="submit" variant="primary" className="flex-1" isLoading={busy}>
            {busy && !isSubmitting ? "En cours..." : submitLabel}
          </FormButton>
        </div>
      </form>
    </SideModal>
  );
}