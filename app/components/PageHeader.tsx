"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useSidebar } from "./Sidebar";

interface PageHeaderProps {
  title: string;
  subtitle: string;
}

export default function PageHeader({ title, subtitle }: PageHeaderProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { collapsed: sidebarCollapsed } = useSidebar();

  const leftOffset = sidebarCollapsed ? "left-16" : "left-64";
  const widthCalc  = sidebarCollapsed ? "w-[calc(100%-4rem)]" : "w-[calc(100%-16rem)]";

  return (
    <>
      {/* Spacer */}
      <div className={`transition-all duration-300 ${isCollapsed ? "h-16" : "h-[100px]"}`} />

      {/* Header fixe */}
      <div className={`fixed top-[57px] ${leftOffset} ${widthCalc} z-20 bg-white border-b border-slate-100 shadow-sm transition-all duration-300`}>
        <div className={`relative px-6 flex flex-col justify-center transition-all duration-300 ${isCollapsed ? "h-16" : "h-[100px]"}`}>
          <div className="flex flex-col gap-0.5">
            <h1 className={`font-black text-slate-900 tracking-tight transition-all duration-300 ${isCollapsed ? "text-lg" : "text-2xl lg:text-3xl"}`}>
              {title}
            </h1>
            <p className={`text-slate-500 text-xs lg:text-sm transition-all duration-300 overflow-hidden ${isCollapsed ? "h-0 opacity-0" : "h-auto opacity-100"}`}>
              {subtitle}
            </p>
          </div>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute right-6 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-50 rounded-full border border-slate-100 text-slate-400 hover:text-slate-600 transition"
          >
            {isCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
          </button>
        </div>
      </div>
    </>
  );
}
