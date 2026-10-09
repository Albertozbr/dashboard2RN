import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // GitHub Pages publica em https://usuario.github.io/repositorio/ → caminhos relativos
  base: mode === "pages" ? "./" : "/",
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    // Versão com servidor: repassa /api para o Express (server/index.js)
    proxy: { "/api": "http://localhost:3001" },
  },
}));
