"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import StatsCard from "@/components/StatsCard";
import {
  ChevronLeft, CheckCircle2, XCircle, Clock,
  FileText, Eye, Download, X,
  MapPin, Briefcase, DollarSign,
  AlertTriangle, AlertCircle,
} from "lucide-react";

import {
  providerInvoiceService, Invoice,
  STATUS_LABELS, STATUS_STYLES, STATUS_DOT,
  formatMontant, formatDate, formatDateLong,
  getPdfUrl, getProviderName, getSiteName,
  getReport, toNum,
} from "@services/providerInvoiceService";

// ─── StatusBadge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const icons: Record<string, React.ReactNode> = {
    paid:      <CheckCircle2  size={14} />,
    pending:   <Clock         size={14} />,
    overdue:   <AlertTriangle size={14} />,
    cancelled: <XCircle       size={14} />,
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-bold
      ${STATUS_STYLES[status] ?? "border-slate-200 bg-slate-50 text-slate-500"}`}>
      {icons[status]}
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ─── PDF Preview Modal — centre plein écran ───────────────────────────────────

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

// ─── FlowStep — Flux : Rapport → Devis → Facture ─────────────────────────────

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
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 rounded-full bg-slate-900 border-2 border-slate-900 flex items-center justify-center text-white shrink-0">
          {icon}
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-slate-200 my-2" />}
      </div>
      <div className="flex-1 pb-6">
        <h4 className="text-sm font-black text-slate-900 mb-1">{label}</h4>
        {reference && <p className="text-xs text-slate-500 mb-1">Réf : {reference}</p>}
        {date      && <p className="text-xs text-slate-400">{formatDate(date)}</p>}
        {status    && <div className="mt-2"><StatusBadge status={status} /></div>}
      </div>
    </div>
  );
}

// ─── Page détail ──────────────────────────────────────────────────────────────

export default function ProviderFacturesDetailPage() {
  const params    = useParams();
  const router    = useRouter();
  const invoiceId = Number(params?.id);

  const [invoice,    setInvoice]    = useState<Invoice | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [pdfPreview, setPdfPreview] = useState<{ url: string; name: string } | null>(null);

  // ── Chargement ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!invoiceId) return;
    const load = async () => {
      setLoading(true); setError("");
      try {
        // GET /provider/invoice/{id} — charge avec interventionReport, quote, provider, site, attachments
        const data = await providerInvoiceService.getInvoiceById(invoiceId);
        setInvoice(data);
      } catch (e: any) {
        setError(
          e.response?.data?.message ??
          e.response?.data?.error   ??
          "Impossible de charger cette facture."
        );
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [invoiceId]);

  // ── Données dérivées ──────────────────────────────────────────────────────
  const isPaid    = invoice?.payment_status === "paid";
  const isOverdue = invoice?.payment_status === "overdue";
  const report    = invoice ? getReport(invoice) : undefined;

  const amountHT  = toNum(invoice?.amount_ht);
  const taxAmount = toNum(invoice?.tax_amount);
  const amountTTC = toNum(invoice?.amount_ttc);

  // PDF principal
  const pdfUrl  = invoice?.pdf_path ? getPdfUrl(invoice.pdf_path) : null;
  const pdfName = invoice?.pdf_path?.split("/").pop() ?? "facture.pdf";

  // Justificatifs supplémentaires (relation attachments[])
  const attachments = (invoice?.attachments ?? []).map((a) => ({
    name: a.file_path.split("/").pop() ?? "document",
    url:  getPdfUrl(a.file_path),
  }));

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = [
    { label: "Prestataire", value: getProviderName(invoice?.provider), delta: "", trend: "up" as const },
    { label: "Site",        value: getSiteName(invoice?.site),         delta: "", trend: "up" as const },
    { label: "Montant HT",  value: formatMontant(amountHT),            delta: "", trend: "up" as const },
    { label: "Montant TTC", value: formatMontant(amountTTC),           delta: "", trend: "up" as const },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="ml-64 mt-20 p-8 space-y-8">

          {/* Bouton retour */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-500 hover:text-black transition-colors
              bg-white px-4 py-2 rounded-xl border border-slate-100 w-fit text-sm font-medium"
          >
            <ChevronLeft size={16} /> Retour
          </button>

          {/* Erreur */}
          {error && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl text-sm font-medium">
              <AlertCircle size={15} className="shrink-0" /> {error}
            </div>
          )}

          {/* Skeleton */}
          {loading && (
            <div className="space-y-4 animate-pulse">
              <div className="h-10 w-80 bg-slate-100 rounded-2xl" />
              <div className="h-36 bg-slate-100 rounded-3xl" />
              <div className="grid grid-cols-4 gap-6">
                {[0,1,2,3].map(i => <div key={i} className="h-28 bg-slate-100 rounded-3xl" />)}
              </div>
              <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 h-80 bg-slate-100 rounded-3xl" />
                <div className="h-80 bg-slate-100 rounded-3xl" />
              </div>
            </div>
          )}

          {invoice && (
            <>
              {/* ── Header ─────────────────────────────────────────────── */}
              <div className="bg-white flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="space-y-3">
                  <div className="flex items-center gap-4 flex-wrap">
                    <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase">
                      {invoice.reference}
                    </h1>
                    <StatusBadge status={invoice.payment_status} />
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <Briefcase size={16} />
                    <span className="font-medium text-base">
                      Rapport : {report?.reference ?? `#${invoice.report_id}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <MapPin size={14} />
                    <span className="text-sm font-medium">{getSiteName(invoice.site)}</span>
                  </div>
                </div>

                {/* Bloc dates */}
                <div className="bg-slate-50/50 p-5 rounded-[24px] border border-slate-100 min-w-[280px] space-y-2.5">
                  {[
                    { label: "Date facture", value: formatDate(invoice.invoice_date), style: "text-slate-900" },
                    {
                      label: "Échéance",
                      value: formatDate(invoice.due_date),
                      style: isOverdue ? "text-red-600 font-black" : "text-slate-900",
                    },
                    ...(isPaid && invoice.payment_date
                      ? [{ label: "Payée le", value: formatDate(invoice.payment_date), style: "text-emerald-700 font-black" }]
                      : []),
                  ].map((r, i) => (
                    <div key={i} className="flex justify-between items-center text-sm">
                      <span className="text-slate-400 font-medium">{r.label}</span>
                      <span className={`font-bold ${r.style}`}>{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── KPIs ─────────────────────────────────────────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpis.map((k, i) => <StatsCard key={i} {...k} />)}
              </div>

              {/* ── Layout 2 colonnes ────────────────────────────────── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Colonne gauche */}
                <div className="lg:col-span-2 space-y-6">

                  {/* Flux de traitement — Rapport → Devis → Facture */}
                  <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">
                      Flux de traitement
                    </h3>
                    <FlowStep
                      label="Rapport d'intervention"
                      reference={report?.reference ?? `Rapport #${invoice.report_id}`}
                      date={report?.start_date}
                      icon={<FileText size={18} />}
                    />
                    {invoice.quote && (
                      <FlowStep
                        label="Devis approuvé"
                        reference={invoice.quote.reference}
                        icon={<CheckCircle2 size={18} />}
                      />
                    )}
                    <FlowStep
                      label="Facture générée"
                      reference={invoice.reference}
                      date={invoice.invoice_date}
                      status={invoice.payment_status}
                      icon={<DollarSign size={18} />}
                      isLast
                    />
                  </div>

                  {/* Détails financiers */}
                  <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                      Détails financiers
                    </h3>
                    <div className="border border-slate-100 rounded-2xl overflow-hidden">
                      <div className="bg-slate-50 border-b border-slate-100 px-4 py-3 space-y-2">
                        {[
                          { label: "Montant HT", value: formatMontant(amountHT) },
                          { label: "TVA",        value: formatMontant(taxAmount) },
                        ].map((r) => (
                          <div key={r.label} className="flex justify-between text-sm">
                            <span className="text-slate-500">{r.label}</span>
                            <span className="font-bold text-slate-900">{r.value}</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-base border-t border-slate-200 pt-2">
                          <span className="font-black text-slate-900">Total TTC</span>
                          <span className="font-black text-slate-900">{formatMontant(amountTTC)}</span>
                        </div>
                      </div>

                      {/* Payée */}
                      {isPaid && (
                        <div className="px-4 py-3 bg-emerald-50 border-t border-emerald-100">
                          <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm mb-1">
                            <CheckCircle2 size={16} />
                            Payée le {formatDateLong(invoice.payment_date)}
                          </div>
                          {invoice.payment_method    && <p className="text-xs text-emerald-600">Mode : {invoice.payment_method}</p>}
                          {invoice.payment_reference && <p className="text-xs text-emerald-600 font-mono">Réf : {invoice.payment_reference}</p>}
                        </div>
                      )}

                      {/* En retard */}
                      {isOverdue && (
                        <div className="px-4 py-3 bg-red-50 border-t border-red-100">
                          <div className="flex items-center gap-2 text-red-700 font-bold text-sm">
                            <AlertTriangle size={16} />
                            Facture en retard — Échéance dépassée
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Rapport lié — description ou findings */}
                  {(report?.description || report?.findings) && (
                    <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                        Rapport d'intervention
                      </h3>
                      <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-xl p-4 border border-slate-100">
                        {report?.findings ?? report?.description}
                      </p>
                    </div>
                  )}

                  {/* Commentaire */}
                  {invoice.comment && (
                    <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Commentaire</h3>
                      <p className="text-sm text-slate-700 leading-relaxed">{invoice.comment}</p>
                    </div>
                  )}
                </div>

                {/* Colonne droite */}
                <div className="space-y-6">

                  {/* Document PDF principal */}
                  <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
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
                            <Eye size={13} /> Aperçu
                          </button>
                          <a href={pdfUrl} download target="_blank" rel="noreferrer"
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-black transition">
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

                    {/* Justificatifs supplémentaires (invoices/attachments/) */}
                    {attachments.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                          Justificatifs ({attachments.length})
                        </p>
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
                    )}
                  </div>

                  {/* Statut actuel */}
                  <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Statut actuel</h3>
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center"
                        style={{ backgroundColor: `${STATUS_DOT[invoice.payment_status] ?? "#94a3b8"}18` }}
                      >
                        {isPaid
                          ? <CheckCircle2  size={18} className="text-green-500"  />
                          : isOverdue
                            ? <AlertTriangle size={18} className="text-red-500"    />
                            : <Clock         size={18} className="text-amber-500"  />
                        }
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900">
                          {STATUS_LABELS[invoice.payment_status] ?? invoice.payment_status}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">Màj : {formatDate(invoice.updated_at)}</p>
                      </div>
                    </div>

                    {invoice.payment_status === "pending" && (
                      <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 font-medium">
                        ⏳ Votre facture est en attente de validation et de paiement.
                      </p>
                    )}
                    {isPaid && (
                      <p className="text-xs text-green-600 bg-green-50 border border-green-100 rounded-xl px-4 py-3 font-medium">
                        ✅ Cette facture a été réglée le {formatDate(invoice.payment_date)}.
                      </p>
                    )}
                    {isOverdue && (
                      <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 font-medium">
                        ❌ Facture en retard. Contactez l'administrateur.
                      </p>
                    )}
                  </div>

                  {/* Infos prestataire */}
                  {invoice.provider && (
                    <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Prestataire</h3>
                      <div className="space-y-2.5">
                        {[
                          { label: "Nom",       value: getProviderName(invoice.provider) },
                          { label: "Email",     value: invoice.provider.email ?? "—"     },
                          { label: "Téléphone", value: invoice.provider.phone ?? "—"     },
                        ].map((f, i) => (
                          <div key={i} className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0">
                            <span className="text-xs text-slate-400 font-medium">{f.label}</span>
                            <span className="text-xs font-bold text-slate-900">{f.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* PDF Preview Modal — centre */}
      {pdfPreview && (
        <PdfPreviewModal url={pdfPreview.url} name={pdfPreview.name} onClose={() => setPdfPreview(null)} />
      )}
    </div>
  );
}