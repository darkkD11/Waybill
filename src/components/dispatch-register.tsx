import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase/client';
import { Bilty } from '../types/supabase';
import { Search, Calendar, Landmark, Coins } from 'lucide-react';

interface DispatchRegisterProps {
  refreshTrigger: boolean;
}

export const DispatchRegister: React.FC<DispatchRegisterProps> = ({ refreshTrigger }) => {
  const [entries, setEntries] = useState<Bilty[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [monthFilter, setMonthFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  // Month lists found dynamically
  const [uniqueMonths, setUniqueMonths] = useState<string[]>([]);

  // Stats
  const [stats, setStats] = useState({
    entries: 0,
    freight: 0,
    weight: 0,
    balance: 0
  });

  useEffect(() => {
    fetchEntries();
  }, [refreshTrigger]);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('biltys')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;
      const dataList = (data || []) as Bilty[];
      setEntries(dataList);

      // Extract unique months (YYYY-MM)
      const months = new Set<string>();
      dataList.forEach(entry => {
        if (entry.date) {
          const parts = entry.date.split('-'); // YYYY-MM-DD
          months.add(`${parts[0]}-${parts[1]}`);
        }
      });
      setUniqueMonths(Array.from(months).sort().reverse());
    } catch (err: any) {
      console.error('Error fetching register:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper to get standard Month short name
  const getMonthLabel = (yearMonth: string) => {
    const [y, m] = yearMonth.split('-');
    const dateObj = new Date(parseInt(y), parseInt(m) - 1, 1);
    return dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  // Helper to format table cells
  const formatNum = (num: number | undefined | null) => {
    if (num === null || num === undefined || num === 0) return '';
    return num.toLocaleString('en-IN');
  };

  // Filter entries
  const filteredEntries = entries.filter(e => {
    // 1. Month Filter
    if (monthFilter !== 'all') {
      if (!e.date) return false;
      const parts = e.date.split('-');
      const eMonth = `${parts[0]}-${parts[1]}`;
      if (eMonth !== monthFilter) return false;
    }

    // 2. Search query
    const q = searchQuery.toLowerCase();
    return (
      (e.truck_no && e.truck_no.toLowerCase().includes(q)) ||
      (e.driver_name && e.driver_name.toLowerCase().includes(q)) ||
      (e.transporter && e.transporter.toLowerCase().includes(q)) ||
      (e.party_do && e.party_do.toLowerCase().includes(q)) ||
      (e.bilty_no && e.bilty_no.toLowerCase().includes(q)) ||
      (e.from_location && e.from_location.toLowerCase().includes(q)) ||
      (e.to_location && e.to_location.toLowerCase().includes(q)) ||
      (e.party_short && e.party_short.toLowerCase().includes(q))
    );
  });

  // Re-calculate stats on filter change
  useEffect(() => {
    const totalFreight = filteredEntries.reduce((sum, e) => sum + (e.dispatch_freight || 0), 0);
    const totalWeight = filteredEntries.reduce((sum, e) => sum + (e.challan_wt || 0), 0);
    const totalBalance = filteredEntries.reduce((sum, e) => sum + (e.act_balance || 0), 0);

    setStats({
      entries: filteredEntries.length,
      freight: totalFreight,
      weight: totalWeight,
      balance: totalBalance
    });
  }, [searchQuery, monthFilter, entries]);

  return (
    <div className="space-y-6 p-4">
      {/* LEDGER KPI SUMMARY */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-indigo-50 text-indigo-600">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Loaded Trips</div>
            <div className="text-2xl font-extrabold text-slate-800 mt-1">{stats.entries}</div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Trips Freight</div>
            <div className="text-2xl font-extrabold text-emerald-600 mt-1">₹{formatNum(stats.freight)}</div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-sky-50 text-sky-600">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Total Tonnage</div>
            <div className="text-2xl font-extrabold text-slate-800 mt-1">{stats.weight.toFixed(2)} MT</div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-amber-50 text-amber-600">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Remaining Bal.</div>
            <div className="text-2xl font-extrabold text-amber-600 mt-1">₹{formatNum(stats.balance)}</div>
          </div>
        </div>
      </div>

      {/* FILTER & LEDGER ACTIONS */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h3 className="text-slate-800 text-sm font-bold">Ledger Operations</h3>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            {/* Month Filter */}
            <select
              value={monthFilter}
              onChange={e => setMonthFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="all">All Months</option>
              {uniqueMonths.map(m => (
                <option key={m} value={m}>{getMonthLabel(m)}</option>
              ))}
            </select>

            {/* Search */}
            <div className="relative flex-grow sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search truck, driver, transporter..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg pl-9 pr-4 py-2 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* LEDGER GRID (SCROLLABLE) */}
        <div className="overflow-x-auto border border-slate-100 rounded-xl max-h-[60vh] overflow-y-auto relative">
          <table className="w-full text-[11px] text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-800 text-white font-semibold sticky top-0 z-10 border-b border-slate-900 uppercase text-[9px] tracking-wider">
                <th className="px-3 py-3 border-r border-slate-700">Party DO</th>
                <th className="px-3 py-3 border-r border-slate-700 w-24">Date</th>
                <th className="px-3 py-3 border-r border-slate-700">LR No.</th>
                <th className="px-3 py-3 border-r border-slate-700">Vehicles No.</th>
                <th className="px-3 py-3 border-r border-slate-700">Load From</th>
                <th className="px-3 py-3 border-r border-slate-700">Unload to</th>
                <th className="px-3 py-3 border-r border-slate-700">Transporter</th>
                <th className="px-3 py-3 border-r border-slate-700 font-bold">Driver</th>
                <th className="px-3 py-3 border-r border-slate-700">Material</th>
                <th className="px-3 py-3 border-r border-slate-700">Quality</th>
                <th className="px-3 py-3 border-r border-slate-700 text-right">Chall.Wt.</th>
                <th className="px-3 py-3 border-r border-slate-700 text-right">Recd.Wt.</th>
                <th className="px-3 py-3 border-r border-slate-700 text-right">Difference</th>
                <th className="px-3 py-3 border-r border-slate-700 text-right">Short.Qty</th>
                <th className="px-3 py-3 border-r border-slate-700">Unload Unit</th>
                <th className="px-3 py-3 border-r border-slate-700">Party</th>
                <th className="px-3 py-3 border-r border-slate-700 text-right">Rate</th>
                <th className="px-3 py-3 border-r border-slate-700 text-right">Freight</th>
                <th className="px-3 py-3 border-r border-slate-700 text-right">Shortage</th>
                <th className="px-3 py-3 border-r border-slate-700 text-right">Bilty</th>
                
                {/* Self Columns */}
                <th className="px-3 py-3 border-r border-slate-700 text-right bg-indigo-950 text-indigo-200">VRE</th>
                <th className="px-3 py-3 border-r border-slate-700 text-right bg-indigo-950 text-indigo-200">Paid</th>
                <th className="px-3 py-3 border-r border-slate-700 text-right bg-indigo-950 text-indigo-200">Fuel Ltr</th>
                <th className="px-3 py-3 border-r border-slate-700 text-right bg-indigo-950 text-indigo-200">Diesel</th>
                <th className="px-3 py-3 border-r border-slate-700 text-right bg-indigo-950 text-indigo-200">Self Bal</th>
                
                {/* Outside Columns */}
                <th className="px-3 py-3 border-r border-slate-700 text-right bg-emerald-950 text-emerald-200">Bilty/com</th>
                <th className="px-3 py-3 border-r border-slate-700 text-right bg-emerald-950 text-emerald-200">VRE Adv</th>
                <th className="px-3 py-3 border-r border-slate-700 text-right bg-emerald-950 text-emerald-200">Ltr</th>
                <th className="px-3 py-3 border-r border-slate-700 text-right bg-emerald-950 text-emerald-200">Diesel</th>
                <th className="px-3 py-3 border-r border-slate-700 text-right bg-emerald-950 text-emerald-200">Out Bal</th>
                
                {/* Overall Summary */}
                <th className="px-3 py-3 border-r border-slate-700 text-right">Adv.Recd.</th>
                <th className="px-3 py-3 text-right font-bold text-amber-400">Act.Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={34} className="text-center py-10 font-sans text-slate-400">
                    No dispatch entries found matching the selection criteria.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((e, idx) => {
                  const dateStr = e.date ? e.date.split('-').reverse().join('/') : '';
                  return (
                    <tr key={e.id || idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2 border-r border-slate-100">{e.party_do || ''}</td>
                      <td className="px-3 py-2 border-r border-slate-100 font-sans">{dateStr}</td>
                      <td className="px-3 py-2 border-r border-slate-100 font-semibold">{e.bilty_no}</td>
                      <td className="px-3 py-2 border-r border-slate-100 uppercase font-semibold">{e.truck_no || ''}</td>
                      <td className="px-3 py-2 border-r border-slate-100 font-sans">{e.from_location || ''}</td>
                      <td className="px-3 py-2 border-r border-slate-100 font-sans">{e.to_location || ''}</td>
                      <td className="px-3 py-2 border-r border-slate-100 font-sans">{e.transporter || ''}</td>
                      <td className="px-3 py-2 border-r border-slate-100 font-sans font-semibold">{e.driver_name || ''}</td>
                      <td className="px-3 py-2 border-r border-slate-100 font-sans">{e.material || ''}</td>
                      <td className="px-3 py-2 border-r border-slate-100 text-center">{e.quality || ''}</td>
                      <td className="px-3 py-2 border-r border-slate-100 text-right">{e.challan_wt || ''}</td>
                      <td className="px-3 py-2 border-r border-slate-100 text-right">{e.recd_wt || ''}</td>
                      <td className="px-3 py-2 border-r border-slate-100 text-right">{e.wt_diff || ''}</td>
                      <td className="px-3 py-2 border-r border-slate-100 text-right">{e.short_qty || ''}</td>
                      <td className="px-3 py-2 border-r border-slate-100 font-sans">{e.unload_unit || ''}</td>
                      <td className="px-3 py-2 border-r border-slate-100 font-sans">{e.party_short || ''}</td>
                      <td className="px-3 py-2 border-r border-slate-100 text-right">{e.dispatch_rate || ''}</td>
                      <td className="px-3 py-2 border-r border-slate-100 text-right font-bold text-slate-700">{formatNum(e.dispatch_freight)}</td>
                      <td className="px-3 py-2 border-r border-slate-100 text-right text-red-600">{formatNum(e.shortage_amt)}</td>
                      <td className="px-3 py-2 border-r border-slate-100 text-right">{formatNum(e.bilty_charge)}</td>
                      
                      {/* Self fields values */}
                      <td className="px-3 py-2 border-r border-slate-100 text-right bg-indigo-50/50">{e.vehicle_type === 'self' ? formatNum(e.vre) : ''}</td>
                      <td className="px-3 py-2 border-r border-slate-100 text-right bg-indigo-50/50">{e.vehicle_type === 'self' ? formatNum(e.paid) : ''}</td>
                      <td className="px-3 py-2 border-r border-slate-100 text-right bg-indigo-50/50">{e.vehicle_type === 'self' ? e.fuel_ltr || '' : ''}</td>
                      <td className="px-3 py-2 border-r border-slate-100 text-right bg-indigo-50/50">{e.vehicle_type === 'self' ? formatNum(e.diesel_cost) : ''}</td>
                      <td className="px-3 py-2 border-r border-slate-100 text-right bg-indigo-50/50 font-bold text-indigo-700">{e.vehicle_type === 'self' ? formatNum(e.self_balance) : ''}</td>
                      
                      {/* Outside fields values */}
                      <td className="px-3 py-2 border-r border-slate-100 text-right bg-emerald-50/50">{e.vehicle_type === 'outside' ? formatNum(e.bilty_com) : ''}</td>
                      <td className="px-3 py-2 border-r border-slate-100 text-right bg-emerald-50/50">{e.vehicle_type === 'outside' ? formatNum(e.vre_adv) : ''}</td>
                      <td className="px-3 py-2 border-r border-slate-100 text-right bg-emerald-50/50">{e.vehicle_type === 'outside' ? e.out_fuel_ltr || '' : ''}</td>
                      <td className="px-3 py-2 border-r border-slate-100 text-right bg-emerald-50/50">{e.vehicle_type === 'outside' ? formatNum(e.out_diesel) : ''}</td>
                      <td className="px-3 py-2 border-r border-slate-100 text-right bg-emerald-50/50 font-bold text-emerald-700">{e.vehicle_type === 'outside' ? formatNum(e.out_balance) : ''}</td>
                      
                      {/* Summary values */}
                      <td className="px-3 py-2 border-r border-slate-100 text-right">{formatNum(e.adv_recd)}</td>
                      <td className="px-3 py-2 text-right font-bold text-amber-700">{formatNum(e.act_balance)}</td>
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
