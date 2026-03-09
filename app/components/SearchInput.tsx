"use client";

import { useState } from "react";
import { Search } from "lucide-react";

type Props = {
  onSearch?: (query: string) => void;
  placeholder?: string;
};

export default function SearchInput({ onSearch, placeholder = "Rechercher..." }: Props) {
  const [query, setQuery] = useState("");
  

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) onSearch(query);
  };

  return (
    <form onSubmit={handleSearch} className="relative w-full max-w-xl">
      <Search 
        size={22} 
        strokeWidth={1.5} 
        className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" 
      />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className={`
          w-full pl-14 pr-6 py-4 bg-white border border-slate-200 
          rounded-2xl text-[16px] text-slate-600 placeholder:text-slate-400 
          outline-none transition-all focus:border-black focus:ring-4 focus:ring-slate-50
        `}
      />
      <button type="submit" className="hidden">Rechercher</button>
    </form>
  );
}
