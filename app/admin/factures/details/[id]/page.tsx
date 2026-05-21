"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, CheckCircle2, Clock, XCircle, FileText,
  Eye, Download, X, MapPin, Briefcase, DollarSign,
  Calendar, AlertTriangle, TrendingUp,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import StatsCard from "@/components/StatsCard";
import { resolveUrl } from "@/components/AttachmentViewer";

import { InvoiceService, Invoice } from "../../../../../services/admin/invoice.service";
import { useToast } from "@/contexts/ToastContext";
import { formatDate, formatCurrency } from "@/lib/utils";



// HELPERS
const getActorName = (obj: any): string | null => {
  if (!obj) return null;
  const u = obj.user || obj;
  const person = u.manager || u.admin || u;
  const fn = (person.first_name || u.first_name || obj.first_name || "").trim();
  const ln = (person.last_name || u.last_name || obj.last_name || "").trim();
  const fullName = `${fn} ${ln}`.trim();
  const rawName = person.name || u.name || obj.name || "";
  return fullName || rawName || null;
};


// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANTS
// ═══════════════════════════════════════════════════════════════════════════

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid: "border-emerald-200 bg-emerald-50 text-emerald-600",
    pending: "border-amber-200 bg-amber-50 text-amber-600",
    overdue: "border-rose-200 bg-rose-50 text-rose-600",
    cancelled: "border-slate-200 bg-slate-50 text-slate-500",
    rejected: "border-red-200 bg-red-50 text-red-600",
  };
  const labels: Record<string, string> = {
    paid: "Validée",
    pending: "En attente",
    overdue: "En retard",
    cancelled: "Annulée",
    rejected: "Rejetée",
  };
  const icons: Record<string, React.ReactNode> = {
    paid: <CheckCircle2 size={14} />,
    pending: <Clock size={14} />,
    overdue: <AlertTriangle size={14} />,
    cancelled: <XCircle size={14} />,
    rejected: <XCircle size={14} />,
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

// ═══════════════════════════════════════════════════════════════════════════
// TIMELINE FLUX COMPLET : Rapport → Devis → Facture
// ═══════════════════════════════════════════════════════════════════════════

interface FlowStepProps {
  label: string;
  reference?: string;
  date?: string;
  status?: string;
  icon: React.ReactNode;
  isLast?: boolean;
}

function FlowStep({ label, reference, date, status, icon, isLast }: FlowStepProps) {
  return (
    <div className="flex gap-4">
      {/* Icône + ligne */}
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 rounded-full bg-slate-900 border-2 border-slate-900 flex items-center justify-center text-white shrink-0">
          {icon}
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-slate-200 my-2" />}
      </div>

      {/* Contenu */}
      <div className="flex-1 pb-6">
        <h4 className="text-sm font-black text-slate-900 mb-1">{label}</h4>
        {reference && <p className="text-xs text-slate-500 mb-1">Réf : {reference}</p>}
        {date && <p className="text-xs text-slate-400">{formatDate(date)}</p>}
        {status && (
          <div className="mt-2">
            <StatusBadge status={status} />
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FACTURES LIÉES AU RAPPORT/TICKET
// ═══════════════════════════════════════════════════════════════════════════

interface RelatedInvoicesListProps {
  invoices: Invoice[];
  currentInvoiceId: number;
}

// function RelatedInvoicesList({ invoices, currentInvoiceId }: RelatedInvoicesListProps) {
//   if (invoices.length <= 1) return null;

//   return (
//     <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
//       <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">
//         Factures liées ({invoices.length})
//       </h3>
//       <div className="space-y-3">
//         {invoices.map((inv) => {
//           const isCurrent = inv.id === currentInvoiceId;
//           return (
//             <Link
//               key={inv.id}
//               href={`/admin/factures/details/${inv.id}`}
//               className={`block p-4 rounded-xl border transition-all ${isCurrent
//                   ? "border-slate-900 bg-slate-900 text-white"
//                   : "border-slate-100 bg-slate-50 hover:bg-white hover:shadow-md"
//                 }`}
//             >
//               <div className="flex items-center justify-between mb-2">
//                 <div className="flex items-center gap-3">
//                   <span className="text-sm font-black">{inv.reference}</span>
//                   {isCurrent && (
//                     <span className="text-xs bg-white text-slate-900 px-2 py-0.5 rounded-full font-bold">
//                       Actuelle
//                     </span>
//                   )}
//                 </div>
//                 <StatusBadge status={inv.payment_status} />
//               </div>
//               <div className="flex items-center justify-between text-xs">
//                 <span className={isCurrent ? "text-slate-300" : "text-slate-500"}>
//                   {formatDate(inv.invoice_date)}
//                 </span>
//                 <span className="font-bold">{formatCurrency(Number(inv.amount_ttc))}</span>

//               </div>
//             </Link>
//           );
//         })}
//       </div>
//     </div>
//   );
// }

// ═══════════════════════════════════════════════════════════════════════════
// ACTION MODAL
// ═══════════════════════════════════════════════════════════════════════════

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant?: "primary" | "danger" | "success";
  loading?: boolean;
}

function ActionModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  confirmVariant = "primary",
  loading = false
}: ActionModalProps) {
  if (!isOpen) return null;

  const variantStyles = {
    primary: "bg-slate-900 text-white hover:bg-black shadow-slate-200",
    danger: "bg-red-600 text-white hover:bg-red-700 shadow-red-100",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-100",
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{title}</h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition text-slate-400 hover:text-slate-900">
              <X size={20} />
            </button>
          </div>
          <div className="space-y-6">
            <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-4 px-6 rounded-2xl bg-white border border-slate-100 text-slate-600 text-sm font-black uppercase tracking-widest hover:bg-slate-50 transition disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={`flex-1 py-4 px-6 rounded-2xl text-sm font-black uppercase tracking-widest transition shadow-xl flex items-center justify-center gap-2 ${variantStyles[confirmVariant]} disabled:opacity-50`}
              >
                {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface RejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  loading?: boolean;
}

function RejectModal({ isOpen, onClose, onConfirm, loading = false }: RejectModalProps) {
  const [reason, setReason] = useState("");
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Rejeter la facture</h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition text-slate-400 hover:text-slate-900">
              <X size={20} />
            </button>
          </div>
          <div className="space-y-6">
            <p className="text-slate-500 text-sm leading-relaxed">
              Veuillez spécifier le motif du rejet. Ce motif sera visible par le prestataire.
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Le montant HT ne correspond pas au devis approuvé..."
              className="w-full p-4 border border-slate-200 rounded-2xl text-sm text-slate-900 bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/5 outline-none h-28 resize-none transition-all"
            />
            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-4 px-6 rounded-2xl bg-white border border-slate-100 text-slate-600 text-sm font-black uppercase tracking-widest hover:bg-slate-50 transition disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={() => onConfirm(reason)}
                disabled={loading || !reason.trim()}
                className="flex-1 py-4 px-6 rounded-2xl text-sm font-black uppercase tracking-widest transition shadow-xl flex items-center justify-center gap-2 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Confirmer le rejet
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PDF PREVIEW MODAL
// ═══════════════════════════════════════════════════════════════════════════

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
          <a
            href={url}
            download
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition"
          >
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


// ═══════════════════════════════════════════════════════════════════════════
// PAGE DÉTAIL FACTURE
// ═══════════════════════════════════════════════════════════════════════════

export default function FactureDetailsPage() {
  const params = useParams();
  const invoiceId = Number(params.id);

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [relatedInvoices, setRelatedInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<{ url: string; name: string } | null>(null);
  const { toast } = useToast();


  // ── Chargement facture ──────────────────────────────────────────────────────
  const fetchInvoice = async () => {
    setIsLoading(true);
    try {
      const data = await InvoiceService.getInvoice(invoiceId);
      setInvoice(data);

      // Charger les factures liées au même rapport
      if (data.report_id) {
        const related = await InvoiceService.getInvoicesByReport(data.report_id);
        setRelatedInvoices(related);
      }
    } catch (err) {
      console.error("Erreur chargement facture", err);
      toast.error("Impossible de charger la facture.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (invoiceId) fetchInvoice();
  }, [invoiceId]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleOpenConfirm = () => setIsConfirmModalOpen(true);

  const handleMarkPaid = async () => {
    setActionLoading(true);
    try {
      await InvoiceService.markAsPaid(invoiceId, {
        payment_date: new Date().toISOString().split("T")[0],
        payment_method: "Virement",
        payment_reference: `MANUAL-${Date.now()}`,
      });
      toast.success("Facture marquée comme validée.");
      setIsConfirmModalOpen(false);
      fetchInvoice();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Erreur lors de la validation.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectInvoice = async (reason: string) => {
    setActionLoading(true);
    try {
      await InvoiceService.rejectInvoice(invoiceId, reason);
      toast.success("Facture rejetée avec succès.");
      setIsRejectModalOpen(false);
      fetchInvoice();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Erreur lors du rejet.");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Calculs ─────────────────────────────────────────────────────────────────
  const isPaid = invoice?.payment_status === "paid";
  const isOverdue = invoice?.payment_status === "overdue";

  const providerName = invoice?.provider?.name ?? invoice?.provider?.company_name ?? "-";
  const siteName = invoice?.site?.nom ?? invoice?.site?.name ?? "-";
  const reportRef = invoice?.interventionReport?.reference ?? `Rapport ${invoice?.report_id}`;
  const quoteRef = invoice?.quote?.reference ?? "-";

  const pdfUrl = invoice?.pdf_path ? resolveUrl(invoice.pdf_path) : null;
  const pdfName = invoice?.pdf_path?.split("/").pop() ?? "facture.pdf";

  // ── Calculs de secours pour cohérence d'affichage ─────────────────────────
  const rawTTC = Number(invoice?.amount_ttc ?? 0);
  const rawTax = Number(invoice?.tax_amount ?? 0);
  const rawHT = Number(invoice?.amount_ht ?? 0);

  // Si HT est à 0 mais TTC est présent, on recalcule HT pour la cohérence
  const displayTTC = rawTTC;
  const displayTax = rawTax;
  const displayHT = (rawHT === 0 && rawTTC > 0) ? (rawTTC - rawTax) : rawHT;

  // KPIs
  const kpis = [
    { label: "Prestataire", value: providerName, delta: "", trend: "up" as const },
    { label: "Site", value: siteName, delta: "", trend: "up" as const },
    {
      label: "Montant HT",
      value: displayHT,
      delta: "",
      trend: "up" as const,
      isCurrency: true,
    },
    {
      label: "Montant TTC",
      value: displayTTC,
      delta: "",
      trend: "up" as const,
      isCurrency: true,
    },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="mt-20 p-8 space-y-8">

          {/* ── Header ────────────────────────────────────────────────────── */}
          <div className="bg-white flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Link
                  href="/admin/factures"
                  className="flex items-center gap-2 text-slate-500 hover:text-black transition-colors bg-white px-4 py-2 rounded-xl border border-slate-100 w-fit text-sm font-medium"
                >
                  <ChevronLeft size={18} /> Retour
                </Link>
              </div>
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
                <div className="flex items-center gap-2 text-slate-500 mt-1">
                  <MapPin size={15} />
                  <span className="text-sm font-medium">{siteName}</span>
                </div>
              </div>
            </div>

            {/* Bloc droit - dates + Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="bg-slate-50/50 p-4 rounded-[24px] border border-slate-100 flex flex-col gap-2 min-w-[200px]">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Date facture</span>
                  <span className="font-bold text-slate-900 text-right ml-2">{formatDate(invoice?.invoice_date)}</span>
                </div>
                {isPaid && invoice?.payment_date && (
                  <div className="flex justify-between items-center text-xs border-t border-slate-200 pt-1">
                    <span className="text-slate-400 font-medium">Validée le</span>
                    <span className="font-bold text-emerald-700 text-right ml-2">{formatDate(invoice.payment_date)}</span>
                  </div>
                )}
              </div>

              {invoice && invoice.payment_status !== "paid" && invoice.payment_status !== "rejected" && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsRejectModalOpen(true)}
                    disabled={actionLoading}
                    className="flex items-center gap-1.5 px-4 py-3.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold hover:bg-rose-100 transition disabled:opacity-50"
                  >
                    <XCircle size={15} /> Rejeter
                  </button>
                  <button
                    onClick={handleOpenConfirm}
                    disabled={actionLoading}
                    className="flex items-center gap-1.5 px-4 py-3.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-100 disabled:opacity-50"
                  >
                    <CheckCircle2 size={15} /> Valider la facture
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── KPIs ──────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis.map((k, i) => (
              <StatsCard key={i} {...k} shouldTruncate={k.label === "Site" ? false : true} />
            ))}
          </div>

          {/* ── Contenu principal ─────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Colonne gauche : Flux + Montants + Rapport */}
            <div className="lg:col-span-2 space-y-6">
              {/* FLUX COMPLET */}
              <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">
                  Flux de traitement
                </h3>
                <div className="space-y-0">
                  <FlowStep
                    label="Rapport d'intervention"
                    reference={reportRef}
                    date={invoice?.interventionReport?.start_date}
                    icon={<FileText size={18} />}
                  />
                  {invoice?.quote && (
                    <FlowStep label="Devis approuvé" reference={quoteRef} icon={<CheckCircle2 size={18} />} />
                  )}
                  <FlowStep
                    label="Facture créee"
                    reference={invoice?.reference}
                    date={invoice?.invoice_date}
                    status={invoice?.payment_status}
                    icon={<DollarSign size={18} />}
                    isLast
                  />
                </div>
              </div>

              {/* Détails financiers */}
              <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">
                  Détails financiers
                </h3>
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
                  {isPaid && (
                    <div className="px-4 py-3 bg-emerald-50 border-t border-emerald-100">
                      <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm mb-2">
                        <CheckCircle2 size={16} />
                        Validée le {formatDate(invoice?.payment_date, { day: "2-digit", month: "long", year: "numeric" })} par {getActorName((invoice as any).payer || (invoice as any).validator) || 'Administrateur'}

                      </div>
                      {invoice?.payment_method && (
                        <p className="text-xs text-emerald-600">Mode : {invoice.payment_method}</p>
                      )}
                      {invoice?.payment_reference && (
                        <p className="text-xs text-emerald-600 font-mono">Réf : {invoice.payment_reference}</p>
                      )}
                    </div>
                  )}
                  {isOverdue && (
                    <div className="px-4 py-3 bg-red-50 border-t border-red-100">
                      <div className="flex items-center gap-2 text-red-700 font-bold text-sm">
                        <AlertTriangle size={16} />
                        Facture en retard - Échéance dépassée
                      </div>
                    </div>
                  )}
                  {invoice?.payment_status === "rejected" && (
                    <div className="px-4 py-3 bg-red-50 border-t border-red-100">
                      <div className="flex items-center gap-2 text-red-700 font-bold text-sm">
                        <XCircle size={16} />
                        Facture Rejetée
                      </div>
                      {invoice.reason && (
                        <p className="text-xs text-red-800 mt-1 pl-6 leading-relaxed">
                          Motif : <span className="font-medium">{invoice.reason}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Rapport lié
              {invoice?.interventionReport?.description && (
                <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">
                    Rapport d'intervention
                  </h3>
                  <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-xl p-4 border border-slate-100">
                    {invoice.interventionReport.description}
                  </p>
                </div>
              )} */}
            </div>

            {/* Colonne droite : PDF + Factures liées + Infos */}
            <div className="space-y-6">
              {/* PDF facture */}
              <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">
                  Document facture
                </h3>
                {pdfUrl ? (
                  <div className="flex flex-col gap-2 p-3 rounded-xl border border-slate-100 bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                        <FileText size={16} className="text-red-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{pdfName}</p>
                        <p className="text-[10px] text-slate-400">PDF</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPdfPreview({ url: pdfUrl, name: pdfName })}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-bold hover:bg-white transition"
                      >
                        <Eye size={13} />
                      </button>
                      <a
                        href={pdfUrl}
                        download
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-black transition"
                      >
                        <Download size={13} /> Télécharger
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="border border-dashed border-slate-200 rounded-xl px-4 py-5 flex items-center gap-3 text-slate-400">
                    <FileText size={16} className="shrink-0" />
                    <p className="text-sm font-medium">Aucun PDF attaché</p>
                  </div>
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
                        const fileUrl = resolveUrl(file.file_path);
                        return (
                          <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-white hover:border-slate-300 transition-colors group">
                            <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                              <FileText size={13} className="text-slate-400" />
                            </div>
                            <p className="text-xs font-bold text-slate-700 truncate flex-1">{fileName}</p>
                            <button
                              onClick={() => setPdfPreview({ url: fileUrl, name: fileName })}
                              className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900 transition p-1.5"
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

              {/* Factures liées */}
              {/* <RelatedInvoicesList invoices={relatedInvoices} currentInvoiceId={invoiceId} /> */}

              {/* Infos prestataire */}
              {invoice?.provider && (
                <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Prestataire</h3>
                  <div className="space-y-2.5">
                    {[
                      { label: "Nom", value: providerName },
                      { label: "Email", value: invoice.provider.email ?? "-" },
                      { label: "Téléphone", value: invoice.provider.phone ?? "-" },
                    ].map((f, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0"
                      >
                        <span className="text-xs text-slate-400 font-medium">{f.label}</span>
                        <span className="text-xs font-bold text-slate-900">{f.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* PDF fullscreen */}
      {pdfPreview && (
        <PdfPreviewModal url={pdfPreview.url} name={pdfPreview.name} onClose={() => setPdfPreview(null)} />
      )}

      {/* Confirmation validation facture */}
      <ActionModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleMarkPaid}
        title="Valider la facture"
        description="Voulez-vous vraiment marquer cette facture comme validée ? Cette action est irréversible et mettra à jour le statut du prestataire."
        confirmLabel="Confirmer la validation"
        confirmVariant="success"
        loading={actionLoading}
      />

      {/* Confirmation rejet facture */}
      <RejectModal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        onConfirm={handleRejectInvoice}
        loading={actionLoading}
      />
    </div>
  );
}