import * as React from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, CheckCircle2, EyeOff, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorBox, PageHeader } from "@/components/layout/shared";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";

type Prioridade = { id: string; title: string; level: string; detail: string; link: string; dismissed: boolean };

const LEVEL: Record<string, { cls: string; bar: string }> = {
  Crítico: { cls: "text-destructive", bar: "bg-destructive" },
  "Alta prioridade": { cls: "text-warning", bar: "bg-warning" },
  Média: { cls: "text-primary-strong", bar: "bg-primary" },
};

export default function AcoesPage() {
  const { data, error, reload } = useApi<{ items: Prioridade[] }>("/prioridades");
  const [showDismissed, setShowDismissed] = React.useState(false);

  async function dismiss(p: Prioridade, dismissed: boolean) {
    try {
      await api(`/prioridades/${encodeURIComponent(p.id)}/dispensar`, { body: { dismissed } });
      toast.success(dismissed ? "Alerta dispensado" : "Alerta restaurado");
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const open = data?.items.filter((p) => !p.dismissed) ?? [];
  const hidden = data?.items.filter((p) => p.dismissed) ?? [];
  const list = showDismissed ? [...open, ...hidden] : open;

  return (
    <>
      <PageHeader
        title="Ações"
        highlight="prioritárias."
        description="Alertas gerados automaticamente: anúncios sem estoque, estoque baixo, pedidos parados e tarefas atrasadas."
      />
      {error && <ErrorBox message={error} onRetry={reload} />}

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Em aberto", open.length],
          ["Críticos", open.filter((p) => p.level === "Crítico").length],
          ["Dispensados", hidden.length],
        ].map(([k, v]) => (
          <Card key={k} className="px-5 py-4">
            <p className="text-xs text-muted-foreground">{k}</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-primary-strong">{data ? v : "–"}</p>
          </Card>
        ))}
      </div>

      {data && open.length === 0 && !showDismissed && (
        <Card>
          <EmptyState icon={CheckCircle2} title="Nenhum alerta em aberto" text="Quando algo precisar da sua atenção, aparece aqui e no sino do topo." />
        </Card>
      )}

      <div className="grid gap-3">
        {list.map((p) => (
          <Card key={p.id} className={cn("relative overflow-hidden p-5 pl-6", p.dismissed && "opacity-60")}>
            <span className={cn("absolute inset-y-0 left-0 w-1", LEVEL[p.level]?.bar)} />
            <div className="flex flex-wrap items-center gap-4">
              <AlertTriangle className={cn("size-5 shrink-0", LEVEL[p.level]?.cls)} aria-hidden />
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold">{p.title}</h2>
                <p className="mt-0.5 text-xs">
                  <span className={LEVEL[p.level]?.cls}>{p.level}</span>
                  <span className="text-muted-foreground"> · {p.detail}</span>
                </p>
              </div>
              <div className="flex gap-2">
                {!p.dismissed && (
                  <Button size="sm" asChild>
                    <Link to={p.link}>
                      Resolver <ArrowRight />
                    </Link>
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => dismiss(p, !p.dismissed)}>
                  {p.dismissed ? <RotateCcw /> : <EyeOff />}
                  {p.dismissed ? "Restaurar" : "Dispensar"}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
      {hidden.length > 0 && (
        <Button variant="link" className="self-start px-0" onClick={() => setShowDismissed((v) => !v)}>
          {showDismissed ? "Ocultar dispensados" : `Mostrar dispensados (${hidden.length})`}
        </Button>
      )}
      <p className="text-xs text-muted-foreground">
        Os alertas somem sozinhos quando o problema é resolvido (ex.: ao repor o estoque ou marcar o pedido como enviado).
      </p>
    </>
  );
}
