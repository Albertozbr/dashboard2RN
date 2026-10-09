// ─────────────────────────────────────────────────────────────────────────────
// Núcleo de regras do RV Commerce AI.
// O MESMO código roda em dois lugares:
//   • no servidor Express (server/index.js), com os dados em arquivo;
//   • direto no navegador (src/lib/local-backend.ts), para o GitHub Pages.
// Nada aqui depende de Node ou do navegador: recebe os dados, devolve respostas.
// ─────────────────────────────────────────────────────────────────────────────

export const CHANNELS = ["Mercado Livre", "Shopee", "SHEIN", "Loja própria", "Outro"];
export const ORDER_STATUS = ["Pago", "Enviado", "Entregue", "Cancelado"];
const TZ_OFFSET_MS = -3 * 3600000; // America/Sao_Paulo (sem horário de verão desde 2019)
const DAY = 86400000;
const LOW_STOCK = 5;

export function emptyData() {
  return {
    version: 2,
    users: [],
    contas: [],
    anuncios: [],
    clientes: [],
    pedidos: [],
    tarefas: [],
    atividades: [],
    dismissed: {}, // prioridades dispensadas: { [id]: true }
  };
}

/* ───────────── utilitários ───────────── */

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const fail = (msg, status = 400) => {
  throw new HttpError(status, msg);
};
const str = (v, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const num = (v) => (typeof v === "number" ? v : Number(String(v ?? "").replace(/\./g, "").replace(",", ".")));
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const norm = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const nextId = (list) => list.reduce((m, x) => Math.max(m, x.id), 0) + 1;
const nowIso = () => new Date().toISOString();
const round2 = (n) => Math.round(n * 100) / 100;

export function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt };
}

function paginate(list, q) {
  const pageSize = Math.min(100, Math.max(1, Number(q.pageSize) || 10));
  const total = list.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(pages, Math.max(1, Number(q.page) || 1));
  return { items: list.slice((page - 1) * pageSize, page * pageSize), total, page, pages, pageSize };
}

function log(data, user, action) {
  data.atividades.unshift({ id: nextId(data.atividades), person: { name: user.name }, action, at: nowIso() });
  data.atividades = data.atividades.slice(0, 500);
}

/* Datas no fuso de São Paulo */
const spDate = (ms) => new Date(ms + TZ_OFFSET_MS); // usar getUTC* nesta data
const spStartOfDay = (ms) => {
  const d = spDate(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - TZ_OFFSET_MS;
};
const ddmm = (ms) => {
  const d = spDate(ms);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};
const todayStr = () => spDate(Date.now()).toISOString().slice(0, 10);

function periodRange(period, now = Date.now()) {
  const today = spStartOfDay(now);
  switch (period) {
    case "ontem":
      return { start: today - DAY, end: today, prevStart: today - 2 * DAY, prevEnd: today - DAY, hourly: true };
    case "7d":
      return { start: today - 6 * DAY, end: today + DAY, prevStart: today - 13 * DAY, prevEnd: today - 6 * DAY, hourly: false };
    case "30d":
      return { start: today - 29 * DAY, end: today + DAY, prevStart: today - 59 * DAY, prevEnd: today - 29 * DAY, hourly: false };
    case "mes": {
      const d = spDate(now);
      const start = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) - TZ_OFFSET_MS;
      const days = Math.round((today + DAY - start) / DAY);
      const prevStart = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1) - TZ_OFFSET_MS;
      return { start, end: today + DAY, prevStart, prevEnd: prevStart + days * DAY, hourly: false };
    }
    default:
      return { start: today, end: today + DAY, prevStart: today - DAY, prevEnd: today, hourly: true };
  }
}

/* ───────────── prioridades calculadas a partir dos dados ───────────── */

export function computePriorities(data) {
  const out = [];
  const today = todayStr();
  for (const a of data.anuncios) {
    if (a.status === "Ativo" && a.stock === 0)
      out.push({ id: `sem-estoque-${a.id}`, level: "Crítico", title: `Anúncio ativo sem estoque: ${a.title}`, detail: [a.account || a.channel, a.sku && `SKU ${a.sku}`].filter(Boolean).join(" · "), link: `/operacao/anuncios?q=${encodeURIComponent(a.sku || a.title)}` });
    else if (a.status === "Ativo" && a.stock > 0 && a.stock <= LOW_STOCK)
      out.push({ id: `estoque-baixo-${a.id}`, level: "Alta prioridade", title: `Estoque baixo (${a.stock} un.): ${a.title}`, detail: [a.account || a.channel, a.sku && `SKU ${a.sku}`].filter(Boolean).join(" · "), link: `/operacao/anuncios?q=${encodeURIComponent(a.sku || a.title)}` });
  }
  for (const p of data.pedidos) {
    if (p.status === "Pago" && Date.now() - new Date(p.date).getTime() > 2 * DAY)
      out.push({ id: `pedido-parado-${p.id}`, level: "Crítico", title: `Pedido #${p.number || p.id} pago há mais de 2 dias sem envio`, detail: `${p.clienteName || "Cliente"} · ${p.channel}`, link: `/operacao/vendas?status=Pago` });
  }
  for (const t of data.tarefas) {
    if (t.status === "pendente" && t.due < today)
      out.push({ id: `tarefa-atrasada-${t.id}`, level: "Alta prioridade", title: `Tarefa atrasada: ${t.title}`, detail: `Responsável: ${t.assignee}`, link: "/tarefas" });
  }
  const order = { Crítico: 0, "Alta prioridade": 1, Média: 2 };
  return out
    .map((p) => ({ ...p, dismissed: Boolean(data.dismissed[p.id]) }))
    .sort((a, b) => order[a.level] - order[b.level]);
}

/* ───────────── rotas ───────────── */

const routes = [];
const route = (method, pattern, handler, opts = {}) => {
  const keys = [];
  const re = new RegExp("^" + pattern.replace(/:(\w+)/g, (_, k) => (keys.push(k), "([^/]+)")) + "$");
  routes.push({ method, re, keys, handler, ...opts });
};

/* Autenticação — o adaptador (servidor ou navegador) cuida da sessão em si */
route("GET", "/auth/status", ({ data }) => ({ hasUsers: data.users.length > 0 }), { public: true });

route("POST", "/auth/login", async ({ data, body, crypto }) => {
  const email = str(body?.email).toLowerCase();
  const user = data.users.find((u) => u.email === email);
  if (!user || !(await crypto.verify(String(body?.password ?? ""), user))) fail("E-mail ou senha incorretos.", 401);
  return { body: { user: publicUser(user) }, session: user.id };
}, { public: true });

route("POST", "/auth/register", async ({ data, body, crypto }) => {
  // Cadastro público só existe para criar o PRIMEIRO acesso (administrador).
  if (data.users.length > 0) fail("O cadastro está fechado. Peça um convite ao administrador.", 403);
  const name = str(body?.name, 80);
  const email = str(body?.email).toLowerCase();
  const password = String(body?.password ?? "");
  if (name.length < 2) fail("Informe seu nome.");
  if (!EMAIL_RE.test(email)) fail("Informe um e-mail válido.");
  if (password.length < 8) fail("A senha precisa ter pelo menos 8 caracteres.");
  const user = { id: 1, name, email, role: "admin", ...(await crypto.hash(password)), createdAt: nowIso() };
  data.users.push(user);
  log(data, user, "criou o painel");
  return { status: 201, body: { user: publicUser(user) }, session: user.id, save: true };
}, { public: true });

route("POST", "/auth/logout", () => ({ body: { ok: true }, session: null }), { public: true });
route("GET", "/auth/me", ({ user }) => ({ user: publicUser(user) }));

/* Minha conta */
route("PATCH", "/me", ({ data, user, body }) => {
  const name = str(body?.name, 80);
  const email = str(body?.email).toLowerCase();
  if (name.length < 2) fail("Informe seu nome.");
  if (!EMAIL_RE.test(email)) fail("E-mail inválido.");
  if (data.users.some((u) => u.email === email && u.id !== user.id)) fail("Esse e-mail já está em uso.", 409);
  user.name = name;
  user.email = email;
  return { body: { user: publicUser(user) }, save: true };
});

route("POST", "/me/password", async ({ user, body, crypto }) => {
  if (!(await crypto.verify(String(body?.current ?? ""), user))) fail("Senha atual incorreta.");
  const next = String(body?.next ?? "");
  if (next.length < 8) fail("A nova senha precisa ter pelo menos 8 caracteres.");
  Object.assign(user, await crypto.hash(next));
  return { body: { ok: true }, save: true };
});

/* Equipe */
const requireAdmin = (user) => user.role !== "admin" && fail("Só o administrador pode fazer isso.", 403);

route("GET", "/usuarios", ({ data }) => ({ items: data.users.map(publicUser) }));

route("POST", "/usuarios", async ({ data, user, body, crypto }) => {
  requireAdmin(user);
  const name = str(body?.name, 80);
  const email = str(body?.email).toLowerCase();
  const password = String(body?.password ?? "");
  if (name.length < 2) fail("Informe o nome.");
  if (!EMAIL_RE.test(email)) fail("E-mail inválido.");
  if (data.users.some((u) => u.email === email)) fail("Já existe um acesso com esse e-mail.", 409);
  if (password.length < 8) fail("A senha provisória precisa ter pelo menos 8 caracteres.");
  const novo = { id: nextId(data.users), name, email, role: body?.role === "admin" ? "admin" : "membro", ...(await crypto.hash(password)), createdAt: nowIso() };
  data.users.push(novo);
  log(data, user, `deu acesso ao painel para ${name}`);
  return { status: 201, body: publicUser(novo), save: true };
});

route("DELETE", "/usuarios/:id", ({ data, user, params }) => {
  requireAdmin(user);
  const id = Number(params.id);
  if (id === user.id) fail("Você não pode remover o próprio acesso.");
  const i = data.users.findIndex((u) => u.id === id);
  if (i < 0) fail("Usuário não encontrado.", 404);
  const [u] = data.users.splice(i, 1);
  log(data, user, `removeu o acesso de ${u.name}`);
  return { body: { ok: true }, save: true };
});

/* Visão geral — tudo calculado a partir dos pedidos cadastrados */
route("GET", "/dashboard", ({ data, query }) => {
  const period = ["hoje", "ontem", "7d", "30d", "mes"].includes(query.period) ? query.period : "hoje";
  const r = periodRange(period);
  const t = (p) => new Date(p.date).getTime();
  const inRange = (a, b) => data.pedidos.filter((p) => t(p) >= a && t(p) < b);
  const cur = inRange(r.start, r.end);
  const prev = inRange(r.prevStart, r.prevEnd);
  const valid = (l) => l.filter((p) => p.status !== "Cancelado");
  const sum = (l) => round2(valid(l).reduce((s, p) => s + p.total, 0));

  const revenue = sum(cur);
  const previous = sum(prev);
  const orders = valid(cur).length;
  const units = valid(cur).reduce((s, p) => s + (p.items || 0), 0);

  // gráfico
  let chart;
  if (r.hourly) {
    const lastHour = period === "hoje" ? spDate(Date.now()).getUTCHours() : 23;
    chart = Array.from({ length: lastHour + 1 }, (_, h) => ({ label: `${String(h).padStart(2, "0")}h`, vendas: 0, anterior: 0 }));
    for (const p of valid(cur)) {
      const h = spDate(t(p)).getUTCHours();
      if (chart[h]) chart[h].vendas = round2(chart[h].vendas + p.total);
    }
    for (const p of valid(prev)) {
      const h = spDate(t(p)).getUTCHours();
      if (chart[h]) chart[h].anterior = round2(chart[h].anterior + p.total);
    }
  } else {
    const days = Math.round((r.end - r.start) / DAY);
    chart = Array.from({ length: days }, (_, i) => ({ label: ddmm(r.start + i * DAY), vendas: 0, anterior: 0 }));
    for (const p of valid(cur)) {
      const i = Math.floor((t(p) - r.start) / DAY);
      if (chart[i]) chart[i].vendas = round2(chart[i].vendas + p.total);
    }
    for (const p of valid(prev)) {
      const i = Math.floor((t(p) - r.prevStart) / DAY);
      if (chart[i]) chart[i].anterior = round2(chart[i].anterior + p.total);
    }
  }

  // participação por conta
  const byAccount = new Map();
  for (const p of valid(cur)) {
    const key = p.contaId ? `c${p.contaId}` : `ch${p.channel}`;
    const conta = data.contas.find((c) => c.id === p.contaId);
    const e = byAccount.get(key) ?? { id: key, name: conta?.name ?? p.channel, channel: conta?.channel ?? p.channel, status: conta?.status ?? null, revenue: 0, orders: 0 };
    e.revenue = round2(e.revenue + p.total);
    e.orders += 1;
    byAccount.set(key, e);
  }
  const accounts = [...byAccount.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
    .map((a) => ({ ...a, share: revenue ? Math.round((a.revenue / revenue) * 100) : 0 }));

  const priorities = computePriorities(data).filter((p) => !p.dismissed);
  const today = todayStr();

  return {
    period,
    hasData: data.pedidos.length > 0,
    stats: {
      revenue,
      previous,
      revenueDelta: previous ? (revenue - previous) / previous : null,
      orders,
      units,
      ticket: orders ? round2(revenue / orders) : 0,
      canceled: cur.filter((p) => p.status === "Cancelado").length,
    },
    chart,
    operational: {
      aEnviar: data.pedidos.filter((p) => p.status === "Pago").length,
      tarefas: data.tarefas.filter((x) => x.status === "pendente").length,
      atrasadas: data.tarefas.filter((x) => x.status === "pendente" && x.due < today).length,
      estoqueBaixo: data.anuncios.filter((a) => a.status === "Ativo" && a.stock > 0 && a.stock <= LOW_STOCK).length,
      semEstoque: data.anuncios.filter((a) => a.status === "Ativo" && a.stock === 0).length,
      clientes: data.clientes.length,
    },
    accounts,
    priorities: priorities.slice(0, 4),
    prioritiesTotal: priorities.length,
    activity: data.atividades.slice(0, 6),
    setup: {
      contas: data.contas.length,
      anuncios: data.anuncios.length,
      pedidos: data.pedidos.length,
      usuarios: data.users.length,
    },
  };
});

/* Prioridades */
route("GET", "/prioridades", ({ data }) => ({ items: computePriorities(data) }));
route("POST", "/prioridades/:id/dispensar", ({ data, params, body }) => {
  if (body?.dismissed === false) delete data.dismissed[params.id];
  else data.dismissed[params.id] = true;
  return { body: { ok: true }, save: true };
});

/* Contas de marketplace */
function readConta(body) {
  const c = {
    name: str(body?.name, 80),
    store: str(body?.store, 80),
    channel: CHANNELS.includes(body?.channel) ? body.channel : "Outro",
    externalId: str(body?.externalId, 60),
    status: body?.status === "Pausada" ? "Pausada" : "Ativa",
  };
  if (c.name.length < 2) fail("Informe o nome da conta.");
  return c;
}

route("GET", "/integracoes", ({ data }) => {
  const channels = CHANNELS.map((name) => {
    const contas = data.contas.filter((c) => c.channel === name);
    const ids = new Set(contas.map((c) => c.id));
    const since = Date.now() - 30 * DAY;
    const peds = data.pedidos.filter((p) => p.status !== "Cancelado" && new Date(p.date).getTime() >= since && (ids.has(p.contaId) || (!p.contaId && p.channel === name)));
    return { name, accounts: contas.length, revenue30d: round2(peds.reduce((s, p) => s + p.total, 0)), orders30d: peds.length };
  }).filter((c) => c.accounts > 0 || c.orders30d > 0);
  const accounts = data.contas.map((c) => ({
    ...c,
    anuncios: data.anuncios.filter((a) => a.contaId === c.id).length,
    pedidos: data.pedidos.filter((p) => p.contaId === c.id).length,
  }));
  return { channels, accounts };
});

route("POST", "/contas", ({ data, user, body }) => {
  const c = { id: nextId(data.contas), ...readConta(body), createdAt: nowIso() };
  data.contas.push(c);
  log(data, user, `adicionou a conta ${c.name} (${c.channel})`);
  return { status: 201, body: c, save: true };
});

route("PUT", "/contas/:id", ({ data, user, body, params }) => {
  const c = data.contas.find((x) => x.id === Number(params.id)) ?? fail("Conta não encontrada.", 404);
  Object.assign(c, readConta(body));
  for (const a of data.anuncios) if (a.contaId === c.id) Object.assign(a, { account: c.name, channel: c.channel });
  log(data, user, `atualizou a conta ${c.name}`);
  return { body: c, save: true };
});

route("DELETE", "/contas/:id", ({ data, user, params }) => {
  const i = data.contas.findIndex((x) => x.id === Number(params.id));
  if (i < 0) fail("Conta não encontrada.", 404);
  const [c] = data.contas.splice(i, 1);
  for (const a of data.anuncios) if (a.contaId === c.id) a.contaId = null;
  for (const p of data.pedidos) if (p.contaId === c.id) p.contaId = null;
  log(data, user, `removeu a conta ${c.name}`);
  return { body: { ok: true }, save: true };
});

/* Clientes */
function readCliente(body) {
  const c = {
    name: str(body?.name, 120),
    email: str(body?.email, 120).toLowerCase(),
    phone: str(body?.phone, 30),
    city: str(body?.city, 80),
    channel: CHANNELS.includes(body?.channel) ? body.channel : "Loja própria",
    status: body?.status === "Inativo" ? "Inativo" : "Ativo",
    notes: str(body?.notes, 1000),
  };
  if (c.name.length < 2) fail("Informe o nome do cliente.");
  if (c.email && !EMAIL_RE.test(c.email)) fail("E-mail inválido.");
  return c;
}

function clienteStats(data, c) {
  const peds = data.pedidos.filter((p) => p.clienteId === c.id && p.status !== "Cancelado");
  return {
    ...c,
    orders: peds.length,
    totalSpent: round2(peds.reduce((s, p) => s + p.total, 0)),
    lastPurchase: peds.map((p) => p.date).sort().pop() ?? null,
  };
}

route("GET", "/clientes", ({ data, query }) => {
  const q = norm(query.q);
  let list = data.clientes;
  if (query.status === "Ativo" || query.status === "Inativo") list = list.filter((c) => c.status === query.status);
  if (q) list = list.filter((c) => norm(`${c.name} ${c.email} ${c.phone} ${c.city}`).includes(q));
  list = list.map((c) => clienteStats(data, c)).sort((a, b) => (b.lastPurchase ?? b.createdAt).localeCompare(a.lastPurchase ?? a.createdAt));
  return paginate(list, query);
});

route("GET", "/clientes/:id", ({ data, params }) => {
  const c = data.clientes.find((x) => x.id === Number(params.id)) ?? fail("Cliente não encontrado.", 404);
  return clienteStats(data, c);
});

route("POST", "/clientes", ({ data, user, body }) => {
  const c = { id: nextId(data.clientes), ...readCliente(body), createdAt: nowIso() };
  data.clientes.push(c);
  log(data, user, `cadastrou o cliente ${c.name}`);
  return { status: 201, body: clienteStats(data, c), save: true };
});

route("PUT", "/clientes/:id", ({ data, user, body, params }) => {
  const c = data.clientes.find((x) => x.id === Number(params.id)) ?? fail("Cliente não encontrado.", 404);
  Object.assign(c, readCliente(body));
  for (const p of data.pedidos) if (p.clienteId === c.id) p.clienteName = c.name;
  log(data, user, `atualizou o cadastro de ${c.name}`);
  return { body: clienteStats(data, c), save: true };
});

route("DELETE", "/clientes/:id", ({ data, user, params }) => {
  const i = data.clientes.findIndex((x) => x.id === Number(params.id));
  if (i < 0) fail("Cliente não encontrado.", 404);
  const [c] = data.clientes.splice(i, 1);
  for (const p of data.pedidos) if (p.clienteId === c.id) p.clienteId = null;
  log(data, user, `excluiu o cliente ${c.name}`);
  return { body: { ok: true }, save: true };
});

/* Anúncios */
function readAnuncio(data, body) {
  const conta = data.contas.find((c) => c.id === Number(body?.contaId)) ?? null;
  const a = {
    title: str(body?.title, 160),
    sku: str(body?.sku, 60),
    externalId: str(body?.externalId, 60),
    contaId: conta?.id ?? null,
    account: conta?.name ?? "",
    channel: conta?.channel ?? (CHANNELS.includes(body?.channel) ? body.channel : "Loja própria"),
    price: num(body?.price),
    cost: body?.cost === "" || body?.cost == null ? null : num(body?.cost),
    stock: Number(body?.stock),
    freeShipping: Boolean(body?.freeShipping),
    status: body?.active === false || body?.status === "Desativado" ? "Desativado" : "Ativo",
  };
  if (a.title.length < 3) fail("Informe o título do anúncio.");
  if (!Number.isFinite(a.price) || a.price <= 0) fail("Preço inválido.");
  if (a.cost !== null && (!Number.isFinite(a.cost) || a.cost < 0)) fail("Custo inválido.");
  if (!Number.isInteger(a.stock) || a.stock < 0) fail("Estoque inválido.");
  return a;
}

route("GET", "/anuncios", ({ data, query }) => {
  const q = norm(query.q);
  let list = data.anuncios;
  if (query.status) list = list.filter((a) => a.status === query.status);
  if (query.channel) list = list.filter((a) => a.channel === query.channel);
  if (query.estoque === "baixo") list = list.filter((a) => a.stock > 0 && a.stock <= LOW_STOCK);
  if (query.estoque === "zerado") list = list.filter((a) => a.stock === 0);
  if (q) list = list.filter((a) => norm(`${a.title} ${a.sku} ${a.externalId}`).includes(q));
  list = [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return paginate(list, query);
});

route("POST", "/anuncios", ({ data, user, body }) => {
  const a = { id: nextId(data.anuncios), ...readAnuncio(data, body), updatedAt: nowIso() };
  data.anuncios.push(a);
  log(data, user, `cadastrou o anúncio "${a.title}"`);
  return { status: 201, body: a, save: true };
});

route("PUT", "/anuncios/:id", ({ data, user, body, params }) => {
  const a = data.anuncios.find((x) => x.id === Number(params.id)) ?? fail("Anúncio não encontrado.", 404);
  const before = { price: a.price, stock: a.stock };
  Object.assign(a, readAnuncio(data, body), { updatedAt: nowIso() });
  const changes = [];
  if (before.price !== a.price) changes.push(`preço para R$ ${a.price.toFixed(2).replace(".", ",")}`);
  if (before.stock !== a.stock) changes.push(`estoque para ${a.stock}`);
  log(data, user, changes.length ? `alterou ${changes.join(" e ")} em "${a.title}"` : `editou o anúncio "${a.title}"`);
  return { body: a, save: true };
});

route("DELETE", "/anuncios/:id", ({ data, user, params }) => {
  const i = data.anuncios.findIndex((x) => x.id === Number(params.id));
  if (i < 0) fail("Anúncio não encontrado.", 404);
  const [a] = data.anuncios.splice(i, 1);
  log(data, user, `excluiu o anúncio "${a.title}"`);
  return { body: { ok: true }, save: true };
});

/* Pedidos (vendas) */
function readPedido(data, body) {
  const conta = data.contas.find((c) => c.id === Number(body?.contaId)) ?? null;
  const cliente = data.clientes.find((c) => c.id === Number(body?.clienteId)) ?? null;
  const date = body?.date ? new Date(body.date) : new Date();
  const p = {
    number: str(body?.number, 40),
    date: isNaN(date.getTime()) ? nowIso() : date.toISOString(),
    contaId: conta?.id ?? null,
    channel: conta?.channel ?? (CHANNELS.includes(body?.channel) ? body.channel : "Loja própria"),
    clienteId: cliente?.id ?? null,
    clienteName: cliente?.name ?? str(body?.clienteName, 120),
    items: Number(body?.items) || 1,
    total: num(body?.total),
    status: ORDER_STATUS.includes(body?.status) ? body.status : "Pago",
    notes: str(body?.notes, 1000),
  };
  if (!Number.isFinite(p.total) || p.total <= 0) fail("Informe o valor total do pedido.");
  if (!Number.isInteger(p.items) || p.items < 1) fail("Quantidade de itens inválida.");
  return p;
}

route("GET", "/pedidos", ({ data, query }) => {
  const q = norm(query.q);
  let list = data.pedidos;
  if (query.status) list = list.filter((p) => p.status === query.status);
  if (query.channel) list = list.filter((p) => p.channel === query.channel);
  if (q) list = list.filter((p) => norm(`${p.number} ${p.clienteName} ${p.notes}`).includes(q));
  list = [...list].sort((a, b) => b.date.localeCompare(a.date));
  const valid = list.filter((p) => p.status !== "Cancelado");
  return { ...paginate(list, query), summary: { total: round2(valid.reduce((s, p) => s + p.total, 0)), count: valid.length } };
});

route("POST", "/pedidos", ({ data, user, body }) => {
  const p = { id: nextId(data.pedidos), ...readPedido(data, body), createdAt: nowIso() };
  data.pedidos.push(p);
  log(data, user, `registrou a venda ${p.number ? "#" + p.number : ""} de R$ ${p.total.toFixed(2).replace(".", ",")}`.replace("  ", " "));
  return { status: 201, body: p, save: true };
});

route("PUT", "/pedidos/:id", ({ data, user, body, params }) => {
  const p = data.pedidos.find((x) => x.id === Number(params.id)) ?? fail("Pedido não encontrado.", 404);
  const before = p.status;
  Object.assign(p, readPedido(data, body));
  log(data, user, before !== p.status ? `marcou o pedido ${p.number ? "#" + p.number : p.id} como ${p.status.toLowerCase()}` : `editou o pedido ${p.number ? "#" + p.number : p.id}`);
  return { body: p, save: true };
});

route("DELETE", "/pedidos/:id", ({ data, user, params }) => {
  const i = data.pedidos.findIndex((x) => x.id === Number(params.id));
  if (i < 0) fail("Pedido não encontrado.", 404);
  const [p] = data.pedidos.splice(i, 1);
  log(data, user, `excluiu o pedido ${p.number ? "#" + p.number : p.id}`);
  return { body: { ok: true }, save: true };
});

/* Tarefas */
route("GET", "/tarefas", ({ data }) => {
  const order = { pendente: 0, concluida: 1 };
  const prio = { Alta: 0, Média: 1, Baixa: 2 };
  return { items: [...data.tarefas].sort((a, b) => order[a.status] - order[b.status] || prio[a.priority] - prio[b.priority] || a.due.localeCompare(b.due)) };
});

route("POST", "/tarefas", ({ data, user, body }) => {
  const title = str(body?.title, 160);
  if (title.length < 3) fail("Descreva a tarefa.");
  const t = {
    id: nextId(data.tarefas),
    title,
    description: str(body?.description, 1000),
    priority: ["Alta", "Média", "Baixa"].includes(body?.priority) ? body.priority : "Média",
    assignee: str(body?.assignee, 80) || user.name,
    due: /^\d{4}-\d{2}-\d{2}$/.test(body?.due) ? body.due : todayStr(),
    status: "pendente",
    createdAt: nowIso(),
  };
  data.tarefas.push(t);
  log(data, user, `criou a tarefa "${t.title}"`);
  return { status: 201, body: t, save: true };
});

route("PATCH", "/tarefas/:id", ({ data, user, body, params }) => {
  const t = data.tarefas.find((x) => x.id === Number(params.id)) ?? fail("Tarefa não encontrada.", 404);
  if (body?.status === "pendente" || body?.status === "concluida") {
    t.status = body.status;
    log(data, user, `${t.status === "concluida" ? "concluiu" : "reabriu"} a tarefa "${t.title}"`);
  }
  return { body: t, save: true };
});

route("DELETE", "/tarefas/:id", ({ data, user, params }) => {
  const i = data.tarefas.findIndex((x) => x.id === Number(params.id));
  if (i < 0) fail("Tarefa não encontrada.", 404);
  const [t] = data.tarefas.splice(i, 1);
  log(data, user, `excluiu a tarefa "${t.title}"`);
  return { body: { ok: true }, save: true };
});

/* Histórico, busca e backup */
route("GET", "/atividades", ({ data, query }) => paginate(data.atividades, query));

route("GET", "/busca", ({ data, query }) => {
  const q = norm(query.q);
  if (q.length < 2) return { clientes: [], anuncios: [], pedidos: [] };
  return {
    clientes: data.clientes.filter((c) => norm(`${c.name} ${c.email}`).includes(q)).slice(0, 5),
    anuncios: data.anuncios.filter((a) => norm(`${a.title} ${a.sku}`).includes(q)).slice(0, 5),
    pedidos: data.pedidos.filter((p) => norm(`${p.number} ${p.clienteName}`).includes(q)).slice(0, 5),
  };
});

route("GET", "/backup", ({ data, user }) => {
  requireAdmin(user);
  const { users, ...rest } = data;
  return { app: "rv-commerce", exportedAt: nowIso(), data: { ...rest, users: users.map((u) => ({ ...u })) } };
});

route("POST", "/backup", ({ data, user, body }) => {
  requireAdmin(user);
  const incoming = body?.data;
  if (body?.app !== "rv-commerce" || !incoming || !Array.isArray(incoming.users)) fail("Arquivo de backup inválido.");
  const base = emptyData();
  for (const k of Object.keys(base)) data[k] = incoming[k] ?? base[k];
  if (!data.users.some((u) => u.id === user.id)) data.users.push(user); // não se tranca para fora
  log(data, user, "restaurou um backup");
  return { body: { ok: true }, save: true };
});

/* ───────────── despachante ───────────── */

/**
 * Executa uma requisição.
 * @param ctx { data, method, path, query, body, userId, crypto: { hash, verify } }
 * @returns { status, body, session?: number|null, save?: boolean }
 */
export async function handle(ctx) {
  const { data, method } = ctx;
  const path = ctx.path.replace(/\/+$/, "") || "/";
  for (const r of routes) {
    if (r.method !== method) continue;
    const m = path.match(r.re);
    if (!m) continue;
    const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
    try {
      let user = null;
      if (!r.public) {
        user = data.users.find((u) => u.id === ctx.userId);
        if (!user) return { status: 401, body: { error: "Faça login para continuar." }, session: ctx.userId ? null : undefined };
      }
      const out = await r.handler({ ...ctx, params, user, query: ctx.query ?? {} });
      const isEnvelope = out && typeof out === "object" && ("body" in out || "session" in out || "save" in out);
      return isEnvelope ? { status: 200, ...out } : { status: 200, body: out };
    } catch (e) {
      if (e instanceof HttpError) return { status: e.status, body: { error: e.message } };
      throw e;
    }
  }
  return { status: 404, body: { error: "Rota não encontrada." } };
}
