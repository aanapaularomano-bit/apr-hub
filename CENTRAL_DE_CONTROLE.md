# Central de Controle — Brief de Implementação (APR Hub)

> Este arquivo é o roteiro para o Claude Code implementar a **Central de Controle** de clientes do APR Hub.
> Leia por completo antes de mexer em qualquer coisa. Trabalhe de forma **incremental** e **sem quebrar** o que já funciona.

---

## 1. Objetivo

Uma tela única que, ao abrir o Hub, mostra **tudo que está rodando em todos os clientes de forma clara**: o que está ativo, quanto está investindo, como está performando e **quais contas precisam de atenção agora** (alertas). Era a ideia inicial do projeto. Essa é a tela que a Ana Paula abre de manhã pra saber onde precisa agir.

## 2. Onde vive

- Criar a rota `/central` **e** torná-la a tela inicial ao entrar no Hub (landing após login).
- Manter o restante da navegação intacto. A Central é um novo ponto de partida, não um substituto dos módulos existentes.

## 3. Fonte de dados (IMPORTANTE — reaproveitar, não recriar)

- Os dados do Meta Ads **já chegam** pela integração **Stract → Google Sheets → rota `sync-sheets`**, com a Google Sheets API Key configurada, botão de sync manual e cron diário na Vercel.
- **Use essa fonte.** NÃO crie uma integração nova com a Marketing API da Meta a menos que seja explicitamente pedido.
- Antes de construir: mapeie quais métricas e quais clientes já vêm por essa ponte hoje, e reutilize os dados do módulo **Funil & Métricas**.
- Se algum cliente ainda não tiver dados fluindo, mostrar o card dele em estado "sem dados / sync pendente" (não travar a tela).

## 4. O que mostrar — por cliente (card)

Cada cliente é um card com:

- **Nome do cliente + squad** (Lançamentos / Perpétuo / Negócios Locais)
- **Status da conta**: Ativa / Pausada / Sem dados
- **Nº de campanhas ativas**
- **Métricas do período (últimos 7 dias) com comparativo vs. período anterior** (seta ↑/↓):
  - Investimento
  - Leads
  - CPL
  - CPA
  - Vendas / Faturamento (quando houver)
  - ROAS
  - CTR
  - CPM
- **Selo de alerta** no canto do card quando houver algo crítico (ver seção 6)
- **Próxima ação** (se já existir no módulo de Estratégias/CRM, puxar; senão, deixar o campo pronto)

## 5. Visão macro (topo da tela)

Uma faixa de números-resumo somando todos os clientes:

- Total investido (hoje e 7d)
- Total de leads (7d)
- ROAS médio ponderado
- Nº de campanhas ativas
- **Nº de contas com alerta crítico** (destaque)

## 6. Alertas (o coração da Central)

Painel/lista de alertas ordenado por severidade. Regras iniciais (deixar fáceis de editar em um único lugar, tipo um arquivo de config):

| Regra | Severidade |
|---|---|
| Conta sem dados novos há 2+ dias (sync falhou ou campanha parada) | Crítico |
| Investimento diário zerado em campanha que deveria estar ativa | Crítico |
| CPL acima do teto definido para o cliente | Atenção |
| ROAS abaixo da meta do cliente | Atenção |
| Verba do período >90% consumida | Atenção |
| Ritmo de leads/vendas abaixo do necessário pra bater a meta | Atenção |

Cada alerta mostra: **cliente**, **o que está acontecendo**, **severidade** e **o que fazer**. Reaproveitar o módulo de **Alertas** já existente se ele servir; senão, criar um serviço simples que calcula esses alertas a partir dos dados da seção 3.

## 7. Filtros e busca

- Filtro por **squad** (Lançamentos / Perpétuo / Negócios Locais)
- Filtro por **status** (Ativa / Pausada / Sem dados)
- Filtro por **severidade de alerta** (só críticos, só atenção)
- Busca por nome de cliente

## 8. Design (seguir o sistema que já existe no Hub)

- Tema **dark**, no mesmo padrão visual do Hub.
- Tipografia: **Space Grotesk** (títulos), **JetBrains Mono** (números/métricas), **Fraunces** (destaques editoriais).
- Acento **verde ácido / neon**.
- Cards limpos, números grandes e legíveis, escaneável em 5 segundos.
- **Não exibir** nenhum contador social (likes/compartilhamentos) — não se aplica aqui.

## 9. Reaproveitar o que já existe

- Dados: `sync-sheets`, integração Stract, Google Sheets API, módulo **Funil & Métricas**.
- **Alertas**: reusar o módulo existente se possível.
- **Status/próxima ação**: puxar do **CRM** e **Estratégias**.
- Componentes de UI e tema: reusar os já existentes, não reinventar.

## 10. Regras para o Claude Code (importante)

1. **Auditar antes de editar.** Primeiro entenda como os dados chegam e o que já existe.
2. **Incremental.** Uma parte de cada vez; rodar `npm run build` após cada parte e corrigir erros antes de seguir.
3. **Não quebrar** rotas, módulos ou o deploy existentes.
4. **Não** criar integração nova com a Meta sem pedir confirmação.
5. **Perguntar antes** de qualquer operação destrutiva (apagar arquivos, resetar dados, mudar schema do Supabase).
6. Ao final: commit com mensagem clara e explicar o que foi feito em linguagem simples.
