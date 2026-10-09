import * as React from "react";
import { CalendarDays, Check, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { ErrorBox, PageHeader } from "@/components/layout/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/use-api";
import { dayLabel } from "@/lib/format";

type Tarefa = {
  id: number;
  title: string;
  description: string;
  priority: "Alta" | "Média" | "Baixa";
  assignee: string;
  due: string;
  status: "pendente" | "concluida";
};

const PRIO_VARIANT = { Alta: "warning", Média: "default", Baixa: "secondary" } as const;
const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export default function TarefasPage() {
  const { user } = useAuth();
  const { data, setData, error, reload } = useApi<{ items: Tarefa[] }>("/tarefas");
  const team = useApi<{ items: { id: number; name: string }[] }>("/usuarios").data?.items.map((u) => u.name) ?? [];
  const [filter, setFilter] = React.useState<"pendente" | "concluida" | "todas">("pendente");
  const [form, setForm] = React.useState({ title: "", priority: "Média", assignee: user?.name ?? "", due: today() });
  const [saving, setSaving] = React.useState(false);

  const items = (data?.items ?? []).filter((t) => filter === "todas" || t.status === filter);
  const counts = {
    pendente: data?.items.filter((t) => t.status === "pendente").length ?? 0,
    concluida: data?.items.filter((t) => t.status === "concluida").length ?? 0,
  };

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (form.title.trim().length < 3) return toast.error("Descreva a tarefa (mín. 3 letras).");
    setSaving(true);
    try {
      const t = await api<Tarefa>("/tarefas", { body: form });
      setData((d) => d && { items: [t, ...d.items] });
      setForm((f) => ({ ...f, title: "" }));
      toast.success("Tarefa criada");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function toggle(t: Tarefa) {
    const status = t.status === "pendente" ? "concluida" : "pendente";
    setData((d) => d && { items: d.items.map((x) => (x.id === t.id ? { ...x, status } : x)) });
    try {
      await api(`/tarefas/${t.id}`, { method: "PATCH", body: { status } });
    } catch (err) {
      toast.error((err as Error).message);
      reload();
    }
  }

  async function remove(t: Tarefa) {
    const prev = data;
    setData((d) => d && { items: d.items.filter((x) => x.id !== t.id) });
    try {
      await api(`/tarefas/${t.id}`, { method: "DELETE" });
      toast.success("Tarefa excluída");
    } catch (err) {
      toast.error((err as Error).message);
      setData(prev);
    }
  }

  return (
    <>
      <PageHeader title="Minhas" highlight="tarefas." description="Organize o que precisa ser feito pela equipe." />
      {error && <ErrorBox message={error} onRetry={reload} />}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Nova tarefa</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={add} className="grid gap-3 md:grid-cols-[1fr_140px_180px_160px_auto]">
            <Input
              placeholder="Ex.: Responder perguntas da Shopee"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              aria-label="Título da tarefa"
            />
            <NativeSelect value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} aria-label="Prioridade">
              <option>Alta</option>
              <option>Média</option>
              <option>Baixa</option>
            </NativeSelect>
            <NativeSelect value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })} aria-label="Responsável">
              {Array.from(new Set([user?.name ?? "", ...team])).filter(Boolean).map((n) => (
                <option key={n}>{n}</option>
              ))}
            </NativeSelect>
            <Input type="date" value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} aria-label="Prazo" />
            <Button type="submit" disabled={saving}>
              <Plus /> Adicionar
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex gap-1 rounded-xl border bg-card p-1 shadow-soft sm:self-start" role="tablist">
        {(
          [
            ["pendente", `Pendentes (${counts.pendente})`],
            ["concluida", `Concluídas (${counts.concluida})`],
            ["todas", "Todas"],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            role="tab"
            aria-selected={filter === k}
            onClick={() => setFilter(k)}
            className={cn(
              "flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-foreground sm:flex-none",
              filter === k && "bg-primary-soft text-primary-strong",
            )}
          >
            {l}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        <ul className="divide-y">
          {!data &&
            Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="px-5 py-4">
                <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
              </li>
            ))}
          {data && items.length === 0 && (
            <li className="px-5 py-12 text-center text-sm text-muted-foreground">
              {filter === "pendente" ? "Nenhuma tarefa pendente. 🎉" : "Nada por aqui."}
            </li>
          )}
          {items.map((t) => {
            const late = t.status === "pendente" && t.due < today();
            return (
              <li key={t.id} className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/30 sm:px-5">
                <button
                  onClick={() => toggle(t)}
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-full border-2 transition-colors",
                    t.status === "concluida"
                      ? "border-success bg-success text-white"
                      : "border-input hover:border-primary",
                  )}
                  aria-label={t.status === "concluida" ? "Marcar como pendente" : "Concluir tarefa"}
                >
                  {t.status === "concluida" && <Check className="size-3.5" strokeWidth={3} />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm font-medium", t.status === "concluida" && "text-muted-foreground line-through")}>
                    {t.title}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                    <span>{t.assignee}</span>
                    <span className={cn("inline-flex items-center gap-1", late && "font-semibold text-destructive")}>
                      <CalendarDays className="size-3" aria-hidden />
                      {late ? `Atrasada · ${dayLabel(t.due)}` : dayLabel(t.due)}
                    </span>
                  </p>
                </div>
                <Badge variant={PRIO_VARIANT[t.priority]} className="hidden sm:inline-flex">
                  {t.priority}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground opacity-100 hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100"
                  onClick={() => remove(t)}
                  aria-label="Excluir tarefa"
                >
                  <Trash2 />
                </Button>
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  );
}
