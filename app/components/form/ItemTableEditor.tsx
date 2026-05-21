"use client";

import { Plus, Minus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import React, { useState, useEffect } from "react";
export interface QuoteItem {
  id?: number;
  designation: string;
  quantity: number;
  unit_price: number;
  total_price?: number;
}

interface ItemTableEditorProps {
  initialItems?: QuoteItem[];
  onChange: (items: QuoteItem[]) => void;
  taxRate?: number;
}

export default function ItemTableEditor({ initialItems = [], onChange, taxRate = 18 }: ItemTableEditorProps) {
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Initialize once
  useEffect(() => {
    if (!initialized && initialItems.length > 0) {
      setItems(initialItems);
      setInitialized(true);
    } else if (!initialized && initialItems.length === 0) {
      setItems([{ designation: "Prestation", quantity: 1, unit_price: 0 }]);
      setInitialized(true);
    }
  }, [initialItems, initialized]);

  // Sync with parent on every change
  useEffect(() => {
    if (initialized) {
      onChange(items);
    }
  }, [items, initialized]);

  const addItem = () => {
    setItems([...items, { designation: "", quantity: 1, unit_price: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) {
      // Clear instead of remove if only one left
      setItems([{ designation: "", quantity: 1, unit_price: 0 }]);
      return;
    };
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const updateItem = (index: number, field: keyof QuoteItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const calculateTotalHT = () => {
    return items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unit_price || 0)), 0);
  };

  const totalHT = calculateTotalHT();
  const actualTaxRate = Number(taxRate) || 0;
  const tvaAmount = totalHT * (actualTaxRate / 100);
  const totalTTC = totalHT + tvaAmount;

  return (
    <div className="space-y-4 mb-8">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Détail des prestations</h3>
        <button
          type="button"
          onClick={addItem}
          className="flex items-center gap-1.5 text-[10px] font-black text-slate-900 uppercase tracking-widest hover:text-indigo-600 transition-colors"
        >
          <Plus size={12} strokeWidth={3} /> Ajouter une ligne
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full text-left border-collapse block md:table">
          <thead className="hidden md:table-header-group">
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Désignation</th>
              <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-24">Qté</th>
              <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right w-32">P.U. HT</th>
              <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right w-36">Total</th>
              <th className="px-2 py-3 w-10 text-center">
                {/* Header for action column */}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 block md:table-row-group">
            {items.map((item, index) => (
              <tr key={index} className="flex flex-col md:table-row gap-3 p-4 md:p-0 border-b border-slate-100 md:border-none group hover:bg-slate-50/30 transition-colors">
                <td className="block md:table-cell p-0 md:p-2 md:pl-5">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest md:hidden mb-1">Désignation</div>
                  <input
                    type="text"
                    value={item.designation}
                    onChange={(e) => updateItem(index, "designation", e.target.value)}
                    placeholder="Désignation de la prestation..."
                    className="w-full bg-slate-50 md:bg-transparent border border-slate-200 md:border-none rounded-xl md:rounded-none px-3 py-2 md:p-0 focus:ring-0 text-sm font-bold text-slate-900 placeholder:text-slate-300 focus:bg-white"
                  />
                </td>
                <td className="block md:table-cell p-0 md:p-2 text-left md:text-center">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest md:hidden mb-1">Qté</div>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, "quantity", parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 md:bg-transparent border border-slate-200 md:border-none rounded-xl md:rounded-none px-3 py-2 md:p-0 focus:ring-0 text-sm font-medium text-slate-600 text-left md:text-center focus:bg-white"
                  />
                </td>
                <td className="block md:table-cell p-0 md:p-2 text-left md:text-right">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest md:hidden mb-1">P.U. HT</div>
                  <input
                    type="number"
                    value={item.unit_price}
                    onChange={(e) => updateItem(index, "unit_price", parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 md:bg-transparent border border-slate-200 md:border-none rounded-xl md:rounded-none px-3 py-2 md:p-0 focus:ring-0 text-sm font-medium text-slate-600 text-left md:text-right tabular-nums focus:bg-white"
                  />
                </td>
                <td className="block md:table-cell p-0 md:p-2 text-left md:text-right">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest md:hidden mb-1">Total</div>
                  <div className="px-3 py-2 md:px-5 md:py-3 text-sm font-black text-slate-900 tabular-nums bg-slate-50 md:bg-transparent rounded-xl">
                    {formatCurrency(Number(item.quantity || 0) * Number(item.unit_price || 0))}
                  </div>
                </td>
                <td className="block md:table-cell p-0 md:p-2 text-right md:text-center">
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="flex items-center justify-center gap-1.5 w-full md:w-auto px-4 py-2 md:p-1.5 rounded-xl border border-red-100 md:border-none text-red-500 hover:text-red-700 hover:bg-red-50 transition-all font-bold text-xs md:text-sm"
                    title="Supprimer la ligne"
                  >
                    <Minus size={14} strokeWidth={3} /> <span className="md:hidden">Supprimer cette ligne</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer Totals */}
        <div className="bg-white p-5 border-t border-slate-100 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 font-medium">Total HT</span>
            <span className="text-slate-900 font-bold">{formatCurrency(totalHT)}</span>
          </div>
          {actualTaxRate > 0 && (
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-medium">TVA ({actualTaxRate}%)</span>
              <span className="text-slate-900 font-bold">{formatCurrency(tvaAmount)}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <span className="text-sm font-black text-slate-900 uppercase tracking-widest">Total TTC</span>
            <span className="text-xl font-black text-indigo-600 tabular-nums">{formatCurrency(totalTTC)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
