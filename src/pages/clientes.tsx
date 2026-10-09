import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowRight, Plus, Search, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CHANNELS, ChannelMark, EmptyState, ErrorBox, Field, LoadingRows, PageHeader, Pagination, Spinner, StatusBadge } from "@/components/layout/shared";
import { api, type Page } from "@/lib/api";
import { useApi, useDebounced } from "@/lib/use-api";
import { brl, dateTime, int } from "@/lib/format";

export type Cliente = {
  id: number;
  name: string;
  email: string;
  phone: string;
  city: string;
  channel: string;
  orders: number;
  totalSpent: number;
  lastPurchase: string | null;
  createdAt: string;
  status: "Ativo" | "Inativo";
  notes: string;
};

const EMPTY = { name: "", email: "", phone: "", city: "", channel: "Loja própria", status: "Ativo", notes: "" };

function ClienteDialog({
  open,
  onOpenChange,
  cliente,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cliente: Cliente | null;
  onSaved: (c?: Cliente) => void;
}) {
  const [form, setForm] = React.useState(EMPTY);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(cliente ? { ...EMPTY, ...cliente } : EMPTY);
  }, [open, cliente]);

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const saved = cliente
        ? await api<Cliente>(`/clientes/${cliente.id}`, { method: "PUT", body: form })
        : await api<Cliente>("/clientes", { body: form });
      toast.success(cliente ? "Cliente atualizado" : "Cliente cadastrado");
      onSaved(saved);
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{cliente ? cliente.name : "Novo cliente"}</DialogTitle>
          <DialogDescription>
            {cliente
              ? cliente.orders
                ? `${int(cliente.orders)} ${cliente.orders === 1 ? "pedido" : "pedidos"} · ${brl(cliente.totalSpent)} em compras · última em ${dateTime(cliente.lastPurchase!).date}`
                : "Ainda sem vendas registradas para este cliente."
              : "Cadastre um cliente de venda direta ou de outro canal."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <Field label="Nome">
            <Input value={form.name} onChange={set("name")} autoFocus />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="E-mail">
              <Input type="email" value={form.email} onChange={set("email")} placeholder="opcional" />
            </Field>
            <Field label="Telefone">
              <Input value={form.phone} onChange={set("phone")} placeholder="(00) 00000-0000" />
            </Field>
            <Field label="Cidade">
              <Input value={form.city} onChange={set("city")} placeholder="Cidade/UF" />
            </Field>
            <Field label="Canal">
              <NativeSelect value={form.channel} onChange={set("channel")}>
                {CHANNELS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Situação">
              <NativeSelect value={form.status} onChange={set("status")}>
                <option>Ativo</option>
                <option>Inativo</option>
              </NativeSelect>
            </Field>
          </div>
          <Field label="Observações">
            <Textarea value={form.notes} onChange={set("notes")} rows={3} />
          </Field>
          {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <DialogFooter>
            {cliente && (
              <Button
                type="button"
                variant="ghost"
                className="mr-auto text-destructive hover:text-destructive"
                onClick={async () => {
                  if (!window.confirm(`Excluir o cliente ${cliente.name}?`)) return;
                  try {
                    await api(`/clientes/${cliente.id}`, { method: "DELETE" });
                    toast.success("Cliente excluído");
                    onSaved(cliente);
                    onOpenChange(false);
                  } catch (err) {
                    setError((err as Error).message);
                  }
                }}
              >
                <Trash2 /> Excluir
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Spinner />} {cliente ? "Salvar alterações" : "Cadastrar cliente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ClientesPage() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = React.useState(params.get("q") ?? "");
  const dq = useDebounced(q);
  const status = params.get("status") ?? "";
  const page = Number(params.get("page") ?? 1);
  const openId = params.get("id");

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };

  React.useEffect(() => {
    if ((params.get("q") ?? "") !== dq) update({ q: dq || null, page: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq]);

  const path = `/clientes?page=${page}&pageSize=10&status=${status}&q=${encodeURIComponent(params.get("q") ?? "")}`;
  const { data, error, loading, reload } = useApi<Page<Cliente>>(path);

  const [dialog, setDialog] = React.useState<{ open: boolean; cliente: Cliente | null }>({ open: false, cliente: null });

  // Abre o cliente vindo da busca global (?id=)
  React.useEffect(() => {
    if (!openId) return;
    api<Cliente>(`/clientes/${openId}`)
      .then((c) => setDialog({ open: true, cliente: c }))
      .catch(() => {});
  }, [openId]);

  return (
    <>
      <PageHeader
        title="Clientes"
        description={data ? `${int(data.total)} ${data.total === 1 ? "cliente" : "clientes"}` : "Carregando…"}
        actions={
          <Button onClick={() => setDialog({ open: true, cliente: null })}>
            <Plus /> Novo cliente
          </Button>
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, e-mail, telefone ou cidade" className="pl-9" />
        </div>
        <NativeSelect className="sm:w-40" value={status} onChange={(e) => update({ status: e.target.value || null, page: null })} aria-label="Situação">
          <option value="">Todos</option>
          <option value="Ativo">Ativos</option>
          <option value="Inativo">Inativos</option>
        </NativeSelect>
      </div>

      {error && <ErrorBox message={error} onRetry={reload} />}

      <Card className="overflow-hidden">
        {data && data.total === 0 && !status && !params.get("q") ? (
          <EmptyState
            icon={Users}
            title="Nenhum cliente cadastrado"
            text="Cadastre clientes para vincular às vendas e ver quanto cada um já comprou."
            action={
              <Button onClick={() => setDialog({ open: true, cliente: null })}>
                <Plus /> Cadastrar primeiro cliente
              </Button>
            }
          />
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b bg-muted/60 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Cliente</th>
                <th className="px-4 py-3 text-left font-medium">Contato</th>
                <th className="px-4 py-3 text-left font-medium">Canal</th>
                <th className="px-4 py-3 text-right font-medium">Pedidos</th>
                <th className="px-4 py-3 text-left font-medium">Última compra</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className={loading && data ? "divide-y opacity-60" : "divide-y"}>
              {!data && <LoadingRows cols={6} />}
              {data?.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    Nenhum cliente encontrado.
                  </td>
                </tr>
              )}
              {data?.items.map((c) => {
                const last = c.lastPurchase ? dateTime(c.lastPurchase) : null;
                return (
                  <tr
                    key={c.id}
                    className="cursor-pointer transition-colors hover:bg-accent/40"
                    onClick={() => setDialog({ open: true, cliente: c })}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary-strong">
                          {c.name[0]?.toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{c.name}</p>
                          <StatusBadge status={c.status} className="mt-0.5 px-2 py-0 text-[10px]" />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <p className={c.email ? "" : "text-muted-foreground"}>{c.email || "E-mail não informado"}</p>
                      <p className="text-muted-foreground">{c.phone || "Telefone não informado"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        <ChannelMark channel={c.channel} className="size-6 rounded-md text-[8px]" />
                        {c.channel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{c.orders}</td>
                    <td className="px-4 py-3 text-xs">
                      {last ? (
                        <>
                          <p>{last.date}</p>
                          <p className="text-muted-foreground">{last.time}</p>
                        </>
                      ) : (
                        <span className="text-muted-foreground">Sem compras</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary-strong">
                        Ver cliente <ArrowRight className="size-3.5" />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}
      </Card>

      {data && data.total > 0 && <Pagination {...data} label="clientes" onPage={(p) => update({ page: String(p) })} />}

      <ClienteDialog
        open={dialog.open}
        cliente={dialog.cliente}
        onOpenChange={(open) => {
          setDialog((d) => ({ ...d, open }));
          if (!open && openId) update({ id: null });
        }}
        onSaved={reload}
      />
    </>
  );
}
