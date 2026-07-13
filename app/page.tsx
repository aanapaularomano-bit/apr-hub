'use client';

import { useEffect, useState } from 'react';
import HubApp from '@/components/HubApp';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/me')
      .then(r => r.json())
      .then(data => {
        setUser(data.id ? data : null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#08080f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa', fontFamily: "'DM Sans', system-ui" }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚡</div>
        <span style={{ fontWeight: 600, fontSize: 16 }}>Carregando Ana Paula Romano...</span>
      </div>
    </div>
  );

  if (!user) return null;

  return <HubApp user={user} />;
}
