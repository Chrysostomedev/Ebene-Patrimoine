"use client";

import { useMemo, useState } from "react";
import SearchInput from "./SearchInput";
import Paginate from "./Paginate";
import { useLanguage } from "../../contexts/LanguageContext";
import { Loader2 } from "lucide-react";
import { useMediaQuery } from "../../hooks/common/useMediaQuery";
import DataTableMobileView from "./DataTableMobileView";

export type ColumnConfig<T> = {
  header: string;
  key: keyof T | "actions";
  render?: (value: any, item: T) => React.ReactNode;
  mobileHide?: boolean;
  mobilePrimary?: boolean;
  mobileBadge?: boolean;
};

type Props<T> = {
  title: string;
  columns: ColumnConfig<T>[];
  data: T[];
  onViewAll?: () => void;
  // Server-side support
  onSearchChange?: (query: string) => void;
  isLoading?: boolean;
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
};

/** Nettoie le HTML et rend une valeur de cellule cliquable si email/téléphone */
function renderCellValue(value: any): React.ReactNode {
  if (value == null || value === "") return "-";
  const str = String(value);

  if (/<[a-z][\s\S]*>/i.test(str)) {
    const stripped = str.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    if (!stripped) return "-";
    return (
      <div
        className="prose prose-sm max-w-none text-slate-700 line-clamp-2 text-xs leading-relaxed [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic [&_u]:underline [&_s]:line-through"
        dangerouslySetInnerHTML={{ __html: str }}
      />
    );
  }

  const stripped = str.trim();
  if (!stripped) return "-";

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(stripped)) {
    return (
      <a href={`mailto:${stripped}`} className="text-slate-700 hover:underline hover:text-slate-900 transition-colors" onClick={e => e.stopPropagation()}>
        {stripped}
      </a>
    );
  }
  if (/^[+\d][\d\s\-().]{6,}$/.test(stripped.trim())) {
    return (
      <a href={`tel:${stripped.replace(/\s/g, "")}`} className="text-slate-700 hover:underline hover:text-slate-900 transition-colors" onClick={e => e.stopPropagation()}>
        {stripped}
      </a>
    );
  }
  return stripped;
}

function getTextFromNode(node: any): string {
  if (node == null) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (typeof node === "boolean") return "";
  if (Array.isArray(node)) {
    return node.map(getTextFromNode).join(" ");
  }
  if (node.props && node.props.children) {
    return getTextFromNode(node.props.children);
  }
  return "";
}

function extractAllValues(val: any): string[] {
  if (val == null) return [];
  if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
    return [String(val)];
  }
  if (val instanceof Date) {
    return [val.toLocaleDateString(), val.toISOString(), String(val)];
  }
  if (Array.isArray(val)) {
    return val.flatMap(extractAllValues);
  }
  if (typeof val === "object") {
    try {
      return Object.values(val).flatMap(extractAllValues);
    } catch {
      return [];
    }
  }
  return [];
}

export default function DataTable<T extends { id: string | number }>({
  title,
  columns = [],
  data = [],
  onViewAll,
  onSearchChange,
  isLoading = false,
  pagination,
}: Props<T>) {
  const [localSearch, setLocalSearch] = useState("");
  const { t } = useLanguage();
  const isMobile = useMediaQuery("(max-width: 767px)");

  const handleSearch = (q: string) => {
    if (onSearchChange) {
      onSearchChange(q);
    } else {
      setLocalSearch(q);
    }
  };

  const filteredData = useMemo(() => {
    // Si recherche serveur, on retourne la data brute car déjà filtrée par l'API
    if (onSearchChange || !localSearch.trim()) return data;
    
    const lowerSearch = localSearch.toLowerCase().trim();

    return data.filter((item) => {
      const colTexts = columns.map((col) => {
        if (col.key === "actions") return "";
        let node: any = null;
        if (col.render) {
          try {
            node = col.render(item[col.key as keyof T], item);
          } catch {
            node = null;
          }
        } else {
          node = renderCellValue(item[col.key as keyof T]);
        }
        return getTextFromNode(node);
      });

      const objValues = extractAllValues(item);
      const allSearchableStrings = [...colTexts, ...objValues].join(" ").toLowerCase();
      return allSearchableStrings.includes(lowerSearch);
    });
  }, [data, localSearch, columns, onSearchChange]);

  return (
    <div className="bg-white shadow-sm overflow-hidden flex flex-col h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between p-8 pb-4 gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-black text-slate-800 tracking-tight">{title}</h2>
          {isLoading && <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />}
        </div>
        <div className="flex-1 max-w-2xl">
          <SearchInput onSearch={handleSearch} placeholder={t("table.search")} />
        </div>
      </div>

      <div className="flex-1 overflow-x-auto px-6 pb-6">
        {isMobile ? (
          <DataTableMobileView
            data={filteredData}
            columns={columns}
            isLoading={isLoading}
          />
        ) : (
          <table className="data-table-desktop min-w-full border-separate border-spacing-y-0">
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
                    {isLoading ? t("common.loading") : t("table.noData")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination intégrée */}
      {pagination && pagination.totalPages > 1 && (
        <div className="p-6 border-t border-slate-50 flex justify-center bg-slate-50/30">
          <Paginate
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPageChange={pagination.onPageChange}
          />
        </div>
      )}
    </div>
  );
}
