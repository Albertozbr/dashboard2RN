import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import jwt from "jsonwebtoken";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "..", "data");
const SECRET_FILE = path.join(DATA_DIR, ".secret");
fs.mkdirSync(DATA_DIR, { recursive: true });

// Segredo da sessão: variável SESSION_SECRET ou um arquivo gerado na primeira execução.
const SECRET =
  process.env.SESSION_SECRET ||
  (fs.existsSync(SECRET_FILE)
    ? fs.readFileSync(SECRET_FILE, "utf8")
    : (() => {
        const s = crypto.randomBytes(48).toString("hex");
        fs.writeFileSync(SECRET_FILE, s);
        return s;
      })());

export const COOKIE = "rv_session";

/* Senhas: scrypt com sal aleatório */
export const passwordCrypto = {
  async hash(password) {
    const salt = crypto.randomBytes(16).toString("hex");
    return { salt, passwordHash: crypto.scryptSync(password, salt, 64).toString("hex"), algo: "scrypt" };
  },
  async verify(password, user) {
    if (user.algo && user.algo !== "scrypt") return false;
    const hash = crypto.scryptSync(password, user.salt, 64);
    return crypto.timingSafeEqual(hash, Buffer.from(user.passwordHash, "hex"));
  },
};

export function readSession(req) {
  try {
    return jwt.verify(req.cookies?.[COOKIE], SECRET).sub;
  } catch {
    return null;
  }
}

export function writeSession(res, userId) {
  if (userId === null) return res.clearCookie(COOKIE);
  res.cookie(COOKIE, jwt.sign({ sub: userId }, SECRET, { expiresIn: "7d" }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "1",
    maxAge: 7 * 24 * 3600 * 1000,
  });
}
