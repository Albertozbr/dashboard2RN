import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { Pencil, Plus, Search, Tag, Trash2, Truck, X } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { CHANNELS, ChannelMark, EmptyState, ErrorBox, Field, LoadingRows, PageHeader, Pagination, Spinner, StatusBadge } from "@/components/layout/shared";
import { api, type Page } from "@/lib/api";
import { useApi, useDebounced } from "@/lib/use-api";
import { brl, dateTime, int } from "@/lib/format";

type Anuncio = {
  id: number;
  title: string;
  sku: string;
  externalId: string;
  contaId: number | null;
  account: string;
  channel: string;
  cost: number | null;
  status: string;
  price: number;
  stock: number;
  freeShipping: boolean;
  updatedAt: string;
};

type Conta = { id: number; name: string; channel: string };

function AnuncioDialog({
  open,
  anuncio,
  contas,
  onClose,
  onSaved,
}: {
  open: boolean;
  anuncio: Anuncio | null;
  contas: Conta[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const blank = () => ({
    title: "",
    sku: "",
    externalId: "",
    contaId: contas[0] ? String(contas[0].id) : "",
    channel: "Loja própria",
    price: "",
    cost: "",
    stock: "0",
    freeShipping: false,
    active: true,
  });
  const [form, setForm] = React.useState(blank);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const money = (n: number | null) => (n == null ? "" : n.toFixed(2).replace(".", ","));

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      anuncio
        ? {
            title: anuncio.title,
            sku: anuncio.sku,
            externalId: anuncio.externalId,
            contaId: anuncio.contaId ? String(anuncio.contaId) : "",
            channel: anuncio.channel,
            price: money(anuncio.price),
            cost: money(anuncio.cost),
            stock: String(anuncio.stock),
            freeShipping: anuncio.freeShipping,
            active: anuncio.status !== "Desativado",
          }
        : blank(),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, anuncio]);

  const set = (k: "title" | "sku" | "externalId" | "contaId" | "channel" | "price" | "cost" | "stock") =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const body = { ...form, contaId: form.contaId ? Number(form.contaId) : null, stock: Number(form.stock) };
    try {
      if (anuncio) await api(`/anuncios/${anuncio.id}`, { method: "PUT", body });
      else await api("/anuncios", { body });
      toast.success(anuncio ? "Anúncio atualizado" : "Anúncio cadastrado");
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const price = Number(form.price.replace(/\./g, "").replace(",", "."));
  const cost = Number(form.cost.replace(/\./g, "").replace(",", "."));
  const margin = form.cost && price > 0 && Number.isFinite(cost) ? (price - cost) / price : null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="pr-6 leading-snug">{anuncio ? "Editar anúncio" : "Novo anúncio"}</DialogTitle>
          <DialogDescription>Estoque baixo (até 5) e anúncios ativos sem estoque viram alertas automaticamente.</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="grid gap-4">
          <Field label="Título">
            <Input value={form.title} onChange={set("title")} autoFocus />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Conta">
              <NativeSelect value={form.contaId} onChange={set("contaId")}>
                <option value="">Sem conta</option>
                {contas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.channel}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            {!form.contaId && (
              <Field label="Canal">
                <NativeSelect value={form.channel} onChange={set("channel")}>
                  {CHANNELS.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </NativeSelect>
              </Field>
            )}
            <Field label="SKU">
              <Input value={form.sku} onChange={set("sku")} placeholder="Opcional" />
            </Field>
            <Field label="ID no marketplace">
              <Input value={form.externalId} onChange={set("externalId")} placeholder="Ex.: MLB123…" />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Preço (R$)">
              <Input inputMode="decimal" value={form.price} onChange={set("price")} placeholder="0,00" />
            </Field>
            <Field label="Custo (R$)" hint={margin !== null ? `Margem ${(margin * 100).toFixed(0)}%` : "Opcional"}>
              <Input inputMode="decimal" value={form.cost} onChange={set("cost")} placeholder="0,00" />
            </Field>
            <Field label="Estoque">
              <Input type="number" min={0} value={form.stock} onChange={set("stock")} />
            </Field>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                ["active", "Anúncio ativo", "Disponível para venda"],
                ["freeShipping", "Frete grátis", "Exibe o selo na lista"],
              ] as const
            ).map(([k, label, hint]) => (
              <label key={k} className="flex items-center justify-between gap-4 rounded-xl border px-4 py-3 text-sm">
                <span>
                  <span className="font-medium">{label}</span>
                  <span className="block text-xs text-muted-foreground">{hint}</span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form[k]}
                  aria-label={label}
                  onClick={() => setForm((f) => ({ ...f, [k]: !f[k] }))}
                  className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", form[k] ? "bg-primary" : "bg-input")}
                >
                  <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", form[k] ? "left-[22px]" : "left-0.5")} />
                </button>
              </label>
            ))}
          </div>
          {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Spinner />} {anuncio ? "Salvar" : "Cadastrar anúncio"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AnunciosPage() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = React.useState(params.get("q") ?? "");
  const dq = useDebounced(q);
  const status = params.get("status") ?? "";
  const channel = params.get("canal") ?? "";
  const estoque = params.get("estoque") ?? "";
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

  const path = `/anuncios?page=${page}&pageSize=10&status=${encodeURIComponent(status)}&channel=${encodeURIComponent(channel)}&estoque=${estoque}&q=${encodeURIComponent(params.get("q") ?? "")}`;
  const { data, error, loading, reload } = useApi<Page<Anuncio>>(path);
  const contas = useApi<{ accounts: Conta[] }>("/integracoes").data?.accounts ?? [];
  const [dialog, setDialog] = React.useState<{ open: boolean; anuncio: Anuncio | null }>({ open: params.get("novo") === "1", anuncio: null });
  const filtered = Boolean(status || channel || estoque || params.get("q"));

  async function remove(a: Anuncio) {
    if (!window.confirm(`Excluir o anúncio "${a.title}"?`)) return;
    try {
      await api(`/anuncios/${a.id}`, { method: "DELETE" });
      toast.success("Anúncio excluído");
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <>
      <PageHeader
        title="Anúncios"
        description={data ? `${int(data.total)} ${data.total === 1 ? "anúncio" : "anúncios"}${filtered ? " no filtro" : ""}` : "Carregando…"}
        actions={
          <Button onClick={() => setDialog({ open: true, anuncio: null })}>
            <Plus /> Novo anúncio
          </Button>
        }
      />

      <div className="grid gap-2 sm:grid-cols-[1fr_170px_170px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por título, SKU ou ID…" className="pl-9" />
        </div>
        <NativeSelect value={status} onChange={(e) => update({ status: e.target.value || null, page: null })} aria-label="Status">
          <option value="">Todos os status</option>
          <option>Ativo</option>
          <option>Desativado</option>
        </NativeSelect>
        <NativeSelect value={channel} onChange={(e) => update({ canal: e.target.value || null, page: null })} aria-label="Canal">
          <option value="">Todos os canais</option>
          {CHANNELS.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </NativeSelect>
      </div>
      {estoque && (
        <div>
          <Badge variant="warning" className="gap-1.5 py-1">
            Estoque {estoque === "baixo" ? "baixo (1 a 5 un.)" : "zerado"}
            <button onClick={() => update({ estoque: null, page: null })} aria-label="Remover filtro">
              <X className="size-3" />
            </button>
          </Badge>
        </div>
      )}

      {error && <ErrorBox message={error} onRetry={reload} />}

      <Card className="overflow-hidden">
        {data && data.total === 0 && !filtered ? (
          <EmptyState
            icon={Tag}
            title="Nenhum anúncio cadastrado"
            text="Cadastre seus anúncios com preço, custo e estoque para receber alertas de estoque e acompanhar margens."
            action={
              <Button onClick={() => setDialog({ open: true, anuncio: null })}>
                <Plus /> Cadastrar primeiro anúncio
              </Button>
            }
          />
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b bg-muted/60 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Produto / anúncio</th>
                <th className="px-4 py-3 text-left font-medium">Conta</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Preço</th>
                <th className="px-4 py-3 text-right font-medium">Estoque</th>
                <th className="px-4 py-3 text-left font-medium">Atualização</th>
                <th className="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className={loading && data ? "divide-y opacity-60" : "divide-y"}>
              {!data && <LoadingRows cols={7} />}
              {data?.items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    Nenhum anúncio encontrado.
                  </td>
                </tr>
              )}
              {data?.items.map((a) => {
                const { date, time } = dateTime(a.updatedAt);
                return (
                  <tr key={a.id} className="transition-colors hover:bg-accent/40">
                    <td className="max-w-[340px] px-4 py-3">
                      {a.freeShipping && (
                        <p className="mb-0.5 flex items-center gap-1 text-[11px] font-medium text-success">
                          <Truck className="size-3" /> Frete grátis
                        </p>
                      )}
                      <p className="truncate font-medium">{a.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        SKU {a.sku} · {a.externalId}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        <ChannelMark channel={a.channel} className="size-6 rounded-md text-[8px]" />
                        {a.account || a.channel}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{brl(a.price)}</td>
                    <td className={cn("px-4 py-3 text-right font-semibold tabular-nums", a.stock === 0 ? "text-muted-foreground" : a.stock <= 5 && "text-warning")}>
                      {a.stock}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {date.slice(0, 5)} {time}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="size-8" onClick={() => setDialog({ open: true, anuncio: a })} aria-label="Editar anúncio">
                          <Pencil />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-8 hover:text-destructive" onClick={() => remove(a)} aria-label="Excluir anúncio">
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

      {data && data.total > 0 && <Pagination {...data} label="anúncios" onPage={(p) => update({ page: String(p) })} />}
      <AnuncioDialog
        open={dialog.open}
        anuncio={dialog.anuncio}
        contas={contas}
        onClose={() => {
          setDialog((d) => ({ ...d, open: false }));
          if (params.get("novo")) update({ novo: null });
        }}
        onSaved={reload}
      />
    </>
  );
}
