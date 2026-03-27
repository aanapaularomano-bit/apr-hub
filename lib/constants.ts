export const SQUADS = {
  lancamentos: { label: "Lançamentos", icon: "🚀", color: "#8b5cf6" },
  perpetuo: { label: "Perpétuo", icon: "♾️", color: "#3b82f6" },
  negocios_locais: { label: "Neg. Locais", icon: "📍", color: "#22c55e" },
};

export const PHASES = {
  lancamentos: ["Onboarding", "Planejamento", "Aquecimento", "Captação", "Lançamento", "Pós-Lançamento", "Debriefing"],
  perpetuo: ["Onboarding", "Setup Funil", "Testes", "Otimização", "Escala", "Manutenção"],
  negocios_locais: ["Onboarding", "Setup", "Geração Leads", "Otimização", "Escala", "Growth"],
};

export const FUNNEL_TPL = {
  lancamentos: [
    { key: "impressoes", label: "Impressões", color: "#8b5cf6" },
    { key: "cliques", label: "Cliques", color: "#a78bfa" },
    { key: "inscritos", label: "Inscritos", color: "#c4b5fd" },
    { key: "presentes", label: "Presentes", color: "#6366f1" },
    { key: "carrinho", label: "Carrinho", color: "#818cf8" },
    { key: "vendas", label: "Vendas", color: "#22c55e" },
  ],
  perpetuo: [
    { key: "sessoes", label: "Sessões", color: "#3b82f6" },
    { key: "visualizou", label: "Vis. Produto", color: "#60a5fa" },
    { key: "addcart", label: "Add Cart", color: "#93c5fd" },
    { key: "checkout", label: "Checkout", color: "#6366f1" },
    { key: "compras", label: "Compras", color: "#22c55e" },
  ],
  negocios_locais: [
    { key: "impressoes", label: "Impressões", color: "#22c55e" },
    { key: "cliques", label: "Cliques", color: "#4ade80" },
    { key: "leads", label: "Leads", color: "#86efac" },
    { key: "agendamentos", label: "Agendamentos", color: "#6366f1" },
    { key: "compareceu", label: "Compareceu", color: "#818cf8" },
    { key: "fechamentos", label: "Fechamentos", color: "#22c55e" },
  ],
};

export const KPI_TPL = {
  lancamentos: [
    { key: "cpl", label: "CPL", prefix: "R$ ", color: "#22c55e" },
    { key: "taxa_presenca", label: "Tx Presença", suffix: "%", color: "#3b82f6" },
    { key: "conv_venda", label: "Conv→Venda", suffix: "%", color: "#f59e0b" },
    { key: "ticket_medio", label: "Ticket Médio", prefix: "R$ ", color: "#8b5cf6" },
  ],
  perpetuo: [
    { key: "taxa_conversao", label: "Conv. Geral", suffix: "%", color: "#3b82f6" },
    { key: "ticket_medio", label: "Ticket Médio", prefix: "R$ ", color: "#f59e0b" },
    { key: "cac", label: "CAC", prefix: "R$ ", color: "#ef4444" },
    { key: "ltv_90d", label: "LTV 90d", prefix: "R$ ", color: "#22c55e" },
  ],
  negocios_locais: [
    { key: "cpl", label: "CPL", prefix: "R$ ", color: "#22c55e" },
    { key: "taxa_agendamento", label: "Tx Agend.", suffix: "%", color: "#8b5cf6" },
    { key: "show_rate", label: "Show Rate", suffix: "%", color: "#f59e0b" },
    { key: "cpa_fechamento", label: "CPA", prefix: "R$ ", color: "#ef4444" },
  ],
};

export const TASK_COLS = [
  { key: "afazer", label: "A Fazer", color: "#f59e0b" },
  { key: "fazendo", label: "Fazendo", color: "#3b82f6" },
  { key: "feito", label: "Feito", color: "#22c55e" },
];

export const PRIO = {
  urgente: { color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  normal: { color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  baixa: { color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
};

export const PAY_STATUS = {
  pago: { label: "Pago", color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  pendente: { label: "Pendente", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  atrasado: { label: "Atrasado", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
};

export const EXP_CATS = {
  ferramenta: { label: "Ferramentas", icon: "🛠️", color: "#3b82f6" },
  freelancer: { label: "Freelancers", icon: "👤", color: "#8b5cf6" },
  infra: { label: "Infraestrutura", icon: "🖥️", color: "#06b6d4" },
  fixo: { label: "Custos Fixos", icon: "📋", color: "#f59e0b" },
};

export const fB = (n: number) =>
  "R$ " + Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export const fB2 = (n: number) =>
  "R$ " + Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fN = (n: number) =>
  n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : String(n || 0);

export const THEME = {
  bg: "#08080f",
  card: "rgba(255,255,255,0.025)",
  bdr: "rgba(255,255,255,0.06)",
  tx: "#e2e8f0",
  mt: "rgba(255,255,255,0.4)",
  mt2: "rgba(255,255,255,0.2)",
  fn: "'DM Sans', system-ui, sans-serif",
  mo: "'JetBrains Mono', monospace",
};
