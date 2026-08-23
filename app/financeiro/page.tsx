'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { statusRecebimento, ResumoRecebimentos, PillStatus, SeletorStatusCliente, agruparPorTipo, CabecalhoGrupo } from '@/components/ResumoRecebimentosPJ';
import { SeletorSquad } from '@/components/SquadValorPJ';
import { EditorValorMoeda, BotaoNovaReceita } from '@/components/ValorEditavelPJ';
import { SeletorDiaPagamento, ESTILO_TABELA } from '@/components/LayoutTabelaPJ';
import { ClienteEditavel } from '@/components/TabelaPJGrid';
// Acesso via API server-side (/api/financeiro)

/* ============================================
   APR FINANCEIRO — Next.js + Supabase
   Rota: /financeiro
   ============================================ */

// Supabase acessado apenas no servidor

const MESES_NOMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const CATS_PF = ['🍔 Alimentação','🚗 Transporte','🏠 Moradia','💊 Saúde','🎉 Lazer','📚 Educação','👗 Vestuário','💳 Assinaturas','🐾 Pets','💰 Outros'];
const CATS_CARD = [...CATS_PF, 'Hobby','Veículos','Marketing PJ','Turismo/Entretenimento','Produtos e Serviços','Diversos'];
function fmtParcela(tx: any): string {
  if (tx.parcela_atual == null || !tx.parcela_total || !tx.valor_parcela) return '';
  let ate = '';
  if (tx.data_termino) {
    const str = String(tx.data_termino).length <= 7 ? tx.data_termino + '-01' : tx.data_termino;
    const parts = str.split('-');
    const MESES_ABREV = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
    ate = ` · até ${MESES_ABREV[parseInt(parts[1]) - 1]}/${String(parts[0]).slice(2)}`;
  }
  return `${tx.parcela_atual}/${tx.parcela_total} · ${fmtBR(parseFloat(tx.valor_parcela) || 0)}/mês${ate}`;
}
function guessCategoria(desc: string): string {
  const d = desc.toLowerCase();
  if (/uber|gasolina|combustivel|carro|estacionamento|mecanico/.test(d)) return '🚗 Transporte';
  if (/mercado|supermercado|ifood|restaurante|lanche|padaria|delivery/.test(d)) return '🍔 Alimentação';
  if (/aluguel|condominio|energia|agua|internet|gas/.test(d)) return '🏠 Moradia';
  if (/farmacia|medico|consulta|exame|plano de saude|academia/.test(d)) return '💊 Saúde';
  if (/netflix|spotify|amazon|disney|youtube|globo/.test(d)) return '💳 Assinaturas';
  if (/curso|livro|escola|faculdade/.test(d)) return '📚 Educação';
  if (/roupa|sapato|shopping/.test(d)) return '👗 Vestuário';
  if (/vet|petshop|racao/.test(d)) return '🐾 Pets';
  return '💰 Outros';
}

function makeEmptyMonth() {
  return {
    'rec-pj': [
      { cliente: 'Renata Cappai (PEDS)', squad: 'Lançamentos', tipo: 'Recorrente', status: 'Ativo', dia: '', valor: 0, recebido: false },
      { cliente: 'Renata Bacha (CBDS)', squad: 'Perpétuo', tipo: 'Recorrente', status: 'Ativo', dia: '', valor: 0, recebido: false },
      { cliente: 'Babi Rezende (Yoga)', squad: 'Lançamentos', tipo: 'Projeto', status: 'Ativo', dia: '', valor: 0, recebido: false },
      { cliente: 'Franciele Maftum (PNP)', squad: 'Lançamentos', tipo: 'Recorrente', status: 'Ativo', dia: '', valor: 0, recebido: false },
      { cliente: 'Bruna Araújo (C2PRO)', squad: 'Perpétuo', tipo: 'Recorrente', status: 'Ativo', dia: '', valor: 0, recebido: false },
    ],
    'cust-pj': [
      { desc: 'Salário/Pró-labore', cat: 'Equipe', venc: '05', valor: 0, pago: false },
      { desc: 'Freelas / Squad', cat: 'Equipe', venc: '10', valor: 0, pago: false },
      { desc: 'Ferramentas (Meta, ManyChat, AC, etc)', cat: 'Ferramentas', venc: '15', valor: 0, pago: false },
      { desc: 'Contador', cat: 'Administrativo', venc: '05', valor: 0, pago: false },
      { desc: 'Impostos (Simples)', cat: 'Impostos', venc: '20', valor: 0, pago: false },
      { desc: 'Hospedagem/Vercel/Supabase', cat: 'Infra', venc: '05', valor: 0, pago: false },
    ],
    'var-pj': [],
    'rec-pf': [
      { origem: 'Pró-labore (da PJ)', tipo: 'Salário', data: '05', valor: 0, recebido: false },
    ],
    'cust-pf': [
      { desc: 'Aluguel / Financiamento', cat: 'Moradia', venc: '10', valor: 0, pago: false },
      { desc: 'Mercado', cat: 'Alimentação', venc: '15', valor: 0, pago: false },
      { desc: 'Energia/Água/Internet', cat: 'Utilidades', venc: '15', valor: 0, pago: false },
      { desc: 'Plano de saúde', cat: 'Saúde', venc: '10', valor: 0, pago: false },
      { desc: 'Academia/Esporte', cat: 'Bem-estar', venc: '05', valor: 0, pago: false },
    ],
    'var-pf': [],
    'cards': [
      { nome: 'Nubank', bandeira: 'Mastercard', titular: 'PF', limite: 0, fatura: 0, venc: '10' },
      { nome: 'Inter PJ', bandeira: 'Mastercard', titular: 'PJ', limite: 0, fatura: 0, venc: '15' },
      { nome: 'Itaú Black · 1603', bandeira: 'Mastercard', titular: 'PF', limite: 0, fatura: 0, venc: '' },
      { nome: 'Final 6153', bandeira: 'Mastercard', titular: 'PF', limite: 0, fatura: 0, venc: '' },
      { nome: 'Final 6728', bandeira: 'Mastercard', titular: 'PJ', limite: 0, fatura: 0, venc: '' },
    ],
    'card-tx': [
      { data: '2026-01-30', desc: 'TmOdontologia', cartao: 'Itau Black', cat: 'Saúde', origem: 'PF', valor: 312.50, parcela_atual: 6, parcela_total: 8, valor_parcela: 312.50, data_termino: '2026-09' },
      { data: '2026-04-28', desc: 'PAYGO*G L VILELA 04-28', cartao: 'Itau Black', cat: 'Hobby', origem: 'PF', valor: 293.98, parcela_atual: 3, parcela_total: 10, valor_parcela: 293.98, data_termino: '2027-01' },
      { data: '2026-04-29', desc: 'PATRICIA QUEIROZ', cartao: 'Itau Black', cat: 'Diversos', origem: 'PF', valor: 434.95, parcela_atual: 3, parcela_total: 6, valor_parcela: 434.95, data_termino: '2026-10' },
      { data: '2026-05-09', desc: 'ZP*BAESS - BEACH', cartao: 'Itau Black', cat: 'Hobby', origem: 'PF', valor: 324.80, parcela_atual: 3, parcela_total: 5, valor_parcela: 324.80, data_termino: '2026-10' },
      { data: '2026-05-24', desc: 'DANKI FRQ IGUATEMI', cartao: 'Itau Black', cat: 'Vestuário', origem: 'PF', valor: 259.80, parcela_atual: 3, parcela_total: 5, valor_parcela: 259.80, data_termino: '2026-10' },
      { data: '2026-05-25', desc: 'JIM.COM* ARX CONCE', cartao: 'Itau Black', cat: 'Turismo/Entretenimento', origem: 'PF', valor: 159.90, parcela_atual: 3, parcela_total: 6, valor_parcela: 159.90, data_termino: '2026-10' },
      { data: '2026-05-26', desc: 'CasaCaiada', cartao: 'Itau Black', cat: 'Vestuário', origem: 'PF', valor: 83.58, parcela_atual: 3, parcela_total: 5, valor_parcela: 83.58, data_termino: '2026-10' },
      { data: '2026-05-29', desc: 'TRACKFIELD', cartao: 'Itau Black', cat: 'Vestuário', origem: 'PF', valor: 189.95, parcela_atual: 2, parcela_total: 2, valor_parcela: 189.95, data_termino: '2026-08' },
      { data: '2026-06-11', desc: 'VIVARA RPT', cartao: 'Itau Black', cat: 'Hobby', origem: 'PF', valor: 1246.68, parcela_atual: 2, parcela_total: 3, valor_parcela: 1246.68, data_termino: '2026-09' },
      { data: '2026-06-11', desc: 'GLVilelaDe', cartao: 'Itau Black', cat: 'Hobby', origem: 'PF', valor: 229.50, parcela_atual: 2, parcela_total: 2, valor_parcela: 229.50, data_termino: '2026-08' },
      { data: '2026-06-11', desc: 'VIVARA RPT estorno', cartao: 'Itau Black', cat: 'Hobby', origem: 'PF', valor: -0.04, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-06-12', desc: 'PAYGO*G L VILELA 06-12', cartao: 'Itau Black', cat: 'Hobby', origem: 'PF', valor: 202.97, parcela_atual: 2, parcela_total: 10, valor_parcela: 202.97, data_termino: '2027-03' },
      { data: '2026-06-13', desc: 'JIM.COM* 64257026', cartao: 'Itau Black', cat: 'Diversos', origem: 'PF', valor: 285.40, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-06-14', desc: 'HAVAN S J RIO PRETO', cartao: 'Itau Black', cat: 'Vestuário', origem: 'PF', valor: 114.98, parcela_atual: 2, parcela_total: 4, valor_parcela: 114.98, data_termino: '2026-10' },
      { data: '2026-06-14', desc: 'HAVAN estorno', cartao: 'Itau Black', cat: 'Vestuário', origem: 'PF', valor: -0.06, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-06-16', desc: 'JIM.COM* INSTITUTO', cartao: 'Itau Black', cat: 'Saúde', origem: 'PF', valor: 833.37, parcela_atual: 2, parcela_total: 12, valor_parcela: 833.37, data_termino: '2027-06' },
      { data: '2026-06-16', desc: 'JIM.COM* INSTITUTO estorno', cartao: 'Itau Black', cat: 'Saúde', origem: 'PF', valor: -0.44, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-06-27', desc: 'MP *BENI', cartao: 'Itau Black', cat: 'Alimentação', origem: 'PF', valor: 22.99, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-06-28', desc: 'DM*Mailchimp', cartao: 'Itau Black', cat: 'Assinaturas', origem: 'PF', valor: 42.50, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-06-28', desc: 'RAIA 3307', cartao: 'Itau Black', cat: 'Saúde', origem: 'PF', valor: 336.40, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-06-28', desc: 'PRATIC LOJA DE CONVENI', cartao: 'Itau Black', cat: 'Alimentação', origem: 'PF', valor: 46.49, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-06-29', desc: 'PostoVillageMall', cartao: 'Itau Black', cat: 'Veículos', origem: 'PF', valor: 271.80, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-06-29', desc: 'PRATIC LOJA DE CONVENI 06-29', cartao: 'Itau Black', cat: 'Alimentação', origem: 'PF', valor: 25.01, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-06-30', desc: 'PROPARK', cartao: 'Itau Black', cat: 'Veículos', origem: 'PF', valor: 12.00, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-06-30', desc: 'VILLANOVA', cartao: 'Itau Black', cat: 'Alimentação', origem: 'PF', valor: 53.90, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-01', desc: 'COMPLEXO FUNFARME', cartao: 'Itau Black', cat: 'Saúde', origem: 'PF', valor: 15.00, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-01', desc: 'ZOOM.COM', cartao: 'Itau Black', cat: 'Assinaturas', origem: 'PF', valor: 124.20, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-02', desc: 'ANDREA S FOOD COMERCIO', cartao: 'Itau Black', cat: 'Alimentação', origem: 'PF', valor: 53.00, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-02', desc: 'SJRP DAHMA 07-02', cartao: 'Itau Black', cat: 'Alimentação', origem: 'PF', valor: 161.16, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-02', desc: 'VICTOR HUGO LAZARO SIM', cartao: 'Itau Black', cat: 'Alimentação', origem: 'PF', valor: 90.70, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-03', desc: 'Container', cartao: 'Itau Black', cat: 'Alimentação', origem: 'PF', valor: 209.33, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-03', desc: 'VILLANOVA 07-03', cartao: 'Itau Black', cat: 'Alimentação', origem: 'PF', valor: 100.10, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-05', desc: 'ASA*NA PRAIA RIO PRETO', cartao: 'Itau Black', cat: 'Hobby', origem: 'PF', valor: 229.00, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-05', desc: 'HBL*HBLMILAGREDIG', cartao: 'Itau Black', cat: 'Produtos e Serviços', origem: 'PF', valor: 2000.00, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-07', desc: 'ANDREAS FOOD COMERCIO', cartao: 'Itau Black', cat: 'Alimentação', origem: 'PF', valor: 71.00, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-08', desc: 'AnaCarolina', cartao: 'Itau Black', cat: 'Diversos', origem: 'PF', valor: 108.00, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-09', desc: 'SPACE HEALTH', cartao: 'Itau Black', cat: 'Saúde', origem: 'PF', valor: 17.00, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-10', desc: 'LGEventosLtda', cartao: 'Itau Black', cat: 'Diversos', origem: 'PF', valor: 128.00, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-14', desc: 'AnaBeatriz', cartao: 'Itau Black', cat: 'Vestuário', origem: 'PF', valor: 11.70, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-14', desc: 'PRATIC LOJA DE CONVENI 07-14', cartao: 'Itau Black', cat: 'Alimentação', origem: 'PF', valor: 14.67, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-15', desc: 'NaPraiaRioPreto 07-15', cartao: 'Itau Black', cat: 'Hobby', origem: 'PF', valor: 81.00, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-17', desc: 'ARENA SUNSET', cartao: 'Itau Black', cat: 'Alimentação', origem: 'PF', valor: 9.00, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-18', desc: 'VMT*LAVATERIA 1', cartao: 'Itau Black', cat: 'Diversos', origem: 'PF', valor: 39.90, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-18', desc: 'VMT*LAVATERIA 2', cartao: 'Itau Black', cat: 'Diversos', origem: 'PF', valor: 19.95, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-18', desc: 'VMT*LAVATERIA 3', cartao: 'Itau Black', cat: 'Diversos', origem: 'PF', valor: 39.90, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-18', desc: 'Villagequimica', cartao: 'Itau Black', cat: 'Diversos', origem: 'PF', valor: 62.70, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-18', desc: 'PRATIC LOJA DE CONVENI 07-18', cartao: 'Itau Black', cat: 'Alimentação', origem: 'PF', valor: 75.88, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-18', desc: 'POSTO MONTE CARLO PARQ', cartao: 'Itau Black', cat: 'Veículos', origem: 'PF', valor: 39.90, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-18', desc: 'NAGOYATO SUSHI LTDA', cartao: 'Itau Black', cat: 'Alimentação', origem: 'PF', valor: 559.90, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-20', desc: 'DOCE MEL', cartao: 'Itau Black', cat: 'Vestuário', origem: 'PF', valor: 51.00, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-20', desc: 'VILLAGE PASTEIS', cartao: 'Itau Black', cat: 'Alimentação', origem: 'PF', valor: 20.00, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-21', desc: 'AUTO BAN 1', cartao: 'Itau Black', cat: 'Veículos', origem: 'PF', valor: 9.70, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-21', desc: 'AUTO BAN 2', cartao: 'Itau Black', cat: 'Veículos', origem: 'PF', valor: 12.80, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-21', desc: 'AUTO BAN 3', cartao: 'Itau Black', cat: 'Veículos', origem: 'PF', valor: 14.50, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-21', desc: 'KRIKOR', cartao: 'Itau Black', cat: 'Diversos', origem: 'PF', valor: 200.00, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-21', desc: 'AutoPosto', cartao: 'Itau Black', cat: 'Veículos', origem: 'PF', valor: 200.80, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-21', desc: 'P4', cartao: 'Itau Black', cat: 'Veículos', origem: 'PF', valor: 11.80, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-21', desc: 'RODOSNACK SÃO CARLOS R', cartao: 'Itau Black', cat: 'Alimentação', origem: 'PF', valor: 28.80, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-21', desc: 'AUTO BAN 4', cartao: 'Itau Black', cat: 'Veículos', origem: 'PF', valor: 14.30, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-21', desc: 'EixoSp', cartao: 'Itau Black', cat: 'Veículos', origem: 'PF', valor: 7.00, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-21', desc: 'NINO ITAIM BUCA', cartao: 'Itau Black', cat: 'Alimentação', origem: 'PF', valor: 212.44, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-21', desc: 'AGULHA 07-21', cartao: 'Itau Black', cat: 'Veículos', origem: 'PF', valor: 13.80, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-21', desc: 'ARARAQUARA 07-21', cartao: 'Itau Black', cat: 'Veículos', origem: 'PF', valor: 22.80, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-21', desc: 'CATIGUA 07-21', cartao: 'Itau Black', cat: 'Veículos', origem: 'PF', valor: 19.80, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-22', desc: 'AUTO BAN 5', cartao: 'Itau Black', cat: 'Veículos', origem: 'PF', valor: 14.50, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-22', desc: 'AUTO BAN 6', cartao: 'Itau Black', cat: 'Veículos', origem: 'PF', valor: 14.30, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-22', desc: 'AUTO BAN 7', cartao: 'Itau Black', cat: 'Veículos', origem: 'PF', valor: 12.80, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-22', desc: 'MP *HELLENRE', cartao: 'Itau Black', cat: 'Alimentação', origem: 'PF', valor: 50.00, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-22', desc: 'AUTO BAN 8', cartao: 'Itau Black', cat: 'Veículos', origem: 'PF', valor: 9.70, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-22', desc: 'EixoSp 1', cartao: 'Itau Black', cat: 'Veículos', origem: 'PF', valor: 11.60, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-22', desc: 'EixoSp 2', cartao: 'Itau Black', cat: 'Veículos', origem: 'PF', valor: 7.00, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-22', desc: 'AUTO POSTO E S V RC', cartao: 'Itau Black', cat: 'Veículos', origem: 'PF', valor: 252.98, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-22', desc: 'AGULHA 07-22', cartao: 'Itau Black', cat: 'Veículos', origem: 'PF', valor: 13.80, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-22', desc: 'ARARAQUARA 07-22', cartao: 'Itau Black', cat: 'Veículos', origem: 'PF', valor: 22.80, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-22', desc: 'CATIGUA 07-22', cartao: 'Itau Black', cat: 'Veículos', origem: 'PF', valor: 19.80, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-25', desc: 'TLY PRODUTOS FARMA', cartao: 'Itau Black', cat: 'Saúde', origem: 'PF', valor: 280.96, parcela_atual: 1, parcela_total: 2, valor_parcela: 280.96, data_termino: '2026-08' },
      { data: '2026-07-25', desc: 'PRATIC LOJA DE CONVENI 07-25', cartao: 'Itau Black', cat: 'Alimentação', origem: 'PF', valor: 30.49, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-25', desc: 'KEBABA', cartao: 'Itau Black', cat: 'Alimentação', origem: 'PF', valor: 107.90, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-25', desc: 'ASAEL', cartao: 'Itau Black', cat: 'Veículos', origem: 'PF', valor: 8.00, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-25', desc: 'JAPA BEACH TENI 1', cartao: 'Itau Black', cat: 'Hobby', origem: 'PF', valor: 13.99, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-25', desc: 'JAPA BEACH TENI 2', cartao: 'Itau Black', cat: 'Hobby', origem: 'PF', valor: 21.99, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-25', desc: 'LOVABLE', cartao: 'Itau Black', cat: 'Assinaturas', origem: 'PF', valor: 137.90, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-26', desc: 'SJRP DAHMA 07-26', cartao: 'Itau Black', cat: 'Alimentação', origem: 'PF', valor: 177.16, parcela_atual: 1, parcela_total: 2, valor_parcela: 177.16, data_termino: '2026-08' },
      { data: '2026-07-26', desc: 'PRATIC LOJA DE CONVENI 07-26', cartao: 'Itau Black', cat: 'Alimentação', origem: 'PF', valor: 66.00, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-27', desc: 'NaPraiaRioPreto 07-27', cartao: 'Itau Black', cat: 'Hobby', origem: 'PF', valor: 57.00, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-02-24', desc: 'EBN*Canva04802', cartao: 'Itau Black', cat: 'Assinaturas', origem: 'PF', valor: 24.24, parcela_atual: 6, parcela_total: 12, valor_parcela: 24.24, data_termino: '2026-08' },
      { data: '2026-04-28', desc: 'CASASBAHIACOM', cartao: 'Itau Black', cat: 'Vestuário', origem: 'PF', valor: 243.54, parcela_atual: 3, parcela_total: 8, valor_parcela: 243.54, data_termino: '2026-11' },
      { data: '2026-06-04', desc: 'NUV*LOJAVESTECRIS', cartao: 'Itau Black', cat: 'Vestuário', origem: 'PF', valor: 79.02, parcela_atual: 2, parcela_total: 5, valor_parcela: 79.02, data_termino: '2026-10' },
      { data: '2026-06-04', desc: 'NUV*LOJAVESTECRIS estorno', cartao: 'Itau Black', cat: 'Vestuário', origem: 'PF', valor: -0.12, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-06-06', desc: 'EC *EMMAS', cartao: 'Itau Black', cat: 'Vestuário', origem: 'PF', valor: 310.58, parcela_atual: 2, parcela_total: 12, valor_parcela: 310.58, data_termino: '2027-05' },
      { data: '2026-06-06', desc: 'EC *EMMASLEEP estorno', cartao: 'Itau Black', cat: 'Vestuário', origem: 'PF', valor: -0.33, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-02', desc: 'FACEBK *FPJZ3W5XL2 - Facebook Ads', cartao: 'Itau Black', cat: 'Marketing PJ', origem: 'PJ', valor: 1127.84, parcela_atual: 1, parcela_total: 1, valor_parcela: 1127.84, data_termino: '2026-08' },
      { data: '2026-07-03', desc: 'HUBLA *XFLOW - Hubla', cartao: 'Itau Black', cat: 'Marketing PJ', origem: 'PJ', valor: 3761.57, parcela_atual: 1, parcela_total: 1, valor_parcela: 3761.57, data_termino: '2026-08' },
      { data: '2026-07-06', desc: 'NETFLIX.COM', cartao: 'Itau Black', cat: 'Assinaturas', origem: 'PF', valor: 44.90, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-13', desc: 'FACEBK *UREV7X5XL2 - Facebook Ads', cartao: 'Itau Black', cat: 'Marketing PJ', origem: 'PJ', valor: 358.43, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-17', desc: 'UNICA FARMACIA DE', cartao: 'Itau Black', cat: 'Saúde', origem: 'PF', valor: 425.68, parcela_atual: 1, parcela_total: 3, valor_parcela: 425.68, data_termino: '2026-09' },
      { data: '2026-07-26', desc: 'FACEBK *V6ZBDY9WL2 - Facebook Ads', cartao: 'Itau Black', cat: 'Marketing PJ', origem: 'PJ', valor: 1144.50, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-28', desc: 'HUBLA *ACACADEMY - Hubla', cartao: 'Itau Black', cat: 'Marketing PJ', origem: 'PJ', valor: 297.00, parcela_atual: 1, parcela_total: 1, valor_parcela: 297.00, data_termino: '2026-08' },
      // Itau Latam
      { data: '2025-08-25', desc: 'HTM*Sobral Ens', cartao: 'Itau latam', cat: 'Educação', origem: 'PF', valor: 249.21, parcela_atual: 12, parcela_total: 12, valor_parcela: 249.21, data_termino: '2026-08-01' },
      { data: '2025-09-03', desc: 'ASAAS*REPORTEI', cartao: 'Itau latam', cat: 'Assinaturas', origem: 'PF', valor: 82.45, parcela_atual: 11, parcela_total: 12, valor_parcela: 82.45, data_termino: '2026-09-01' },
      { data: '2026-03-24', desc: 'RAYBAN BRASILS', cartao: 'Itau latam', cat: 'Vestuário', origem: 'PF', valor: 99.00, parcela_atual: 5, parcela_total: 10, valor_parcela: 99.00, data_termino: '2026-12-01' },
      { data: '2026-04-02', desc: 'TmOdontologiaS', cartao: 'Itau latam', cat: 'Saúde', origem: 'PF', valor: 1000.00, parcela_atual: 4, parcela_total: 4, valor_parcela: 1000.00, data_termino: '2026-08-01' },
      { data: '2026-04-08', desc: 'PLANALTO MATER', cartao: 'Itau latam', cat: 'Outros', origem: 'PF', valor: 636.40, parcela_atual: 4, parcela_total: 4, valor_parcela: 636.40, data_termino: '2026-08-01' },
      { data: '2026-04-14', desc: 'LEROY MERLINSA', cartao: 'Itau latam', cat: 'Outros', origem: 'PF', valor: 279.86, parcela_atual: 4, parcela_total: 8, valor_parcela: 279.86, data_termino: '2026-11-01' },
      { data: '2026-06-09', desc: 'MOVIDA RAC SJA', cartao: 'Itau latam', cat: 'Transporte', origem: 'PF', valor: 181.94, parcela_atual: 2, parcela_total: 3, valor_parcela: 181.94, data_termino: '2026-09-01' },
      { data: '2026-07-04', desc: 'Mensalidade Plano Anuidade', cartao: 'Itau latam', cat: 'Serviços', origem: 'PF', valor: 105.00, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-09', desc: 'STRACTCURITIBABRA', cartao: 'Itau latam', cat: 'Serviços', origem: 'PF', valor: 149.00, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-11', desc: 'OBA HORTIFRUTI', cartao: 'Itau latam', cat: 'Alimentação', origem: 'PF', valor: 267.68, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-11', desc: 'SJRP DAHMA', cartao: 'Itau latam', cat: 'Alimentação', origem: 'PF', valor: 251.31, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-11', desc: 'PostoVillageMall', cartao: 'Itau latam', cat: 'Transporte', origem: 'PF', valor: 290.06, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-12', desc: 'JoaoGabriel Supermercado', cartao: 'Itau latam', cat: 'Alimentação', origem: 'PF', valor: 246.40, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-13', desc: 'FACEBK* R26U6WZ8W2 - Facebook Ads', cartao: 'Itau latam', cat: 'Marketing PJ', origem: 'PJ', valor: 73.19, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-15', desc: 'Hotel at Booking.com', cartao: 'Itau latam', cat: 'Viagem', origem: 'PF', valor: 1140.22, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-15', desc: 'CANCELAMENTO Booking.com', cartao: 'Itau latam', cat: 'Viagem', origem: 'PF', valor: -1140.22, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-18', desc: 'ANDREAS FOOD COMERCIO', cartao: 'Itau latam', cat: 'Alimentação', origem: 'PF', valor: 74.00, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-21', desc: 'Google One', cartao: 'Itau latam', cat: 'Assinaturas', origem: 'PF', valor: 9.99, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-27', desc: 'HTM*Escalytics LTDA 1', cartao: 'Itau latam', cat: 'Educação', origem: 'PF', valor: 297.00, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-27', desc: 'HTM*Escalytics LTDA 2', cartao: 'Itau latam', cat: 'Educação', origem: 'PF', valor: 147.00, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-28', desc: 'APPLE.COM/BILL', cartao: 'Itau latam', cat: 'Assinaturas', origem: 'PF', valor: 66.90, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-28', desc: 'HTM *TrafegoComIA', cartao: 'Itau latam', cat: 'Educação', origem: 'PF', valor: 297.00, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-07-29', desc: 'LATAM AIR*LZRA', cartao: 'Itau latam', cat: 'Viagem', origem: 'PF', valor: 214.77, parcela_atual: 1, parcela_total: 10, valor_parcela: 214.77, data_termino: '2027-04-01' },
      { data: '2026-07-31', desc: 'EBN*SPOTIFYCURITIBA', cartao: 'Itau latam', cat: 'Assinaturas', origem: 'PF', valor: 23.90, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      { data: '2026-08-01', desc: 'Google Workspace Velar', cartao: 'Itau latam', cat: 'Assinaturas', origem: 'PF', valor: 163.60, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
    ],
    'metas': [
      { meta: 'Reserva de emergência', cat: 'Reserva', alvo: 0, real: 0 },
      { meta: 'Investimentos do mês', cat: 'Investimento', alvo: 0, real: 0 },
      { meta: 'Faturamento PJ', cat: 'Faturamento', alvo: 0, real: 0 },
    ],
    'reserva': [
      { desc: 'Reserva de emergência', tipo: 'CDB liquidez diária', saldo: 0, aporte: 0 },
      { desc: 'Investimentos LP', tipo: 'Tesouro/CDI', saldo: 0, aporte: 0 },
    ],
    'investimentos': [
      { id: '1',  nome: 'BTG Pactual CDB Plus FIRF CrPr RL',          tipo: 'Renda Fixa',           moeda: 'BRL', saldo: 41909.92, anotacao: 'CDI · D+0 · rent. 0,85%/mês' },
      { id: '2',  nome: 'More MCA II FICFIDC RL',                      tipo: 'Fundo de Investimento', moeda: 'BRL', saldo: 54680.92, anotacao: 'Renda Fixa · D+61 · rent. 0,84%/mês' },
      { id: '3',  nome: 'M8 Capital Plus FIRF LP CrPr RL',             tipo: 'Fundo de Investimento', moeda: 'BRL', saldo: 38658.55, anotacao: 'Renda Fixa · D+32 · rent. 0,79%/mês' },
      { id: '4',  nome: 'BTG Pactual CDB Liquidez Diária',             tipo: 'Renda Fixa',           moeda: 'BRL', saldo: 3323.26,  anotacao: 'CDB · CDI · venc. 19/07/2027' },
      { id: '5',  nome: 'C6 CDB 15,80% a.a.',                          tipo: 'Renda Fixa',           moeda: 'BRL', saldo: 1218.27,  anotacao: 'CDB · 15,80% a.a. · venc. 13/11/2026' },
      { id: '6',  nome: 'C6 CDB 14,25% a.a.',                          tipo: 'Renda Fixa',           moeda: 'BRL', saldo: 10381.94, anotacao: 'CDB · 14,25% a.a. · venc. 14/04/2031' },
      { id: '7',  nome: 'Banco Digimais CDB 112% CDI',                 tipo: 'Renda Fixa',           moeda: 'BRL', saldo: 5754.67,  anotacao: 'CDB · 112% CDI · venc. 17/07/2030' },
      { id: '8',  nome: 'Banco Digimais CDB 114% CDI',                 tipo: 'Renda Fixa',           moeda: 'BRL', saldo: 5769.33,  anotacao: 'CDB · 114% CDI · venc. 17/07/2031' },
      { id: '9',  nome: 'Banco Original LCA 92,5% CDI',                tipo: 'Renda Fixa',           moeda: 'BRL', saldo: 2196.48,  anotacao: 'LCA · 92,5% CDI · venc. 19/03/2027' },
      { id: '10', nome: 'BTG Pactual LCA 92% CDI',                     tipo: 'Renda Fixa',           moeda: 'BRL', saldo: 1104.99,  anotacao: 'LCA · 92% CDI · venc. 30/08/2027' },
      { id: '11', nome: 'Ouribank CDB 106,2% CDI',                     tipo: 'Renda Fixa',           moeda: 'BRL', saldo: 1119.68,  anotacao: 'CDB · 106,2% CDI · venc. 06/09/2027' },
      { id: '12', nome: 'ARZ CONFIDAS D PF FIM',                       tipo: 'Fundo de Investimento', moeda: 'BRL', saldo: 10139.57, anotacao: 'Multimercados · rent. 0,94%/mês' },
      { id: '13', nome: 'Bitcoin (BTC)',                                tipo: 'Cripto',               moeda: 'BRL', saldo: 7255.24,  anotacao: '0,01824219 BTC · investido R$7.940,50 · rent. -R$685,26' },
      { id: '14', nome: 'JPMorgan Chase (JPM)',                        tipo: 'Internacional',         moeda: 'USD', saldo: 117.87,   anotacao: 'Ação · investido US$101,00 · +16,70%' },
      { id: '15', nome: 'Microsoft (MSFT)',                            tipo: 'Internacional',         moeda: 'USD', saldo: 94.51,    anotacao: 'Ação · investido US$101,00 · -6,43%' },
      { id: '16', nome: 'NVIDIA (NVDA)',                               tipo: 'Internacional',         moeda: 'USD', saldo: 124.63,   anotacao: 'Ação · investido US$101,00 · +23,40%' },
      { id: '17', nome: 'JPMorgan USD Emerg Markets (EMB)',            tipo: 'Internacional',         moeda: 'USD', saldo: 1864.81,  anotacao: 'ETF · investido US$1.912,00 · -2,47%' },
      { id: '18', nome: 'Russell 2000 iShares ETF (IWM)',              tipo: 'Internacional',         moeda: 'USD', saldo: 3623.78,  anotacao: 'ETF · investido US$3.210,00 · +12,89%' },
      { id: '19', nome: 'SPDR Portfolio Long Term Treasury (SPTL)',    tipo: 'Internacional',         moeda: 'USD', saldo: 2036.01,  anotacao: 'ETF · investido US$2.094,50 · -2,79%' },
      { id: '20', nome: 'SPDR S&P 500 ETF (SPY)',                      tipo: 'Internacional',         moeda: 'USD', saldo: 2443.70,  anotacao: 'ETF · investido US$2.275,00 · +7,42%' },
      { id: '21', nome: 'S&P 500 Vanguard ETF (VOO)',                  tipo: 'Internacional',         moeda: 'USD', saldo: 120.58,   anotacao: 'ETF · investido US$101,00 · +19,39%' },
      { id: '22', nome: 'Vanguard Total World Stock (VT)',             tipo: 'Internacional',         moeda: 'USD', saldo: 1505.84,  anotacao: 'ETF · investido US$1.407,50 · +6,99%' },
      { id: '23', nome: 'FTGF Western Asset US Gov. Liquidity',        tipo: 'Internacional',         moeda: 'USD', saldo: 920.48,   anotacao: 'Money Market · investido US$917,22 · +0,36%' },
      { id: '24', nome: 'Invesco US Dollar Liquidity Portfolio',       tipo: 'Internacional',         moeda: 'USD', saldo: 6107.18,  anotacao: 'Money Market · investido US$6.021,78 · +1,42%' },
    ],
    notes: ''
  };
}

function getInitialMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function fmtBR(n: number) {
  if (typeof n !== 'number' || isNaN(n)) n = 0;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
}
function fmtPct(n: number) { return (Math.round(n * 10) / 10).toFixed(1) + '%'; }


export default function FinanceiroPage() {
  const [currentMonth, setCurrentMonth] = useState(getInitialMonth());
  const [db, setDb] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('Carregando...');
  const [activeTab, setActiveTab] = useState('resumo');
  const [searchRec, setSearchRec] = useState('');
  const [addFormCard, setAddFormCard] = useState<string | null>(null);
  const [addFormDraft, setAddFormDraft] = useState({ data: '', desc: '', cat: CATS_CARD[0], origem: 'PF', valor: '', parcelado: false, parcela_atual: 1, parcela_total: 2, valor_parcela: '', data_termino: '' });
  const [eurRate, setEurRate] = useState(6.0);
  const [eurRateStatus, setEurRateStatus] = useState<'loading'|'ok'|'offline'>('loading');
  const [usdRate, setUsdRate] = useState(5.5);
  const [usdRateStatus, setUsdRateStatus] = useState<'loading'|'ok'|'offline'>('loading');
  const saveTimerRef = useRef<any>(null);

  // COTAÇÃO USD/BRL (média 30 dias)
  useEffect(() => {
    fetch('https://economia.awesomeapi.com.br/json/daily/USD-BRL/30')
      .then(r => r.json())
      .then((data: any[]) => {
        if (!Array.isArray(data) || !data.length) throw new Error('no data');
        const avg = data.reduce((s: number, d: any) => s + parseFloat(d.bid || '0'), 0) / data.length;
        setUsdRate(avg);
        setUsdRateStatus('ok');
      })
      .catch(() => setUsdRateStatus('offline'));
  }, []);

  // COTAÇÃO EUR/BRL (média 30 dias)
  useEffect(() => {
    fetch('https://economia.awesomeapi.com.br/json/daily/EUR-BRL/30')
      .then(r => r.json())
      .then((data: any[]) => {
        if (!Array.isArray(data) || !data.length) throw new Error('no data');
        const avg = data.reduce((s: number, d: any) => s + parseFloat(d.bid || '0'), 0) / data.length;
        setEurRate(avg);
        setEurRateStatus('ok');
      })
      .catch(() => setEurRateStatus('offline'));
  }, []);

  // CARREGAR dados do Supabase
  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch('/api/financeiro');
      const json = await res.json();
      if (json.error) {
        console.error(json.error);
        setSaveStatus('Erro ao carregar');
      } else {
        const newDb: Record<string, any> = {};
        (json.data || []).forEach((row: any) => {
          newDb[row.month_key] = row.data;
        });
        setDb(newDb);
        setSaveStatus('Carregado da nuvem ✓');
      }
      setLoading(false);
    })();
  }, []);

  // MIGRAÇÃO: popula card-tx seedado se estiver vazio ou faltando transações de algum cartão
  useEffect(() => {
    if (loading) return;
    const saved = db[currentMonth];
    if (!saved) return; // mês não existe no Supabase — makeEmptyMonth já cobre
    const nrm = (s: string) => s?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const allSeed = makeEmptyMonth()['card-tx'] as any[];
    let current: any[] = Array.isArray(saved['card-tx']) ? saved['card-tx'] : [];
    let changed = false;
    if (current.length === 0) {
      current = allSeed;
      changed = true;
    } else {
      // Acrescenta seed de cada cartão ausente no array existente
      const seedCards = Array.from(new Set(allSeed.map((tx: any) => nrm(tx.cartao))));
      seedCards.forEach(cardNrm => {
        const hasCard = current.some((tx: any) => nrm(tx.cartao) === cardNrm);
        if (!hasCard) {
          current = [...current, ...allSeed.filter((tx: any) => nrm(tx.cartao) === cardNrm)];
          changed = true;
        }
      });
    }
    // Investimentos: substitui seed se vazio ou com dado placeholder
    let invs: any[] = Array.isArray(saved['investimentos']) ? saved['investimentos'] : [];
    const invNeedsReset = !invs.length || (invs.length === 1 && (!invs[0].nome || invs[0].nome === '' || invs[0].nome === 'Nome'));
    if (invNeedsReset) {
      invs = makeEmptyMonth()['investimentos'] as any[];
      changed = true;
    }
    // Metas: popula seed se array vazio
    const METAS_SEED = [
      { id: '1', nome: 'Patrimônio Total R$ 500k',      valor_alvo: 500000, valor_atual: 426000, prazo: '2027-12-31', anotacao: 'Meta principal de patrimônio consolidado' },
      { id: '2', nome: 'Reserva Internacional US$ 25k', valor_alvo: 25000,  valor_atual: 19218,  prazo: '2026-12-31', anotacao: 'Carteira internacional BTG' },
      { id: '3', nome: 'Renda Passiva R$ 5.000/mês',    valor_alvo: 5000,   valor_atual: 3600,   prazo: '2027-06-30', anotacao: 'Renda mensal estimada dos investimentos' },
    ];
    let metas: any[] = Array.isArray(saved['metas']) ? saved['metas'] : [];
    if (metas.length === 0) {
      metas = METAS_SEED;
      changed = true;
    }
    if (changed) {
      const migrated = { ...saved, 'card-tx': current, 'investimentos': invs, 'metas': metas };
      setDb(prev => ({ ...prev, [currentMonth]: migrated }));
      fetch('/api/financeiro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month_key: currentMonth, data: migrated }),
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, currentMonth]);

  // SALVAR no Supabase (debounced)
  const saveMonth = useCallback(async (monthKey: string, monthData: any) => {
    setSaveStatus('Salvando...');
    const res = await fetch('/api/financeiro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month_key: monthKey, data: monthData }),
    });
    const json = await res.json();
    if (json.error) {
      console.error(json.error);
      setSaveStatus('Erro ao salvar');
    } else {
      setSaveStatus('Salvo na nuvem ✓');
      setTimeout(() => setSaveStatus('Sincronizado'), 2000);
    }
  }, []);

  const updateMonth = useCallback((updater: (m: any) => any) => {
    setDb(prev => {
      const current = prev[currentMonth] || makeEmptyMonth();
      const updated = updater(JSON.parse(JSON.stringify(current)));
      const newDb = { ...prev, [currentMonth]: updated };
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => saveMonth(currentMonth, updated), 600);
      return newDb;
    });
  }, [currentMonth, saveMonth]);

  const copyPreviousMonth = () => {
    const [y, mo] = currentMonth.split('-').map(Number);
    const prevDate = new Date(y, mo - 2, 1);
    const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    const prevData = db[prevKey];
    if (!prevData) {
      alert('Nenhum dado encontrado no mês anterior para copiar.');
      return;
    }
    if (!confirm(`Copiar dados de \${MESES_NOMES[prevDate.getMonth()]} / \${prevDate.getFullYear()} para o mês atual? Isso substituirá os dados atuais.`)) return;
    const copied = JSON.parse(JSON.stringify(prevData));
    // Reseta campos de status (recebido/pago) para o novo mês
    (copied['rec-pj'] || []).forEach((r: any) => { r.recebido = false; });
    (copied['rec-pf'] || []).forEach((r: any) => { r.recebido = false; });
    (copied['cust-pj'] || []).forEach((r: any) => { r.pago = false; });
    (copied['cust-pf'] || []).forEach((r: any) => { r.pago = false; });
    copied.notes = '';
    setDb(prev => {
      const newDb = { ...prev, [currentMonth]: copied };
      saveMonth(currentMonth, copied);
      return newDb;
    });
  };



  const _saved = db[currentMonth];
  const m = _saved ? { ...makeEmptyMonth(), ..._saved } : makeEmptyMonth();

  // ===== CÁLCULOS =====
  const sumValor = (arr: any[]) => (arr || []).reduce((s, r) => s + (parseFloat(r.valor) || 0), 0);
  const toBRL = (r: any) => (parseFloat(r.valor) || 0) * (r.moeda === 'EUR' ? eurRate : 1);
  const recPJ = (m['rec-pj'] || []).reduce((s: number, r: any) => s + toBRL(r), 0);
  const recPF = sumValor(m['rec-pf']);
  const custPJ = sumValor(m['cust-pj']) + sumValor(m['var-pj']);
  const custPF = sumValor(m['cust-pf']) + sumValor(m['var-pf']);
  const cardsFatura = (m['cards'] || []).reduce((s: number, r: any) => s + (parseFloat(r.fatura) || 0), 0);
  const recPJReceived = (m['rec-pj'] || []).reduce((s: number, r: any) => s + (r.recebido ? toBRL(r) : 0), 0);
  const recTotal = recPJ + recPF;
  const custTotal = custPJ + custPF;
  const resultado = recTotal - custTotal;
  const margem = recTotal > 0 ? (resultado / recTotal) * 100 : 0;

  // ===== HELPERS =====
  const updRow = (key: string, idx: number, field: string, value: any) => {
    updateMonth(month => {
      if (!month[key]) month[key] = [];
      month[key][idx][field] = value;
      return month;
    });
  };
  const delRow = (key: string, idx: number) => {
    if (!confirm('Remover este item?')) return;
    updateMonth(month => {
      month[key] = month[key].filter((_: any, i: number) => i !== idx);
      return month;
    });
  };
  const addRow = (key: string) => {
    const templates: any = {
      'rec-pj': { cliente: '', squad: 'Lançamentos', tipo: 'Recorrente', status: 'Ativo', dia: '', valor: 0, recebido: false, moeda: 'BRL' },
      'cust-pj': { desc: '', cat: 'Ferramentas', venc: '', valor: 0, pago: false },
      'var-pj': { desc: '', cliente: '', data: '', valor: 0 },
      'rec-pf': { origem: '', tipo: 'Salário', data: '', valor: 0, recebido: false },
      'cust-pf': { desc: '', cat: 'Moradia', categoria: '🏠 Moradia', venc: '', valor: 0, pago: false },
      'var-pf': { desc: '', cat: 'Lazer', data: '', valor: 0 },
      'cards': { nome: '', bandeira: 'Mastercard', titular: 'PF', limite: 0, fatura: 0, venc: '' },
      'card-tx': { data: '', desc: '', cartao: '', cat: CATS_CARD[0], origem: 'PF', valor: 0, parcela_atual: null, parcela_total: null, valor_parcela: null, data_termino: null },
      'metas': { meta: '', cat: 'Faturamento', alvo: 0, real: 0 },
      'reserva': { desc: '', tipo: '', saldo: 0, aporte: 0 },
      'investimentos': { nome: '', tipo: 'Renda Fixa', moeda: 'BRL', saldo: 0, anotacao: '' },
    };
    updateMonth(month => {
      if (!month[key]) month[key] = [];
      month[key].push({ ...templates[key] });
      return month;
    });
  };

  const monthOptions = (() => {
    const d = new Date();
    const arr = [];
    for (let i = -6; i <= 12; i++) {
      const dt = new Date(d.getFullYear(), d.getMonth() + i, 1);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      arr.push({ key, label: `${MESES_NOMES[dt.getMonth()]} / ${dt.getFullYear()}` });
    }
    return arr;
  })();

  const [yy, mm] = currentMonth.split('-');
  const currentMonthLabel = `${MESES_NOMES[+mm - 1]} / ${yy}`;
  const mesRef = new Date(+yy, +mm - 1, 1);

  if (loading) {
    return <div style={{ minHeight: '100vh', background: '#0a0a0d', color: '#e9e9f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>Carregando APR Financeiro...</div>;
  }

  return (
    <div className="apr-fin">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,600;9..144,700&family=JetBrains+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap');
        .apr-fin {
          --bg-0:#0a0a0d; --bg-1:#101015; --bg-2:#161620; --bg-3:#1d1d2a;
          --line:#2a2a3a; --line-soft:#1e1e2b; --text:#e9e9f2; --text-soft:#9b9bb0; --text-dim:#6a6a80;
          --accent:#c8ff5a; --accent-2:#7afcb8; --warn:#ffb454; --danger:#ff6b8a; --info:#7cb7ff;
          --r-sm:8px; --r-md:12px; --r-lg:18px;
          font-family:'Inter',sans-serif; background:var(--bg-0); color:var(--text); min-height:100vh;
          line-height:1.5;
          background-image:radial-gradient(circle at 15% 10%, rgba(200,255,90,.04), transparent 40%), radial-gradient(circle at 85% 90%, rgba(122,252,184,.03), transparent 50%);
        }
        .apr-fin *{box-sizing:border-box}
        .apr-fin header{padding:28px 40px 20px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;background:rgba(10,10,13,.85);backdrop-filter:blur(12px);position:sticky;top:0;z-index:100}
        .apr-fin .brand{display:flex;align-items:center;gap:14px}
        .apr-fin .brand-mark{width:42px;height:42px;border-radius:10px;background:linear-gradient(135deg,var(--accent) 0%,var(--accent-2) 100%);display:flex;align-items:center;justify-content:center;color:#0a0a0d;font-weight:700;font-size:18px;font-family:'Fraunces',serif;box-shadow:0 0 30px rgba(200,255,90,.25)}
        .apr-fin .brand-text h1{font-family:'Fraunces',serif;font-weight:600;font-size:22px;letter-spacing:-.02em;margin:0}
        .apr-fin .brand-text .sub{font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.15em;font-family:'JetBrains Mono',monospace}
        .apr-fin .month-picker{display:flex;align-items:center;gap:8px;background:var(--bg-2);border:1px solid var(--line);border-radius:var(--r-sm);padding:8px 12px;font-family:'JetBrains Mono',monospace;font-size:13px}
        .apr-fin .month-picker select{background:transparent;border:none;color:var(--text);font-family:inherit;font-size:13px;cursor:pointer;outline:none}
        .apr-fin .month-picker select option{background:var(--bg-2)}
        .apr-fin .btn{padding:9px 16px;border-radius:var(--r-sm);font-size:13px;font-weight:500;border:1px solid var(--line);background:var(--bg-2);color:var(--text);cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:6px}
        .apr-fin .btn:hover{background:var(--bg-3);border-color:var(--text-dim)}
        .apr-fin .btn-primary{background:var(--accent);color:#0a0a0d;border-color:var(--accent);font-weight:600}
        .apr-fin .tabs{display:flex;gap:4px;padding:0 40px;border-bottom:1px solid var(--line);background:var(--bg-1);overflow-x:auto}
        .apr-fin .tab{padding:14px 18px;background:transparent;border:none;color:var(--text-soft);font-family:inherit;font-size:13px;font-weight:500;cursor:pointer;border-bottom:2px solid transparent;white-space:nowrap;display:flex;align-items:center;gap:8px}
        .apr-fin .tab:hover{color:var(--text)}
        .apr-fin .tab.active{color:var(--accent);border-bottom-color:var(--accent)}
        .apr-fin .tab-dot{width:6px;height:6px;border-radius:50%;background:currentColor;opacity:.6}
        .apr-fin main{padding:32px 40px 80px;max-width:1600px;margin:0 auto}
        .apr-fin .section-title{font-family:'Fraunces',serif;font-size:28px;font-weight:600;letter-spacing:-.02em;margin:0 0 6px}
        .apr-fin .section-sub{color:var(--text-dim);font-size:14px;margin-bottom:28px}
        .apr-fin .kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-bottom:32px}
        .apr-fin .kpi{background:var(--bg-1);border:1px solid var(--line);border-radius:var(--r-md);padding:20px;position:relative;overflow:hidden}
        .apr-fin .kpi::before{content:'';position:absolute;top:0;left:0;width:3px;height:100%;background:var(--accent);opacity:.7}
        .apr-fin .kpi.pf::before{background:var(--accent-2)}
        .apr-fin .kpi.warn::before{background:var(--warn)}
        .apr-fin .kpi.danger::before{background:var(--danger)}
        .apr-fin .kpi-label{font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:var(--text-dim);font-weight:500;margin-bottom:8px;font-family:'JetBrains Mono',monospace}
        .apr-fin .kpi-value{font-family:'Fraunces',serif;font-size:30px;font-weight:600;letter-spacing:-.02em;line-height:1.1}
        .apr-fin .kpi-value.neg{color:var(--danger)}
        .apr-fin .kpi-value.pos{color:var(--accent)}
        .apr-fin .kpi-meta{font-size:12px;color:var(--text-dim);margin-top:8px}
        .apr-fin .block{background:var(--bg-1);border:1px solid var(--line);border-radius:var(--r-lg);margin-bottom:24px;overflow:hidden}
        .apr-fin .block-head{padding:20px 24px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--line-soft);flex-wrap:wrap;gap:12px}
        .apr-fin .block-title{font-family:'Fraunces',serif;font-size:18px;font-weight:600;letter-spacing:-.01em;display:flex;align-items:center;gap:10px}
        .apr-fin .badge{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.1em;padding:3px 8px;border-radius:4px;background:var(--bg-3);color:var(--text-soft)}
        .apr-fin .badge.pj{background:rgba(200,255,90,.12);color:var(--accent)}
        .apr-fin .badge.pf{background:rgba(122,252,184,.12);color:var(--accent-2)}
        .apr-fin .block-body{padding:20px 24px}
        .apr-fin table{width:100%;border-collapse:collapse;font-size:13px}
        .apr-fin th{text-align:left;font-weight:500;font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:var(--text-dim);padding:10px 8px;border-bottom:1px solid var(--line);font-family:'JetBrains Mono',monospace}
        .apr-fin td{padding:10px 8px;border-bottom:1px solid var(--line-soft)}
        .apr-fin tr:last-child td{border-bottom:none}
        .apr-fin tr.total td{border-top:2px solid var(--line);font-weight:600;color:var(--accent);padding-top:14px;font-family:'JetBrains Mono',monospace}
        .apr-fin td input, .apr-fin td select{background:transparent;border:1px solid transparent;color:var(--text);padding:6px 8px;border-radius:6px;font-family:inherit;font-size:13px;width:100%}
        .apr-fin td input:hover, .apr-fin td select:hover{border-color:var(--line)}
        .apr-fin td input:focus, .apr-fin td select:focus{border-color:var(--accent);outline:none;background:var(--bg-2)}
        .apr-fin td input[type=number]{text-align:right;font-family:'JetBrains Mono',monospace}
        .apr-fin td.right{text-align:right;font-family:'JetBrains Mono',monospace}
        .apr-fin td select option{background:var(--bg-2)}
        .apr-fin .btn-del{background:transparent;border:none;color:var(--text-dim);cursor:pointer;padding:4px 8px;border-radius:4px;font-size:14px}
        .apr-fin .btn-del:hover{color:var(--danger);background:rgba(255,107,138,.08)}
        .apr-fin .add-row{display:flex;gap:8px;align-items:center;margin-top:14px;padding-top:14px;border-top:1px dashed var(--line)}
        .apr-fin .add-row .btn{font-size:12px;padding:7px 12px}
        .apr-fin .two-col{display:grid;grid-template-columns:1fr 1fr;gap:24px}
        @media(max-width:1024px){.apr-fin .two-col{grid-template-columns:1fr}}
        .apr-fin .alerts{display:flex;flex-direction:column;gap:10px}
        .apr-fin .alert{padding:14px 18px;border-radius:var(--r-md);border-left:3px solid;display:flex;gap:12px;align-items:flex-start;background:var(--bg-2);font-size:13px}
        .apr-fin .alert.warn{border-color:var(--warn);background:rgba(255,180,84,.06)}
        .apr-fin .alert.danger{border-color:var(--danger);background:rgba(255,107,138,.06)}
        .apr-fin .alert.ok{border-color:var(--accent);background:rgba(200,255,90,.05)}
        .apr-fin .alert.info{border-color:var(--info);background:rgba(124,183,255,.05)}
        .apr-fin .alert-icon{font-size:18px;line-height:1}
        .apr-fin .alert-body strong{display:block;margin-bottom:2px;font-size:13px}
        .apr-fin .alert-body span{color:var(--text-soft);font-size:12px}
        .apr-fin .progress{width:100%;height:8px;background:var(--bg-3);border-radius:4px;overflow:hidden;margin-top:6px}
        .apr-fin .progress-bar{height:100%;background:var(--accent);border-radius:4px;transition:width .4s}
        .apr-fin .progress-bar.warn{background:var(--warn)}
        .apr-fin .progress-bar.danger{background:var(--danger)}
        .apr-fin .meta-bar{display:flex;justify-content:space-between;align-items:center;padding:10px 16px;background:var(--bg-2);border-radius:var(--r-sm);font-size:12px;color:var(--text-dim);font-family:'JetBrains Mono',monospace;margin-bottom:20px}
        .apr-fin .save-status{display:flex;align-items:center;gap:6px}
        .apr-fin .save-dot{width:8px;height:8px;border-radius:50%;background:var(--accent);animation:aprpulse 2s infinite}
        @keyframes aprpulse{0%,100%{opacity:1}50%{opacity:.4}}
        .apr-fin .cards-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}
        .apr-fin .card-tile{background:linear-gradient(135deg,var(--bg-2) 0%,var(--bg-3) 100%);border:1px solid var(--line);border-radius:var(--r-md);padding:18px;position:relative;overflow:hidden}
        .apr-fin .card-name{font-family:'Fraunces',serif;font-size:16px;font-weight:600;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center}
        .apr-fin .card-flag{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--text-dim);font-family:'JetBrains Mono',monospace}
        .apr-fin .card-row{display:flex;justify-content:space-between;font-size:13px;margin:6px 0}
        .apr-fin .card-row .lbl{color:var(--text-soft);font-size:12px}
        .apr-fin .card-row .val{font-family:'JetBrains Mono',monospace}
        .apr-fin .dre-row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--line-soft);font-size:14px}
        .apr-fin .dre-row.h{font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:var(--text-dim);font-weight:500;padding:14px 0 8px;border-bottom:1px solid var(--line)}
        .apr-fin .dre-row.total{font-family:'Fraunces',serif;font-size:18px;font-weight:600;color:var(--accent);padding:14px 0;border-top:2px solid var(--line);border-bottom:none}
        .apr-fin .dre-row .v{font-family:'JetBrains Mono',monospace}
        .apr-fin .dre-row.neg .v{color:var(--danger)}
        .apr-fin .dre-row.indent{padding-left:20px;color:var(--text-soft);font-size:13px}
        .apr-fin .scenarios{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:16px}
        @media(max-width:900px){.apr-fin .scenarios{grid-template-columns:1fr}}
        .apr-fin .scenario{background:var(--bg-2);border:1px solid var(--line);border-radius:var(--r-md);padding:18px}
        .apr-fin .scenario h4{font-family:'Fraunces',serif;font-size:15px;font-weight:600;margin:0 0 8px;display:flex;justify-content:space-between;align-items:center}
        .apr-fin .scenario .big{font-family:'Fraunces',serif;font-size:24px;font-weight:600;margin:10px 0 4px}
        .apr-fin .scenario .small{font-size:12px;color:var(--text-dim);margin-bottom:10px}
        .apr-fin .scenario.pessimist .big{color:var(--danger)}
        .apr-fin .scenario.realist .big{color:var(--accent)}
        .apr-fin .scenario.optimist .big{color:var(--accent-2)}
        .apr-fin .form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}
        .apr-fin .form-grid input{background:var(--bg-2);border:1px solid var(--line);color:var(--text);padding:9px 12px;border-radius:6px;font-family:inherit;font-size:13px}
        .apr-fin .empty{text-align:center;padding:40px 20px;color:var(--text-dim);font-size:13px;background:var(--bg-2);border-radius:var(--r-md);border:1px dashed var(--line)}
        @media(max-width:768px){
          .apr-fin header{padding:20px 20px 16px}
          .apr-fin main{padding:20px 16px 60px}
          .apr-fin .tabs{padding:0 16px}
          .apr-fin .tab{padding:12px 12px;font-size:12px}
          .apr-fin .section-title{font-size:22px}
          .apr-fin table{font-size:12px}
          .apr-fin th, .apr-fin td{padding:8px 6px}
        }
      `}</style>

      <header>
        <div className="brand">
          <div className="brand-mark">$</div>
          <div className="brand-text">
            <h1>APR Financeiro</h1>
            <div className="sub">Planejamento Mensal · PJ + PF</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="month-picker">
            <span>📅</span>
            <select value={currentMonth} onChange={e => setCurrentMonth(e.target.value)}>
              {monthOptions.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </div>
          <button className="btn" onClick={copyPreviousMonth}>📋 Copiar mês anterior</button>
          <a href="/" className="btn">← Voltar ao Hub</a>
        </div>
      </header>

      <nav className="tabs">
        {[
          ['resumo', 'Resumo'],
          ['pj', 'PJ · APR Digital'],
          ['pf', 'PF · Pessoal'],
          ['cartoes', 'Cartões'],
          ['fluxo', 'Fluxo de Caixa'],
          ['metas', 'Metas'],
          ['investimentos', '📈 Investimentos'],
          ['dre', 'DRE'],
          ['cenarios', 'Cenários'],
        ].map(([id, label]) => (
          <button key={id} className={`tab ${activeTab === id ? 'active' : ''}`} onClick={() => setActiveTab(id)}>
            <span className="tab-dot"></span>{label}
          </button>
        ))}
      </nav>

      <main>
        <div className="meta-bar">
          <div className="save-status">
            <span className="save-dot"></span>
            <span>{saveStatus}</span>
          </div>
          <div>{currentMonthLabel}</div>
        </div>

        {/* RESUMO */}
        {activeTab === 'resumo' && (
          <section>
            <h2 className="section-title">Resumo Executivo</h2>
            <p className="section-sub">Visão consolidada PJ + PF do mês selecionado</p>
            <div className="kpi-grid">
              <div className="kpi"><div className="kpi-label">Receita PJ</div><div className="kpi-value pos">{fmtBR(recPJ)}</div><div className="kpi-meta">{(m['rec-pj'] || []).filter((r: any) => r.status === 'Ativo').length} clientes ativos</div></div>
              <div className="kpi pf"><div className="kpi-label">Receita PF</div><div className="kpi-value pos">{fmtBR(recPF)}</div><div className="kpi-meta">renda pessoal</div></div>
              <div className="kpi danger"><div className="kpi-label">Despesas Totais</div><div className="kpi-value neg">{fmtBR(custTotal)}</div><div className="kpi-meta">PJ {fmtBR(custPJ)} · PF {fmtBR(custPF)}</div></div>
              <div className="kpi"><div className="kpi-label">Resultado Líquido</div><div className={`kpi-value ${resultado >= 0 ? 'pos' : 'neg'}`}>{fmtBR(resultado)}</div><div className="kpi-meta">{resultado >= 0 ? 'sobra do mês' : 'déficit do mês'}</div></div>
              <div className="kpi warn"><div className="kpi-label">Fatura Cartões</div><div className="kpi-value">{fmtBR(cardsFatura)}</div><div className="kpi-meta">{(m['cards'] || []).length} cartões</div></div>
              <div className="kpi"><div className="kpi-label">Margem</div><div className="kpi-value">{fmtPct(margem)}</div><div className="kpi-meta">resultado / receita</div></div>
            </div>

            <div className="two-col">
              <div className="block">
                <div className="block-head"><div className="block-title">⚠ Alertas e Insights</div></div>
                <div className="block-body">
                  <div className="alerts">
                    {(() => {
                      const a: any[] = [];
                      if (resultado < 0) a.push({ type: 'danger', icon: '⛔', title: 'Mês no negativo', msg: `Resultado de ${fmtBR(resultado)}. Revise custos ou acelere recebimentos.` });
                      if (recPJ > 0 && custPJ / recPJ > 0.7) a.push({ type: 'warn', icon: '⚠', title: 'Custo fixo PJ alto', msg: `Custos PJ representam ${fmtPct((custPJ / recPJ) * 100)} da receita PJ. Ideal abaixo de 60%.` });
                      if (recPJ > 0 && recPJReceived / recPJ < 0.5) a.push({ type: 'warn', icon: '💸', title: 'Recebimentos atrasados', msg: `Apenas ${fmtPct((recPJReceived / recPJ) * 100)} da receita PJ foi efetivamente recebida.` });
                      const cardWarn = (m['cards'] || []).filter((c: any) => c.limite > 0 && (c.fatura / c.limite) > 0.8);
                      if (cardWarn.length) a.push({ type: 'warn', icon: '💳', title: 'Cartões próximos do limite', msg: `${cardWarn.length} cartão(ões) usando mais de 80% do limite.` });
                      if (resultado > 0 && recTotal > 0 && (resultado / recTotal) >= 0.3) a.push({ type: 'ok', icon: '✨', title: 'Excelente margem', msg: `Margem de ${fmtPct((resultado / recTotal) * 100)}. Direcione parte para reserva.` });
                      if (!a.length) a.push({ type: 'info', icon: 'ℹ', title: 'Nenhum alerta no momento', msg: 'Preencha os dados do mês para receber insights.' });
                      return a.map((x, i) => (
                        <div key={i} className={`alert ${x.type}`}>
                          <div className="alert-icon">{x.icon}</div>
                          <div className="alert-body"><strong>{x.title}</strong><span>{x.msg}</span></div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>

              <div className="block">
                <div className="block-head"><div className="block-title">📊 Distribuição do mês</div></div>
                <div className="block-body">
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 10, fontFamily: 'JetBrains Mono,monospace' }}>Receitas</div>
                  {[{ l: 'PJ', v: recPJ, c: 'var(--accent)' }, { l: 'PF', v: recPF, c: 'var(--accent-2)' }].map((d, i) => {
                    const pct = recTotal > 0 ? (d.v / recTotal) * 100 : 0;
                    return (
                      <div key={i} style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}><span>Receita {d.l}</span><span style={{ fontFamily: 'JetBrains Mono,monospace' }}>{fmtBR(d.v)} · {fmtPct(pct)}</span></div>
                        <div className="progress"><div className="progress-bar" style={{ width: `${pct}%`, background: d.c }}></div></div>
                      </div>
                    );
                  })}
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.1em', margin: '18px 0 10px', fontFamily: 'JetBrains Mono,monospace' }}>Despesas</div>
                  {[{ l: 'PJ', v: custPJ, c: 'var(--warn)' }, { l: 'PF', v: custPF, c: 'var(--danger)' }].map((d, i) => {
                    const pct = custTotal > 0 ? (d.v / custTotal) * 100 : 0;
                    return (
                      <div key={i} style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}><span>Custos {d.l}</span><span style={{ fontFamily: 'JetBrains Mono,monospace' }}>{fmtBR(d.v)} · {fmtPct(pct)}</span></div>
                        <div className="progress"><div className="progress-bar" style={{ width: `${pct}%`, background: d.c }}></div></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* GRÁFICOS */}
            <div className="two-col">
              {/* Concentração de receita por cliente */}
              <div className="block">
                <div className="block-head"><div className="block-title">🎯 Concentração de Receita</div></div>
                <div className="block-body">
                  {(() => {
                    const clientes = (m['rec-pj'] || []).filter((r: any) => r.valor > 0 && r.status === 'Ativo');
                    if (!clientes.length) return <div style={{textAlign:'center',color:'var(--text-dim)',padding:20,fontSize:13}}>Preencha os valores dos clientes pra ver a concentração.</div>;
                    const total = clientes.reduce((s: number, r: any) => s + (+r.valor || 0), 0);
                    const sorted = [...clientes].sort((a: any, b: any) => (b.valor || 0) - (a.valor || 0));
                    const colors = ['var(--accent)', 'var(--accent-2)', 'var(--info)', 'var(--warn)', '#c084fc', '#f472b6', '#67e8f9', '#fbbf24'];
                    return (
                      <div>
                        {/* Barra horizontal empilhada */}
                        <div style={{display:'flex',height:32,borderRadius:8,overflow:'hidden',marginBottom:16}}>
                          {sorted.map((cl: any, idx: number) => {
                            const pct = total > 0 ? (cl.valor / total) * 100 : 0;
                            return <div key={idx} style={{width:pct+'%',background:colors[idx % colors.length],minWidth:pct>3?'auto':'2px',position:'relative',cursor:'pointer'}} title={cl.cliente+': '+pct.toFixed(1)+'%'}></div>;
                          })}
                        </div>
                        {/* Legenda */}
                        {sorted.map((cl: any, idx: number) => {
                          const pct = total > 0 ? (cl.valor / total) * 100 : 0;
                          const isRisk = pct > 30;
                          return (
                            <div key={idx} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:'1px solid var(--line-soft)',fontSize:13}}>
                              <div style={{display:'flex',alignItems:'center',gap:8}}>
                                <span style={{width:10,height:10,borderRadius:2,background:colors[idx % colors.length],display:'inline-block'}}></span>
                                <span>{cl.cliente}</span>
                              </div>
                              <div style={{fontFamily:'JetBrains Mono,monospace',display:'flex',gap:12,alignItems:'center'}}>
                                <span>{fmtBR(cl.valor)}</span>
                                <span style={{color: isRisk ? 'var(--danger)' : 'var(--text-dim)',fontWeight: isRisk ? 600 : 400}}>
                                  {pct.toFixed(1)}% {isRisk ? '⚠' : ''}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                        {sorted.some((cl: any) => total > 0 && (cl.valor / total) * 100 > 30) && (
                          <div style={{marginTop:12,padding:'10px 14px',borderRadius:8,background:'rgba(255,107,138,.08)',border:'1px solid rgba(255,107,138,.2)',fontSize:12,color:'var(--danger)'}}>
                            ⚠ Atenção: cliente(s) com mais de 30% da receita. Considere diversificar a base.
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Tendência vs mês anterior */}
              <div className="block">
                <div className="block-head"><div className="block-title">📈 Tendência vs Mês Anterior</div></div>
                <div className="block-body">
                  {(() => {
                    const [y, mo] = currentMonth.split('-').map(Number);
                    const prevDate = new Date(y, mo - 2, 1);
                    const prevKey = prevDate.getFullYear() + '-' + String(prevDate.getMonth() + 1).padStart(2, '0');
                    const prev = db[prevKey];
                    if (!prev) return <div style={{textAlign:'center',color:'var(--text-dim)',padding:20,fontSize:13}}>Sem dados do mês anterior para comparar.</div>;
                    const prevRecPJ = (prev['rec-pj'] || []).reduce((s: number, r: any) => s + (+r.valor || 0), 0);
                    const prevRecPF = (prev['rec-pf'] || []).reduce((s: number, r: any) => s + (+r.valor || 0), 0);
                    const prevCustPJ = (prev['cust-pj'] || []).reduce((s: number, r: any) => s + (+r.valor || 0), 0) + (prev['var-pj'] || []).reduce((s: number, r: any) => s + (+r.valor || 0), 0);
                    const prevCustPF = (prev['cust-pf'] || []).reduce((s: number, r: any) => s + (+r.valor || 0), 0);
                    const prevTotal = prevRecPJ + prevRecPF;
                    const prevCust = prevCustPJ + prevCustPF;
                    const prevRes = prevTotal - prevCust;
                    const items = [
                      { label: 'Receita PJ', atual: recPJ, anterior: prevRecPJ },
                      { label: 'Receita PF', atual: recPF, anterior: prevRecPF },
                      { label: 'Despesas', atual: custTotal, anterior: prevCust },
                      { label: 'Resultado', atual: resultado, anterior: prevRes },
                    ];
                    return (
                      <div>
                        {items.map((item, idx) => {
                          const diff = item.anterior > 0 ? ((item.atual - item.anterior) / item.anterior) * 100 : (item.atual > 0 ? 100 : 0);
                          const isUp = diff > 0;
                          const isDespesa = item.label === 'Despesas';
                          const good = isDespesa ? !isUp : isUp;
                          return (
                            <div key={idx} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:'1px solid var(--line-soft)'}}>
                              <div>
                                <div style={{fontSize:13,marginBottom:4}}>{item.label}</div>
                                <div style={{fontSize:11,color:'var(--text-dim)',fontFamily:'JetBrains Mono,monospace'}}>
                                  ant: {fmtBR(item.anterior)}
                                </div>
                              </div>
                              <div style={{textAlign:'right'}}>
                                <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:15,fontWeight:600}}>{fmtBR(item.atual)}</div>
                                <div style={{fontSize:13,fontFamily:'JetBrains Mono,monospace',color: good ? 'var(--accent)' : 'var(--danger)',fontWeight:600}}>
                                  {isUp ? '↑' : '↓'} {Math.abs(diff).toFixed(1)}%
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Receita vs Despesa - Barras do mês */}
            <div className="block" style={{marginTop:24}}>
              <div className="block-head"><div className="block-title">📊 Receita vs Despesa · Visual</div></div>
              <div className="block-body">
                {(() => {
                  const max = Math.max(recTotal, custTotal, 1);
                  return (
                    <div>
                      <div style={{marginBottom:16}}>
                        <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:13}}>
                          <span>Receitas</span>
                          <span style={{fontFamily:'JetBrains Mono,monospace',color:'var(--accent)'}}>{fmtBR(recTotal)}</span>
                        </div>
                        <div style={{height:28,background:'var(--bg-3)',borderRadius:6,overflow:'hidden'}}>
                          <div style={{height:'100%',width:(recTotal/max*100)+'%',background:'linear-gradient(90deg,var(--accent),var(--accent-2))',borderRadius:6,transition:'width .4s'}}></div>
                        </div>
                      </div>
                      <div style={{marginBottom:16}}>
                        <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:13}}>
                          <span>Despesas</span>
                          <span style={{fontFamily:'JetBrains Mono,monospace',color:'var(--danger)'}}>{fmtBR(custTotal)}</span>
                        </div>
                        <div style={{height:28,background:'var(--bg-3)',borderRadius:6,overflow:'hidden'}}>
                          <div style={{height:'100%',width:(custTotal/max*100)+'%',background:'linear-gradient(90deg,var(--danger),var(--warn))',borderRadius:6,transition:'width .4s',opacity:.8}}></div>
                        </div>
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between',paddingTop:12,borderTop:'2px solid var(--line)',fontSize:15}}>
                        <span style={{fontWeight:600}}>Resultado</span>
                        <span style={{fontFamily:'Fraunces,serif',fontSize:22,fontWeight:600,color:resultado>=0?'var(--accent)':'var(--danger)'}}>{fmtBR(resultado)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* GRAFICOS */}
            <div className="two-col">
              <div className="block">
                <div className="block-head"><div className="block-title">🎯 Concentração de Receita</div></div>
                <div className="block-body">
                  {(() => {
                    const clientes = (m['rec-pj'] || []).filter((r: any) => r.valor > 0 && r.status === 'Ativo');
                    if (!clientes.length) return <div style={{textAlign:'center',color:'var(--text-dim)',padding:20,fontSize:13}}>Preencha os valores dos clientes.</div>;
                    const total = clientes.reduce((s: number, r: any) => s + (+r.valor || 0), 0);
                    const sorted = [...clientes].sort((a: any, b: any) => (b.valor || 0) - (a.valor || 0));
                    const colors = ['var(--accent)', 'var(--accent-2)', 'var(--info)', 'var(--warn)', '#c084fc', '#f472b6'];
                    return (<div>
                      <div style={{display:'flex',height:32,borderRadius:8,overflow:'hidden',marginBottom:16}}>
                        {sorted.map((cl: any, idx: number) => {
                          const pct = total > 0 ? (cl.valor / total) * 100 : 0;
                          return <div key={idx} style={{width:pct+'%',background:colors[idx % colors.length],minWidth:2}} title={cl.cliente+': '+pct.toFixed(1)+'%'}></div>;
                        })}
                      </div>
                      {sorted.map((cl: any, idx: number) => {
                        const pct = total > 0 ? (cl.valor / total) * 100 : 0;
                        const isRisk = pct > 30;
                        return (<div key={idx} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:'1px solid var(--line-soft)',fontSize:13}}>
                          <div style={{display:'flex',alignItems:'center',gap:8}}>
                            <span style={{width:10,height:10,borderRadius:2,background:colors[idx % colors.length],display:'inline-block'}}></span>
                            <span>{cl.cliente}</span>
                          </div>
                          <div style={{fontFamily:'JetBrains Mono,monospace',display:'flex',gap:12,alignItems:'center'}}>
                            <span>{fmtBR(cl.valor)}</span>
                            <span style={{color: isRisk ? 'var(--danger)' : 'var(--text-dim)',fontWeight: isRisk ? 600 : 400}}>{pct.toFixed(1)}%{isRisk ? ' ⚠' : ''}</span>
                          </div>
                        </div>);
                      })}
                    </div>);
                  })()}
                </div>
              </div>

              <div className="block">
                <div className="block-head"><div className="block-title">📈 Tendência vs Mês Anterior</div></div>
                <div className="block-body">
                  {(() => {
                    const [y2, mo2] = currentMonth.split('-').map(Number);
                    const prevDate2 = new Date(y2, mo2 - 2, 1);
                    const prevKey2 = prevDate2.getFullYear() + '-' + String(prevDate2.getMonth() + 1).padStart(2, '0');
                    const prev = db[prevKey2];
                    if (!prev) return <div style={{textAlign:'center',color:'var(--text-dim)',padding:20,fontSize:13}}>Sem dados do mês anterior.</div>;
                    const pRecPJ = (prev['rec-pj'] || []).reduce((s: number, r: any) => s + (+r.valor || 0), 0);
                    const pRecPF = (prev['rec-pf'] || []).reduce((s: number, r: any) => s + (+r.valor || 0), 0);
                    const pCustPJ = (prev['cust-pj'] || []).reduce((s: number, r: any) => s + (+r.valor || 0), 0) + (prev['var-pj'] || []).reduce((s: number, r: any) => s + (+r.valor || 0), 0);
                    const pCustPF = (prev['cust-pf'] || []).reduce((s: number, r: any) => s + (+r.valor || 0), 0);
                    const pTotal = pRecPJ + pRecPF;
                    const pCust = pCustPJ + pCustPF;
                    const pRes = pTotal - pCust;
                    const items = [
                      { label: 'Receita PJ', atual: recPJ, anterior: pRecPJ },
                      { label: 'Receita PF', atual: recPF, anterior: pRecPF },
                      { label: 'Despesas', atual: custTotal, anterior: pCust },
                      { label: 'Resultado', atual: resultado, anterior: pRes },
                    ];
                    return (<div>
                      {items.map((item, idx) => {
                        const diff = item.anterior > 0 ? ((item.atual - item.anterior) / item.anterior) * 100 : (item.atual > 0 ? 100 : 0);
                        const isUp = diff > 0;
                        const isDespesa = item.label === 'Despesas';
                        const good = isDespesa ? !isUp : isUp;
                        return (<div key={idx} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:'1px solid var(--line-soft)'}}>
                          <div>
                            <div style={{fontSize:13,marginBottom:4}}>{item.label}</div>
                            <div style={{fontSize:11,color:'var(--text-dim)',fontFamily:'JetBrains Mono,monospace'}}>ant: {fmtBR(item.anterior)}</div>
                          </div>
                          <div style={{textAlign:'right'}}>
                            <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:15,fontWeight:600}}>{fmtBR(item.atual)}</div>
                            <div style={{fontSize:13,fontFamily:'JetBrains Mono,monospace',color: good ? 'var(--accent)' : 'var(--danger)',fontWeight:600}}>
                              {isUp ? '↑' : '↓'} {Math.abs(diff).toFixed(1)}%
                            </div>
                          </div>
                        </div>);
                      })}
                    </div>);
                  })()}
                </div>
              </div>
            </div>

            <div className="block" style={{marginTop:24}}>
              <div className="block-head"><div className="block-title">📊 Receita vs Despesa</div></div>
              <div className="block-body">
                {(() => {
                  const max = Math.max(recTotal, custTotal, 1);
                  return (<div>
                    <div style={{marginBottom:16}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:13}}><span>Receitas</span><span style={{fontFamily:'JetBrains Mono,monospace',color:'var(--accent)'}}>{fmtBR(recTotal)}</span></div>
                      <div style={{height:28,background:'var(--bg-3)',borderRadius:6,overflow:'hidden'}}><div style={{height:'100%',width:(recTotal/max*100)+'%',background:'linear-gradient(90deg,var(--accent),var(--accent-2))',borderRadius:6}}></div></div>
                    </div>
                    <div style={{marginBottom:16}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:13}}><span>Despesas</span><span style={{fontFamily:'JetBrains Mono,monospace',color:'var(--danger)'}}>{fmtBR(custTotal)}</span></div>
                      <div style={{height:28,background:'var(--bg-3)',borderRadius:6,overflow:'hidden'}}><div style={{height:'100%',width:(custTotal/max*100)+'%',background:'linear-gradient(90deg,var(--danger),var(--warn))',borderRadius:6,opacity:.8}}></div></div>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',paddingTop:12,borderTop:'2px solid var(--line)',fontSize:15}}>
                      <span style={{fontWeight:600}}>Resultado</span>
                      <span style={{fontFamily:'Fraunces,serif',fontSize:22,fontWeight:600,color:resultado>=0?'var(--accent)':'var(--danger)'}}>{fmtBR(resultado)}</span>
                    </div>
                  </div>);
                })()}
              </div>
            </div>

          </section>
        )}

        {/* PJ */}
        {activeTab === 'pj' && (
          <section>
            <h2 className="section-title">PJ · APR Digital</h2>
            <p className="section-sub">Receitas dos clientes e custos fixos da agência</p>

            <ResumoRecebimentos receitas={(m['rec-pj'] || []).map((r: any) => r.moeda === 'EUR' ? { ...r, valor: (parseFloat(r.valor) || 0) * eurRate } : r)} mesRef={mesRef} />

            <div style={{ marginBottom: 12 }}>
              <span style={{ display: 'inline-block', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 5, padding: '3px 10px', fontSize: 11, fontFamily: 'JetBrains Mono,monospace', color: eurRateStatus === 'offline' ? 'var(--warn)' : 'var(--text-dim)' }}>
                {eurRateStatus === 'offline' ? '⚠ cotação offline' : `€1 = R$ ${eurRate.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (média 30 dias)`}
              </span>
            </div>

            <div className="block">
              <div className="block-head">
                <div className="block-title">💰 Receitas · Clientes <span className="badge pj">recorrente + projeto</span></div>
              </div>
              <div className="block-body">
                <div style={{ marginBottom: 12 }}>
                  <input
                    type="text"
                    placeholder="Buscar cliente..."
                    value={searchRec}
                    onChange={e => setSearchRec(e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 6, padding: '7px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                {(() => {
                  const allRecs: any[] = m['rec-pj'] || [];
                  const filtered = searchRec.trim() === '' ? allRecs : allRecs.filter((r: any) => (r.cliente || '').toLowerCase().includes(searchRec.toLowerCase()));
                  const grupos = agruparPorTipo(filtered);
                  if (allRecs.length === 0) return (
                    <>
                      <div style={{ padding: '24px 8px', color: 'var(--text-dim)', textAlign: 'center', fontSize: 13 }}>Nenhum lançamento.</div>
                      <BotaoNovaReceita onClick={() => addRow('rec-pj')} />
                    </>
                  );
                  return (
                    <>
                      {grupos.map((grupo) => {
                        const totalGrupo = grupo.clientes.reduce((s: number, r: any) => s + toBRL(r), 0);
                        return (
                          <div key={grupo.chave}>
                            <CabecalhoGrupo titulo={grupo.titulo} subtitulo={grupo.subtitulo} total={totalGrupo} quantidade={grupo.clientes.length} />
                            <table>
                              <thead>
                                <tr>
                                  <th style={ESTILO_TABELA.cabecalho}>Cliente</th>
                                  <th style={ESTILO_TABELA.cabecalho}>Squad</th>
                                  <th style={ESTILO_TABELA.cabecalho}>Status</th>
                                  <th style={ESTILO_TABELA.cabecalho}>Dia pgto</th>
                                  <th style={{ ...ESTILO_TABELA.cabecalho, textAlign: 'right' }}>Valor</th>
                                  <th style={{ ...ESTILO_TABELA.cabecalho, textAlign: 'right' }}>Recebido?</th>
                                  <th></th>
                                </tr>
                              </thead>
                              <tbody>
                                {grupo.clientes.map((row: any) => {
                                  const origIdx = allRecs.indexOf(row);
                                  const st = statusRecebimento(!!row.recebido, row.dia || '', mesRef);
                                  return (
                                    <tr key={origIdx} style={{ borderLeft: `3px solid ${st.cor}`, ...ESTILO_TABELA.linha }}>
                                      <td style={ESTILO_TABELA.celula}><ClienteEditavel nome={row.cliente || ''} onChange={v => updRow('rec-pj', origIdx, 'cliente', v)} /></td>
                                      <td style={ESTILO_TABELA.celula}>
                                        <SeletorSquad squad={row.squad || 'Lançamentos'} onChange={v => updRow('rec-pj', origIdx, 'squad', v)} />
                                      </td>
                                      <td style={ESTILO_TABELA.celula}>
                                        <SeletorStatusCliente status={row.status || 'Ativo'} onChange={v => updRow('rec-pj', origIdx, 'status', v)} />
                                      </td>
                                      <td style={ESTILO_TABELA.celula}><SeletorDiaPagamento dia={row.dia} onChange={v => updRow('rec-pj', origIdx, 'dia', v)} /></td>
                                      <td style={{ ...ESTILO_TABELA.celula, textAlign: 'right' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                                          <button onClick={() => updRow('rec-pj', origIdx, 'moeda', row.moeda === 'EUR' ? 'BRL' : 'EUR')} title="Alternar moeda" style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, border: '1px solid var(--line)', background: row.moeda === 'EUR' ? 'rgba(124,183,255,.12)' : 'var(--bg-3)', color: row.moeda === 'EUR' ? 'var(--info)' : 'var(--text-dim)', cursor: 'pointer', fontFamily: 'JetBrains Mono,monospace', lineHeight: 1.4 }}>{row.moeda === 'EUR' ? '€' : 'R$'}</button>
                                          <EditorValorMoeda valor={row.valor} onChange={v => updRow('rec-pj', origIdx, 'valor', v)} destaque />
                                        </div>
                                      </td>
                                      <td style={{ ...ESTILO_TABELA.celula, textAlign: 'right' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                                          <input type="checkbox" checked={!!row.recebido} onChange={e => updRow('rec-pj', origIdx, 'recebido', e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#22C55E' }} />
                                          <PillStatus recebido={!!row.recebido} dia={row.dia || ''} mesRef={mesRef} />
                                        </div>
                                      </td>
                                      <td style={{ ...ESTILO_TABELA.celula, width: 36, textAlign: 'right' }}><button className="btn-del" onClick={() => delRow('rec-pj', origIdx)} title="Remover">✕</button></td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        );
                      })}
                      {(() => {
                        const allRecsAll = m['rec-pj'] || [];
                        const hasEUR = allRecsAll.some((r: any) => r.moeda === 'EUR' && (parseFloat(r.valor) || 0) > 0);
                        const totalBRLonly = allRecsAll.filter((r: any) => r.moeda !== 'EUR').reduce((s: number, r: any) => s + (parseFloat(r.valor) || 0), 0);
                        const totalEURraw = allRecsAll.filter((r: any) => r.moeda === 'EUR').reduce((s: number, r: any) => s + (parseFloat(r.valor) || 0), 0);
                        return (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '14px 8px 0', marginTop: 8, borderTop: '2px solid var(--line)', fontWeight: 600, color: 'var(--accent)', fontFamily: 'JetBrains Mono,monospace', fontSize: 13 }}>
                            <span>TOTAL RECEITAS PJ</span>
                            {hasEUR ? (
                              <span style={{ textAlign: 'right' }}>
                                <span>{fmtBR(totalBRLonly)} + €{totalEURraw.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                <span style={{ display: 'block', fontSize: 11, color: 'var(--text-dim)', fontWeight: 400 }}>(= {fmtBR(recPJ)} convertido)</span>
                              </span>
                            ) : <span>{fmtBR(recPJ)}</span>}
                          </div>
                        );
                      })()}
                      <BotaoNovaReceita onClick={() => addRow('rec-pj')} />
                    </>
                  );
                })()}
              </div>
            </div>

            <TableBlock title="📉 Custos Fixos · Agência" badge="mensal" badgeClass="pj"
              data={m['cust-pj'] || []} fields={[
                { k: 'desc', type: 'text', ph: 'Descrição' },
                { k: 'cat', type: 'select', opts: ['Equipe', 'Ferramentas', 'Impostos', 'Infra', 'Administrativo', 'Marketing', 'Outros'] },
                { k: 'venc', type: 'text', ph: 'dia' },
                { k: 'valor', type: 'number', right: true },
                { k: 'pago', type: 'check', right: true },
              ]} headers={['Descrição', 'Categoria', 'Vencimento', 'Valor (R$)', 'Pago?']}
              onUpd={(i, f, v) => updRow('cust-pj', i, f, v)} onDel={i => delRow('cust-pj', i)} onAdd={() => addRow('cust-pj')}
              totalLabel="TOTAL CUSTOS PJ" totalSpan={3} totalValue={fmtBR(sumValor(m['cust-pj']))} />

            <TableBlock title="🎯 Custos Variáveis / Projetos" badge="pontual"
              data={m['var-pj'] || []} fields={[
                { k: 'desc', type: 'text', ph: 'Descrição' },
                { k: 'cliente', type: 'text', ph: 'Cliente/Projeto' },
                { k: 'data', type: 'text', ph: 'dia' },
                { k: 'valor', type: 'number', right: true },
              ]} headers={['Descrição', 'Cliente/Projeto', 'Data', 'Valor (R$)']}
              onUpd={(i, f, v) => updRow('var-pj', i, f, v)} onDel={i => delRow('var-pj', i)} onAdd={() => addRow('var-pj')}
              totalLabel="TOTAL VARIÁVEIS" totalSpan={3} totalValue={fmtBR(sumValor(m['var-pj']))} />
          </section>
        )}

        {/* PF */}
        {activeTab === 'pf' && (
          <section>
            <h2 className="section-title">PF · Pessoal</h2>
            <p className="section-sub">Suas finanças pessoais — entradas, custos fixos e variáveis</p>

            <TableBlock title="💚 Entradas · PF" badge="renda" badgeClass="pf"
              data={m['rec-pf'] || []} fields={[
                { k: 'origem', type: 'text', ph: 'Origem' },
                { k: 'tipo', type: 'select', opts: ['Salário', 'Pró-labore', 'Comissão', 'Aluguel', 'Investimento', 'Outros'] },
                { k: 'data', type: 'text', ph: 'dia' },
                { k: 'valor', type: 'number', right: true },
                { k: 'recebido', type: 'check', right: true },
              ]} headers={['Origem', 'Tipo', 'Data', 'Valor (R$)', 'Recebido?']}
              onUpd={(i, f, v) => updRow('rec-pf', i, f, v)} onDel={i => delRow('rec-pf', i)} onAdd={() => addRow('rec-pf')}
              totalLabel="TOTAL ENTRADAS PF" totalSpan={3} totalValue={fmtBR(recPF)} />

            <div className="block">
              <div className="block-head">
                <div className="block-title">🏠 Custos Fixos · Pessoal <span className="badge pf">mensal</span></div>
              </div>
              <div className="block-body">
                <table>
                  <thead>
                    <tr>
                      <th>Descrição</th>
                      <th>Categoria</th>
                      <th>Vencimento</th>
                      <th style={{ textAlign: 'right' }}>Valor (R$)</th>
                      <th style={{ textAlign: 'right' }}>Pago?</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(m['cust-pf'] || []).length === 0
                      ? <tr><td colSpan={6} style={{ padding: '24px 8px', color: 'var(--text-dim)', textAlign: 'center', fontSize: 13 }}>Nenhum lançamento.</td></tr>
                      : (m['cust-pf'] || []).map((row: any, i: number) => (
                        <tr key={i}>
                          <td style={ESTILO_TABELA.celula}>
                            <input type="text" defaultValue={row.desc || ''} placeholder="Descrição" onBlur={e => {
                              const v = e.target.value;
                              updRow('cust-pf', i, 'desc', v);
                              if (!row.categoria || row.categoria === '💰 Outros') {
                                const suggested = guessCategoria(v);
                                if (suggested !== '💰 Outros') updRow('cust-pf', i, 'categoria', suggested);
                              }
                            }} />
                          </td>
                          <td style={ESTILO_TABELA.celula}>
                            <select value={CATS_PF.includes(row.categoria) ? row.categoria : '💰 Outros'} onChange={e => updRow('cust-pf', i, 'categoria', e.target.value)}>
                              {CATS_PF.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </td>
                          <td style={ESTILO_TABELA.celula}>
                            <input type="text" defaultValue={row.venc || ''} placeholder="dia" onBlur={e => updRow('cust-pf', i, 'venc', e.target.value)} />
                          </td>
                          <td style={{ ...ESTILO_TABELA.celula, textAlign: 'right' }}>
                            <input type="number" step="0.01" defaultValue={row.valor || ''} onBlur={e => updRow('cust-pf', i, 'valor', parseFloat(e.target.value) || 0)} />
                          </td>
                          <td style={{ ...ESTILO_TABELA.celula, textAlign: 'right' }}>
                            <input type="checkbox" checked={!!row.pago} onChange={e => updRow('cust-pf', i, 'pago', e.target.checked)} style={{ width: 'auto' }} />
                          </td>
                          <td style={{ ...ESTILO_TABELA.celula, width: 36, textAlign: 'right' }}><button className="btn-del" onClick={() => delRow('cust-pf', i)} title="Remover">✕</button></td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 8px 0', marginTop: 8, borderTop: '2px solid var(--line)', fontWeight: 600, color: 'var(--accent)', fontFamily: 'JetBrains Mono,monospace', fontSize: 13 }}>
                  <span>TOTAL CUSTOS PF</span><span>{fmtBR(sumValor(m['cust-pf']))}</span>
                </div>
                <div className="add-row"><button className="btn btn-primary" onClick={() => addRow('cust-pf')}>+ Adicionar</button></div>
                {(m['cust-pf'] || []).some((r: any) => (parseFloat(r.valor) || 0) > 0) && (() => {
                  const totalCust = sumValor(m['cust-pf']);
                  const byCat: Record<string, number> = {};
                  (m['cust-pf'] || []).forEach((r: any) => {
                    const cat = CATS_PF.includes(r.categoria) ? r.categoria : '💰 Outros';
                    byCat[cat] = (byCat[cat] || 0) + (parseFloat(r.valor) || 0);
                  });
                  const sorted = Object.entries(byCat).filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a);
                  if (!sorted.length) return null;
                  return (
                    <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--line-soft)' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12, fontFamily: 'JetBrains Mono,monospace' }}>Gastos por categoria</div>
                      {sorted.map(([cat, val]) => {
                        const pct = totalCust > 0 ? (val / totalCust) * 100 : 0;
                        return (
                          <div key={cat} style={{ marginBottom: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                              <span>{cat}</span>
                              <span style={{ fontFamily: 'JetBrains Mono,monospace' }}>{fmtBR(val)} · {pct.toFixed(1)}%</span>
                            </div>
                            <div className="progress"><div className="progress-bar" style={{ width: `${pct}%` }}></div></div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>


          </section>
        )}

        {/* CARTÕES */}
        {activeTab === 'cartoes' && (() => {
          const txs: any[] = m['card-tx'] || [];
          const cards: any[] = m['cards'] || [];
          const totalGeral = txs.reduce((s: number, tx: any) => s + (parseFloat(tx.valor) || 0), 0);
          const totalParcelasVencer = txs.reduce((s: number, tx: any) => {
            if (tx.parcela_atual != null && tx.parcela_total != null && tx.valor_parcela != null) {
              return s + (tx.parcela_total - tx.parcela_atual) * (parseFloat(tx.valor_parcela) || 0);
            }
            return s;
          }, 0);
          const inputStyle = { background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 5, padding: '6px 8px', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' as const, width: '100%' };
          const saveAddForm = (cartaoNome: string) => {
            const d = addFormDraft;
            const newTx: any = { data: d.data, desc: d.desc, cartao: cartaoNome, cat: d.cat, origem: d.origem, valor: parseFloat(d.valor) || 0, parcela_atual: d.parcelado ? d.parcela_atual : null, parcela_total: d.parcelado ? d.parcela_total : null, valor_parcela: d.parcelado ? (parseFloat(d.valor_parcela) || 0) : null, data_termino: d.parcelado ? d.data_termino : null };
            updateMonth(month => { if (!month['card-tx']) month['card-tx'] = []; month['card-tx'].push(newTx); return month; });
            setAddFormCard(null);
            setAddFormDraft({ data: '', desc: '', cat: CATS_CARD[0], origem: 'PF', valor: '', parcelado: false, parcela_atual: 1, parcela_total: 2, valor_parcela: '', data_termino: '' });
          };
          return (
            <section>
              <h2 className="section-title">Cartões de Crédito</h2>
              <p className="section-sub">Acompanhamento de limites, faturas e lançamentos por cartão</p>

              <div className="kpi-grid">
                <div className="kpi"><div className="kpi-label">Total Lançado</div><div className="kpi-value neg">{fmtBR(totalGeral)}</div><div className="kpi-meta">{txs.length} lançamento{txs.length !== 1 ? 's' : ''}</div></div>
                <div className="kpi"><div className="kpi-label">Parcelas a Vencer</div><div className="kpi-value" style={{ color: 'var(--warn)' }}>{fmtBR(totalParcelasVencer)}</div><div className="kpi-meta">saldo futuro parcelado</div></div>
              </div>

              {cards.map((card: any, cardIdx: number) => {
                const normalize = (s: string) => s?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
                const cardTxs = txs.map((tx, i) => ({ tx, origIdx: i })).filter(({ tx }) => normalize(tx.cartao) === normalize(card.nome));
                const faturaTxs = cardTxs.reduce((s, { tx }) => s + (parseFloat(tx.valor) || 0), 0);
                const parcelasVencer = cardTxs.reduce((s, { tx }) => {
                  if (tx.parcela_atual != null && tx.parcela_total != null && tx.valor_parcela != null) {
                    return s + (tx.parcela_total - tx.parcela_atual) * (parseFloat(tx.valor_parcela) || 0);
                  }
                  return s;
                }, 0);
                const usado = card.limite > 0 ? (faturaTxs / card.limite) * 100 : 0;
                const barCls = usado > 80 ? 'danger' : usado > 60 ? 'warn' : '';
                const byCat: Record<string, { tx: any; origIdx: number }[]> = {};
                cardTxs.forEach(({ tx, origIdx }) => {
                  const c = tx.cat || 'Outros';
                  if (!byCat[c]) byCat[c] = [];
                  byCat[c].push({ tx, origIdx });
                });
                const isAddOpen = addFormCard === card.nome;
                return (
                  <div key={cardIdx} className="block" style={{ marginBottom: 20 }}>
                    <div className="block-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <div className="block-title">💳 {card.nome} <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-dim)' }}>{card.bandeira} · {card.titular}</span></div>
                      <div style={{ display: 'flex', gap: 14, fontFamily: 'JetBrains Mono,monospace', fontSize: 12, flexWrap: 'wrap' }}>
                        {card.limite > 0 && <span style={{ color: 'var(--text-dim)' }}>Limite: {fmtBR(card.limite)}</span>}
                        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Fatura: {fmtBR(faturaTxs)}</span>
                        {parcelasVencer > 0 && <span style={{ color: 'var(--warn)' }}>A vencer: {fmtBR(parcelasVencer)}</span>}
                      </div>
                    </div>
                    <div className="block-body">
                      {card.limite > 0 && (
                        <div style={{ marginBottom: 12 }}>
                          <div className="progress"><div className={`progress-bar ${barCls}`} style={{ width: `${Math.min(usado, 100)}%` }}></div></div>
                          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4, fontFamily: 'JetBrains Mono,monospace' }}>{fmtPct(usado)} do limite utilizado</div>
                        </div>
                      )}
                      {Object.keys(byCat).length === 0
                        ? <div style={{ padding: '10px 0', color: 'var(--text-dim)', fontSize: 13 }}>Nenhum lançamento neste cartão.</div>
                        : Object.entries(byCat).map(([cat, rows]) => {
                            const catTotal = rows.reduce((s, { tx }) => s + (parseFloat(tx.valor) || 0), 0);
                            return (
                              <div key={cat} style={{ marginBottom: 14 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 0', borderBottom: '1px solid var(--line)', marginBottom: 2 }}>
                                  <span>{cat}</span><span style={{ fontFamily: 'JetBrains Mono,monospace' }}>{fmtBR(catTotal)}</span>
                                </div>
                                <table>
                                  <tbody>
                                    {rows.map(({ tx, origIdx }) => {
                                      const isParcelado = tx.parcela_atual != null && tx.parcela_total != null && tx.valor_parcela != null;
                                      const val = parseFloat(tx.valor) || 0;
                                      return (
                                        <tr key={origIdx} style={{ background: isParcelado ? 'rgba(124,183,255,0.05)' : undefined }}>
                                          <td style={{ ...ESTILO_TABELA.celula, fontFamily: 'JetBrains Mono,monospace', fontSize: 12, whiteSpace: 'nowrap', width: 90 }}>{tx.data}</td>
                                          <td style={ESTILO_TABELA.celula}>
                                            <span>{tx.desc}</span>
                                            {isParcelado && <span style={{ display: 'block', fontSize: 11, color: '#CCFF00', fontFamily: 'JetBrains Mono,monospace', marginTop: 1 }}>{fmtParcela(tx)}</span>}
                                          </td>
                                          <td style={{ ...ESTILO_TABELA.celula, width: 50, textAlign: 'center' }}>
                                            <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: tx.origem === 'PJ' ? 'rgba(167,139,250,0.15)' : 'var(--bg-3)', color: tx.origem === 'PJ' ? 'var(--accent)' : 'var(--text-dim)' }}>{tx.origem}</span>
                                          </td>
                                          <td style={{ ...ESTILO_TABELA.celula, textAlign: 'right', fontFamily: 'JetBrains Mono,monospace', color: val < 0 ? 'var(--danger)' : isParcelado ? 'var(--info)' : undefined }}>{fmtBR(val)}</td>
                                          <td style={{ width: 36, textAlign: 'right' }}><button className="btn-del" onClick={() => delRow('card-tx', origIdx)} title="Remover">✕</button></td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            );
                          })
                      }
                      {isAddOpen ? (
                        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 8, padding: '14px 16px', marginTop: 12 }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr 170px 70px 100px', gap: 8, marginBottom: 10 }}>
                            <input type="date" value={addFormDraft.data} onChange={e => setAddFormDraft(d => ({ ...d, data: e.target.value }))} style={inputStyle} />
                            <input type="text" placeholder="Descrição" value={addFormDraft.desc} onChange={e => setAddFormDraft(d => ({ ...d, desc: e.target.value }))} style={inputStyle} />
                            <select value={addFormDraft.cat} onChange={e => setAddFormDraft(d => ({ ...d, cat: e.target.value }))} style={inputStyle}>{CATS_CARD.map(c => <option key={c}>{c}</option>)}</select>
                            <select value={addFormDraft.origem} onChange={e => setAddFormDraft(d => ({ ...d, origem: e.target.value }))} style={inputStyle}><option>PF</option><option>PJ</option></select>
                            <input type="number" placeholder="Valor" value={addFormDraft.valor} onChange={e => setAddFormDraft(d => ({ ...d, valor: e.target.value }))} style={{ ...inputStyle, fontFamily: 'JetBrains Mono,monospace', textAlign: 'right' }} />
                          </div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-dim)', cursor: 'pointer', marginBottom: addFormDraft.parcelado ? 10 : 0 }}>
                            <input type="checkbox" checked={addFormDraft.parcelado} onChange={e => setAddFormDraft(d => ({ ...d, parcelado: e.target.checked }))} />
                            É parcelado?
                          </label>
                          {addFormDraft.parcelado && (
                            <div style={{ display: 'grid', gridTemplateColumns: '90px 90px 130px 150px', gap: 8, marginTop: 8 }}>
                              <div><div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 3 }}>Parcela atual</div><input type="number" value={addFormDraft.parcela_atual} onChange={e => setAddFormDraft(d => ({ ...d, parcela_atual: parseInt(e.target.value) || 1 }))} style={inputStyle} /></div>
                              <div><div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 3 }}>Total parcelas</div><input type="number" value={addFormDraft.parcela_total} onChange={e => setAddFormDraft(d => ({ ...d, parcela_total: parseInt(e.target.value) || 2 }))} style={inputStyle} /></div>
                              <div><div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 3 }}>Valor/parcela (R$)</div><input type="number" placeholder="0,00" value={addFormDraft.valor_parcela} onChange={e => setAddFormDraft(d => ({ ...d, valor_parcela: e.target.value }))} style={{ ...inputStyle, fontFamily: 'JetBrains Mono,monospace' }} /></div>
                              <div><div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 3 }}>Data término</div><input type="month" value={addFormDraft.data_termino} onChange={e => setAddFormDraft(d => ({ ...d, data_termino: e.target.value }))} style={inputStyle} /></div>
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                            <button className="btn btn-primary" onClick={() => saveAddForm(card.nome)}>Salvar</button>
                            <button className="btn" onClick={() => { setAddFormCard(null); setAddFormDraft({ data: '', desc: '', cat: CATS_CARD[0], origem: 'PF', valor: '', parcelado: false, parcela_atual: 1, parcela_total: 2, valor_parcela: '', data_termino: '' }); }}>Cancelar</button>
                          </div>
                        </div>
                      ) : (
                        <div className="add-row" style={{ marginTop: 10 }}>
                          <button className="btn btn-primary" onClick={() => setAddFormCard(card.nome)}>+ Lançamento</button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              <div className="block">
                <div className="block-head"><div className="block-title">⚙️ Gerenciar Cartões</div></div>
                <div className="block-body">
                  <TableInner data={m['cards'] || []} fields={[
                    { k: 'nome', type: 'text', ph: 'Nome do cartão' },
                    { k: 'bandeira', type: 'select', opts: ['Visa', 'Mastercard', 'Elo', 'American Express', 'Hipercard', 'Outros'] },
                    { k: 'titular', type: 'select', opts: ['PJ', 'PF'] },
                    { k: 'limite', type: 'number', right: true },
                    { k: 'fatura', type: 'number', right: true },
                    { k: 'venc', type: 'text', ph: 'dia' },
                  ]} headers={['Cartão', 'Bandeira', 'Titularidade', 'Limite', 'Fatura atual', 'Vence dia']}
                    onUpd={(i, f, v) => updRow('cards', i, f, v)} onDel={i => delRow('cards', i)} />
                  <div className="add-row"><button className="btn btn-primary" onClick={() => addRow('cards')}>+ Adicionar cartão</button></div>
                </div>
              </div>

              {txs.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 8px', marginTop: 4, borderTop: '2px solid var(--line)', fontWeight: 600, color: 'var(--accent)', fontFamily: 'JetBrains Mono,monospace', fontSize: 13 }}>
                  <span>TOTAL GERAL CARTÕES</span><span>{fmtBR(totalGeral)}</span>
                </div>
              )}
            </section>
          );
        })()}

        {/* FLUXO */}
        {activeTab === 'fluxo' && <FluxoTab m={m} fmtBR={fmtBR} />}

        {/* METAS */}
        {activeTab === 'metas' && (
          <section>
            <h2 className="section-title">Metas Mensais</h2>
            <p className="section-sub">Objetivos financeiros e reserva</p>

            <TableBlock title="🎯 Metas do mês"
              data={m['metas'] || []} fields={[
                { k: 'meta', type: 'text', ph: 'Descrição da meta' },
                { k: 'cat', type: 'select', opts: ['Faturamento', 'Reserva', 'Investimento', 'Pessoal', 'Equipe', 'Outros'] },
                { k: 'alvo', type: 'number', right: true },
                { k: 'real', type: 'number', right: true },
                { k: 'progress', type: 'progress' },
              ]} headers={['Meta', 'Categoria', 'Alvo (R$)', 'Realizado (R$)', 'Progresso']}
              onUpd={(i, f, v) => updRow('metas', i, f, v)} onDel={i => delRow('metas', i)} onAdd={() => addRow('metas')} />

            <TableBlock title="💎 Reserva e Investimentos"
              data={m['reserva'] || []} fields={[
                { k: 'desc', type: 'text', ph: 'Descrição' },
                { k: 'tipo', type: 'text', ph: 'Tipo de aplicação' },
                { k: 'saldo', type: 'number', right: true },
                { k: 'aporte', type: 'number', right: true },
              ]} headers={['Descrição', 'Tipo', 'Saldo atual (R$)', 'Aporte mês (R$)']}
              onUpd={(i, f, v) => updRow('reserva', i, f, v)} onDel={i => delRow('reserva', i)} onAdd={() => addRow('reserva')}
              totalLabel="TOTAL RESERVA" totalSpan={2} totalValue={fmtBR((m['reserva'] || []).reduce((s: number, r: any) => s + (parseFloat(r.saldo) || 0), 0))} />
          </section>
        )}

        {/* INVESTIMENTOS */}
        {activeTab === 'investimentos' && (() => {
          const invs: any[] = m['investimentos'] || [];
          const totalPatrimonio = invs.reduce((s, inv) => s + parseFloat(inv.saldo) * (inv.moeda === 'USD' ? usdRate : inv.moeda === 'EUR' ? eurRate : 1), 0);
          console.log('usdRate at calc:', usdRate, 'eurRate:', eurRate);
          console.log('inv sample:', m['investimentos']?.map((i:any) => ({nome: i.nome, moeda: i.moeda, saldo: i.saldo, converted: parseFloat(i.saldo) * (i.moeda === 'USD' ? usdRate : i.moeda === 'EUR' ? eurRate : 1)})));
          return (
            <section>
              <h2 className="section-title">📈 Investimentos</h2>
              <p className="section-sub">Portfólio de investimentos e patrimônio total convertido em BRL</p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-block', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 5, padding: '3px 10px', fontSize: 11, fontFamily: 'JetBrains Mono,monospace', color: eurRateStatus === 'offline' ? 'var(--warn)' : 'var(--text-dim)' }}>
                  {eurRateStatus === 'offline' ? '⚠ EUR offline' : `€1 = R$ ${eurRate.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (média 30 dias)`}
                </span>
                <span style={{ display: 'inline-block', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 5, padding: '3px 10px', fontSize: 11, fontFamily: 'JetBrains Mono,monospace', color: usdRateStatus === 'offline' ? 'var(--warn)' : 'var(--text-dim)' }}>
                  {usdRateStatus === 'offline' ? '⚠ USD offline' : `US$1 = R$ ${usdRate.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (média 30 dias)`}
                </span>
              </div>
              <div className="kpi-grid">
                <div className="kpi"><div className="kpi-label">Total Patrimônio</div><div className="kpi-value pos">{fmtBR(totalPatrimonio)}</div><div className="kpi-meta">{invs.length} investimento{invs.length !== 1 ? 's' : ''}</div></div>
              </div>
              <div className="block">
                <div className="block-head"><div className="block-title">💼 Carteira de Investimentos</div></div>
                <div className="block-body">
                  <table>
                    <thead>
                      <tr>
                        <th>Nome</th>
                        <th>Tipo</th>
                        <th>Moeda</th>
                        <th style={{ textAlign: 'right' }}>Saldo</th>
                        <th style={{ textAlign: 'right' }}>Saldo em R$</th>
                        <th>Anotação</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {invs.length === 0
                        ? <tr><td colSpan={7} style={{ padding: '24px 8px', color: 'var(--text-dim)', textAlign: 'center', fontSize: 13 }}>Nenhum investimento cadastrado.</td></tr>
                        : invs.map((inv: any, i: number) => {
                          const saldoBRL = parseFloat(inv.saldo) * (inv.moeda === 'USD' ? usdRate : inv.moeda === 'EUR' ? eurRate : 1);
                          return (
                            <tr key={i}>
                              <td style={ESTILO_TABELA.celula}><input type="text" defaultValue={inv.nome || ''} placeholder="Nome" onBlur={e => updRow('investimentos', i, 'nome', e.target.value)} /></td>
                              <td style={ESTILO_TABELA.celula}>
                                <select value={inv.tipo || 'Renda Fixa'} onChange={e => updRow('investimentos', i, 'tipo', e.target.value)}>
                                  {['Renda Fixa','Fundo de Investimento','Cripto','Internacional'].map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                              </td>
                              <td style={ESTILO_TABELA.celula}>
                                <select value={inv.moeda || 'BRL'} onChange={e => updRow('investimentos', i, 'moeda', e.target.value)}>
                                  {['BRL','USD','EUR'].map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                              </td>
                              <td style={{ ...ESTILO_TABELA.celula, textAlign: 'right' }}><input type="number" step="0.01" defaultValue={inv.saldo || ''} onBlur={e => updRow('investimentos', i, 'saldo', parseFloat(e.target.value) || 0)} /></td>
                              <td style={{ ...ESTILO_TABELA.celula, textAlign: 'right', fontFamily: 'JetBrains Mono,monospace', color: 'var(--accent)' }}>{fmtBR(saldoBRL)}</td>
                              <td style={ESTILO_TABELA.celula}><input type="text" defaultValue={inv.anotacao || ''} placeholder="Anotação" onBlur={e => updRow('investimentos', i, 'anotacao', e.target.value)} /></td>
                              <td style={{ ...ESTILO_TABELA.celula, width: 36, textAlign: 'right' }}><button className="btn-del" onClick={() => delRow('investimentos', i)} title="Remover">✕</button></td>
                            </tr>
                          );
                        })
                      }
                    </tbody>
                  </table>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 8px 0', marginTop: 8, borderTop: '2px solid var(--line)', fontWeight: 600, color: 'var(--accent)', fontFamily: 'JetBrains Mono,monospace', fontSize: 13 }}>
                    <span>TOTAL PATRIMÔNIO</span><span>{fmtBR(totalPatrimonio)}</span>
                  </div>
                  <div className="add-row"><button className="btn btn-primary" onClick={() => addRow('investimentos')}>＋ Adicionar Investimento</button></div>
                </div>
              </div>
            </section>
          );
        })()}

        {/* DRE */}
        {activeTab === 'dre' && <DreTab m={m} recPJ={recPJ} custPJ={custPJ} recPJReceived={recPJReceived} fmtBR={fmtBR} fmtPct={fmtPct} sumValor={sumValor} updateMonth={updateMonth} />}

        {/* CENÁRIOS */}
        {activeTab === 'cenarios' && <CenariosTab recTotal={recTotal} custTotal={custTotal} fmtBR={fmtBR} fmtPct={fmtPct} />}

      </main>
    </div>
  );
}

/* ============ COMPONENTES REUTILIZÁVEIS ============ */
function TableBlock(props: any) {
  return (
    <div className="block">
      <div className="block-head">
        <div className="block-title">{props.title} {props.badge && <span className={`badge ${props.badgeClass || ''}`}>{props.badge}</span>}</div>
      </div>
      <div className="block-body">
        <TableInner {...props} />
        {props.totalLabel && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 8px 0', marginTop: 8, borderTop: '2px solid var(--line)', fontWeight: 600, color: 'var(--accent)', fontFamily: 'JetBrains Mono,monospace', fontSize: 13 }}>
            <span>{props.totalLabel}</span>
            <span>{props.totalValue}</span>
          </div>
        )}
        {props.onAdd && <div className="add-row"><button className="btn btn-primary" onClick={props.onAdd}>+ Adicionar</button></div>}
      </div>
    </div>
  );
}

function TableInner({ data, fields, headers, onUpd, onDel, getRowStyle }: any) {
  return (
    <table>
      <thead><tr>{headers.map((h: string, i: number) => <th key={i} style={{ textAlign: fields[i]?.right ? 'right' : 'left' }}>{h}</th>)}<th></th></tr></thead>
      <tbody>
        {data.length === 0 ? <tr><td colSpan={headers.length + 1} style={{ padding: '24px 8px', color: 'var(--text-dim)', textAlign: 'center', fontSize: 13 }}>Nenhum lançamento.</td></tr> :
          data.map((row: any, i: number) => (
            <tr key={i} style={getRowStyle ? getRowStyle(row) : undefined}>
              {fields.map((f: any, j: number) => (
                <td key={j} className={f.right ? 'right' : ''}>
                  {renderField(f, row, i, onUpd)}
                </td>
              ))}
              <td style={{ width: 36, textAlign: 'right' }}><button className="btn-del" onClick={() => onDel(i)} title="Remover">✕</button></td>
            </tr>
          ))
        }
      </tbody>
    </table>
  );
}

function renderField(f: any, row: any, i: number, onUpd: any) {
  if (f.type === 'text')
    return <input type="text" defaultValue={row[f.k] ?? ''} placeholder={f.ph || ''} onBlur={e => onUpd(i, f.k, e.target.value)} />;
  if (f.type === 'number')
    return <input type="number" step="0.01" defaultValue={row[f.k] || ''} onBlur={e => onUpd(i, f.k, parseFloat(e.target.value) || 0)} />;
  if (f.type === 'select')
    return <select value={row[f.k] || f.opts[0]} onChange={e => onUpd(i, f.k, e.target.value)}>{f.opts.map((o: string) => <option key={o} value={o}>{o}</option>)}</select>;
  if (f.type === 'check')
    return <input type="checkbox" checked={!!row[f.k]} onChange={e => onUpd(i, f.k, e.target.checked)} style={{ width: 'auto' }} />;
  if (f.type === 'check-pill') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
        <input type="checkbox" checked={!!row[f.k]} onChange={e => onUpd(i, f.k, e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#22C55E' }} />
        <PillStatus recebido={!!row[f.k]} dia={row[f.diaPgtoKey] || ''} mesRef={f.mesRef} />
      </div>
    );
  }
  if (f.type === 'cardSelect')
    return <select value={row[f.k] || ''} onChange={e => onUpd(i, f.k, e.target.value)}><option value="">—</option>{(f.cards || []).map((c: any, k: number) => <option key={k}>{c.nome}</option>)}</select>;
  if (f.type === 'progress') {
    const pct = row.alvo > 0 ? Math.min(100, (row.real / row.alvo) * 100) : 0;
    const cls = pct >= 80 ? '' : (pct >= 40 ? 'warn' : 'danger');
    return <>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono,monospace' }}>{(Math.round(pct * 10) / 10).toFixed(1)}%</div>
      <div className="progress"><div className={`progress-bar ${cls}`} style={{ width: `${pct}%` }}></div></div>
    </>;
  }
  return null;
}

function FluxoTab({ m, fmtBR }: any) {
  const events: any[] = [];
  (m['rec-pj'] || []).forEach((r: any) => { if (r.valor > 0) events.push({ data: '05', tipo: 'Entrada', desc: r.cliente, origem: 'PJ', valor: +r.valor }); });
  (m['rec-pf'] || []).forEach((r: any) => { if (r.valor > 0) events.push({ data: r.data || '05', tipo: 'Entrada', desc: r.origem, origem: 'PF', valor: +r.valor }); });
  (m['cust-pj'] || []).forEach((r: any) => { if (r.valor > 0) events.push({ data: r.venc || '15', tipo: 'Saída', desc: r.desc, origem: 'PJ', valor: -Math.abs(+r.valor) }); });
  (m['var-pj'] || []).forEach((r: any) => { if (r.valor > 0) events.push({ data: r.data || '20', tipo: 'Saída', desc: r.desc, origem: 'PJ', valor: -Math.abs(+r.valor) }); });
  (m['cust-pf'] || []).forEach((r: any) => { if (r.valor > 0) events.push({ data: r.venc || '15', tipo: 'Saída', desc: r.desc, origem: 'PF', valor: -Math.abs(+r.valor) }); });
  (m['var-pf'] || []).forEach((r: any) => { if (r.valor > 0) events.push({ data: r.data || '20', tipo: 'Saída', desc: r.desc, origem: 'PF', valor: -Math.abs(+r.valor) }); });
  events.sort((a, b) => (parseInt(a.data) || 0) - (parseInt(b.data) || 0));
  let saldo = 0, totIn = 0, totOut = 0;

  return (
    <section>
      <h2 className="section-title">Fluxo de Caixa</h2>
      <p className="section-sub">Movimentações do mês organizadas por data</p>
      <div className="kpi-grid">
        <div className="kpi"><div className="kpi-label">Entradas</div><div className="kpi-value pos">{fmtBR(events.filter(e => e.valor > 0).reduce((s, e) => s + e.valor, 0))}</div></div>
        <div className="kpi danger"><div className="kpi-label">Saídas</div><div className="kpi-value neg">{fmtBR(events.filter(e => e.valor < 0).reduce((s, e) => s + Math.abs(e.valor), 0))}</div></div>
        <div className="kpi pf"><div className="kpi-label">Saldo do mês</div><div className="kpi-value">{fmtBR(events.reduce((s, e) => s + e.valor, 0))}</div></div>
      </div>
      <div className="block">
        <div className="block-head"><div className="block-title">📅 Linha do tempo</div></div>
        <div className="block-body">
          <table>
            <thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Origem</th><th style={{ textAlign: 'right' }}>Valor</th><th style={{ textAlign: 'right' }}>Saldo</th></tr></thead>
            <tbody>
              {events.length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 24 }}>Sem movimentações.</td></tr> :
                events.map((e, i) => {
                  saldo += e.valor;
                  const color = e.valor >= 0 ? 'var(--accent)' : 'var(--danger)';
                  return (
                    <tr key={i}>
                      <td style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 12 }}>{e.data}</td>
                      <td><span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: e.valor >= 0 ? 'rgba(200,255,90,.1)' : 'rgba(255,107,138,.1)', color, fontFamily: 'JetBrains Mono,monospace' }}>{e.tipo}</span></td>
                      <td>{e.desc}</td>
                      <td><span className={`badge ${e.origem.toLowerCase()}`}>{e.origem}</span></td>
                      <td className="right" style={{ color }}>{fmtBR(e.valor)}</td>
                      <td className="right" style={{ color: saldo >= 0 ? 'var(--accent)' : 'var(--danger)', fontWeight: 600 }}>{fmtBR(saldo)}</td>
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function DreTab({ m, recPJ, custPJ, recPJReceived, fmtBR, fmtPct, sumValor, updateMonth }: any) {
  const cat = (c: string) => (m['cust-pj'] || []).filter((r: any) => r.cat === c).reduce((s: number, r: any) => s + (+r.valor || 0), 0);
  const custEquipe = cat('Equipe');
  const custFerr = cat('Ferramentas') + cat('Infra');
  const custAdm = cat('Administrativo') + cat('Marketing');
  const custImp = cat('Impostos');
  const custOut = cat('Outros');
  const variaveis = sumValor(m['var-pj']);
  const totalCustOp = custEquipe + custFerr + custAdm + custOut + variaveis;
  const ebitda = recPJ - totalCustOp;
  const lucro = ebitda - custImp;
  const ativos = (m['rec-pj'] || []).filter((r: any) => r.status === 'Ativo' && r.valor > 0);

  return (
    <section>
      <h2 className="section-title">DRE Simplificada · PJ</h2>
      <p className="section-sub">Demonstração de resultado da APR Digital</p>
      <div className="block"><div className="block-body">
        <div className="dre-row h"><span>Receita Bruta · PJ</span><span></span></div>
        <div className="dre-row"><span>(+) Faturamento de clientes</span><span className="v">{fmtBR(recPJ)}</span></div>
        <div className="dre-row h" style={{ marginTop: 8 }}><span>Custos Operacionais</span><span></span></div>
        <div className="dre-row neg indent"><span>Equipe e freelas</span><span className="v">- {fmtBR(custEquipe)}</span></div>
        <div className="dre-row neg indent"><span>Ferramentas e infraestrutura</span><span className="v">- {fmtBR(custFerr)}</span></div>
        <div className="dre-row neg indent"><span>Administrativo e marketing</span><span className="v">- {fmtBR(custAdm)}</span></div>
        <div className="dre-row neg indent"><span>Custos variáveis / projetos</span><span className="v">- {fmtBR(variaveis)}</span></div>
        <div className="dre-row neg indent"><span>Outros custos</span><span className="v">- {fmtBR(custOut)}</span></div>
        <div className="dre-row" style={{ borderTop: '1px solid var(--line)', paddingTop: 12, marginTop: 8 }}><span><strong>EBITDA</strong></span><span className="v" style={{ color: ebitda >= 0 ? 'var(--accent)' : 'var(--danger)', fontWeight: 600 }}>{fmtBR(ebitda)}</span></div>
        <div className="dre-row h" style={{ marginTop: 8 }}><span>Tributação</span><span></span></div>
        <div className="dre-row neg indent"><span>Impostos (Simples)</span><span className="v">- {fmtBR(custImp)}</span></div>
        <div className="dre-row total"><span>LUCRO LÍQUIDO PJ</span><span className="v">{fmtBR(lucro)}</span></div>
      </div></div>

      <div className="two-col">
        <div className="block"><div className="block-head"><div className="block-title">📈 Indicadores</div></div><div className="block-body">
          <div className="dre-row"><span>Ticket médio cliente</span><span className="v">{fmtBR(ativos.length ? recPJ / ativos.length : 0)}</span></div>
          <div className="dre-row"><span>Margem operacional</span><span className="v">{fmtPct(recPJ > 0 ? (lucro / recPJ) * 100 : 0)}</span></div>
          <div className="dre-row"><span>Custo fixo / Receita</span><span className="v">{fmtPct(recPJ > 0 ? (custPJ / recPJ) * 100 : 0)}</span></div>
          <div className="dre-row"><span>Clientes ativos</span><span className="v">{(m['rec-pj'] || []).filter((r: any) => r.status === 'Ativo').length}</span></div>
          <div className="dre-row"><span>Recebido / Faturado</span><span className="v">{fmtPct(recPJ > 0 ? (recPJReceived / recPJ) * 100 : 0)}</span></div>
        </div></div>
        <div className="block"><div className="block-head"><div className="block-title">💡 Observações</div></div><div className="block-body">
          <textarea defaultValue={m.notes || ''} onBlur={e => updateMonth((mm: any) => { mm.notes = e.target.value; return mm; })}
            style={{ width: '100%', minHeight: 160, background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--text)', padding: 12, borderRadius: 8, fontFamily: 'inherit', resize: 'vertical' }}
            placeholder="Anote aqui observações sobre o mês..." />
        </div></div>
      </div>
    </section>
  );
}

function CenariosTab({ recTotal, custTotal, fmtBR, fmtPct }: any) {
  const [pess, setPess] = useState(-30);
  const [real, setReal] = useState(0);
  const [opt, setOpt] = useState(40);
  const make = (label: string, pct: number, cls: string) => {
    const rec = recTotal * (1 + pct / 100);
    const res = rec - custTotal;
    const margem = rec > 0 ? (res / rec) * 100 : 0;
    return (
      <div className={`scenario ${cls}`}>
        <h4>{label}<span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 12, color: 'var(--text-dim)' }}>{pct >= 0 ? '+' : ''}{pct}%</span></h4>
        <div className="small">Receita projetada</div>
        <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 15, color: 'var(--text-soft)' }}>{fmtBR(rec)}</div>
        <div className="small" style={{ marginTop: 10 }}>Resultado líquido</div>
        <div className="big">{fmtBR(res)}</div>
        <div className="small">Margem {fmtPct(margem)}</div>
      </div>
    );
  };
  return (
    <section>
      <h2 className="section-title">Cenários · Projeção</h2>
      <p className="section-sub">Simulação do mês com 3 cenários</p>
      <div className="block"><div className="block-body">
        <div className="form-grid" style={{ marginBottom: 20 }}>
          <div><label style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.1em' }}>% Pessimista</label><input type="number" value={pess} step={5} onChange={e => setPess(+e.target.value || 0)} /></div>
          <div><label style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.1em' }}>% Realista</label><input type="number" value={real} step={5} onChange={e => setReal(+e.target.value || 0)} /></div>
          <div><label style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.1em' }}>% Otimista</label><input type="number" value={opt} step={5} onChange={e => setOpt(+e.target.value || 0)} /></div>
        </div>
        <div className="scenarios">
          {make('Pessimista', pess, 'pessimist')}
          {make('Realista', real, 'realist')}
          {make('Otimista', opt, 'optimist')}
        </div>
      </div></div>
    </section>
  );
}
