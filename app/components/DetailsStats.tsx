import { ChevronRight } from "lucide-react";
import Link from "next/link";

interface DetailsStatsProps {
  label: string;
  value: string | number;
href?: string;
  className?: string; 
}

export default function DetailsStats({ label, value,  href = "#", className = "" }: DetailsStatsProps) {
  const formattedValue = value.toString().padStart(2, '0');

  return (
    <div className={`bg-white px-4 py-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200 ${className}`}>
      <p className="text-slate-600 text-[11px] mb-4 px-1">{label}</p>
      
      <div className="flex items-center justify-between px-1">
        <h3 className="text-3xl font-extrabold text-slate-900 tracking-tighter">{formattedValue}</h3>

        <Link
          href={href}
          className="flex items-center gap-1 text-[13px] font-bold text-slate-900 transition-all no-underline group-hover:text-black mb-2"
        >
          <span>Voir le détail</span>
          <ChevronRight
            size={20}
            strokeWidth={3}
            className="group-hover:translate-x-1 transition-transform duration-200"
          />
        </Link>
      </div>
    </div>
  );
}
