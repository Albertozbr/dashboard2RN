# RV Commerce AI — Painel

Painel de operação para marketplaces (React + TypeScript + Tailwind/shadcn), com login, equipe,
vendas, anúncios, clientes, tarefas e alertas automáticos. **Começa vazio** — tudo o que aparece
é calculado a partir do que você cadastra.

---

## Publicar no GitHub Pages (sem servidor)

1. Crie um repositório no GitHub e envie esta pasta (sem `node_modules`, `dist` e `data` — o `.gitignore` já cuida disso):
   ```bash
   git init
   git add .
   git commit -m "Painel RV Commerce"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
   git push -u origin main
   ```
2. No GitHub, abra o repositório → **Settings → Pages** → em *Source* escolha **GitHub Actions**.
3. Pronto: a cada `git push` o site é publicado sozinho (aba **Actions** mostra o andamento).
   O endereço fica `https://SEU-USUARIO.github.io/SEU-REPOSITORIO/`.
4. No primeiro acesso, crie o login de **administrador**. Depois disso o cadastro fecha;
   novos acessos são criados em **Configurações → Acesso da equipe**.

> **Importante — como funciona sem servidor:** no GitHub Pages os dados e os logins ficam salvos
> **no navegador de quem usa** (cada computador tem os seus). Use **Minha conta → Exportar backup**
> com frequência; o mesmo arquivo serve para levar os dados a outro computador (**Restaurar backup**).
> Para a equipe toda compartilhar os mesmos dados em tempo real, use a versão com servidor (abaixo).

Para testar a versão do Pages no seu computador:
```bash
npm run build:pages
npm run preview:pages
```

---

## Rodar com servidor (dados compartilhados pela equipe)

```bash
npm install
npm run dev        # http://localhost:5173  (site + servidor juntos)
```
Produção num servidor/VPS: `npm run build` e depois `npm start` (porta 3001, ou a variável `PORT`).
Os dados ficam em `data/banco.json`. Em produção defina `SESSION_SECRET` (texto longo aleatório) e,
se usar HTTPS, `COOKIE_SECURE=1`. Para apagar tudo e recomeçar: pare o servidor e rode `npm run reset-db`.

---

## O que o painel faz

| Área | Funções |
|---|---|
| Primeiro acesso / Login | Cria o administrador; depois só entra quem tem acesso. |
| Visão geral | Faturamento, pedidos, ticket médio, cancelados e gráfico por período — calculados das vendas. Primeiros passos até o painel estar configurado. |
| Vendas | Registrar, editar, excluir, mudar status (Pago → Enviado → Entregue / Cancelado), busca e filtros. |
| Anúncios | Cadastro com preço, custo (margem), estoque, conta, frete grátis; busca e filtros. |
| Clientes | Cadastro, busca; total comprado e última compra calculados das vendas. |
| Integrações | Contas/lojas por canal e vendas dos últimos 30 dias por canal. |
| Ações prioritárias | Alertas automáticos: anúncio ativo sem estoque, estoque baixo (≤ 5), pedido pago há mais de 2 dias sem envio, tarefa atrasada. |
| Tarefas | Criar, concluir, excluir; responsáveis vêm da equipe. |
| Acesso da equipe | Administrador cria e remove acessos (membro ou administrador). |
| Execuções | Histórico de todas as ações. |
| Minha conta | Nome, e-mail, senha, tema claro/escuro, backup. |
| Busca (Ctrl + K) | Páginas, clientes, anúncios e vendas. |

Itens do menu com o selo **BREVE** já têm endereço e mostram uma tela provisória.

## Estrutura

```
shared/core.js     ← TODAS as regras e rotas (usadas pelo servidor e pela versão do Pages)
server/            ← servidor Express opcional (sessão por cookie, dados em data/banco.json)
src/lib/local-backend.ts ← versão do Pages: as mesmas regras rodando no navegador
src/pages/         ← telas
src/components/    ← layout, menu e componentes (shadcn em components/ui)
.github/workflows/deploy-pages.yml ← publicação automática no GitHub Pages
```
