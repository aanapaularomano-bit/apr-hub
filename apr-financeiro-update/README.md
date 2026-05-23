# APR FINANCEIRO — Instalação no APR Hub

Siga **na ordem**. Cada etapa tem o que esperar como resultado.

---

## ✅ ETAPA 1 — Criar a tabela no Supabase (5 min)

### 1.1. Abra o Supabase
- Vá em: https://supabase.com/dashboard
- Faça login
- Entre no projeto `blpmrbtiruundbwzftfs` (seu projeto APR Hub)

### 1.2. Vá no SQL Editor
- No menu da esquerda, clique em **SQL Editor** (ícone tipo `</>` ou "SQL")
- Clique em **+ New query** (botão verde no canto)

### 1.3. Cole o SQL e rode
- Abra o arquivo `SUPABASE_SETUP.sql` que está dentro do ZIP
- Copie TODO o conteúdo
- Cole na janela do SQL Editor
- Clique no botão **Run** (canto inferior direito, ou aperte `Cmd+Enter` / `Ctrl+Enter`)

### 1.4. Resultado esperado
Você deve ver no painel de baixo:
```
status
Tabela apr_financeiro criada com sucesso!
```

Se aparecer erro, me manda print que eu te ajudo.

---

## ✅ ETAPA 2 — Subir o código no APR Hub (10 min)

### 2.1. Abra o Terminal
- No Mac: `Cmd + Espaço` → digita "Terminal" → Enter
- Você verá uma janela preta/branca com texto

### 2.2. Vá pra pasta do APR Hub
Cole o comando abaixo e aperte Enter (ajusta o caminho se a sua pasta tem outro nome):

```bash
cd ~/Desktop/apr-hub
```

Se a pasta estiver em outro lugar, use:
```bash
cd /caminho/para/apr-hub
```

**Como saber se deu certo:** o terminal vai mudar pra `apr-hub %` ou `apr-hub $`. Você está dentro da pasta agora.

### 2.3. Descompacte o ZIP nessa pasta
Mova o arquivo `apr-financeiro-update.zip` pra dentro da pasta `apr-hub` (com a mão, pelo Finder).

Depois, no Terminal:

```bash
unzip -o apr-financeiro-update.zip
```

**Resultado esperado:**
```
Archive:  apr-financeiro-update.zip
  inflating: app/financeiro/page.tsx
  inflating: SUPABASE_SETUP.sql
  inflating: README.md
```

### 2.4. Verifique se o Supabase já está instalado
Cole:
```bash
cat package.json | grep supabase
```

- **Se aparecer** `"@supabase/supabase-js"`: ✅ já está instalado, pule pro passo 2.6
- **Se não aparecer nada**: rode o comando abaixo:

```bash
npm install @supabase/supabase-js
```

Aguarda terminar (vai aparecer "added X packages" no final).

### 2.5. Confira as variáveis de ambiente
Cole:
```bash
cat .env.local | grep SUPABASE
```

Você precisa ter estas duas linhas:
```
NEXT_PUBLIC_SUPABASE_URL=https://blpmrbtiruundbwzftfs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<sua-chave-anon>
```

**Se não tiver, você precisa adicionar.** No Supabase Dashboard → Settings → API → copia o **anon public** e cola no `.env.local`.

> ⚠ **Importante:** as variáveis também precisam estar no **Vercel** (Settings → Environment Variables do projeto). Senão o deploy não funciona.

### 2.6. Testa localmente antes de subir
Cole:
```bash
npx next build
```

Aguarda. Se aparecer `✓ Compiled successfully` no final, está tudo certo.

Se der erro, copia o erro e me manda.

### 2.7. Sobe pra produção
Cole, um comando de cada vez:

```bash
git add .
```
```bash
git commit -m "feat: adiciona /financeiro com persistência Supabase"
```
```bash
git push
```

### 2.8. Dispara o deploy do Vercel
```bash
curl -X POST "https://api.vercel.com/v1/integrations/deploy/prj_iSX9RPuc1GG6s67fRflFWGUEQ7KV/fTensUY8a3"
```

**Resultado esperado:**
```json
{"job":{"id":"...","state":"PENDING"}}
```

### 2.9. Acompanhe o deploy
- Espera uns 2–3 minutos
- Abre: https://apr-hub-lime.vercel.app/financeiro

🎉 Pronto! Os dados já vão salvar direto no Supabase, sincronizando entre celular e computador.

---

## 🆘 Se der ruim

Me manda:
1. Print do erro
2. Em qual passo travou
3. O que apareceu no Terminal

Eu te desbloqueio.
