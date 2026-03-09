"use client";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import ActionHeader from "@/components/ActionHeader";

interface ListItem {
  name: string;
  subText: string;
  // id du site pour construire le lien /admin/sites/details/[id]
  id?: number | string;
}

interface ListCardProps {
  title: string;
  items: ListItem[];
  // href du lien "Voir tous" dans le header
  viewAllHref?: string;
  viewAllText?: string;
}

export default function ListCard({
  title,
  items,
  viewAllHref = "/admin/sites",
  viewAllText = "Voir tous",
}: ListCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-8">
      {/* Header avec lien "Voir tous" → /admin/sites */}
      <ActionHeader title={title} href={viewAllHref} linkText={viewAllText} />

      <div className="space-y-3">
        {items.map((item, index) => {
          // Si l'item a un id, on construit le lien vers la page détails du site
          const href = item.id ? `/admin/sites/details/${item.id}` : "/admin/sites";

          return (
            <Link
              key={index}
              href={href}
              className="group flex items-center justify-between p-5 rounded-2xl bg-slate-50/50 hover:bg-slate-100/80 transition-all duration-200 cursor-pointer"
            >
              <div className="space-y-1">
                <p className="font-bold text-slate-800 text-base leading-none">
                  {item.name}
                </p>
                <p className="text-sm font-medium text-slate-400">
                  {item.subText}
                </p>
              </div>
              <div className="text-slate-900 group-hover:translate-x-1 transition-transform">
                <ChevronRight size={22} strokeWidth={3} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}