'use client';

import React, { useState } from 'react';
import { Bilty } from '../types/supabase';
import { BiltyForm } from '../components/bilty-form';
import { BiltyPrint } from '../components/bilty-print';
import { ClientManager } from '../components/client-manager';
import { BillHistory } from '../components/bill-history';
import { DispatchRegister } from '../components/dispatch-register';
import { DataIO } from '../components/data-io';
import { FileText, Users, Receipt, TableProperties, FileSpreadsheet, Truck } from 'lucide-react';

type TabType = 'bilty' | 'clients' | 'history' | 'register' | 'export';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('bilty');
  const [editBiltyId, setEditBiltyId] = useState<string | null>(null);
  const [biltyToPrint, setBiltyToPrint] = useState<Bilty | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(false);

  const triggerRefresh = () => {
    setRefreshTrigger(prev => !prev);
  };

  const handleEditSelect = (id: string) => {
    setEditBiltyId(id);
    setActiveTab('bilty');
  };

  const handleCancelEdit = () => {
    setEditBiltyId(null);
  };

  const handleTriggerPrint = (bilty: Bilty) => {
    setBiltyToPrint(bilty);
    // Let React update the DOM print elements, then trigger printing
    setTimeout(() => {
      window.print();
    }, 200);
  };

  return (
    <>
      {/* SCREEN INTERFACE (HIDDEN DURING PRINT) */}
      <div className="no-print min-h-screen flex flex-col md:flex-row bg-slate-100 font-sans text-slate-800">
        
        {/* SIDEBAR NAVIGATION */}
        <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col border-r border-slate-800 shrink-0 shadow-lg">
          {/* Logo brand */}
          <div className="p-6 border-b border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20 text-lg">
              MA
            </div>
            <div>
              <h1 className="font-extrabold text-sm tracking-wide text-white leading-none">MANOJ ASSOCIATES</h1>
              <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider mt-1 block">Logistics Partner</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 p-4 space-y-1">
            <button
              onClick={() => { setActiveTab('bilty'); handleCancelEdit(); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition duration-200 cursor-pointer ${
                activeTab === 'bilty'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Truck className="w-4.5 h-4.5" />
              <span>New Bilty Entry</span>
            </button>

            <button
              onClick={() => setActiveTab('clients')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition duration-200 cursor-pointer ${
                activeTab === 'clients'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Users className="w-4.5 h-4.5" />
              <span>Client Database</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition duration-200 cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Receipt className="w-4.5 h-4.5" />
              <span>Bill History</span>
            </button>

            <button
              onClick={() => setActiveTab('register')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition duration-200 cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <TableProperties className="w-4.5 h-4.5" />
              <span>Dispatch Register</span>
            </button>

            <button
              onClick={() => setActiveTab('export')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition duration-200 cursor-pointer ${
                activeTab === 'export'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-4.5 h-4.5" />
              <span>Import / Export</span>
            </button>
          </nav>

          {/* Footer info */}
          <div className="p-4 border-t border-slate-800 text-[10px] text-slate-500 text-center font-medium">
            Manoj Associates System v2.0<br />
            © 2026. All rights reserved.
          </div>
        </aside>

        {/* MAIN PANEL CONTENT */}
        <main className="flex-1 flex flex-col min-w-0">
          
          {/* Header toolbar */}
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 shadow-sm">
            <h2 className="font-bold text-slate-800 text-base flex items-center gap-2">
              {activeTab === 'bilty' && (editBiltyId ? 'Modify Bilty' : 'Generate New Bilty (LR)')}
              {activeTab === 'clients' && 'Client Directory'}
              {activeTab === 'history' && 'Bilty Archives'}
              {activeTab === 'register' && 'Dispatch Register Ledger'}
              {activeTab === 'export' && 'Spreadsheet Sync'}
            </h2>
            <div className="text-xs font-semibold text-slate-400 bg-slate-50 border border-slate-200 rounded-full px-3 py-1.5 font-mono">
              Surat Branch, GJ
            </div>
          </header>

          {/* Tab Pages Router */}
          <div className="flex-grow overflow-auto">
            {activeTab === 'bilty' && (
              <BiltyForm
                editBiltyId={editBiltyId}
                onSaveSuccess={triggerRefresh}
                onCancelEdit={handleCancelEdit}
                triggerPrint={handleTriggerPrint}
              />
            )}
            {activeTab === 'clients' && <ClientManager />}
            {activeTab === 'history' && (
              <BillHistory
                onEditSelect={handleEditSelect}
                triggerPrint={handleTriggerPrint}
                refreshTrigger={refreshTrigger}
              />
            )}
            {activeTab === 'register' && (
              <DispatchRegister refreshTrigger={refreshTrigger} />
            )}
            {activeTab === 'export' && (
              <DataIO onImportSuccess={triggerRefresh} />
            )}
          </div>
        </main>
      </div>

      {/* PRINT-ONLY AREA (RENDERED ONLY DURING WINDOW.PRINT()) */}
      <div className="preview-panel-root">
        <BiltyPrint bilty={biltyToPrint} />
      </div>
    </>
  );
}
