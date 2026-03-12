"use client";

import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import StatsCard from "@/components/StatsCard";
import DataTable from "@/components/DataTable";
import PageHeader from "@/components/PageHeader";
import ActionGroup from "@/components/ActionGroup";
import ReusableForm from "@/components/ReusableForm";
import {
  Eye, ArrowUpRight, Download, Filter,
  X, FileText, CheckCircle2, XCircle,
  AlertCircle, ChevronLeft, ChevronRight,
  PlusCircle, Copy, Check,
  CalendarDays,
} from "lucide-react";

import { useProviderQuotes } from "@hooks/provider/useProviderQuotes";
import {
  Quote, ALL_STATUSES,
  STATUS_LABELS, STATUS_STYLES, STATUS_DOT,
  formatCurrency, formatDate, getPdfUrl,
} from "@services/provider/providerQuoteService";
import type { FieldConfig } from "@/components/ReusableForm";
import { useState } from "react";

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div className={`fixed bottom-6 right-6 z-[99999] flex items-center gap-3 px-5 py-4
      rounded-2xl shadow-2xl border text-sm font-semibold
      animate-in slide-in-from-bottom-4 duration-300
      ${type === "success"
        ? "bg-white border-green-100 text-green-700"
        : "bg-white border-red-100 text-red-700"}`}>
      {type === "success"
        ? <CheckCircle2 size={18} className="text-green-500 shrink-0" />
        : <XCircle      size={18} className="text-red-500 shrink-0" />}
      {msg}
    </div>
  );
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold
      ${STATUS_STYLES[status] ?? "border-slate-200 bg-slate-50 text-slate-500"}`}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: STATUS_DOT[status] ?? "#94a3b8" }} />
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ─── PDF Preview Modal (centre) ───────────────────────────────────────────────

function PdfPreviewModal({ url, name, onClose }: { url: string; name: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[300] flex flex-col bg-black/95">
      <div className="flex items-center justify-between px-6 py-4 bg-black border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-red-600 flex items-center justify-center">
            <FileText size={14} className="text-white" />
          </div>
          <p className="text-white font-bold text-sm">{name}</p>
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

// ─── Side Panel aperçu (droite) ───────────────────────────────────────────────

function QuotePreviewPanel({ quote, onClose }: { quote: Quote; onClose: () => void }) {
  const [copied,     setCopied]     = useState(false);
  const [pdfPreview, setPdfPreview] = useState<{ url: string; name: string } | null>(null);

  const pdfFiles = (quote.pdf_paths ?? []).map(p => ({
    name: p.split("/").pop() ?? "devis.pdf",
    url:  getPdfUrl(p),
  }));

  const copyRef = () => {
    navigator.clipboard.writeText(quote.reference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[420px] bg-white z-50 shadow-2xl flex flex-col rounded-l-3xl overflow-hidden">

        {/* Header — croix haut gauche comme admin */}
        <div className="flex items-start px-6 pt-6 pb-0 shrink-0">
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-xl transition -ml-1">
            <X size={18} className="text-slate-500" />
          </button>
        </div>
        <div className="px-6 pt-4 pb-5 shrink-0">
          <h2 className="text-2xl font-black text-slate-900">Devis #{quote.id}</h2>
          <p className="text-slate-400 text-xs mt-0.5">Retrouvez les détails du devis en dessous</p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-5">

          {/* Champs clé/valeur */}
          <div className="space-y-0">
            {[
              {
                label: "Référence",
                render: () => (
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{quote.reference}</span>
                    <button onClick={copyRef} className="p-1 hover:bg-slate-100 rounded-md transition">
                      {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} className="text-slate-400" />}
                    </button>
                  </div>
                ),
              },
              { label: "Ticket",    value: quote.ticket?.subject ?? quote.ticket?.title ?? `#${quote.ticket_id}` },
              { label: "Site",      value: quote.site?.nom ?? quote.site?.name ?? "—" },
              { label: "Montant HT",  value: formatCurrency(quote.amount_ht) },
              { label: `TVA (${quote.tax_rate ?? 18}%)`, value: formatCurrency(quote.tax_amount) },
              { label: "Date",      value: formatDate(quote.created_at) },
            ].map((f, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                <p className="text-xs text-slate-400 font-medium">{f.label}</p>
                {(f as any).render
                  ? (f as any).render()
                  : <p className="text-sm font-bold text-slate-900">{(f as any).value}</p>}
              </div>
            ))}

            {/* Statut */}
            <div className="flex items-center justify-between py-3">
              <p className="text-xs text-slate-400 font-medium">Statut</p>
              <StatusBadge status={quote.status} />
            </div>
          </div>

          {/* Motif rejet */}
          {quote.status === "rejeté" && quote.rejection_reason && (
            <div className="bg-red-50 rounded-xl p-4 border border-red-100">
              <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Motif de rejet</p>
              <p className="text-sm text-red-700 leading-relaxed">{quote.rejection_reason}</p>
            </div>
          )}

          {/* Description */}
          {quote.description && (
            <div>
              <p className="text-xs text-slate-400 font-medium mb-2">Description</p>
              <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-xl p-4 border border-slate-100">
                {quote.description}
              </p>
            </div>
          )}

          {/* Items */}
          {quote.items && quote.items.length > 0 && (
            <div>
              <p className="text-xs text-slate-400 font-medium mb-3">Articles ({quote.items.length})</p>
              <div className="border border-slate-100 rounded-2xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Désignation</th>
                      <th className="text-center px-2 py-2.5 text-[10px] font-black text-slate-400 uppercase">Qté</th>
                      <th className="text-right px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quote.items.map((item, i) => (
                      <tr key={i} className="border-b border-slate-50 last:border-0">
                        <td className="px-4 py-3 text-xs font-medium text-slate-900">{item.designation}</td>
                        <td className="px-2 py-3 text-center text-xs text-slate-500">{item.quantity}</td>
                        <td className="px-4 py-3 text-right text-xs font-bold text-slate-900">
                          {formatCurrency(item.total_price ?? item.quantity * item.unit_price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="bg-slate-50 border-t border-slate-100 px-4 py-3 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Total HT</span>
                    <span className="font-bold">{formatCurrency(quote.amount_ht)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">TVA ({quote.tax_rate}%)</span>
                    <span className="font-bold">{formatCurrency(quote.tax_amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-slate-200 pt-1.5">
                    <span className="font-black text-slate-900">Total TTC</span>
                    <span className="font-black text-slate-900">{formatCurrency(quote.amount_ttc)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Pièces jointes PDF */}
          {pdfFiles.length > 0 && (
            <div>
              <p className="text-xs text-slate-400 font-medium mb-3">Pièce jointe</p>
              <div className="space-y-2">
                {pdfFiles.map((file, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-white">
                    <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                      <FileText size={16} className="text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{file.name}</p>
                      <p className="text-[10px] text-slate-400">PDF</p>
                    </div>
                    <button
                      onClick={() => setPdfPreview({ url: file.url, name: file.name })}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition shrink-0"
                    >
                      <Eye size={13} /> Aperçu
                    </button>
                    <a href={file.url} download target="_blank" rel="noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-black transition shrink-0">
                      <Download size={13} />
                    </a>
                  </div>
                  
                ))}
              </div>
            </div>
          )}

          {/* Approuvé */}
          {quote.status === "approuvé" && (
            <div className="flex items-center gap-2 py-3.5 px-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-bold">
              <CheckCircle2 size={16} />
              Devis approuvé le {formatDate(quote.approved_at ?? "")}
            </div>
          )}
        </div>
      </div>

      {pdfPreview && (
        <PdfPreviewModal url={pdfPreview.url} name={pdfPreview.name} onClose={() => setPdfPreview(null)} />
      )}
    </>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function ProviderDevisPage() {
  const router = useRouter();

  const {
    quotes, stats, selectedQuote,
    loading, statsLoading, submitting,
    error, submitSuccess, submitError,
    isPanelOpen, isCreateOpen,
    statusFilter, setStatusFilter,
    openPanel, closePanel,
    openCreate, closeCreate,
    createQuote, exportXlsx,
  } = useProviderQuotes();

  // ── Champs formulaire — même pattern que DevisPage admin ─────────────────
  const quoteFields: FieldConfig[] = [
    {
      name:     "ticket_id",
      label:    "ID du Ticket *",
      type:     "text",
      required: true,
    },
    {
      name:  "description",
      label: "Description",
      type:  "textarea",
    },
    {
      name:  "unit_price",
      label: "Prix unitaire",
      type:  "number",
    },
    {
      name:  "quantity",
      label: "Quantité",
      type:  "number",
    },
  
    {
      name:     "quote_pdf",
      label:    "Devis PDF",
      type:     "pdf-upload",
      maxPDFs:  1,
      gridSpan: 2,
    } as any,
  ];

  const handleCreate = async (formData: any) => {
    const ok = await createQuote({
      ticket_id:   parseInt(formData.ticket_id),
      description: formData.description || undefined,
      tax_rate:    parseFloat(formData.tax_rate) || 18,
      // Items par défaut — le prestataire les saisit dans le formulaire
      items: formData.items ?? [
        { designation: "Prestation", quantity: 1, unit_price: 0 },
      ],
      pdf_file: formData.quote_pdf?.[0] ?? undefined,
    });
    return ok;
  };

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = [
    {
      label: "Total devis",
      value: statsLoading ? "—" : (stats?.total ?? 0),
      delta: "", trend: "up" as const,
    },
    {
      label: "En attente",
      value: statsLoading ? "—" : (stats?.pending ?? 0),
      delta: "", trend: "up" as const,
    },
    {
      label: "Approuvés",
      value: statsLoading ? "—" : (stats?.approved ?? 0),
      delta: "", trend: "up" as const,
    },
    {
      label: "Montant approuvé",
      value: statsLoading ? "—" : formatCurrency(stats?.total_approved_amount ?? 0),
      delta: "", trend: "up" as const,
    },
  ];

  // ── ActionGroup ───────────────────────────────────────────────────────────
  const actions = [
    {
      label:   "Exporter",
      icon:    Download,
      onClick: exportXlsx,
      variant: "secondary" as const,
    },
    {
      label:   "Nouveau devis",
      icon:    PlusCircle,
      onClick: openCreate,
      variant: "primary" as const,
    },
  ];

  // ── Colonnes DataTable ────────────────────────────────────────────────────
  const columns = [
    {
      header: "Référence", key: "reference",
      render: (_: any, row: Quote) => (
        <span className="font-black text-slate-900 text-sm">{row.reference}</span>
      ),
    },
    {
      header: "Ticket", key: "ticket",
      render: (_: any, row: Quote) => (
        <span className="text-xs text-slate-600 font-medium">
         {row.ticket?.subject ?? row.ticket?.title ?? `#${row.ticket_id}`}
        </span>
      ),
    },
    {
      header: "Montant HT", key: "amount_ht",
      render: (_: any, row: Quote) => (
        <span className="text-sm font-bold text-slate-800">{formatCurrency(row.amount_ht)}</span>
      ),
    },
    {
      header: "Montant TTC", key: "amount_ttc",
      render: (_: any, row: Quote) => (
        <span className="text-sm font-black text-slate-900">{formatCurrency(row.amount_ttc)}</span>
      ),
    },
    {
      header: "Statut", key: "status",
      render: (_: any, row: Quote) => <StatusBadge status={row.status} />,
    },
    {
      header: "Date", key: "created_at",
      render: (_: any, row: Quote) => (
        <span className="text-xs text-slate-400">{formatDate(row.created_at)}</span>
      ),
    },
    {
      header: "Actions", key: "actions",
      render: (_: any, row: Quote) => (
        <div className="flex items-center gap-3">
          {/* Aperçu panel droite */}
          <button
            onClick={() => openPanel(row)}
            className="flex items-center gap-2 font-bold text-slate-800 hover:text-gray-500 transition"
          >
            <Eye size={18} />
          </button>
          {/* Détails — page [id] */}
          <button
            onClick={() => router.push(`/provider/devis/${row.id}`)}
            className="group p-2 rounded-xl bg-white hover:bg-black border border-slate-200 hover:border-black transition flex items-center justify-center"
          >
            <ArrowUpRight size={15} className="text-slate-600 group-hover:text-white group-hover:rotate-45 transition-all" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="ml-64 mt-20 p-6 space-y-8">

          <PageHeader
            title="Mes Devis"
            subtitle="Ce menu vous permet de consulter et gérer vos devis d'intervention"
          />

          {/* Erreur globale */}
          {error && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl text-sm font-medium">
              <AlertCircle size={15} className="shrink-0" /> {error}
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {statsLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-3xl border border-slate-100 p-6 animate-pulse h-28" />
                ))
              : kpis.map((k, i) => <StatsCard key={i} {...k} />)
            }
          </div>

          {/* Toolbar : filtre SELECT + ActionGroup */}
          <div className="shrink-0 flex justify-between items-center gap-4">

            {/* Filtre par statut — select standard */}
            <div className="flex items-center gap-2">
              <Filter size={15} className="text-slate-400 shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-slate-200 bg-white text-slate-700 text-sm font-semibold rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900 transition cursor-pointer"
              >
                <option value="">Tous les statuts</option>
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
                ))}
              </select>
              {statusFilter && (
                <button
                  onClick={() => setStatusFilter("")}
                  className="p-1.5 hover:bg-slate-100 rounded-lg transition text-slate-400 hover:text-slate-700"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <ActionGroup actions={actions} />
          </div>

          {/* Table */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Liste des devis</h3>
              <span className="text-xs text-slate-400">{quotes.length} devis</span>
            </div>

            <div className="px-6 py-4">
              {loading
                ? <div className="space-y-3 animate-pulse">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="h-12 bg-gray-100 rounded-xl" />
                    ))}
                  </div>
                : <DataTable columns={columns} data={quotes} onViewAll={() => {}} />
              }
            </div>
          </div>

        </main>
      </div>

      {/* Toasts */}
      {submitSuccess && <Toast msg={submitSuccess} type="success" />}
      {submitError   && <Toast msg={submitError}   type="error"   />}

      {/* Panel aperçu — slide droite */}
      {isPanelOpen && selectedQuote && (
        <QuotePreviewPanel quote={selectedQuote} onClose={closePanel} />
      )}

      {/* ReusableForm — slide droite, même pattern admin */}
      <ReusableForm
        isOpen={isCreateOpen}
        onClose={closeCreate}
        title="Créer un devis"
        subtitle="Les informations ci-dessous permettront de créer un nouveau devis."
        fields={quoteFields}
        onSubmit={handleCreate}
        submitLabel={submitting ? "Soumission en cours..." : "Soumettre le devis"}
      />

    </div>
  );
}