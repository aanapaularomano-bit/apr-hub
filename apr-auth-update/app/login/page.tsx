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
    <div className="apr-login">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=JetBrains+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap');
        body { margin: 0; padding: 0; background: #0a0a0d; }
        .apr-login {
          --bg-0:#0a0a0d; --bg-1:#101015; --bg-2:#161620; --bg-3:#1d1d2a;
          --line:#2a2a3a; --text:#e9e9f2; --text-soft:#9b9bb0; --text-dim:#6a6a80;
          --accent:#c8ff5a; --accent-2:#7afcb8; --danger:#ff6b8a;
          min-height: 100vh;
          background: var(--bg-0);
          color: var(--text);
          font-family: 'Inter', sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          position: relative;
          overflow: hidden;
        }
        .apr-login::before {
          content: '';
          position: absolute;
          top: -50%; left: -50%; width: 200%; height: 200%;
          background:
            radial-gradient(circle at 20% 30%, rgba(200,255,90,.08), transparent 40%),
            radial-gradient(circle at 80% 70%, rgba(122,252,184,.05), transparent 50%);
          animation: aprfloat 20s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes aprfloat {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          50% { transform: translate(-20px, -20px) rotate(2deg); }
        }
        .apr-login .card {
          background: rgba(16, 16, 21, 0.85);
          backdrop-filter: blur(20px);
          border: 1px solid var(--line);
          border-radius: 20px;
          padding: 48px 40px;
          max-width: 420px;
          width: 100%;
          box-shadow: 0 20px 60px rgba(0,0,0,.5), 0 0 60px rgba(200,255,90,.05);
          position: relative;
          z-index: 1;
        }
        .apr-login .brand-mark {
          width: 64px; height: 64px;
          border-radius: 16px;
          background: linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #0a0a0d;
          font-family: 'Fraunces', serif;
          font-weight: 700;
          font-size: 28px;
          margin-bottom: 24px;
          box-shadow: 0 0 40px rgba(200,255,90,.3);
        }
        .apr-login h1 {
          font-family: 'Fraunces', serif;
          font-size: 28px;
          font-weight: 600;
          letter-spacing: -0.02em;
          margin: 0 0 8px;
        }
        .apr-login .sub {
          color: var(--text-dim);
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          font-family: 'JetBrains Mono', monospace;
          margin-bottom: 32px;
        }
        .apr-login label {
          display: block;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: var(--text-dim);
          margin-bottom: 8px;
          font-family: 'JetBrains Mono', monospace;
        }
        .apr-login input {
          width: 100%;
          padding: 14px 16px;
          background: var(--bg-2);
          border: 1px solid var(--line);
          border-radius: 10px;
          color: var(--text);
          font-family: inherit;
          font-size: 15px;
          outline: none;
          transition: all 0.2s;
          box-sizing: border-box;
        }
        .apr-login input:focus {
          border-color: var(--accent);
          background: var(--bg-3);
          box-shadow: 0 0 0 3px rgba(200,255,90,.1);
        }
        .apr-login button {
          width: 100%;
          padding: 14px;
          background: var(--accent);
          color: #0a0a0d;
          border: none;
          border-radius: 10px;
          font-family: inherit;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          margin-top: 20px;
          transition: all 0.2s;
        }
        .apr-login button:hover:not(:disabled) {
          background: #d4ff7a;
          transform: translateY(-1px);
          box-shadow: 0 4px 20px rgba(200,255,90,.3);
        }
        .apr-login button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .apr-login .error {
          background: rgba(255,107,138,.1);
          border: 1px solid rgba(255,107,138,.3);
          color: var(--danger);
          padding: 12px 14px;
          border-radius: 8px;
          font-size: 13px;
          margin-top: 16px;
          animation: aprshake 0.4s ease;
        }
        @keyframes aprshake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .apr-login .footer {
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid var(--line);
          text-align: center;
          font-size: 11px;
          color: var(--text-dim);
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: 0.1em;
        }
      `}</style>

      <div className="card">
        <div className="brand-mark">A</div>
        <h1>APR Hub</h1>
        <div className="sub">Acesso Restrito</div>

        <form onSubmit={handleSubmit}>
          <label htmlFor="pwd">Senha de acesso</label>
          <input
            id="pwd"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Digite sua senha"
            autoFocus
            required
            disabled={loading}
          />

          {error && <div className="error">⚠ {error}</div>}

          <button type="submit" disabled={loading || !password}>
            {loading ? 'Validando...' : 'Entrar →'}
          </button>
        </form>

        <div className="footer">APR DIGITAL · {new Date().getFullYear()}</div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0a0a0d' }} />}>
      <LoginForm />
    </Suspense>
  );
}
