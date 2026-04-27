"use client";
import { TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";

interface StatsCardProps {
  label: string;
  value: string | number;
  delta?: string;
  trend?: "up" | "down";
  isCurrency?: boolean;
  href?: string; // redirection au clic
  shouldTruncate?: boolean;
}

function formatMontant(value: number): string {
  if (value === 0) return "0";
  if (value >= 1_000_000) return `${Math.round(value / 1_000_000)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return `${Math.round(value)}`;
}

function formatCount(value: number): string {
  return value < 10 ? `0${value}` : `${value}`;
}

export default function StatsCard({ label, value, delta, trend = "up", isCurrency = false, href, shouldTruncate = true }: StatsCardProps) {
  const isUp = trend === "up";
  const showFCFA = isCurrency || (typeof value === "string" && value.includes("FCFA"));

  let displayValue: string;
  if (typeof value === "number" && isCurrency) {
    displayValue = formatMontant(value);
  } else if (typeof value === "string" && value.includes("FCFA")) {
    displayValue = value.replace(" FCFA", "").trim();
  } else if (typeof value === "number") {
    displayValue = formatCount(value);
  } else {
    displayValue = value || "-";
  }

  // const deltaBlock = delta ? (
  //   <div className={`flex items-center gap-1 text-[10px] font-medium flex-shrink-0 ${isUp ? "text-emerald-500" : "text-rose-500"}`}>
  //     <span className="whitespace-nowrap">{delta}</span>
  //     {isUp
  //       ? <TrendingUp size={16} strokeWidth={2.5} className="flex-shrink-0" />
  //       : <TrendingDown size={16} strokeWidth={2.5} className="flex-shrink-0" />
  //     }
  //   </div>
  // ) : null;

  const inner = (
    <>
      <p className="text-slate-600 text-[11px] font-semibold mb-4 px-1 leading-tight">{label}</p>
      <div className="flex items-center justify-between px-1 gap-2 min-w-0">
        {showFCFA ? (
          <div className="flex items-baseline gap-1.5 min-w-0 flex-1">
            <h3 className={`text-xl font-extrabold text-slate-900 tracking-tighter leading-none ${shouldTruncate ? "truncate" : ""}`}>{displayValue}</h3>
            <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase flex-shrink-0">FCFA</span>
          </div>
        ) : (
          <h3 className={`text-2xl font-extrabold text-slate-900 tracking-tighter flex-1 ${shouldTruncate ? "truncate" : ""}`}>{displayValue}</h3>
        )}
        {/* {deltaBlock} */}
      </div>
    </>
  );

  const base = "bg-white px-4 py-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 min-w-0";

  if (href) {
    return (
      <Link href={href} className={`${base} block cursor-pointer hover:border-slate-300 hover:-translate-y-0.5`}>
        {inner}
      </Link>
    );
  }

  return <div className={base}>{inner}</div>;
}