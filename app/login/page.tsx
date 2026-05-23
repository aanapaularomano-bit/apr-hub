'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push(redirect);
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || 'Senha incorreta');
        setLoading(false);
      }
    } catch (err) {
      setError('Erro de conexão. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <div style={{minHeight:'100vh',background:'#0a0a0d',color:'#e9e9f2',fontFamily:'Inter,sans-serif',display:'flex',alignItems:'center',justifyContent:'center',padding:20,position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',background:'radial-gradient(circle at 20% 30%, rgba(200,255,90,.08), transparent 40%), radial-gradient(circle at 80% 70%, rgba(122,252,184,.05), transparent 50%)',pointerEvents:'none'}}/>
      <div style={{background:'rgba(16,16,21,0.85)',backdropFilter:'blur(20px)',border:'1px solid #2a2a3a',borderRadius:20,padding:'48px 40px',maxWidth:420,width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,.5), 0 0 60px rgba(200,255,90,.05)',position:'relative',zIndex:1}}>
        <div style={{width:64,height:64,borderRadius:16,background:'linear-gradient(135deg,#c8ff5a 0%,#7afcb8 100%)',display:'flex',alignItems:'center',justifyContent:'center',color:'#0a0a0d',fontFamily:'Georgia,serif',fontWeight:700,fontSize:28,marginBottom:24,boxShadow:'0 0 40px rgba(200,255,90,.3)'}}>A</div>
        <h1 style={{fontFamily:'Georgia,serif',fontSize:28,fontWeight:600,letterSpacing:'-0.02em',margin:'0 0 8px'}}>APR Hub</h1>
        <div style={{color:'#6a6a80',fontSize:13,textTransform:'uppercase',letterSpacing:'0.15em',fontFamily:'monospace',marginBottom:32}}>Acesso Restrito</div>
        <form onSubmit={handleSubmit}>
          <label style={{display:'block',fontSize:11,textTransform:'uppercase',letterSpacing:'0.12em',color:'#6a6a80',marginBottom:8,fontFamily:'monospace'}}>Senha de acesso</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Digite sua senha" autoFocus required disabled={loading}
            style={{width:'100%',padding:'14px 16px',background:'#161620',border:'1px solid #2a2a3a',borderRadius:10,color:'#e9e9f2',fontFamily:'inherit',fontSize:15,outline:'none',boxSizing:'border-box'}}/>
          {error && <div style={{background:'rgba(255,107,138,.1)',border:'1px solid rgba(255,107,138,.3)',color:'#ff6b8a',padding:'12px 14px',borderRadius:8,fontSize:13,marginTop:16}}>⚠ {error}</div>}
          <button type="submit" disabled={loading||!password}
            style={{width:'100%',padding:14,background:'#c8ff5a',color:'#0a0a0d',border:'none',borderRadius:10,fontFamily:'inherit',fontSize:15,fontWeight:600,cursor:'pointer',marginTop:20,opacity:loading||!password?0.6:1}}>
            {loading ? 'Validando...' : 'Entrar →'}
          </button>
        </form>
        <div style={{marginTop:32,paddingTop:24,borderTop:'1px solid #2a2a3a',textAlign:'center',fontSize:11,color:'#6a6a80',fontFamily:'monospace',letterSpacing:'0.1em'}}>APR DIGITAL · 2026</div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{minHeight:'100vh',background:'#0a0a0d'}}/>}>
      <LoginForm />
    </Suspense>
  );
}
