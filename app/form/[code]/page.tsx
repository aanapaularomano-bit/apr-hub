'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';

const inputS = { width: '100%', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px', color: '#1a1a2e', fontSize: 15, outline: 'none', boxSizing: 'border-box' as const, fontFamily: "'DM Sans', system-ui, sans-serif" };
const labelS = { fontSize: 13, fontWeight: 600 as const, color: '#4a5568', display: 'block' as const, marginBottom: 6 };

export default function FormPage() {
  const params = useParams();
  const code = params?.code as string;
  const [form, setForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState({
    nome_socio: '', nome_empresa: '', email: '', whatsapp: '', site_instagram: '',
    cnpj: '', cpf_socio: '', rg: '', endereco_cep: '', profissao: '', estado_civil: '',
    dia_pagamento: '', produto_servico: '', publico_alvo: '', orcamento_trafego: '',
    objetivos: '', concorrentes: '', historico: '', dados_bancarios: '', tipo_cobranca: '', observacoes: '',
  });

  useEffect(() => {
    if (code) loadForm();
  }, [code]);

  async function loadForm() {
    setLoading(true);
    const { data: f, error } = await supabase.from('client_forms').select('*').eq('form_code', code).single();
    if (error || !f) { setError('Formulário não encontrado'); setLoading(false); return; }
    if (f.status === 'preenchido') { setSubmitted(true); }
    setForm(f);
    // Pre-fill if already has data
    if (f.nome_socio) {
      setData({
        nome_socio: f.nome_socio || '', nome_empresa: f.nome_empresa || '', email: f.email || '',
        whatsapp: f.whatsapp || '', site_instagram: f.site_instagram || '', cnpj: f.cnpj || '',
        cpf_socio: f.cpf_socio || '', rg: f.rg || '', endereco_cep: f.endereco_cep || '',
        profissao: f.profissao || '', estado_civil: f.estado_civil || '', dia_pagamento: f.dia_pagamento || '',
        produto_servico: f.produto_servico || '', publico_alvo: f.publico_alvo || '',
        orcamento_trafego: f.orcamento_trafego || '', objetivos: f.objetivos || '',
        concorrentes: f.concorrentes || '', historico: f.historico || '',
        dados_bancarios: f.dados_bancarios || '', tipo_cobranca: f.tipo_cobranca || '',
        observacoes: f.observacoes || '',
      });
    }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!data.nome_socio || !data.email || !data.whatsapp) { setError('Preencha os campos obrigatórios'); return; }
    setSubmitting(true);
    setError('');
    const { error } = await supabase.from('client_forms').update({ ...data, status: 'preenchido', updated_at: new Date().toISOString() }).eq('form_code', code);
    if (error) { setError('Erro ao enviar. Tente novamente.'); setSubmitting(false); return; }
    setSubmitted(true);
    setSubmitting(false);
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f8fafc, #eef2ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', system-ui" }}>
      <div style={{ textAlign: 'center', color: '#6366f1' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚡</div>
        <span style={{ fontWeight: 600, fontSize: 16 }}>Carregando formulário...</span>
      </div>
    </div>
  );

  if (error && !form) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f8fafc, #eef2ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', system-ui" }}>
      <div style={{ textAlign: 'center', maxWidth: 400, padding: 40 }}>
        <div style={{ fontSize: 50, marginBottom: 16 }}>😕</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a2e', marginBottom: 8 }}>Formulário não encontrado</h1>
        <p style={{ fontSize: 14, color: '#64748b' }}>Verifique o link e tente novamente. Se o problema persistir, entre em contato com a APR Digital.</p>
      </div>
    </div>
  );

  if (submitted) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f0fdf4, #eef2ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', system-ui" }}>
      <div style={{ textAlign: 'center', maxWidth: 450, padding: 40 }}>
        <div style={{ width: 70, height: 70, borderRadius: 20, background: 'linear-gradient(135deg,#22c55e,#16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 20px' }}>✓</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1a1a2e', marginBottom: 8 }}>Dados enviados com sucesso! 🎉</h1>
        <p style={{ fontSize: 15, color: '#64748b', lineHeight: 1.7 }}>Obrigada por preencher seus dados cadastrais. Nossa equipe já recebeu e entrará em contato em breve para dar continuidade ao seu processo.</p>
        <div style={{ marginTop: 24, padding: '14px 20px', background: 'rgba(99,102,241,0.08)', borderRadius: 12, color: '#6366f1', fontSize: 13, fontWeight: 600 }}>APR Digital — Marketing que transforma resultados</div>
      </div>
    </div>
  );

  const fields = [
    { section: 'Dados Pessoais', items: [
      { k: 'nome_socio', l: 'Nome sócio completo', req: true },
      { k: 'nome_empresa', l: 'Nome empresa' },
      { k: 'email', l: 'Email', t: 'email', req: true },
      { k: 'whatsapp', l: 'WhatsApp', req: true },
      { k: 'cpf_socio', l: 'CPF Sócio' },
      { k: 'rg', l: 'RG' },
      { k: 'profissao', l: 'Profissão' },
      { k: 'estado_civil', l: 'Estado Civil' },
    ]},
    { section: 'Empresa', items: [
      { k: 'cnpj', l: 'CNPJ Empresa' },
      { k: 'endereco_cep', l: 'Endereço da empresa com CEP' },
      { k: 'site_instagram', l: 'Site ou Instagram' },
      { k: 'dia_pagamento', l: 'Melhor dia de pagamento (5, 10 ou 25)' },
    ]},
    { section: 'Sobre o Negócio', items: [
      { k: 'produto_servico', l: 'Qual seu produto/serviço principal?', area: true },
      { k: 'publico_alvo', l: 'Quem é seu público-alvo?', area: true },
      { k: 'objetivos', l: 'Quais seus objetivos com marketing digital?', area: true },
      { k: 'orcamento_trafego', l: 'Orçamento mensal disponível para tráfego (R$)' },
      { k: 'concorrentes', l: 'Quem são seus principais concorrentes?', area: true },
      { k: 'historico', l: 'Já anunciou online antes? Conte um pouco.', area: true },
    ]},
    { section: 'Financeiro', items: [
      { k: 'dados_bancarios', l: 'Dados bancários / PIX para pagamento', area: true },
      { k: 'tipo_cobranca', l: 'Tipo de cobrança acordado (fixo, %, mix)' },
      { k: 'observacoes', l: 'Observações adicionais', area: true },
    ]},
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f8fafc, #eef2ff)', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '40px 24px 60px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ width: 60, height: 60, borderRadius: 18, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, color: '#fff', margin: '0 auto 16px' }}>A</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1a1a2e', marginBottom: 6 }}>Formulário de Dados Cadastrais</h1>
          <p style={{ fontSize: 15, color: '#64748b', lineHeight: 1.6 }}>Por favor preencha esse formulário para que possamos dar continuidade no seu processo de entrada!</p>
        </div>

        <form onSubmit={handleSubmit}>
          {fields.map(section => (
            <div key={section.section} style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: '#6366f1', marginBottom: 16, paddingBottom: 8, borderBottom: '2px solid #e2e8f0' }}>{section.section}</h2>
              <div style={{ display: 'grid', gridTemplateColumns: section.items.some(i => (i as any).area) ? '1fr' : '1fr 1fr', gap: 16 }}>
                {section.items.map(f => (
                  <div key={f.k} style={{ gridColumn: (f as any).area ? '1 / -1' : undefined }}>
                    <label style={labelS}>{f.l}{(f as any).req && <span style={{ color: '#ef4444' }}>*</span>}</label>
                    {(f as any).area ? (
                      <textarea value={(data as any)[f.k]} onChange={e => setData({ ...data, [f.k]: e.target.value })} rows={3} style={{ ...inputS, resize: 'vertical' as const }} />
                    ) : (
                      <input type={(f as any).t || 'text'} value={(data as any)[f.k]} onChange={e => setData({ ...data, [f.k]: e.target.value })} style={inputS} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {error && <div style={{ padding: '12px 16px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 13, marginBottom: 16 }}>{error}</div>}

          <button type="submit" disabled={submitting} style={{
            width: '100%', padding: '16px', borderRadius: 12, border: 'none',
            background: submitting ? '#a5b4fc' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff', fontSize: 16, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer',
            fontFamily: "'DM Sans', system-ui",
          }}>
            {submitting ? 'Enviando...' : 'Enviar Dados'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 30, fontSize: 12, color: '#94a3b8' }}>
          APR Digital — Seus dados estão protegidos e serão utilizados apenas para fins contratuais.
        </div>
      </div>
    </div>
  );
}
