"use client";

import { Search } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";

type Props = {
  onSearch?: (query: string) => void;
  placeholder?: string;
};

export default function SearchInput({ onSearch, placeholder }: Props) {
  const { t } = useLanguage();
  return (
    <div className="relative w-full max-w-xl">
      <Search size={18} strokeWidth={1.5} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      <input
        type="text"
        onChange={e => onSearch?.(e.target.value)}
        placeholder={placeholder ?? t("table.search")}
        className="w-full pl-11 pr-10 py-3 bg-white border border-slate-200 rounded-2xl text-sm text-slate-700 placeholder:text-slate-400 outline-none transition-all focus:border-slate-900 focus:ring-2 focus:ring-slate-900/5"
      />
    </div>
  );
}
