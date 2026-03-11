import Link from "next/link";
import {
  ChevronLeft,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  MapPin,
  Briefcase,
  RefreshCw,
  AlertCircle
} from "lucide-react";

import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import StatsCard from "@/components/StatsCard";


// ─────────────────────────────────────────
// DATA STATIQUE
// ─────────────────────────────────────────

const quote = {
  id: 1,
  reference: "DEV-2026-001",
  status: "approved",
  created_at: "2026-03-10T10:00:00",
  approved_at: "2026-03-11T08:00:00",

  description:
    "Maintenance et remplacement du système de climatisation du bâtiment principal.",

  provider: {
    name: "ClimTech Services"
  },

  site: {
    name: "Abidjan Plateau"
  },

  ticket: {
    reference: "TCK-4452",
    subject: "Panne système climatisation",
    type: "Maintenance",
    status: "Ouvert"
  },

  items: [
    {
      designation: "Compresseur climatisation",
      quantity: 1,
      unit_price: 350000
    },
    {
      designation: "Main d'oeuvre installation",
      quantity: 1,
      unit_price: 120000
    }
  ],

  history: [
    {
      id: 1,
      action: "created",
      performed_by_name: "Jean Admin",
      created_at: "2026-03-10T10:00:00"
    },
    {
      id: 2,
      action: "approved",
      performed_by_name: "Marie Manager",
      created_at: "2026-03-11T08:00:00"
    }
  ]
};


// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

const formatMontant = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M FCFA`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}K FCFA`;
  return `${v.toLocaleString("fr-FR")} FCFA`;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });


// ─────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {

  const map: any = {
    pending: {
      label: "En attente",
      icon: <Clock size={14}/>
    },
    approved: {
      label: "Approuvé",
      icon: <CheckCircle2 size={14}/>
    },
    rejected: {
      label: "Rejeté",
      icon: <XCircle size={14}/>
    },
    revision: {
      label: "Révision",
      icon: <RefreshCw size={14}/>
    }
  };

  const config = map[status];

  return (
    <span className="flex items-center gap-2 px-4 py-2 border rounded-xl text-sm font-bold">
      {config.icon}
      {config.label}
    </span>
  );
}


// ─────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────

export default function DevisDetailsPage() {

  const totalHT = quote.items.reduce(
    (s, i) => s + i.quantity * i.unit_price,
    0
  );

  const tax = totalHT * 0.18;
  const totalTTC = totalHT + tax;

  const kpis = [
    { label: "Prestataire", value: quote.provider.name },
    { label: "Site", value: quote.site.name },
    { label: "Articles", value: quote.items.length },
    { label: "Total TTC", value: formatMontant(totalTTC) }
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">

      <Sidebar/>

      <div className="flex-1 flex flex-col pl-64">

        <Navbar/>

        <main className="mt-20 p-8 space-y-8">

          {/* HEADER */}

          <div className="bg-white p-6 rounded-2xl border">

            <Link
              href="/admin/devis"
              className="flex items-center gap-2 mb-4 text-sm"
            >
              <ChevronLeft size={18}/>
              Retour
            </Link>

            <div className="flex items-center gap-4">
              <h1 className="text-4xl font-black">
                {quote.reference}
              </h1>

              <StatusBadge status={quote.status}/>
            </div>

            <div className="flex items-center gap-3 mt-3 text-sm text-gray-500">
              <Briefcase size={16}/>
              {quote.ticket.reference}
            </div>

            <div className="flex items-center gap-3 text-sm text-gray-500">
              <MapPin size={16}/>
              {quote.site.name}
            </div>

          </div>


          {/* KPIs */}

          <div className="grid grid-cols-4 gap-6">
            {kpis.map((k,i)=>(
              <StatsCard key={i} {...k}/>
            ))}
          </div>


          {/* DESCRIPTION */}

          <div className="bg-white p-6 rounded-2xl border">

            <h3 className="text-sm font-bold mb-3">
              Description
            </h3>

            <p className="text-sm text-gray-600">
              {quote.description}
            </p>

          </div>


          {/* ARTICLES */}

          <div className="bg-white p-6 rounded-2xl border">

            <h3 className="text-sm font-bold mb-4">
              Articles
            </h3>

            <table className="w-full text-sm">

              <thead className="border-b">
                <tr>
                  <th className="text-left py-2">Désignation</th>
                  <th>Qté</th>
                  <th>P.U</th>
                  <th>Total</th>
                </tr>
              </thead>

              <tbody>

                {quote.items.map((item,i)=>{

                  const total=item.quantity*item.unit_price;

                  return(
                    <tr key={i} className="border-b">

                      <td className="py-2">
                        {item.designation}
                      </td>

                      <td className="text-center">
                        {item.quantity}
                      </td>

                      <td className="text-right">
                        {formatMontant(item.unit_price)}
                      </td>

                      <td className="text-right font-bold">
                        {formatMontant(total)}
                      </td>

                    </tr>
                  );
                })}

              </tbody>

            </table>

            <div className="mt-4 text-right font-bold">
              Total TTC : {formatMontant(totalTTC)}
            </div>

          </div>


          {/* HISTORIQUE */}

          <div className="bg-white p-6 rounded-2xl border">

            <h3 className="text-sm font-bold mb-4">
              Historique
            </h3>

            {quote.history.map((h)=>(
              <div key={h.id} className="text-sm mb-2">
                {h.action} — {h.performed_by_name} — {formatDate(h.created_at)}
              </div>
            ))}

          </div>

        </main>
      </div>
    </div>
  );
}