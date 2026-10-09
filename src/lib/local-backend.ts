/*
  "Servidor" que roda dentro do navegador — usado na versão do GitHub Pages.
  Usa exatamente as mesmas regras do servidor (shared/core.js); só muda onde os
  dados ficam: no armazenamento deste navegador (localStorage).

  Importante: cada navegador/computador tem os próprios dados. Use "Exportar backup"
  em Minha conta para guardar uma cópia ou levar os dados para outro computador.
*/
import { emptyData, handle, type PasswordCrypto } from "../../shared/core.js";

const DB_KEY = "rv-commerce:dados";
const SESSION_KEY = "rv-commerce:sessao";

function load() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return { ...emptyData(), ...JSON.parse(raw) };
  } catch {
    /* armazenamento indisponível ou corrompido */
  }
  return emptyData();
}

let data = load();

// Outra aba alterou os dados → recarrega
window.addEventListener("storage", (e) => {
  if (e.key === DB_KEY) data = load();
});

function persist() {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(data));
  } catch {
    throw new Error("Não foi possível salvar neste navegador (armazenamento cheio ou bloqueado).");
  }
}

function getSession(): number | null {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null");
    if (s && s.exp > Date.now()) return s.userId;
  } catch {
    /* ignora */
  }
  return null;
}

function setSession(userId: number | null) {
  try {
    if (userId === null) localStorage.removeItem(SESSION_KEY);
    else localStorage.setItem(SESSION_KEY, JSON.stringify({ userId, exp: Date.now() + 7 * 24 * 3600 * 1000 }));
  } catch {
    /* ignora */
  }
}

/* Senhas: PBKDF2-SHA256 (Web Crypto), 210 mil iterações, sal aleatório */
const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
async function pbkdf2(password: string, saltHex: string) {
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map((h) => parseInt(h, 16)));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 210000 }, key, 256));
}

const passwordCrypto: PasswordCrypto = {
  async hash(password) {
    const salt = hex(crypto.getRandomValues(new Uint8Array(16)).buffer);
    return { salt, passwordHash: await pbkdf2(password, salt), algo: "pbkdf2" };
  },
  async verify(password, user) {
    if (user.algo !== "pbkdf2") return false;
    return (await pbkdf2(password, String(user.salt))) === user.passwordHash;
  },
};

export async function localFetch(method: string, pathWithQuery: string, body?: unknown) {
  const url = new URL(pathWithQuery, "http://local");
  const out = await handle({
    data,
    method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
    body: body ? JSON.parse(JSON.stringify(body)) : undefined,
    userId: getSession(),
    crypto: passwordCrypto,
  });
  if (out.session !== undefined) setSession(out.session);
  if (out.save) persist();
  // devolve cópia para a tela não alterar os dados diretamente
  return { status: out.status, body: out.body === undefined ? {} : JSON.parse(JSON.stringify(out.body)) };
}
