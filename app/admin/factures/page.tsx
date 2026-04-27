// app/admin/factures/page.tsx

"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Eye, Filter, Download, Upload, X,
  CheckCircle2, FileText, Copy,
  ArrowUpRight,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import StatsCard from "@/components/StatsCard";
import DataTable, { ColumnConfig } from "@/components/DataTable";
import Paginate from "@/components/Paginate";
import PageHeader from "@/components/PageHeader";

import { useInvoices } from "../../../hooks/admin/useInvoices";
import { Invoice, InvoiceService } from "../../../services/admin/invoice.service";
import { exportToXlsx } from "../../../core/export";
import { useToast } from "@/contexts/ToastContext";
import { formatDate, formatCurrency } from "@/lib/utils";


// ══════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════

// local formatMontant and formatDate removed - using @/lib/utils


// ══════════════════════════════════════════════
// STATUTS
// ══════════════════════════════════════════════

const STATUS_STYLES: Record<string, string> = {
  paid: "border-emerald-200 bg-emerald-50 text-emerald-600",
  pending: "border-amber-200 bg-amber-50 text-amber-600",
  overdue: "border-rose-200 bg-rose-50 text-rose-600",
  cancelled: "border-slate-200 bg-slate-50 text-slate-500",
};

const STATUS_LABELS: Record<string, string> = {
  paid: "Payée",
  pending: "En attente",
  overdue: "En retard",
  cancelled: "Annulée",
};

/** Badge coloré selon le statut de paiement */
function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center min-w-[90px] px-3 py-1.5 rounded-xl border text-xs font-bold ${STATUS_STYLES[status] ?? ""
        }`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ══════════════════════════════════════════════
// PDF PREVIEW MODAL
// ══════════════════════════════════════════════

function PdfPreviewModal({
  url, name, onClose,
}: {
  url: string; name: string; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[300] flex flex-col bg-black/95">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-black border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-red-600 flex items-center justify-center">
            <FileText size={14} className="text-white" />
          </div>
          <p className="text-white font-bold text-sm">{name}</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={url} download target="_blank" rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition"
          >
            <Download size={14} /> Télécharger
          </a>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition">
            <X size={18} className="text-white" />
          </button>
        </div>
      </div>

      {/* Visionneuse PDF */}
      <div className="flex-1">
        <iframe src={`${url}#toolbar=0`} className="w-full h-full border-0" title={name} />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// FILTER DROPDOWN
// ══════════════════════════════════════════════

function FilterDropdown({
  isOpen, onClose, filters, onApply,
}: {
  isOpen: boolean;
  onClose: () => void;
  filters: { status?: string };
  onApply: (f: { status?: string }) => void;
}) {
  const [local, setLocal] = useState(filters);
  useEffect(() => { setLocal(filters); }, [filters]);

  if (!isOpen) return null;

  const options = [
    { val: "", label: "Toutes" },
    { val: "pending", label: "En attente" },
    { val: "paid", label: "Payée" },
    { val: "overdue", label: "En retard" },
    { val: "cancelled", label: "Annulée" },
  ];

  return (
    <div className="absolute right-0 top-full mt-2 z-50 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
      {/* Titre */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <span className="text-sm font-black text-slate-900 uppercase tracking-widest">Filtres</span>
        <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition">
          <X size={16} className="text-slate-500" />
        </button>
      </div>

      {/* Options de statut */}
      <div className="p-5">
        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Statut</label>
        <div className="flex flex-col gap-2 mt-2">
          {options.map(({ val, label }) => (
            <button
              key={val}
              onClick={() => setLocal({ ...local, status: val || undefined })}
              className={`w-full text-left px-4 py-2 rounded-xl text-sm font-semibold transition ${(local.status ?? "") === val
                ? "bg-slate-900 text-white"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 py-4 border-t border-slate-100 flex gap-3">
        <button
          onClick={() => { setLocal({}); onApply({}); onClose(); }}
          className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition"
        >
          Réinitialiser
        </button>
        <button
          onClick={() => { onApply(local); onClose(); }}
          className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition"
        >
          Appliquer
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// SIDE PANEL FACTURE
// ══════════════════════════════════════════════

function InvoiceSidePanel({
  invoice, onClose, onMarkPaid,
}: {
  invoice: Invoice | null;
  onClose: () => void;
  onMarkPaid: (id: number) => void;
}) {
  const [pdfPreview, setPdfPreview] = useState<{ url: string; name: string } | null>(null);

  // Reset l'aperçu PDF quand on change de facture
  useEffect(() => { setPdfPreview(null); }, [invoice?.id]);

  if (!invoice) return null;

  const isPaid = invoice.payment_status === "paid";
  const pdfUrl = invoice.pdf_path ? InvoiceService.getPdfUrl(invoice.pdf_path) : null;
  const pdfName = invoice.pdf_path?.split("/").pop() ?? "facture.pdf";

  // Accès correct via les relations imbriquées
  const providerName = invoice.provider?.company_name ?? "-";
  const siteName = invoice.site?.nom ?? "-";

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);

  // Normalisation des montants (peuvent arriver en string depuis l'API)
  const amountHT = typeof invoice.amount_ht === "string" ? parseFloat(invoice.amount_ht) : invoice.amount_ht;
  const taxAmount = typeof invoice.tax_amount === "string" ? parseFloat(invoice.tax_amount) : invoice.tax_amount;
  const amountTTC = typeof invoice.amount_ttc === "string" ? parseFloat(invoice.amount_ttc) : invoice.amount_ttc;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={onClose} />

      {/* Panneau */}
      <div className="fixed right-0 top-0 h-full w-[420px] bg-white z-50 shadow-2xl flex flex-col rounded-l-3xl overflow-hidden">

        {/* Bouton fermeture */}
        <div className="flex items-start px-6 pt-6 pb-0 shrink-0">
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-xl transition -ml-1">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        {/* Titre */}
        <div className="px-6 pt-4 pb-5 shrink-0">
          <h2 className="text-2xl font-black text-slate-900">Facture {invoice.reference}</h2>
          <p className="text-slate-400 text-xs mt-0.5">Retrouvez les détails de la facture en dessous</p>
        </div>

        {/* Corps scrollable */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-5">

          {/* Champs de base */}
          <div className="space-y-0">
            {[
              {
                label: "ID Facture",
                render: () => (
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{invoice.reference}</span>
                    <button
                      onClick={() => copyToClipboard(invoice.reference)}
                      className="p-1 hover:bg-slate-100 rounded-md transition"
                      aria-label="Copier la référence"
                    >
                      <Copy size={12} className="text-slate-400" />
                    </button>
                  </div>
                ),
              },
              { label: "Prestataire", value: providerName },
              { label: "Date", value: formatDate(invoice.invoice_date) },
              { label: "Site", value: siteName },
              { label: "Montant HT", value: formatCurrency(amountHT) },

            ].map((f, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0"
              >
                <p className="text-xs text-slate-400 font-medium">{f.label}</p>
                {f.render
                  ? f.render()
                  : <p className="text-sm font-bold text-slate-900">{f.value}</p>
                }
              </div>
            ))}

            {/* Ligne statut + bouton check rapide */}
            <div className="flex items-center justify-between py-3">
              <p className="text-xs text-slate-400 font-medium">Statut</p>
              <div className="flex items-center gap-2">
                <StatusBadge status={invoice.payment_status} />
                {!isPaid && (
                  <button
                    onClick={() => onMarkPaid(invoice.id)}
                    className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center hover:bg-emerald-100 transition"
                    title="Marquer comme payée"
                    aria-label="Marquer comme payée"
                  >
                    <CheckCircle2 size={16} className="text-emerald-600" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Récapitulatif HT / TVA / TTC */}
          <div className="bg-slate-50 rounded-2xl border border-slate-100 px-4 py-3 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Montant HT</span>
              <span className="font-bold text-slate-900">{formatCurrency(amountHT)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">TVA</span>
              <span className="font-bold text-slate-900">{formatCurrency(taxAmount)}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-slate-200 pt-1.5">
              <span className="font-black text-slate-900">Montant TTC</span>
              <span className="font-black text-slate-900">{formatCurrency(amountTTC)}</span>

            </div>
          </div>

          {/* Bandeau "Payée le ..." */}
          {isPaid && invoice.payment_date && (
            <div className="flex items-center gap-2 py-3 px-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-bold">
              <CheckCircle2 size={16} />
              Payée le {formatDate(invoice.payment_date)}
            </div>
          )}

          {/* Constatations du rapport d'intervention (snake_case corrigé) */}
          {invoice.intervention_report?.findings && (
            <div>
              <p className="text-xs text-slate-400 font-medium mb-2">Constatations</p>
              <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-xl p-4 border border-slate-100">
                {invoice.intervention_report.findings}
              </p>
            </div>
          )}

          {/* Pièce jointe PDF */}
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
                <a
                  href={pdfUrl} download target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-black transition shrink-0"
                >
                  <Download size={13} /> Télécharger
                </a>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-slate-200 rounded-2xl px-5 py-5 flex items-center gap-3 text-slate-400">
              <FileText size={18} className="shrink-0" />
              <p className="text-sm font-medium">Aucun PDF attaché</p>
            </div>
          )}
        </div>

        {/* Footer : CTA marquer payée */}
        {!isPaid && (
          <div className="px-6 py-5 border-t border-slate-100 shrink-0">
            <button
              onClick={() => onMarkPaid(invoice.id)}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition"
            >
              <CheckCircle2 size={16} /> Marquer comme payée
            </button>
          </div>
        )}
      </div>

      {/* Modale aperçu PDF (priorité z maximale) */}
      {pdfPreview && (
        <PdfPreviewModal
          url={pdfPreview.url}
          name={pdfPreview.name}
          onClose={() => setPdfPreview(null)}
        />
      )}
    </>
  );
}

// ══════════════════════════════════════════════
// PAGE PRINCIPALE
// ══════════════════════════════════════════════

export default function FacturesPage() {
  const filterRef = useRef<HTMLDivElement>(null);

  const { invoices, stats, isLoading, fetchInvoices, fetchStats, markAsPaid } = useInvoices();

  // États UI
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<{ status?: string }>({});
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();
  const [exportLoading, setExportLoading] = useState(false);

  const PER_PAGE = 10;

  // Chargement initial
  useEffect(() => {
    fetchInvoices();
    fetchStats();
  }, [fetchInvoices, fetchStats]);

  // Auto-dismiss du flash après 5 s

  // Ferme le dropdown filtre au clic extérieur
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFiltersOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Helpers locaux ──


  const applyFilters = (f: { status?: string }) => {
    setFilters(f);
    setCurrentPage(1);
  };

  // ── Données filtrées & paginées ──

  const filtered = invoices.filter(inv => !filters.status || inv.payment_status === filters.status);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);
  const activeCount = Object.values(filters).filter(Boolean).length;

  // ── Handler : marquer payée ──

  const handleMarkPaid = async (id: number) => {
    try {
      await markAsPaid(id);
      setSelectedInvoice(prev =>
        prev?.id === id ? { ...prev, payment_status: "paid" as const } : prev,
      );
      toast.success("Facture marquée comme payée avec succès.");
    } catch {
      toast.error("Erreur lors de la mise à jour du statut.");
    }
  };

  const handleExport = async () => {
    if (exportLoading) return;
    setExportLoading(true);
    try {
      const dataToExport = filtered.length > 0 ? filtered : invoices;
      const rows = dataToExport.map(inv => ({
        reference: inv.reference,
        prestataire: inv.provider?.company_name ?? "-",
        site: inv.site?.nom ?? "-",
        date: formatDate(inv.invoice_date),
        montant_ht: typeof inv.amount_ht === "string" ? parseFloat(inv.amount_ht) : (inv.amount_ht ?? 0),
        tva: typeof inv.tax_amount === "string" ? parseFloat(inv.tax_amount) : (inv.tax_amount ?? 0),
        montant_ttc: typeof inv.amount_ttc === "string" ? parseFloat(inv.amount_ttc) : (inv.amount_ttc ?? 0),
        statut: { paid: "Payée", pending: "En attente", overdue: "En retard", cancelled: "Annulée" }[inv.payment_status] ?? inv.payment_status,
        date_paiement: formatDate(inv.payment_date),
      }));
      exportToXlsx(rows, [
        { header: "Référence", key: "reference", width: 18 },
        { header: "Prestataire", key: "prestataire", width: 24 },
        { header: "Site", key: "site", width: 20 },
        { header: "Date", key: "date", width: 14 },
        { header: "Montant HT", key: "montant_ht", width: 16 },
        { header: "TVA", key: "tva", width: 14 },
        { header: "Montant TTC", key: "montant_ttc", width: 16 },
        { header: "Statut", key: "statut", width: 14 },
        { header: "Date paiement", key: "date_paiement", width: 16 },
      ], { filename: "factures", sheetName: "Factures", title: "Export Factures - CANAL+" });
      toast.success("Export téléchargé avec succès.");
    } catch {
      toast.error("Erreur lors de l'exportation.");
    } finally {
      setExportLoading(false);
    }
  };

  // ── KPIs ──

  // Normalisation des montants stats (peuvent arriver en string)
  const totalAmount = stats?.total_amount ?? 0;
  const totalInvoices = stats?.total_invoices ?? 0;
  const avgCost = totalInvoices > 0 ? Math.round(totalAmount / totalInvoices) : 0;

  const kpis = [
    { label: "Coût moyen par facture", value: formatCurrency(avgCost), delta: "+3%", trend: "up" as const },

    { label: "Nombre total de factures", value: totalInvoices, delta: "+3%", trend: "up" as const },
    { label: "Factures en attente", value: stats?.total_unpaid ?? 0, delta: "+0%", trend: "up" as const },
    { label: "Factures payées", value: stats?.total_paid ?? 0, delta: "+15,03%", trend: "up" as const },
  ];

  // ── Colonnes DataTable ──

  const columns: ColumnConfig<Invoice>[] = [
    {
      header: "ID Facture",
      key: "reference",
      render: (_: any, row: Invoice) => (
        <span className="font-black text-slate-900 text-sm">{row.reference}</span>
      ),
    },
    {
      header: "Prestataire",
      key: "provider",
      render: (_: any, row: Invoice) => row.provider?.company_name ?? "-",
    },
    {
      header: "Date",
      key: "invoice_date",
      render: (_: any, row: Invoice) => formatDate(row.invoice_date),
    },
    {
      header: "Site",
      key: "site",
      render: (_: any, row: Invoice) => row.site?.nom ?? "-",
    },
    {
      header: "Montant TTC",
      key: "amount_ttc",
      render: (_: any, row: Invoice) => (
        <span className="font-bold">{formatCurrency(row.amount_ttc)}</span>
      ),

    },
    {
      header: "Statut",
      key: "payment_status",
      render: (_: any, row: Invoice) => <StatusBadge status={row.payment_status} />,
    },
    {
      header: "Actions",
      key: "actions",
      render: (_: any, row: Invoice) => (
        <div className="flex items-center gap-3">

          {/* <button
            onClick={() => { setSelectedInvoice(row); setIsDetailsOpen(true); }}
            className="font-bold text-slate-800 hover:text-gray-500 transition"
            aria-label={`Voir détail facture ${row.reference}`}
          >
            <Eye size={18} />
          </button> */}
          {/* Lien vers la page détail */}
          <Link
            href={`/admin/factures/details/${row.id}`}
            className="group p-2 rounded-xl bg-white hover:bg-gray-50 transition flex items-center justify-center"
            aria-label={`Aller au détail facture ${row.reference}`}
          >
            <Eye size={16} className="group-hover:rotate-45 transition-transform" />
          </Link>
        </div>
      ),
    },
  ];

  // ─────────────────────────────────────────────
  // Rendu
  // ─────────────────────────────────────────────

  return (
    // ← BUG CORRIGÉ : className fermé proprement (idem dashboard)
    <div className="min-h-screen flex bg-slate-50">

      <div className="flex-1 flex flex-col">
        <Navbar />

        <main className="mt-20 p-6 space-y-8">
          <PageHeader
            title="Factures"
            subtitle="Ce menu vous permet de voir les différentes factures disponibles"
          />


          {/* ── KPIs ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis.map((k, i) => <StatsCard key={i} {...k} />)}
          </div>

          {/* ── Barre d'actions (filtre + export) ── */}
          <div className="shrink-0 flex justify-end items-center gap-3">
            <div className="relative" ref={filterRef}>
              <button
                onClick={() => setFiltersOpen(!filtersOpen)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition ${filtersOpen || activeCount > 0
                  ? "bg-slate-900 text-white border-slate-900"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
              >
                <Filter size={16} /> Filtrer par
                {activeCount > 0 && (
                  <span className="ml-1 bg-white text-slate-900 text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                    {activeCount}
                  </span>
                )}
              </button>
              <FilterDropdown
                isOpen={filtersOpen}
                onClose={() => setFiltersOpen(false)}
                filters={filters}
                onApply={applyFilters}
              />
            </div>

            <button
              onClick={handleExport}
              disabled={exportLoading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-bold hover:bg-slate-50 transition disabled:opacity-60 disabled:cursor-wait"
            >
              {exportLoading
                ? <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
                : <Upload size={16} />}
              Exporter
            </button>
          </div>

          {/* Tag filtre actif */}
          {filters.status && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Filtré par :</span>
              <span className="flex items-center gap-1.5 bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded-full">
                {STATUS_LABELS[filters.status] ?? filters.status}
                <button onClick={() => applyFilters({})} className="hover:opacity-70 transition" aria-label="Retirer le filtre">
                  <X size={12} />
                </button>
              </span>
            </div>
          )}

          {/* ── Tableau ── */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <DataTable
              title="Liste des factures"
              columns={columns}
              data={isLoading ? [] : paginated}
              onViewAll={() => { }}
            />
            <div className="p-6 border-t border-slate-50 flex justify-end bg-slate-50/30">
              <Paginate
                currentPage={currentPage}
                totalPages={totalPages || 1}
                onPageChange={setCurrentPage}
              />
            </div>
          </div>

          {/* ── Side panel détail facture ── */}
          <InvoiceSidePanel
            invoice={isDetailsOpen ? selectedInvoice : null}
            onClose={() => { setIsDetailsOpen(false); setSelectedInvoice(null); }}
            onMarkPaid={handleMarkPaid}
          />
        </main>
      </div>
    </div>
  );
}