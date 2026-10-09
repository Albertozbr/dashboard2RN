// Servidor do RV Commerce AI (opcional — o site também roda sem ele, no GitHub Pages).
// Use quando quiser que toda a equipe compartilhe os mesmos dados.
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import express from "express";
import cookieParser from "cookie-parser";
import { handle } from "../shared/core.js";
import { data, save } from "./db.js";
import { passwordCrypto, readSession, writeSession } from "./auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "20mb" }));
app.use(cookieParser());

// Limite simples contra tentativas de senha em sequência
const attempts = new Map();
function tooManyAttempts(ip) {
  const now = Date.now();
  const list = (attempts.get(ip) ?? []).filter((t) => now - t < 10 * 60 * 1000);
  list.push(now);
  attempts.set(ip, list);
  return list.length > 20;
}

app.all("/api/*", async (req, res) => {
  const apiPath = req.path.slice(4);
  if (apiPath === "/auth/login" && tooManyAttempts(req.ip)) {
    return res.status(429).json({ error: "Muitas tentativas. Aguarde alguns minutos." });
  }
  try {
    const out = await handle({
      data,
      method: req.method,
      path: apiPath,
      query: req.query,
      body: req.body,
      userId: readSession(req),
      crypto: passwordCrypto,
    });
    if (out.session !== undefined) writeSession(res, out.session);
    if (out.save) save();
    res.status(out.status).json(out.body ?? {});
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro interno. Tente novamente." });
  }
});

/* Produção: serve o site compilado (npm run build) */
const dist = path.join(__dirname, "..", "dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => console.log(`[api] rodando em http://localhost:${PORT}`));
