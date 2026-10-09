import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { Pencil, Plus, Search, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CHANNELS,
  ChannelMark,
  EmptyState,
  ErrorBox,
  Field,
  LoadingRows,
  PageHeader,
  Pagination,
  Spinner,
} from "@/components/layout/shared";
import { api, type Page } from "@/lib/api";
import { useApi, useDebounced } from "@/lib/use-api";
import { brl, dateTime, int } from "@/lib/format";
import { cn } from "@/lib/utils";

export type Pedido = {
  id: number;
  number: string;
  date: string;
  contaId: number | null;
  channel: string;
  clienteId: number | null;
  clienteName: string;
  items: number;
  total: number;
  status: "Pago" | "Enviado" | "Entregue" | "Cancelado";
  notes: string;
};
type Conta = { id: number; name: string; channel: string };
type ClienteLite = { id: number; name: string };

const STATUS = ["Pago", "Enviado", "Entregue", "Cancelado"] as const;
const STATUS_CLASS: Record<string, string> = {
  Pago: "bg-primary-soft text-primary-strong",
  Enviado: "bg-warning-soft text-warning",
  Entregue: "bg-success-soft text-success",
  Cancelado: "bg-destructive/10 text-destructive",
};

/* datetime-local ↔ ISO no horário do navegador */
const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

function PedidoDialog({
  open,
  onOpenChange,
  pedido,
  contas,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pedido: Pedido | null;
  contas: Conta[];
  onSaved: () => void;
}) {
  const blank = () => ({
    number: "",
    date: toLocalInput(new Date().toISOString()),
    contaId: contas[0] ? String(contas[0].id) : "",
    channel: "Loja própria",
    clienteName: "",
    items: "1",
    total: "",
    status: "Pago",
    notes: "",
  });
  const [form, setForm] = React.useState(blank);
  const [clientes, setClientes] = React.useState<ClienteLite[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      pedido
        ? {
            number: pedido.number,
            date: toLocalInput(pedido.date),
            contaId: pedido.contaId ? String(pedido.contaId) : "",
            channel: pedido.channel,
            clienteName: pedido.clienteName,
            items: String(pedido.items),
            total: pedido.total.toFixed(2).replace(".", ","),
            status: pedido.status,
            notes: pedido.notes,
          }
        : blank(),
    );
    api<Page<ClienteLite>>("/clientes?pageSize=100")
      .then((d) => setClientes(d.items))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pedido]);

  const set = (k: keyof ReturnType<typeof blank>) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const match = clientes.find((c) => c.name.toLowerCase() === form.clienteName.trim().toLowerCase());
    const body = {
      ...form,
      date: new Date(form.date).toISOString(),
      contaId: form.contaId ? Number(form.contaId) : null,
      clienteId: match?.id ?? null,
      items: Number(form.items),
    };
    try {
      if (pedido) await api(`/pedidos/${pedido.id}`, { method: "PUT", body });
      else await api("/pedidos", { body });
      toast.success(pedido ? "Venda atualizada" : "Venda registrada");
      onSaved();
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
          <DialogTitle>{pedido ? `Editar venda${pedido.number ? ` #${pedido.number}` : ""}` : "Registrar venda"}</DialogTitle>
          <DialogDescription>O faturamento e o gráfico da visão geral são calculados a partir destas vendas.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Valor total (R$)">
              <Input inputMode="decimal" placeholder="0,00" value={form.total} onChange={set("total")} autoFocus />
            </Field>
            <Field label="Data e hora">
              <Input type="datetime-local" value={form.date} onChange={set("date")} />
            </Field>
            <Field label="Conta">
              <NativeSelect value={form.contaId} onChange={set("contaId")}>
                <option value="">Sem conta (escolher canal)</option>
                {contas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.channel}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            {!form.contaId ? (
              <Field label="Canal">
                <NativeSelect value={form.channel} onChange={set("channel")}>
                  {CHANNELS.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </NativeSelect>
              </Field>
            ) : (
              <Field label="Nº do pedido" hint="Opcional · o número no marketplace">
                <Input value={form.number} onChange={set("number")} />
              </Field>
            )}
            <Field label="Cliente" hint={clientes.length ? "Escolha da lista ou digite um nome" : "Opcional"}>
              <Input list="rv-clientes" value={form.clienteName} onChange={set("clienteName")} />
              <datalist id="rv-clientes">
                {clientes.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Itens">
                <Input type="number" min={1} value={form.items} onChange={set("items")} />
              </Field>
              <Field label="Status">
                <NativeSelect value={form.status} onChange={set("status")}>
                  {STATUS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
            {!form.contaId && (
              <Field label="Nº do pedido" hint="Opcional">
                <Input value={form.number} onChange={set("number")} />
              </Field>
            )}
          </div>
          <Field label="Observações">
            <Textarea rows={2} value={form.notes} onChange={set("notes")} />
          </Field>
          {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Spinner />} {pedido ? "Salvar" : "Registrar venda"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function VendasPage() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = React.useState(params.get("q") ?? "");
  const dq = useDebounced(q);
  const status = params.get("status") ?? "";
  const channel = params.get("canal") ?? "";
  const page = Number(params.get("page") ?? 1);

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };

  React.useEffect(() => {
    if ((params.get("q") ?? "") !== dq) update({ q: dq || null, page: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq]);

  const path = `/pedidos?page=${page}&pageSize=15&status=${status}&channel=${encodeURIComponent(channel)}&q=${encodeURIComponent(params.get("q") ?? "")}`;
  const { data, error, loading, reload } = useApi<Page<Pedido> & { summary: { total: number; count: number } }>(path);
  const contas = useApi<{ accounts: Conta[] }>("/integracoes").data?.accounts ?? [];
  const [dialog, setDialog] = React.useState<{ open: boolean; pedido: Pedido | null }>({ open: params.get("novo") === "1", pedido: null });

  async function changeStatus(p: Pedido, s: string) {
    try {
      await api(`/pedidos/${p.id}`, { method: "PUT", body: { ...p, status: s } });
      toast.success(`Pedido marcado como ${s.toLowerCase()}`);
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function remove(p: Pedido) {
    if (!window.confirm("Excluir esta venda? Isso não pode ser desfeito.")) return;
    try {
      await api(`/pedidos/${p.id}`, { method: "DELETE" });
      toast.success("Venda excluída");
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const filtered = Boolean(status || channel || params.get("q"));

  return (
    <>
      <PageHeader
        title="Vendas"
        description={data ? `${int(data.summary.count)} pedidos válidos · ${brl(data.summary.total)}${filtered ? " no filtro" : ""}` : "Carregando…"}
        actions={
          <Button onClick={() => setDialog({ open: true, pedido: null })}>
            <Plus /> Registrar venda
          </Button>
        }
      />

      <div className="grid gap-2 sm:grid-cols-[1fr_160px_170px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nº do pedido ou cliente" className="pl-9" />
        </div>
        <NativeSelect value={status} onChange={(e) => update({ status: e.target.value || null, page: null })} aria-label="Status">
          <option value="">Todos os status</option>
          {STATUS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </NativeSelect>
        <NativeSelect value={channel} onChange={(e) => update({ canal: e.target.value || null, page: null })} aria-label="Canal">
          <option value="">Todos os canais</option>
          {CHANNELS.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </NativeSelect>
      </div>

      {error && <ErrorBox message={error} onRetry={reload} />}

      <Card className="overflow-hidden">
        {data && data.total === 0 && !filtered ? (
          <EmptyState
            icon={ShoppingCart}
            title="Nenhuma venda registrada"
            text="Registre suas vendas para acompanhar faturamento, ticket médio e participação por conta."
            action={
              <Button onClick={() => setDialog({ open: true, pedido: null })}>
                <Plus /> Registrar primeira venda
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="border-b bg-muted/60 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Pedido</th>
                  <th className="px-4 py-3 text-left font-medium">Cliente</th>
                  <th className="px-4 py-3 text-left font-medium">Canal</th>
                  <th className="px-4 py-3 text-right font-medium">Itens</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className={loading && data ? "divide-y opacity-60" : "divide-y"}>
                {!data && <LoadingRows cols={7} />}
                {data?.items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      Nenhuma venda encontrada com esses filtros.
                    </td>
                  </tr>
                )}
                {data?.items.map((p) => {
                  const { date, time } = dateTime(p.date);
                  const conta = contas.find((c) => c.id === p.contaId);
                  return (
                    <tr key={p.id} className="transition-colors hover:bg-accent/40">
                      <td className="px-4 py-3">
                        <p className="font-semibold">{p.number ? `#${p.number}` : `Venda ${p.id}`}</p>
                        <p className="text-xs text-muted-foreground">
                          {date} · {time}
                        </p>
                      </td>
                      <td className="px-4 py-3">{p.clienteName || <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2 text-xs text-muted-foreground">
                          <ChannelMark channel={p.channel} className="size-6 rounded-md text-[8px]" />
                          {conta?.name ?? p.channel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{p.items}</td>
                      <td className={cn("px-4 py-3 text-right font-semibold tabular-nums", p.status === "Cancelado" && "text-muted-foreground line-through")}>
                        {brl(p.total)}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={p.status}
                          onChange={(e) => changeStatus(p, e.target.value)}
                          aria-label="Alterar status"
                          className={cn("cursor-pointer rounded-full border-0 px-2.5 py-1 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring", STATUS_CLASS[p.status])}
                        >
                          {STATUS.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="size-8" onClick={() => setDialog({ open: true, pedido: p })} aria-label="Editar venda">
                            <Pencil />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-8 hover:text-destructive" onClick={() => remove(p)} aria-label="Excluir venda">
                            <Trash2 />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {data && data.total > 0 && <Pagination {...data} label="vendas" onPage={(p) => update({ page: String(p) })} />}

      <PedidoDialog
        open={dialog.open}
        pedido={dialog.pedido}
        contas={contas}
        onOpenChange={(open) => {
          setDialog((d) => ({ ...d, open }));
          if (!open && params.get("novo")) update({ novo: null });
        }}
        onSaved={reload}
      />
    </>
  );
}
