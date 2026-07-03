import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase/client';
import { Bilty, Client } from '../types/supabase';
import { Download, Upload, Trash2, ShieldAlert, FileSpreadsheet, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';

interface DataIOProps {
  onImportSuccess: () => void;
}

export const DataIO: React.FC<DataIOProps> = ({ onImportSuccess }) => {
  const [biltyCount, setBiltyCount] = useState(0);
  const [clientCount, setClientCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCounts();
  }, []);

  const fetchCounts = async () => {
    try {
      const { count: bCount, error: bErr } = await supabase
        .from('biltys')
        .select('*', { count: 'exact', head: true });

      const { count: cCount, error: cErr } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });

      if (bErr) throw bErr;
      if (cErr) throw cErr;

      setBiltyCount(bCount || 0);
      setClientCount(cCount || 0);
    } catch (err) {
      console.error('Error fetching database counts:', err);
    }
  };

  // Helper to convert Excel Date to YYYY-MM-DD
  const parseExcelDate = (val: any): string => {
    if (!val) return '';
    if (typeof val === 'number') {
      // Excel serial number
      const date = new Date(Math.round((val - 25569) * 86400 * 1000));
      return date.toISOString().split('T')[0];
    }
    const str = String(val).trim();
    if (str.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return str;
    }
    // Try standard JS Date parsing
    const parsed = Date.parse(str);
    if (!isNaN(parsed)) {
      return new Date(parsed).toISOString().split('T')[0];
    }
    return str;
  };

  // Helper to parse numbers safely
  const parseNum = (val: any): number => {
    if (val === null || val === undefined) return 0;
    const num = parseFloat(String(val).replace(/,/g, '').trim());
    return isNaN(num) ? 0 : num;
  };

  // IMPORT LEADGER SPREADSHEET
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const buffer = e.target?.result;
        if (!buffer) throw new Error('Could not read file data');

        const wb = XLSX.read(buffer, { type: 'array' });
        let importedCount = 0;
        let skippedCount = 0;
        
        // Loop through all sheets
        for (const sheetName of wb.SheetNames) {
          // Skip known non-data sheets
          if (['Mapping', 'Dumfer', 'Instructions', 'Readme'].includes(sheetName)) continue;

          const sheet = wb.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });

          if (rows.length < 3) continue;

          // Find header row (usually contains 'LR No.' or 'Vehicles No.')
          let headerIdx = -1;
          for (let i = 0; i < Math.min(rows.length, 10); i++) {
            const row = rows[i].map(v => String(v).toLowerCase());
            if (row.some(v => v.includes('lr no') || v.includes('vehicles no') || v.includes('lr_no'))) {
              headerIdx = i;
              break;
            }
          }

          if (headerIdx < 0) continue; // No header row found in sheet

          const recordsToInsert: any[] = [];

          // Process rows starting from headerIdx + 1
          for (let i = headerIdx + 1; i < rows.length; i++) {
            const row = rows[i];
            
            // Skip rows without date or vehicle number
            if (!row[1] || !row[3]) continue;

            const biltyNo = String(row[2] || '').trim();
            if (!biltyNo) continue;

            const dateStr = parseExcelDate(row[1]);

            // Map spreadsheet cells back to Supabase columns
            const payload = {
              bilty_no: biltyNo,
              date: dateStr,
              truck_no: String(row[3] || '').toUpperCase().trim(),
              driver_name: String(row[7] || '').trim(),
              driver_mob: '', // unavailable in register columns
              from_location: String(row[4] || '').trim(),
              to_location: String(row[5] || '').trim(),
              consigner_name: '',
              consigner_gst: '',
              consignee_name: '',
              consignee_gst: '',
              goods: [], // no goods sub-array in Excel format

              // Print financials (dummy values as register doesn't contain these)
              to_pay: 0,
              hamali: 0,
              total_freight: 0,
              advance: 0,
              balance: 0,

              // Dispatch fields
              party_do: String(row[0] || '').trim(),
              transporter: String(row[6] || '').trim(),
              material: String(row[8] || '').trim() || 'Ncoal',
              quality: String(row[9] || '').trim() || '4200',
              party_short: String(row[15] || '').trim(),
              unload_unit: String(row[14] || '').trim(),
              challan_wt: parseNum(row[10]),
              recd_wt: parseNum(row[11]),
              wt_diff: parseNum(row[12]),
              short_qty: parseNum(row[13]),
              vehicle_type: String(row[20] || row[21] || row[22] || row[25] || row[26]).trim() !== '' ? 'self' : 'outside',
              dispatch_rate: parseNum(row[16]),
              dispatch_freight: parseNum(row[17]),
              shortage_amt: parseNum(row[18]),
              bilty_charge: parseNum(row[19]),

              // Self vehicle details
              vre: parseNum(row[20]),
              paid: parseNum(row[21]),
              fuel_ltr: parseNum(row[22]),
              pump: String(row[23] || '').trim() || null,
              fuel_rate: parseNum(row[24]),
              diesel_cost: parseNum(row[25]),
              self_balance: parseNum(row[26]),

              // Outside vehicle details
              bilty_com: parseNum(row[27]),
              vre_adv: parseNum(row[28]),
              out_fuel_ltr: parseNum(row[29]),
              out_diesel: parseNum(row[30]),
              out_balance: parseNum(row[31]),

              // Summary
              adv_recd: parseNum(row[32]),
              act_balance: parseNum(row[33]),
            };

            recordsToInsert.push(payload);
          }

          // Batch insert/upsert to Supabase
          if (recordsToInsert.length > 0) {
            // We use upsert on Bilty Number to skip or update duplicates
            const { error } = await supabase
              .from('biltys')
              .upsert(recordsToInsert, { onConflict: 'bilty_no' });

            if (error) {
              console.error(`Error inserting sheet ${sheetName}:`, error.message);
              throw error;
            }

            importedCount += recordsToInsert.length;
          }
        }

        alert(`Ledger Import completed. Successfully processed/updated ${importedCount} records.`);
        fetchCounts();
        onImportSuccess();
      } catch (err: any) {
        alert('Failed to parse Excel file: ' + err.message);
      } finally {
        setLoading(false);
        event.target.value = ''; // Reset input
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // EXPORT DISPATCH REGISTER
  const handleExport = async (scope: 'current' | 'all') => {
    setLoading(true);
    try {
      let query = supabase.from('biltys').select('*').order('date', { ascending: true });
      
      const { data, error } = await query;
      if (error) throw error;

      const records = (data || []) as Bilty[];
      if (records.length === 0) {
        alert('No waybill records available to export.');
        return;
      }

      // Group records by Month
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const byMonth: { [key: string]: Bilty[] } = {};

      const now = new Date();
      const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      records.forEach(r => {
        if (!r.date) return;
        const [y, m] = r.date.split('-');
        const key = `${y}-${m}`;
        if (!byMonth[key]) byMonth[key] = [];
        byMonth[key].push(r);
      });

      const wb = XLSX.utils.book_new();
      
      // Determine what months to export
      const keysToExport = scope === 'current'
        ? [currentYearMonth]
        : Object.keys(byMonth).sort().reverse();

      let hasExportedAny = false;

      keysToExport.forEach(key => {
        const monthRecords = byMonth[key];
        if (!monthRecords || monthRecords.length === 0) return;

        hasExportedAny = true;
        const [y, m] = key.split('-');
        const monthLabel = `${monthNames[parseInt(m) - 1]}-${y.slice(2)}`;

        // Build Excel layout matching the source format
        const titleRow = ['', '', 'MANOJ ASSOCIATES '];
        const subtitleRow = [
          '',
          '',
          `DISPATCH REGISTER FOR THE MONTH OF ${monthNames[parseInt(m) - 1].toUpperCase()} - ${y}`,
          '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
          'Self', '', '', '', '', '', '',
          'Outside Party'
        ];

        const headers = [
          'Party  DO', 'Date', 'LR No.', 'Vehicles No.', 'Load From', 'Unload to',
          'Transporter', 'DRIVER', 'Material', 'Quality ', 'Chall.Wt.', 'Recd.Wt.',
          'Difference', 'Short.Qty', 'Unload Unit', 'Party', 'Rate', 'Freight',
          'Shortage', 'Bilty', 'VRE', 'Paid', 'Fuel Ltr', 'Pump', 'Rate', 'Diesel',
          'Balance ', 'Bilty/com', 'VRE Adv', 'Ltr', 'Diesel', 'Balance ', 'Adv.Recd.',
          'Act.Balance'
        ];

        const rows = monthRecords.map(b => {
          // Format date as serial number or keep YYYY-MM-DD
          // For simplicity we will output DD/MM/YYYY text
          const dateParts = b.date.split('-');
          const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

          return [
            b.party_do || '',
            formattedDate,
            b.bilty_no,
            b.truck_no || '',
            b.from_location || '',
            b.to_location || '',
            b.transporter || '',
            b.driver_name || '',
            b.material || '',
            b.quality || '',
            b.challan_wt || 0,
            b.recd_wt || 0,
            b.wt_diff || 0,
            b.short_qty || 0,
            b.unload_unit || '',
            b.party_short || '',
            b.dispatch_rate || 0,
            b.dispatch_freight || 0,
            b.shortage_amt || 0,
            b.bilty_charge || 0,
            b.vehicle_type === 'self' ? b.vre : '',
            b.vehicle_type === 'self' ? b.paid : '',
            b.vehicle_type === 'self' ? b.fuel_ltr : '',
            b.vehicle_type === 'self' ? b.pump || '' : '',
            b.vehicle_type === 'self' ? b.fuel_rate : '',
            b.vehicle_type === 'self' ? b.diesel_cost : '',
            b.vehicle_type === 'self' ? b.self_balance : '',
            b.vehicle_type === 'outside' ? b.bilty_com : '',
            b.vehicle_type === 'outside' ? b.vre_adv : '',
            b.vehicle_type === 'outside' ? b.out_fuel_ltr : '',
            b.vehicle_type === 'outside' ? b.out_diesel : '',
            b.vehicle_type === 'outside' ? b.out_balance : '',
            b.adv_recd || 0,
            b.act_balance || 0
          ];
        });

        // Convert array of arrays to sheet
        const ws = XLSX.utils.aoa_to_sheet([titleRow, subtitleRow, headers, ...rows]);

        // Merge cells for headers
        ws['!merges'] = [
          // Row 1 (subtitles) - Merge Self columns
          { s: { r: 1, c: 20 }, e: { r: 1, c: 26 } },
          // Merge Outside Party columns
          { s: { r: 1, c: 27 }, e: { r: 1, c: 31 } }
        ];

        // Format column widths
        ws['!cols'] = [
          { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 12 },
          { wch: 25 }, { wch: 14 }, { wch: 8 }, { wch: 8 }, { wch: 9 }, { wch: 9 },
          { wch: 10 }, { wch: 9 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 10 },
          { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 9 }, { wch: 12 },
          { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 9 }, { wch: 8 },
          { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }
        ];

        XLSX.utils.book_append_sheet(wb, ws, monthLabel);
      });

      if (!hasExportedAny) {
        alert(scope === 'current' ? 'No records found for the current month.' : 'No records found to export.');
        return;
      }

      // Download file
      const fileName = scope === 'current'
        ? `Dispatch_Register_Current_Month.xlsx`
        : `Manoj_Associates_Bilty_Details_Total.xlsx`;
        
      XLSX.writeFile(wb, fileName);
    } catch (err: any) {
      alert('Failed to export register: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // CLEAR ALL DATA
  const handleClearAll = async () => {
    const confirmation1 = confirm('WARNING: You are about to permanently delete ALL saved biltys and client records from the database. This action CANNOT be undone. Are you sure?');
    if (!confirmation1) return;

    const confirmation2 = prompt('Type "DELETE ALL" in capitals to proceed with resetting the database:');
    if (confirmation2 !== 'DELETE ALL') {
      alert('Confirmation failed. Database reset aborted.');
      return;
    }

    setLoading(true);
    try {
      // Delete biltys first to prevent foreign key errors, then clients
      const { error: bErr } = await supabase.from('biltys').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      const { error: cErr } = await supabase.from('clients').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      if (bErr) throw bErr;
      if (cErr) throw cErr;

      alert('Database has been completely reset. All waybills and client profiles are cleared.');
      fetchCounts();
      onImportSuccess();
    } catch (err: any) {
      alert('Error clearing data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-8">
      {/* HEADER SECTION */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-indigo-600" /> Export & Import Interface
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Perform bulk spreadsheet synchronization with Excel, backup repository data, or initiate a database reset.
        </p>

        {/* Counts summary */}
        <div className="grid grid-cols-2 gap-4 mt-6 border-t pt-4">
          <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-100">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Waybill Logs</div>
            <div className="text-2xl font-extrabold text-slate-700 mt-1">{biltyCount} Records</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-100">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Client Directory</div>
            <div className="text-2xl font-extrabold text-slate-700 mt-1">{clientCount} Accounts</div>
          </div>
        </div>
      </div>

      {/* OPERATIONS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* IMPORT */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Upload className="w-4 h-4 text-indigo-600" /> Bulk Import Register
            </h4>
            <p className="text-xs text-slate-500 mt-1 leading-normal">
              Upload the Manoj Associates Excel spreadsheet (`.xlsx` format) to populate the register. The loader automatically skips empty rows, detects header keys, parses Excel serial numbers into ISO dates, and skips/updates duplicate LR Numbers.
            </p>
          </div>
          
          <div className="mt-6">
            <label className="w-full flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl px-4 py-6 bg-slate-50 hover:bg-slate-100 hover:border-indigo-400 transition cursor-pointer text-slate-500 text-xs">
              <FileSpreadsheet className="w-8 h-8 text-indigo-400 mb-2" />
              <span className="font-semibold text-indigo-600">Click to choose Excel sheet</span>
              <span className="text-[10px] text-slate-400 mt-1">Accepts .xlsx files only</span>
              <input
                type="file"
                accept=".xlsx"
                onChange={handleImport}
                disabled={loading}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* EXPORT */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-600" /> Download Reports
            </h4>
            <p className="text-xs text-slate-500 mt-1 leading-normal">
              Generate and download the formatted Excel workbook ledger of all entries. The resulting file formats the 34 columns (DO, date, truck, routes, weights, rates, self/outside balances, actual balances) exactly in the original layout with month-divided workbook sheets.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <button
              onClick={() => handleExport('current')}
              disabled={loading}
              className="flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs shadow-md shadow-emerald-50 transition cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" /> Current Month
            </button>
            <button
              onClick={() => handleExport('all')}
              disabled={loading}
              className="flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs shadow-md shadow-indigo-50 transition cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" /> Full Database
            </button>
          </div>
        </div>
      </div>

      {/* DATABASE RE-INITIALIZATION WARNING */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-5 shadow-sm">
        <h4 className="font-bold text-red-800 text-sm flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-600 animate-pulse" /> Danger Zone
        </h4>
        <p className="text-xs text-red-700 mt-1 leading-normal">
          Wipe the Supabase database. This deletes all clients and bilty waybill registries permanently. Make sure to download a database copy before running.
        </p>
        <button
          onClick={handleClearAll}
          disabled={loading}
          className="mt-4 flex items-center justify-center gap-2 py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition shadow-md shadow-red-100 cursor-pointer disabled:opacity-50"
        >
          <Trash2 className="w-3.5 h-3.5" /> Clear All Records
        </button>
      </div>

      {/* REFRESH COUNTS BUTTON */}
      <div className="flex justify-end pr-2">
        <button
          onClick={fetchCounts}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 transition"
        >
          <RefreshCw className="w-3 h-3" /> Refresh Counts
        </button>
      </div>
    </div>
  );
};
