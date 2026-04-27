"use client";

import { useMemo, useState } from "react";
import SearchInput from "./SearchInput";
import { useLanguage } from "../../contexts/LanguageContext";

export type ColumnConfig<T> = {
  header: string;
  key: keyof T | "actions";
  render?: (value: any, item: T) => React.ReactNode;
};

type Props<T> = {
  title: string;
  columns: ColumnConfig<T>[];
  data: T[];
  onViewAll?: () => void;
};

/** Nettoie le HTML et rend une valeur de cellule cliquable si email/téléphone */
function renderCellValue(value: any): React.ReactNode {
  if (value == null || value === "") return "-";
  const str = String(value);

  // Détecte si c'est du HTML rich-text (contient des balises HTML)
  if (/<[a-z][\s\S]*>/i.test(str)) {
    const stripped = str.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    if (!stripped) return "-";
    // Rend le HTML formaté (gras, italique, etc.) dans une div prose compacte
    return (
      <div
        className="prose prose-sm max-w-none text-slate-700 line-clamp-2 text-xs leading-relaxed [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic [&_u]:underline [&_s]:line-through"
        dangerouslySetInnerHTML={{ __html: str }}
      />
    );
  }

  const stripped = str.trim();
  if (!stripped) return "-";

  // Email
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(stripped)) {
    return (
      <a href={`mailto:${stripped}`} className="text-slate-700 hover:underline hover:text-slate-900 transition-colors" onClick={e => e.stopPropagation()}>
        {stripped}
      </a>
    );
  }
  // Téléphone
  if (/^[+\d][\d\s\-().]{6,}$/.test(stripped.trim())) {
    return (
      <a href={`tel:${stripped.replace(/\s/g, "")}`} className="text-slate-700 hover:underline hover:text-slate-900 transition-colors" onClick={e => e.stopPropagation()}>
        {stripped}
      </a>
    );
  }
  return stripped;
}

export default function DataTable<T extends { id: string | number }>({
  title,
  columns = [],
  data = [],
  onViewAll,
}: Props<T>) {
  const [search, setSearch] = useState("");
  const { t } = useLanguage();

  const filteredData = useMemo(() => {
    if (!search.trim()) return data;
    return data.filter((item) =>
      Object.values(item).join(" ").toLowerCase().includes(search.toLowerCase())
    );
  }, [data, search]);

  return (
    <div className="bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-8 pb-4 gap-4">
        <h2 className="text-xl font-black text-slate-800 tracking-tight">{title}</h2>
        <div className="flex-1">
          <SearchInput onSearch={setSearch} placeholder={t("table.search")} />
        </div>
      </div>

      <div className="overflow-x-auto px-6 pb-6">
        <table className="min-w-full border-separate border-spacing-y-0">
          <thead>
            <tr className="bg-slate-50">
              {columns.map((col, index) => (
                <th
                  key={String(col.key)}
                  className={`py-4 px-4 text-left text-[13px] font-black text-black bg-gray-200 tracking-wider ${
                    index === 0 ? "rounded-l-2xl" : ""
                  } ${index === columns.length - 1 ? "rounded-r-2xl" : ""}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-50">
            {filteredData.length > 0 ? (
              filteredData.map((item) => (
                <tr key={item.id} className="group transition-colors hover:bg-slate-50/50">
                  {columns.map((col) => (
                    <td key={String(col.key)} className="py-5 px-4 text-sm font-bold text-slate-600">
                      {col.render
                        ? col.render(col.key !== "actions" ? item[col.key as keyof T] : undefined, item)
                        : col.key !== "actions"
                        ? renderCellValue(item[col.key as keyof T])
                        : null}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="py-10 text-center text-slate-400 text-sm italic">
                  {t("table.noData")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
