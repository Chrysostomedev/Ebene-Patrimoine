"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import DataTable from "@/components/DataTable";
import Paginate from "@/components/Paginate";
import {
    Eye, Calendar, MapPin, Loader2, ClipboardList, Send, Wrench, Clock,
    Download, Filter, Search, X
} from "lucide-react";
import ActionGroup from "@/components/ActionGroup";
import { providerTicketService, Ticket, TICKET_STATUS } from "@/services/provider/providerTicketService";
import { formatDate } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

export default function ProviderPreventiveTicketsPage() {
    const router = useRouter();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<any>({
        page: 1,
        per_page: 15,
        type: "preventif",
        status: undefined,
        search: "",
    });
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [meta, setMeta] = useState<any>(null);
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

    const fetchTickets = async (currentFilters = filters, searchVal = debouncedSearch) => {
        try {
            setLoading(true);
            const res = await providerTicketService.getTickets({
                ...currentFilters,
                search: searchVal || undefined,
            });
            setTickets(res.items);
            setMeta(res.meta);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            const blob = await providerTicketService.exportTickets({
                ...filters,
                search: debouncedSearch || undefined,
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `tickets_preventifs_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Export error:", err);
        }
    };

    useEffect(() => {
        setFilters((prev: any) => ({
            ...prev,
            date_debut: dateRange?.from ? dateRange.from.toISOString().split('T')[0] : undefined,
            date_fin: dateRange?.to ? dateRange.to.toISOString().split('T')[0] : undefined,
            page: 1
        }));
    }, [dateRange]);

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(filters.search || "");
        }, 400);
        return () => clearTimeout(timer);
    }, [filters.search]);

    // Re-fetch tickets when filters (except raw search) or debouncedSearch changes
    useEffect(() => {
        fetchTickets(filters, debouncedSearch);
    }, [filters.page, filters.per_page, filters.type, filters.status, filters.date_debut, filters.date_fin, debouncedSearch]);

    const STATUS_STYLE: Record<string, string> = {
        "PLANIFIÉ": "bg-sky-50 border-sky-400 text-sky-700",
        "EN_COURS": "bg-orange-50 border-orange-400 text-orange-600",
        "RAPPORTÉ": "bg-amber-50 border-amber-400 text-amber-700",
        "ÉVALUÉ": "bg-emerald-50 border-emerald-400 text-emerald-700",
        "CLOS": "bg-black border-black text-white",
    };

    const columns = [
        {
            header: "Référence",
            key: "code_ticket",
            render: (_: any, row: Ticket) => (
                <span className="font-black text-slate-900 font-mono text-xs">{row.code_ticket || `#${row.id}`}</span>
            )
        },
        {
            header: "Sujet",
            key: "subject",
            render: (_: any, row: Ticket) => (
                <div className="max-w-[200px] truncate">
                    <span className="font-bold text-slate-700 text-sm">{row.subject || "Sans objet"}</span>
                </div>
            )
        },
        {
            header: "Site",
            key: "site",
            render: (_: any, row: Ticket) => (
                <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                        <MapPin size={12} className="text-slate-400" />
                        <span className="text-xs font-bold text-slate-600">{row.site?.nom || "—"}</span>
                    </div>
                    {/* <div className="flex items-center gap-1.5">
                        <Wrench size={12} className="text-slate-400" />
                        <span className="text-[10px] font-medium text-slate-400">{row.asset?.designation || "—"}</span>
                    </div> */}
                </div>
            )
        },
        {
            header: "Crée le",
            key: "created_at",
            render: (_: any, row: Ticket) => (
                <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-slate-400" />
                    <span className="text-xs text-slate-500 font-medium">{formatDate(row.created_at)}</span>
                </div>
            )
        },
        {
            header: "Statut",
            key: "status",
            render: (_: any, row: Ticket) => {
                const s = row.status?.toUpperCase();
                return (
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${STATUS_STYLE[s] ?? "bg-slate-50 border-slate-200 text-slate-500"}`}>
                        {s}
                    </span>
                );
            }
        },
        {
            header: "Actions",
            key: "actions",
            render: (_: any, row: Ticket) => (
                <button
                    onClick={() => router.push(`/provider/preventif/${row.id}`)}
                    className="p-2 hover:bg-slate-100 rounded-xl transition text-slate-400 hover:text-slate-900"
                >
                    <Eye size={18} />
                </button>
            )
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50/50">
            <Navbar />
            <main className="mt-20 p-8 space-y-8">
                <PageHeader
                    title="Mes tickets Préventifs"
                    subtitle="Gérez les interventions préventives générées suite aux anomalies."
                />

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <select
                            value={filters.status || ""}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined, page: 1 })}
                            className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-black text-slate-700 outline-none focus:border-slate-400 cursor-pointer shadow-sm min-w-[180px] uppercase tracking-wider"
                        >
                            <option value="">Tous les statuts</option>
                            <option value="PLANIFIÉ">Planifié</option>
                            <option value="EN_COURS">En cours</option>
                            <option value="RAPPORTÉ">Rapporté</option>
                            <option value="ÉVALUÉ">Évalué</option>
                            <option value="CLOS">Clos</option>
                        </select>
                    </div>

                    <ActionGroup
                        actions={[
                            { label: "Exporter ", icon: Download, onClick: handleExport, variant: "secondary" as const },
                        ]}
                        dateRange={dateRange}
                        onDateRangeChange={setDateRange}
                    />
                </div>

                <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                    <DataTable
                        columns={columns}
                        data={tickets}
                        isLoading={loading}
                        onSearchChange={(s) => setFilters(prev => ({ ...prev, search: s, page: 1 }))}
                    />

                    {meta && meta.last_page > 1 && (
                        <div className="p-6 border-t border-slate-50 flex justify-end">
                            <Paginate
                                currentPage={filters.page}
                                totalPages={meta.last_page}
                                onPageChange={(p) => setFilters({ ...filters, page: p })}
                            />
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
