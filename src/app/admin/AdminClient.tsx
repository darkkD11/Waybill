'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, UserPlus, ArrowLeft, Loader2, Info, Users as UsersIcon, Trash2, Edit } from 'lucide-react';
import Link from 'next/link';

interface User {
  id: string;
  email: string;
  role: string;
  created_at: string;
  last_sign_in_at: string | null;
}

export default function AdminClient() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users);
      } else {
        console.error('Failed to fetch users:', data.error);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      setMessage({ type: 'success', text: 'User account created successfully!' });
      setEmail('');
      setPassword('');
      setRole('user');
      
      // Refresh user list
      fetchUsers();
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : String(err) });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (id: string, newRole: string) => {
    if (!window.confirm(`Are you sure you want to change this user's role to ${newRole}?`)) return;
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, role: newRole }),
      });
      if (res.ok) fetchUsers();
      else alert('Failed to update role');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm('Are you SURE you want to delete this user? This cannot be undone.')) return;
    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) fetchUsers();
      else alert('Failed to delete user');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Admin Panel</h1>
              <p className="text-sm text-slate-500">Manage access and user roles</p>
            </div>
          </div>
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600 transition">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* CREATE USER FORM */}
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-fit">
            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-600" /> Create New User
            </h2>
            
            <form onSubmit={handleCreateUser} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full text-sm border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="employee@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Temporary Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full text-sm border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Minimum 6 characters"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Access Role</label>
                <div className="flex flex-col gap-3">
                  <label className={`border rounded-lg p-3 cursor-pointer transition ${role === 'user' ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-200 hover:border-indigo-300'}`}>
                    <input type="radio" name="role" value="user" checked={role === 'user'} onChange={() => setRole('user')} className="hidden" />
                    <div className="font-bold text-slate-800 text-sm">Standard User</div>
                  </label>
                  <label className={`border rounded-lg p-3 cursor-pointer transition ${role === 'admin' ? 'border-amber-500 bg-amber-50/50' : 'border-slate-200 hover:border-amber-300'}`}>
                    <input type="radio" name="role" value="admin" checked={role === 'admin'} onChange={() => setRole('admin')} className="hidden" />
                    <div className="font-bold text-amber-700 text-sm flex items-center gap-1.5"><ShieldCheck className="w-4 h-4"/> Administrator</div>
                  </label>
                </div>
              </div>

              {message && (
                <div className={`p-4 rounded-lg text-sm flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  <Info className="w-5 h-5 shrink-0" /> {message.text}
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md transition disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  Create Account
                </button>
              </div>
            </form>
          </div>

          {/* USER LIST */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <UsersIcon className="w-5 h-5 text-indigo-600" /> Manage Users
            </h2>

            {loadingUsers ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Email</th>
                      <th className="px-4 py-3 font-semibold">Role</th>
                      <th className="px-4 py-3 font-semibold">Last Login</th>
                      <th className="px-4 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-medium text-slate-800">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                            u.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {u.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <button
                            onClick={() => handleUpdateRole(u.id, u.role === 'admin' ? 'user' : 'admin')}
                            className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded transition"
                            title="Toggle Role"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="text-red-500 hover:bg-red-50 p-1.5 rounded transition"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                          No users found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
