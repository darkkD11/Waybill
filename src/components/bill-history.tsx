import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase/client';
import { Bilty } from '../types/supabase';
import { Search, Eye, Trash2, Printer, ArrowUpDown, Receipt } from 'lucide-react';

interface BillHistoryProps {
  onEditSelect: (id: string) => void;
  triggerPrint: (bilty: Bilty) => void;
  refreshTrigger: boolean;
}

export const BillHistory: React.FC<BillHistoryProps> = ({
  onEditSelect,
  triggerPrint,
  refreshTrigger,
}) => {
  const [biltys, setBiltys] = useState<Bilty[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [, setLoading] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<keyof Bilty>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Stats
  const [totalFreight, setTotalFreight] = useState(0);
  const [pendingBalance, setPendingBalance] = useState(0);

  useEffect(() => {
    fetchBiltys();
  }, [refreshTrigger]);

  const fetchBiltys = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('biltys')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      const biltysList = (data || []) as Bilty[];
      setBiltys(biltysList);

      // Calculate stats
      const freightSum = biltysList.reduce((sum, b) => sum + (b.total_freight || 0), 0);
      const balanceSum = biltysList.reduce((sum, b) => sum + (b.balance || 0), 0);
      setTotalFreight(freightSum);
      setPendingBalance(balanceSum);
    } catch (err: unknown) {
      alert('Error fetching bill history: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this Bilty invoice?')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('biltys')
        .delete()
        .eq('id', id);
      if (error) throw error;
      alert('Bilty record deleted.');
      fetchBiltys();
    } catch (err: unknown) {
      alert('Error deleting bilty: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: keyof Bilty) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const getSortedBiltys = () => {
    return [...biltys].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      // Handle nulls
      if (aVal === null || aVal === undefined) return sortOrder === 'asc' ? -1 : 1;
      if (bVal === null || bVal === undefined) return sortOrder === 'asc' ? 1 : -1;

      if (typeof aVal === 'string') {
        return sortOrder === 'asc'
          ? aVal.localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal);
      } else {
        return sortOrder === 'asc'
          ? (aVal as number) - (bVal as number)
          : (bVal as number) - (aVal as number);
      }
    });
  };

  const filteredBiltys = getSortedBiltys().filter(b => {
    const q = searchQuery.toLowerCase();
    const dateStr = b.date ? b.date.split('-').reverse().join('/') : '';
    return (
      (b.bilty_no && b.bilty_no.toLowerCase().includes(q)) ||
      (b.consigner_name && b.consigner_name.toLowerCase().includes(q)) ||
      (b.consignee_name && b.consignee_name.toLowerCase().includes(q)) ||
      (b.truck_no && b.truck_no.toLowerCase().includes(q)) ||
      dateStr.includes(q)
    );
  });

  return (
    <div className="space-y-6 p-4">
      {/* STATS PANELS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Total Waybills</div>
          <div className="text-3xl font-extrabold text-slate-800 mt-2">{biltys.length}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Total Billed Freight</div>
          <div className="text-3xl font-extrabold text-indigo-600 mt-2">
            ₹{totalFreight.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Pending Balance</div>
          <div className="text-3xl font-extrabold text-amber-600 mt-2">
            ₹{pendingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* FILTER & HISTORY TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h3 className="text-slate-800 text-sm font-bold flex items-center gap-2">
            <Receipt className="w-4 h-4 text-indigo-600" /> Bilty History Directory
          </h3>

          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search Bilty No, client, truck, or date..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg pl-9 pr-4 py-2 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-100 rounded-xl max-h-[60vh] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px]">
                <th className="px-4 py-3 cursor-pointer select-none" onClick={() => handleSort('bilty_no')}>
                  <div className="flex items-center gap-1">Bilty No. <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="px-4 py-3 cursor-pointer select-none w-28" onClick={() => handleSort('date')}>
                  <div className="flex items-center gap-1">Date <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="px-4 py-3 cursor-pointer select-none w-32" onClick={() => handleSort('truck_no')}>
                  <div className="flex items-center gap-1">Truck No <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="px-4 py-3">Consigner & Consignee</th>
                <th className="px-4 py-3 cursor-pointer select-none w-32 text-right" onClick={() => handleSort('total_freight')}>
                  <div className="flex items-center gap-1 justify-end">Total Freight <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="px-4 py-3 cursor-pointer select-none w-32 text-right" onClick={() => handleSort('balance')}>
                  <div className="flex items-center gap-1 justify-end">Balance <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="px-4 py-3 w-36 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBiltys.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    No waybills match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredBiltys.map(b => {
                  const dateStr = b.date ? b.date.split('-').reverse().join('/') : '-';
                  return (
                    <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900 font-mono">
                        {b.bilty_no}
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-medium">
                        {dateStr}
                      </td>
                      <td className="px-4 py-3 font-mono uppercase text-slate-700 font-semibold">
                        {b.truck_no || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1 leading-normal max-w-xs sm:max-w-sm truncate">
                          <span className="font-semibold text-slate-800">Sender: {b.consigner_name || '-'}</span>
                          <span className="text-slate-500">Receiver: {b.consignee_name || '-'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-indigo-600">
                        ₹{b.total_freight.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-amber-600">
                        ₹{b.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => onEditSelect(b.id)}
                            className="p-1.5 border border-indigo-100 rounded-lg text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition cursor-pointer"
                            title="Edit Invoice / Reload Form"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => triggerPrint(b)}
                            className="p-1.5 border border-emerald-100 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition cursor-pointer"
                            title="Direct Print (4 Copies)"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(b.id)}
                            className="p-1.5 border border-red-100 rounded-lg text-red-600 hover:bg-red-50 hover:border-red-200 transition cursor-pointer"
                            title="Delete Invoice"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
