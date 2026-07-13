import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase/client';
import { Client } from '../types/supabase';
import { Search, Edit2, Trash2, Users } from 'lucide-react';

export const ClientManager: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Edit / Add Form State
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [gst, setGst] = useState('');
  const [contact, setContact] = useState('');
  const [destination, setDestination] = useState('');

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      setClients(data || []);
    } catch (err: unknown) {
      alert('Error fetching clients: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Client Name is required.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        address: address.trim() || null,
        gst: gst.trim().toUpperCase() || null,
        contact: contact.trim() || null,
        destination: destination.trim() || null,
      };

      if (editId) {
        const { error } = await supabase
          .from('clients')
          .update(payload)
          .eq('id', editId);
        if (error) throw error;
        alert('Client updated successfully!');
      } else {
        const { error } = await supabase
          .from('clients')
          .insert(payload);
        if (error) throw error;
        alert('Client added successfully!');
      }

      resetForm();
      fetchClients();
    } catch (err: unknown) {
      alert('Error saving client: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (c: Client) => {
    setEditId(c.id);
    setName(c.name);
    setAddress(c.address || '');
    setGst(c.gst || '');
    setContact(c.contact || '');
    setDestination(c.destination || '');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this client?')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);
      if (error) throw error;
      alert('Client deleted successfully!');
      fetchClients();
    } catch (err: unknown) {
      alert('Error deleting client: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditId(null);
    setName('');
    setAddress('');
    setGst('');
    setContact('');
    setDestination('');
  };

  // Filter clients based on search query
  const filteredClients = clients.filter(c => {
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.gst && c.gst.toLowerCase().includes(q)) ||
      (c.address && c.address.toLowerCase().includes(q)) ||
      (c.destination && c.destination.toLowerCase().includes(q))
    );
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-4">
      {/* LEFT COLUMN: ADD / EDIT CLIENT FORM */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm h-fit">
        <h3 className="text-indigo-600 text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
          <Users className="w-4 h-4" /> {editId ? 'Edit Client Record' : 'Add New Client'}
        </h3>
        
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Client Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Reliance Industries Ltd."
              required
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">GST Number</label>
            <input
              type="text"
              value={gst}
              onChange={e => setGst(e.target.value)}
              placeholder="15-digit GSTIN"
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 uppercase font-mono"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Destination Address</label>
            <textarea
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Registered office or delivery address"
              rows={3}
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Contact No.</label>
              <input
                type="text"
                value={contact}
                onChange={e => setContact(e.target.value)}
                placeholder="Mobile or phone"
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Default Dest.</label>
              <input
                type="text"
                value={destination}
                onChange={e => setDestination(e.target.value)}
                placeholder="Town / City name"
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t mt-4">
            <button
              type="button"
              onClick={resetForm}
              className="flex-1 py-2 border border-slate-300 rounded-lg text-slate-700 text-sm font-semibold hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-md shadow-indigo-100 transition cursor-pointer disabled:opacity-50"
            >
              {editId ? 'Update Client' : 'Add Client'}
            </button>
          </div>
        </form>
      </div>

      {/* RIGHT COLUMN: CLIENT DATABASE TABLE (2 Cols) */}
      <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h3 className="text-slate-800 text-sm font-bold">Client Directory ({filteredClients.length} Records)</h3>
          
          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, GST or address..."
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
                <th className="px-4 py-3">Client Details</th>
                <th className="px-4 py-3 w-36">GSTIN</th>
                <th className="px-4 py-3 w-32">Destination</th>
                <th className="px-4 py-3 w-28 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-slate-400">
                    No client records found.
                  </td>
                </tr>
              ) : (
                filteredClients.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-800 text-sm">{c.name}</div>
                      <div className="text-slate-500 mt-1 leading-normal">{c.address || 'No address details'}</div>
                      {c.contact && <div className="text-[10px] text-slate-400 mt-1">Ph: {c.contact}</div>}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold uppercase text-slate-700">
                      {c.gst || '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-medium">
                      {c.destination || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleEdit(c)}
                          className="p-1.5 border border-indigo-100 rounded-lg text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition cursor-pointer"
                          title="Edit Client"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-1.5 border border-red-100 rounded-lg text-red-600 hover:bg-red-50 hover:border-red-200 transition cursor-pointer"
                          title="Delete Client"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
