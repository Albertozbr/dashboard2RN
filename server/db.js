// Banco em arquivo JSON (data/banco.json). Começa VAZIO.
// Sem dependências nativas: funciona igual no Windows, Mac e Linux.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { emptyData } from "../shared/core.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "..", "data");
const DB_FILE = path.join(DATA_DIR, "banco.json");

fs.mkdirSync(DATA_DIR, { recursive: true });

export const data = fs.existsSync(DB_FILE)
  ? { ...emptyData(), ...JSON.parse(fs.readFileSync(DB_FILE, "utf8")) }
  : emptyData();

export function save() {
  const tmp = DB_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, DB_FILE);
}
