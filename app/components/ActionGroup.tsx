"use client";

import React from "react";
import { LucideIcon } from "lucide-react";

export type ActionButton = {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: "primary" | "secondary";
};

interface ActionGroupProps {
  actions?: ActionButton[];
}

export default function ActionGroup({ actions = [] }: ActionGroupProps) {
  if (!actions || actions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3">
      {actions.map((action, index) => {
        const IconComponent = action.icon;
        const isPrimary = action.variant === "primary";

        return (
          <button
            key={`${action.label}-${index}`}
            onClick={action.onClick}
            className={`
              flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-bold text-[14px]
              transition-all duration-200 active:scale-95
              ${isPrimary
                ? "bg-theme-primary text-white hover:opacity-90 shadow-md"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
              }
            `}
          >
            {IconComponent && <IconComponent size={18} strokeWidth={2.5} />}
            <span className="tracking-tight">{action.label}</span>
          </button>
        );
      })}
    </div>
  );
}