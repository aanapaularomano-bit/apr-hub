# 🔐 APR HUB — Autenticação por Senha

Este pacote adiciona uma camada de proteção por senha em TODO o APR Hub, incluindo `/financeiro`.

---

## ✅ ETAPA 1 — Configurar a senha no Vercel (5 min)

**Importante:** a senha NÃO fica no código. Ela é uma variável de ambiente no Vercel.

### 1.1. Abra o Vercel
- Vá em https://vercel.com/dashboard
- Faça login
- Clique no projeto **apr-hub-lime**

### 1.2. Vá nas configurações
- Clique em **Settings** (menu do topo)
- No menu da esquerda, clique em **Environment Variables**

### 1.3. Adicione DUAS variáveis

**Variável 1 — a senha:**
- **Key:** `APR_PASSWORD`
- **Value:** _(coloca aqui a senha que você quer usar — use algo forte, mínimo 12 caracteres com letras, números e símbolos)_
- **Environment:** marque TODAS as opções (Production, Preview, Development)
- Clique em **Save**

**Variável 2 — token de sessão:**
- Clique em **Add Another**
- **Key:** `APR_AUTH_SECRET`
- **Value:** _(uma string aleatória longa — pode ser qualquer coisa, tipo `apr-hub-2026-token-secreto-xyz123`)_
- **Environment:** marque TODAS as opções
- Clique em **Save**

### 1.4. Resultado esperado
Você deve ver as 2 novas variáveis listadas:
- ✅ APR_PASSWORD
- ✅ APR_AUTH_SECRET

---

## ✅ ETAPA 2 — Subir o código (5 min)

### 2.1. Abra o Terminal e vá pra pasta do APR Hub
```bash
cd ~/Downloads/apr-hub
```

### 2.2. Coloca o ZIP `apr-auth-update.zip` na pasta apr-hub (pelo Finder)

### 2.3. Descompacta
```bash
unzip -o apr-auth-update.zip
```

**Resultado esperado:** vai criar/atualizar:
- `middleware.ts` (na raiz)
- `app/login/page.tsx`
- `app/api/login/route.ts`
- `app/api/logout/route.ts`

### 2.4. Testa o build
```bash
npx next build
```

Espera ver `✓ Compiled successfully` e a rota `/login` listada.

### 2.5. Sobe pro GitHub
```bash
git add .
```
```bash
git commit -m "feat: adiciona autenticacao por senha no APR Hub"
```
```bash
git push
```

### 2.6. Dispara o deploy
```bash
curl -X POST "https://api.vercel.com/v1/integrations/deploy/prj_iSX9RPuc1GG6s67fRflFWGUEQ7KV/fTensUY8a3"
```

### 2.7. Aguarde 2-3 minutos

---

## 🎉 Como vai funcionar

1. Abra https://apr-hub-lime.vercel.app
2. Vai redirecionar pra `/login` automaticamente
3. Digite a senha que você cadastrou no Vercel
4. Entrou! Fica logada por 30 dias.

### Sair manualmente
Acesse: https://apr-hub-lime.vercel.app/api/logout
(vai te deslogar e redirecionar pro login)

### Trocar senha
Vá no Vercel → Settings → Environment Variables → edita `APR_PASSWORD` → salva → o próximo deploy ativa.

---

## 🆘 Se der ruim

- **"Senha incorreta" mesmo digitando certo:** confira se você salvou a variável no Vercel pra TODAS as environments (Production, Preview, Development) e se fez novo deploy depois.
- **Não redireciona pro login:** limpe cookies do navegador (Cmd+Shift+Delete) e tente de novo.
- **Erro 500:** verifique se as DUAS variáveis estão no Vercel (`APR_PASSWORD` e `APR_AUTH_SECRET`).
