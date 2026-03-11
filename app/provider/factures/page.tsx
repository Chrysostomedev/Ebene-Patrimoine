"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import StatsCard from "@/components/StatsCard";
import DataTable from "@/components/DataTable";
import PageHeader from "@/components/PageHeader";
import ActionGroup from "@/components/ActionGroup";
import ReusableForm from "@/components/ReusableForm";
import Paginate from "@/components/Paginate";
import type { FieldConfig } from "@/components/ReusableForm";

import {
  Eye, ArrowUpRight, Download, Filter, X,
  FileText, CheckCircle2, XCircle, Clock,
  AlertTriangle, AlertCircle, PlusCircle, Copy, Check,
  CalendarDays,
} from "lucide-react";

import { useProviderInvoices } from "@hooks/useProviderInvoices";
import {
  Invoice, ALL_STATUSES,
  STATUS_LABELS, STATUS_STYLES, STATUS_DOT,
  formatMontant, formatDate, getPdfUrl,
  getProviderName, getSiteName, getReport, toNum,
} from "@services/providerInvoiceService";

// ─── Toast ─────────────────────────────────────────────────────────────────────

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
        : <XCircle      size={18} className="text-red-500 shrink-0"   />}
      {msg}
    </div>
  );
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center justify-center min-w-[90px] px-3 py-1.5
      rounded-xl border text-xs font-bold
      ${STATUS_STYLES[status] ?? "border-slate-200 bg-slate-50 text-slate-500"}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ─── PDF Preview Modal (centre, plein écran) ──────────────────────────────────

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

// ─── Side Panel — slide droite ────────────────────────────────────────────────

function InvoiceSidePanel({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const [copied,     setCopied]     = useState(false);
  const [pdfPreview, setPdfPreview] = useState<{ url: string; name: string } | null>(null);

  const pdfUrl  = invoice.pdf_path ? getPdfUrl(invoice.pdf_path) : null;
  const pdfName = invoice.pdf_path?.split("/").pop() ?? "facture.pdf";
  const report  = getReport(invoice);

  const amountHT  = toNum(invoice.amount_ht);
  const taxAmount = toNum(invoice.tax_amount);
  const amountTTC = toNum(invoice.amount_ttc);

  const copyRef = () => {
    navigator.clipboard.writeText(invoice.reference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Pièces jointes supplémentaires
  const attachments = (invoice.attachments ?? []).map((a) => ({
    name: a.file_path.split("/").pop() ?? "document",
    url:  getPdfUrl(a.file_path),
  }));

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[420px] bg-white z-50 shadow-2xl flex flex-col rounded-l-3xl overflow-hidden">

        {/* Croix haut gauche */}
        <div className="flex items-start px-6 pt-6 pb-0 shrink-0">
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-xl transition -ml-1">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        <div className="px-6 pt-4 pb-5 shrink-0">
          <h2 className="text-2xl font-black text-slate-900">Facture {invoice.reference}</h2>
          <p className="text-slate-400 text-xs mt-0.5">Retrouvez les détails de la facture en dessous</p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-5">

          {/* Champs clé/valeur */}
          <div className="space-y-0">
            {[
              {
                label: "ID Facture",
                render: () => (
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{invoice.reference}</span>
                    <button onClick={copyRef} className="p-1 hover:bg-slate-100 rounded-md transition">
                      {copied
                        ? <Check size={12} className="text-green-500" />
                        : <Copy  size={12} className="text-slate-400" />}
                    </button>
                  </div>
                ),
              },
              { label: "Prestataire", value: getProviderName(invoice.provider) },
              { label: "Date",        value: formatDate(invoice.invoice_date)   },
              { label: "Échéance",    value: formatDate(invoice.due_date)       },
              { label: "Site",        value: getSiteName(invoice.site)          },
              { label: "Montant HT",  value: formatMontant(amountHT)            },
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
              <StatusBadge status={invoice.payment_status} />
            </div>
          </div>

          {/* Récap montants */}
          <div className="bg-slate-50 rounded-2xl border border-slate-100 px-4 py-3 space-y-1.5">
            {[
              { label: "Montant HT", value: formatMontant(amountHT)  },
              { label: "TVA",        value: formatMontant(taxAmount)  },
            ].map((r) => (
              <div key={r.label} className="flex justify-between text-xs">
                <span className="text-slate-500">{r.label}</span>
                <span className="font-bold text-slate-900">{r.value}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm border-t border-slate-200 pt-1.5">
              <span className="font-black text-slate-900">Montant TTC</span>
              <span className="font-black text-slate-900">{formatMontant(amountTTC)}</span>
            </div>
          </div>

          {/* Payée */}
          {invoice.payment_status === "paid" && invoice.payment_date && (
            <div className="flex items-center gap-2 py-3 px-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-bold">
              <CheckCircle2 size={16} />
              Payée le {formatDate(invoice.payment_date)}
            </div>
          )}

          {/* En retard */}
          {invoice.payment_status === "overdue" && (
            <div className="flex items-center gap-2 py-3 px-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-bold">
              <AlertTriangle size={16} />
              Facture en retard — contactez l'administrateur
            </div>
          )}

          {/* Constatations rapport */}
          {report?.findings && (
            <div>
              <p className="text-xs text-slate-400 font-medium mb-2">Constatations</p>
              <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-xl p-4 border border-slate-100">
                {report.findings}
              </p>
            </div>
          )}

          {/* Commentaire */}
          {invoice.comment && (
            <div>
              <p className="text-xs text-slate-400 font-medium mb-2">Commentaire</p>
              <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-xl p-4 border border-slate-100">
                {invoice.comment}
              </p>
            </div>
          )}

          {/* PDF principal */}
          {pdfUrl ? (
            <div>
              <p className="text-xs text-slate-400 font-medium mb-3">Pièce jointe</p>
              <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-white">
                <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                  <FileText size={16} className="text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">{pdfName}</p>
                  <p className="text-[10px] text-slate-400">PDF</p>
                </div>
                <button
                  onClick={() => setPdfPreview({ url: pdfUrl, name: pdfName })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition shrink-0"
                >
                  <Eye size={13} /> Aperçu
                </button>
                <a href={pdfUrl} download target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-black transition shrink-0">
                  <Download size={13} />
                </a>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-slate-200 rounded-2xl px-5 py-5 flex items-center gap-3 text-slate-400">
              <FileText size={18} className="shrink-0" />
              <p className="text-sm font-medium">Aucun PDF attaché</p>
            </div>
          )}

          {/* Justificatifs supplémentaires */}
          {attachments.length > 0 && (
            <div>
              <p className="text-xs text-slate-400 font-medium mb-3">Justificatifs ({attachments.length})</p>
              <div className="space-y-2">
                {attachments.map((file, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-white">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                      <FileText size={13} className="text-slate-400" />
                    </div>
                    <p className="text-xs font-bold text-slate-700 truncate flex-1">{file.name}</p>
                    <button
                      onClick={() => setPdfPreview({ url: file.url, name: file.name })}
                      className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900 transition"
                    >
                      <Eye size={12} /> Aperçu
                    </button>
                  </div>
                ))}
              </div>
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

export default function ProviderFacturesPage() {
  const router = useRouter();

  const {
    invoices, stats, selectedInvoice, meta,
    loading, statsLoading, submitting,
    error, submitSuccess, submitError,
    isPanelOpen, isCreateOpen,
    statusFilter, currentPage,
    openPanel, closePanel,
    openCreate, closeCreate,
    setStatusFilter, setPage,
    createInvoice, exportXlsx,
  } = useProviderInvoices();

  // ── Champs ReusableForm ────────────────────────────────────────────────────
  // createFromReport() attend : report_id (obligatoire), + optionnels si pas de devis
  const invoiceFields: FieldConfig[] = [
    {
      name:     "report_id",
      label:    "ID du Rapport d'intervention *",
      type:     "text",
      required: true,
    },
    {
      name:  "amount_ht",
      label: "Montant HT (FCFA) — si pas de devis approuvé",
      type:  "number",
    },
    {
      name:  "tax_amount",
      label: "Montant TVA (FCFA)",
      type:  "number",
    },
    {
      name:  "amount_ttc",
      label: "Montant TTC (FCFA)",
      type:  "number",
    },
    {
      name:  "comment",
      label: "Commentaire",
      type:  "textarea",gridSpan: 2,
    },
    { name: "invoice_date", label: "Date ", type: "date", required: true, icon: CalendarDays },
    { name: "due_date", label: "Date ", type: "date", required: true, icon: CalendarDays },
    {
      name:     "pdf_file",
      label:    "Facture PDF",
      type:     "pdf-upload",
      maxPDFs:  1,
      gridSpan: 2,
    } as any,
  ];

  const handleCreate = async (formData: any) => {
    await createInvoice({
      report_id:  parseInt(formData.report_id),
      amount_ht:  formData.amount_ht  ? parseFloat(formData.amount_ht)  : undefined,
      tax_amount: formData.tax_amount ? parseFloat(formData.tax_amount) : undefined,
      amount_ttc: formData.amount_ttc ? parseFloat(formData.amount_ttc) : undefined,
      comment:    formData.comment    || undefined,
      pdf_file:   formData.pdf_file?.[0] ?? undefined,
    });
  };

  // ── KPIs — calqués sur la page admin ──────────────────────────────────────
  const totalInvoices = stats?.total_invoices ?? 0;
  const totalAmount   = toNum(stats?.total_amount);
  const avgCost       = totalInvoices > 0 ? Math.round(totalAmount / totalInvoices) : 0;

  const kpis = [
    { label: "Coût moyen par facture",   value: statsLoading ? "—" : formatMontant(avgCost),      delta: "", trend: "up" as const },
    { label: "Nombre total de factures", value: statsLoading ? "—" : totalInvoices,               delta: "", trend: "up" as const },
    { label: "Factures en attente",      value: statsLoading ? "—" : (stats?.total_unpaid  ?? 0), delta: "", trend: "up" as const },
    { label: "Factures payées",          value: statsLoading ? "—" : (stats?.total_paid    ?? 0), delta: "", trend: "up" as const },
  ];

  // ── ActionGroup ───────────────────────────────────────────────────────────
  const pageActions = [
    { label: "Exporter",          icon: Download,   onClick: exportXlsx, variant: "secondary" as const },
    { label: "Nouvelle facture",  icon: PlusCircle, onClick: openCreate, variant: "primary"   as const },
  ];

  // ── Colonnes DataTable ────────────────────────────────────────────────────
  const columns = [
    {
      header: "ID Facture", key: "reference",
      render: (_: any, row: Invoice) => (
        <span className="font-black text-slate-900 text-sm">{row.reference}</span>
      ),
    },
    {
      header: "Prestataire", key: "provider",
      render: (_: any, row: Invoice) => (
        <span className="text-xs text-slate-600 font-medium">{getProviderName(row.provider)}</span>
      ),
    },
    {
      header: "Date", key: "invoice_date",
      render: (_: any, row: Invoice) => (
        <span className="text-xs text-slate-500">{formatDate(row.invoice_date)}</span>
      ),
    },
    {
      header: "Site", key: "site",
      render: (_: any, row: Invoice) => (
        <span className="text-xs text-slate-600">{getSiteName(row.site)}</span>
      ),
    },
    {
      header: "Montant TTC", key: "amount_ttc",
      render: (_: any, row: Invoice) => (
        <span className="text-sm font-bold text-slate-900">{formatMontant(row.amount_ttc)}</span>
      ),
    },
    {
      header: "Statut", key: "payment_status",
      render: (_: any, row: Invoice) => <StatusBadge status={row.payment_status} />,
    },
    {
      header: "Actions", key: "actions",
      render: (_: any, row: Invoice) => (
        <div className="flex items-center gap-3">
          {/* Aperçu panel droite */}
          <button
            onClick={() => openPanel(row)}
            className="flex items-center gap-2 text-slate-800 hover:text-gray-500 transition"
            title="Aperçu"
          >
            <Eye size={18} />
          </button>
          {/* Détails → page [id] */}
          <button
            onClick={() => router.push(`/provider/factures/${row.id}`)}
            className="group p-2 rounded-xl bg-white hover:bg-black border border-slate-200 hover:border-black transition flex items-center justify-center"
            title="Voir les détails"
          >
            <ArrowUpRight size={15} className="text-slate-600 group-hover:text-white group-hover:rotate-45 transition-all" />
          </button>
        </div>
      ),
    },
  ];

  const totalPages = meta?.last_page ?? 1;

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="ml-64 mt-20 p-6 space-y-8">

          <PageHeader
            title="Mes Factures"
            subtitle="Ce menu vous permet de voir les différentes factures disponibles"
          />

          {/* Erreur globale */}
          {error && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl text-sm font-medium">
              <AlertCircle size={15} className="shrink-0" /> {error}
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {statsLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-3xl border border-slate-100 p-6 animate-pulse h-28" />
                ))
              : kpis.map((k, i) => <StatsCard key={i} {...k} />)
            }
          </div>

          {/* Toolbar : filtre SELECT + ActionGroup */}
          <div className="flex justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter size={15} className="text-slate-400 shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-slate-200 bg-white text-slate-700 text-sm font-semibold
                  rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900
                  transition cursor-pointer"
              >
                <option value="">Tous les statuts</option>
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
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

            <ActionGroup actions={pageActions} />
          </div>

          {/* Filtre actif pill */}
          {statusFilter && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Filtré par :</span>
              <span className="flex items-center gap-1.5 bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded-full">
                {STATUS_LABELS[statusFilter] ?? statusFilter}
                <button onClick={() => setStatusFilter("")} className="hover:opacity-70 transition">
                  <X size={11} />
                </button>
              </span>
            </div>
          )}

          {/* DataTable */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Liste des factures</h3>
              {meta && <span className="text-xs text-slate-400">{meta.total} facture{meta.total > 1 ? "s" : ""}</span>}
            </div>

            <div className="px-6 py-4">
              {loading
                ? <div className="space-y-3 animate-pulse">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="h-12 bg-gray-100 rounded-xl" />
                    ))}
                  </div>
                : <DataTable columns={columns} data={invoices} onViewAll={() => {}} />
              }
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-6 border-t border-slate-50 flex justify-end bg-slate-50/30">
                <Paginate
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </div>
            )}
          </div>

        </main>
      </div>

      {/* Toasts */}
      {submitSuccess && <Toast msg={submitSuccess} type="success" />}
      {submitError   && <Toast msg={submitError}   type="error"   />}

      {/* Panel aperçu — slide droite */}
      {isPanelOpen && selectedInvoice && (
        <InvoiceSidePanel invoice={selectedInvoice} onClose={closePanel} />
      )}

      {/* ReusableForm création — slide droite, même pattern admin */}
      <ReusableForm
        isOpen={isCreateOpen}
        onClose={closeCreate}
        title="Générer une facture"
        subtitle="Les informations ci-dessous permettront de générer une nouvelle facture à partir d'un rapport d'intervention."
        fields={invoiceFields}
        onSubmit={handleCreate}
        submitLabel={submitting ? "Génération en cours..." : "Générer la facture"}
      />

    </div>
  );
}