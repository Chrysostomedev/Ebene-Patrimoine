"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, CheckCircle2, Clock, XCircle, FileText,
  Eye, Download, X, MapPin, Briefcase, DollarSign,
  Calendar, AlertTriangle, TrendingUp,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import StatsCard from "@/components/StatsCard";

import { InvoiceService, Invoice } from "../../../../../services/admin/invoice.service";
import { useToast } from "@/contexts/ToastContext";
import { formatDate, formatCurrency } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANTS
// ═══════════════════════════════════════════════════════════════════════════

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid: "border-emerald-200 bg-emerald-50 text-emerald-600",
    pending: "border-amber-200 bg-amber-50 text-amber-600",
    overdue: "border-rose-200 bg-rose-50 text-rose-600",
    cancelled: "border-slate-200 bg-slate-50 text-slate-500",
  };
  const labels: Record<string, string> = {
    paid: "Validée",
    pending: "En attente",
    overdue: "En retard",
    cancelled: "Annulée",
  };
  const icons: Record<string, React.ReactNode> = {
    paid: <CheckCircle2 size={14} />,
    pending: <Clock size={14} />,
    overdue: <AlertTriangle size={14} />,
    cancelled: <XCircle size={14} />,
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-bold ${styles[status] ?? "border-slate-200 bg-slate-50 text-slate-500"
        }`}
    >
      {icons[status]}
      {labels[status] ?? status}
    </span>
  );
}

function FlowStep({ label, reference, date, status, icon, isLast }: { label: string; reference?: string; date?: string; status?: string; icon: React.ReactNode; isLast?: boolean }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 rounded-full bg-slate-900 border-2 border-slate-900 flex items-center justify-center text-white shrink-0">
          {icon}
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-slate-200 my-2" />}
      </div>
      <div className="flex-1 pb-6">
        <h4 className="text-sm font-black text-slate-900 mb-1">{label}</h4>
        {reference && <p className="text-xs text-slate-500 mb-1">Réf : {reference}</p>}
        {date && <p className="text-xs text-slate-400">{formatDate(date)}</p>}
        {status && <div className="mt-2"><StatusBadge status={status} /></div>}
      </div>
    </div>
  );
}

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
          <a href={url} download target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition">
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

export default function ManagerFactureDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = Number(params.id);

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<{ url: string; name: string } | null>(null);
  const { toast } = useToast();

  const fetchInvoice = async () => {
    setIsLoading(true);
    try {
      const data = await InvoiceService.getInvoice(invoiceId);
      setInvoice(data);
    } catch (err) {
      toast.error("Impossible de charger la facture.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (invoiceId) fetchInvoice();
  }, [invoiceId]);

  const providerName = invoice?.provider?.company_name ?? invoice?.provider?.name ?? "-";
  const siteName = invoice?.site?.nom ?? "-";
  const reportRef = invoice?.intervention_report?.reference ?? `Rapport #${invoice?.report_id}`;
  const pdfUrl = invoice?.pdf_path ? InvoiceService.getPdfUrl(invoice.pdf_path) : null;
  const pdfName = invoice?.pdf_path?.split("/").pop() ?? "facture.pdf";

  // ── Calculs de secours pour cohérence d'affichage ─────────────────────────
  const rawTTC = Number(invoice?.amount_ttc ?? 0);
  const rawTax = Number(invoice?.tax_amount ?? 0);
  const rawHT = Number(invoice?.amount_ht ?? 0);

  const displayTTC = rawTTC;
  const displayTax = rawTax;
  const displayHT = (rawHT === 0 && rawTTC > 0) ? (rawTTC - rawTax) : rawHT;

  const kpis = [
    { label: "Prestataire", value: providerName, delta: "", trend: "up" as const },
    { label: "Site", value: siteName, delta: "", trend: "up" as const },
    { label: "Montant HT", value: formatCurrency(displayHT), delta: "", trend: "up" as const },
    { label: "Montant TTC", value: formatCurrency(displayTTC), delta: "", trend: "up" as const },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="mt-20 p-8 space-y-8">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-black transition bg-white px-4 py-2 rounded-xl border border-slate-100 text-sm font-medium">
              <ChevronLeft size={18} /> Retour
            </button>
          </div>

          <div className="bg-white flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-4 mb-1">
                  <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase">
                    {isLoading ? "Chargement..." : invoice?.reference ?? `Facture #${invoiceId}`}
                  </h1>
                  {invoice && <StatusBadge status={invoice.payment_status} />}
                </div>
                <div className="flex items-center gap-2 text-slate-400 mt-1">
                  <Briefcase size={18} />
                  <span className="font-medium text-lg">Rapport : {reportRef}</span>
                </div>
              </div>
            </div>
            <div className="bg-slate-50/50 p-6 rounded-[24px] border border-slate-100 min-w-[300px]">
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Date facture</span>
                  <span className="font-bold text-slate-900">{formatDate(invoice?.invoice_date)}</span>
                </div>
                {invoice?.payment_status === "paid" && (
                  <div className="flex justify-between items-center border-t border-slate-200 pt-2">
                    <span className="text-slate-400 font-medium">Validée le</span>
                    <span className="font-bold text-emerald-700">{formatDate(invoice.payment_date)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis.map((k, i) => <StatsCard key={i} {...k} />)}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">Flux de traitement</h3>
                <FlowStep label="Rapport d'intervention" reference={reportRef} date={invoice?.intervention_report?.start_date} icon={<FileText size={18} />} />
                <FlowStep label="Facture créee" reference={invoice?.reference} date={invoice?.invoice_date} status={invoice?.payment_status} icon={<DollarSign size={18} />} isLast />
              </div>

              <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Détails financiers</h3>
                <div className="border border-slate-100 rounded-2xl overflow-hidden">
                  <div className="bg-slate-50 border-b border-slate-100 px-4 py-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Montant HT</span>
                      <span className="font-bold text-slate-900">{formatCurrency(displayHT)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">TVA (18%)</span>
                      <span className="font-bold text-slate-900">{formatCurrency(displayTax)}</span>
                    </div>
                    <div className="flex justify-between text-base border-t border-slate-200 pt-2">
                      <span className="font-black text-slate-900">Total TTC</span>
                      <span className="font-black text-slate-900">{formatCurrency(displayTTC)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Document facture</h3>
                {pdfUrl ? (
                  <div className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center"><FileText size={16} className="text-red-500" /></div>
                      <p className="text-xs font-bold text-slate-900 truncate flex-1">{pdfName}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setPdfPreview({ url: pdfUrl, name: pdfName })} className="flex-1 py-2 rounded-lg border border-slate-200 text-xs font-bold hover:bg-white transition">Aperçu</button>
                      <a href={pdfUrl} download className="flex-1 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold text-center hover:bg-black transition">Télécharger</a>
                    </div>
                  </div>
                ) : (
                  <div className="border border-dashed border-slate-200 rounded-xl p-5 text-center text-slate-400 text-sm">Aucun PDF attaché</div>
                )}

                {/* Justificatifs supplémentaires */}
                {(invoice?.attachments ?? []).length > 0 && (
                  <div className="mt-6 space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                      Justificatifs ({(invoice?.attachments ?? []).length})
                    </p>
                    <div className="space-y-2">
                      {(invoice?.attachments ?? []).map((file, i) => {
                        const fileName = file.file_path.split("/").pop() ?? "document";
                        const fileUrl = InvoiceService.getPdfUrl(file.file_path);
                        return (
                          <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-white hover:border-slate-300 transition-colors">
                            <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                              <FileText size={13} className="text-slate-400" />
                            </div>
                            <p className="text-xs font-bold text-slate-700 truncate flex-1">{fileName}</p>
                            <button
                              onClick={() => setPdfPreview({ url: fileUrl, name: fileName })}
                              className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900 transition p-1"
                            >
                              <Eye size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {pdfPreview && <PdfPreviewModal url={pdfPreview.url} name={pdfPreview.name} onClose={() => setPdfPreview(null)} />}
    </div>
  );
}