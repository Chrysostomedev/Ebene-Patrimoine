"use client";

import { useState, useMemo } from "react";
import SearchInput from "./SearchInput";

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

export default function DataTable<T extends { id: string | number }>({
  title,
  columns = [],
  data = [],
  onViewAll,
}: Props<T>) {
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
  const [search, setSearch] = useState("");

  const handleSelectAll = () => {
    if (selectedIds.length === data.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(data.map((item) => item.id));
    }
  };

  const handleSelectRow = (id: string | number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Filtrage basé sur search
  const filteredData = useMemo(() => {
    if (!search.trim()) return data;
    return data.filter((item) =>
      Object.values(item)
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [data, search]);

  return (
    <div className="bg-white shadow-sm overflow-hidden">
      {/* Header avec SearchInput et ActionHeader */}
      <div className="flex items-center justify-between p-8 pb-4 gap-4">
        <h2 className="text-xl font-black text-slate-800 tracking-tight">{title}</h2>
        <div className="flex-1">
          <SearchInput onSearch={setSearch} />
        </div>
        
      </div>

      {/* Table */}
      <div className="overflow-x-auto px-6 pb-6">
        <table className="min-w-full border-separate border-spacing-y-0">
          <thead>
            <tr className="bg-green-50">
              <th className="py-4 w-12 text-center rounded-l-2xl">
                <div className="flex justify-center items-center">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 accent-black w-4 h-4 cursor-pointer"
                    onChange={handleSelectAll}
                    checked={filteredData.length > 0 && selectedIds.length === filteredData.length}
                  />
                </div>
              </th>
              {columns.map((col, index) => (
                <th
                  key={String(col.key)}
                  className={`py-4 px-4 text-left text-[13px] font-black text-black bg-theme-secondary  tracking-wider ${
                    index === columns.length - 1 ? "rounded-r-2xl" : ""
                  }`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-50">
            {filteredData.length > 0 ? (
              filteredData.map((item) => (
                <tr
                  key={item.id}
                  className={`group transition-colors ${
                    selectedIds.includes(item.id) ? "bg-slate-50/80" : "hover:bg-slate-50/50"
                  }`}
                >
                  <td className="py-5 w-12 text-center">
                    <div className="flex justify-center items-center">
                      <input
                        type="checkbox"
                        className="rounded border-slate-200 bg-slate-200 accent-black w-4 h-4 cursor-pointer"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => handleSelectRow(item.id)}
                      />
                    </div>
                  </td>
                  {columns.map((col) => (
                    <td key={String(col.key)} className="py-5 px-4 text-sm font-bold text-slate-600">
                      {col.render
                        ? col.render(col.key !== "actions" ? item[col.key as keyof T] : undefined, item)
                        : col.key !== "actions"
                        ? (item[col.key as keyof T] as React.ReactNode)
                        : null}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length + 1} className="py-10 text-center text-slate-400 text-sm italic">
                  Aucune donnée disponible
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
