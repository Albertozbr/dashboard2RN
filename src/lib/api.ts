/*
  Cliente da API.
  • Versão com servidor (npm run dev / npm start): chama /api no servidor Express.
  • Versão GitHub Pages (npm run build:pages): VITE_STATIC=1 → tudo roda no navegador.
*/

export const STATIC_MODE = import.meta.env.VITE_STATIC === "1";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  const method = options.method ?? (options.body ? "POST" : "GET");
  let status: number;
  let data: unknown;

  if (STATIC_MODE) {
    const { localFetch } = await import("./local-backend");
    if (options.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    ({ status, body: data } = await localFetch(method, path, options.body));
  } else {
    const res = await fetch(`/api${path}`, {
      method,
      headers: options.body ? { "Content-Type": "application/json" } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
      credentials: "include",
      signal: options.signal,
    });
    status = res.status;
    data = await res.json().catch(() => ({}));
  }

  if (status >= 400) {
    if (status === 401 && !path.startsWith("/auth/")) window.dispatchEvent(new Event("rv:unauthorized"));
    throw new ApiError(status, (data as { error?: string }).error ?? "Algo deu errado. Tente novamente.");
  }
  return data as T;
}

export type Page<T> = { items: T[]; total: number; page: number; pages: number; pageSize: number };
