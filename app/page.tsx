'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import LoginPage from './login/page';
import HubApp from '@/components/HubApp';

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#08080f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#a78bfa',
        fontFamily: "'DM Sans', system-ui",
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚡</div>
          <span style={{ fontWeight: 600, fontSize: 16 }}>Carregando APR Hub...</span>
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;
  return <HubApp user={user} />;
}
