import React from 'react';
import AdminClient from './AdminClient';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  // Only allow admins
  if (user.user_metadata?.role !== 'admin') {
    return redirect('/');
  }

  return <AdminClient />;
}
