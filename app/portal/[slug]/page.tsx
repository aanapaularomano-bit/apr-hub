import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { getPortalRole, portalCookieName } from '@/lib/portalAuth';
import PortalClient from './PortalClient';

export default async function PortalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: portal } = await supabase
    .from('client_portals')
    .select('id, client_id, slug, enabled, sections, clients(id, name, squad, niche, product)')
    .eq('slug', slug)
    .single();

  if (!portal || !portal.enabled) {
    return (
      <div style={{ minHeight: '100vh', background: '#F2F4F1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Grotesk', system-ui" }}>
        <div style={{ textAlign: 'center', color: '#5C6861' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>404</div>
          <p>Portal não encontrado ou inativo.</p>
        </div>
      </div>
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(portalCookieName(slug))?.value;
  const role = token ? await getPortalRole(slug, token) : null;
  const isLoggedIn = role !== null;
  const isAdmin = role === 'admin';

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: "document.body.classList.add('portal')" }} />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href="/portal.css" />
      <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Space+Grotesk:wght@400;500;600&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />
      <PortalClient
        slug={slug}
        clientName={(portal.clients as any)?.name ?? slug}
        isLoggedIn={isLoggedIn}
        isAdmin={isAdmin}
      />
    </>
  );
}
