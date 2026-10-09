import * as React from "react";
import { api } from "@/lib/api";

/* Busca dados de um endpoint e recarrega quando o caminho muda. */
export function useApi<T>(path: string | null) {
  const [data, setData] = React.useState<T | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(Boolean(path));
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    if (!path) return;
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    api<T>(path, { signal: ctrl.signal })
      .then((d) => setData(d))
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [path, tick]);

  const reload = React.useCallback(() => setTick((t) => t + 1), []);
  return { data, setData, error, loading, reload };
}

/* Atrasa um valor (ex.: texto de busca) para não chamar a API a cada tecla. */
export function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
