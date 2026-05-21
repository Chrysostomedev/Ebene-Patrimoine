"use client";

import React from "react";
import type { ColumnConfig } from "./DataTable";

interface DataTableMobileViewProps<T> {
  data: T[];
  columns: ColumnConfig<T>[];
  isLoading?: boolean;
}

export function DataTableMobileView<T extends { id: string | number }>({
  data,
  columns,
  isLoading,
}: DataTableMobileViewProps<T>) {
  const visibleColumns = columns.filter((col) => !col.mobileHide && col.key !== "actions");
  const primaryCol = columns.find((col) => col.mobilePrimary) ?? columns[0];
  const badgeCols = columns.filter((col) => col.mobileBadge);
  const otherCols = visibleColumns.filter(
    (col) => !col.mobilePrimary && !col.mobileBadge && col.key !== "actions"
  );
  const actionsCol = columns.find((col) => col.key === "actions");

  if (isLoading) {
    return (
      <div className="mobile-card-list">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="mobile-card mobile-card--skeleton" />
        ))}
      </div>
    );
  }

  if (!data.length) {
    return <div className="mobile-empty">Aucune donnée disponible</div>;
  }

  return (
    <div className="mobile-card-list">
      {data.map((item, idx) => {
        const primaryValue = primaryCol?.render
          ? primaryCol.render(item[primaryCol.key as keyof T], item)
          : String(item[primaryCol.key as keyof T] ?? "");

        return (
          <div key={item.id ?? idx} className="mobile-card">
            {/* En-tête de la carte */}
            <div className="mobile-card__header">
              <span className="mobile-card__primary">{primaryValue}</span>
              <div className="mobile-card__badges">
                {badgeCols.map((col) => (
                  <span key={String(col.key)} className="mobile-card__badge">
                    {col.render
                      ? col.render(item[col.key as keyof T], item)
                      : String(item[col.key as keyof T] ?? "")}
                  </span>
                ))}
              </div>
            </div>

            {/* Lignes de données */}
            <dl className="mobile-card__body">
              {otherCols.map((col) => (
                <div key={String(col.key)} className="mobile-card__row">
                  <dt className="mobile-card__label">{col.header}</dt>
                  <dd className="mobile-card__value">
                    {col.render
                      ? col.render(item[col.key as keyof T], item)
                      : String(item[col.key as keyof T] ?? "—")}
                  </dd>
                </div>
              ))}
            </dl>

            {/* Section Actions sur mobile */}
            {actionsCol?.render && (
              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end gap-2">
                {actionsCol.render(undefined, item)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
export default DataTableMobileView;
