import * as React from "react";
import { Pencil, Plug, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { CHANNELS, ChannelMark, EmptyState, ErrorBox, Field, PageHeader, Spinner, StatusBadge } from "@/components/layout/shared";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { brl, int } from "@/lib/format";

type Conta = {
  id: number;
  name: string;
  store: string;
  channel: string;
  status: "Ativa" | "Pausada";
  externalId: string;
  anuncios: number;
  pedidos: number;
};
type Data = {
  channels: { name: string; accounts: number; revenue30d: number; orders30d: number }[];
  accounts: Conta[];
};

function ContaDialog({ open, conta, onClose, onSaved }: { open: boolean; conta: Conta | null; onClose: () => void; onSaved: () => void }) {
  const blank = { name: "", store: "", channel: "Mercado Livre", externalId: "", status: "Ativa" };
  const [form, setForm] = React.useState(blank);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(conta ? { name: conta.name, store: conta.store, channel: conta.channel, externalId: conta.externalId, status: conta.status } : blank);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, conta]);

  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (conta) await api(`/contas/${conta.id}`, { method: "PUT", body: form });
      else await api("/contas", { body: form });
      toast.success(conta ? "Conta atualizada" : "Conta adicionada");
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{conta ? "Editar conta" : "Adicionar conta"}</DialogTitle>
          <DialogDescription>Cada loja/conta de marketplace que você opera. Vendas e anúncios ficam ligados a ela.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome da conta">
              <Input value={form.name} onChange={set("name")} placeholder="Ex.: Minha Loja" autoFocus />
            </Field>
            <Field label="Canal">
              <NativeSelect value={form.channel} onChange={set("channel")}>
                {CHANNELS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Empresa / loja" hint="Opcional">
              <Input value={form.store} onChange={set("store")} />
            </Field>
            <Field label="ID no canal" hint="Opcional · Seller ID, nº da loja…">
              <Input value={form.externalId} onChange={set("externalId")} />
            </Field>
            <Field label="Situação">
              <NativeSelect value={form.status} onChange={set("status")}>
                <option>Ativa</option>
                <option>Pausada</option>
              </NativeSelect>
            </Field>
          </div>
          {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Spinner />} {conta ? "Salvar" : "Adicionar conta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function IntegracoesPage() {
  const { data, error, reload } = useApi<Data>("/integracoes");
  const [dialog, setDialog] = React.useState<{ open: boolean; conta: Conta | null }>({ open: false, conta: null });

  async function remove(c: Conta) {
    if (!window.confirm(`Remover a conta ${c.name}? Vendas e anúncios continuam, mas sem conta vinculada.`)) return;
    try {
      await api(`/contas/${c.id}`, { method: "DELETE" });
      toast.success("Conta removida");
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const add = (
    <Button onClick={() => setDialog({ open: true, conta: null })}>
      <Plus /> Adicionar conta
    </Button>
  );

  return (
    <>
      <PageHeader title="Canais de" highlight="venda." description="As contas e lojas que você opera em cada marketplace." actions={add} />
      {error && <ErrorBox message={error} onRetry={reload} />}

      {data && data.channels.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.channels.map((ch) => (
            <Card key={ch.name} className="relative overflow-hidden p-5">
              <span className="absolute inset-x-5 top-0 h-0.5 rounded-b bg-gradient-to-r from-sidebar-from to-sidebar-to" />
              <div className="flex items-center gap-3">
                <ChannelMark channel={ch.name} className="size-11 rounded-xl text-xs" />
                <div>
                  <p className="font-semibold">{ch.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {ch.accounts} {ch.accounts === 1 ? "conta" : "contas"}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 overflow-hidden rounded-xl border text-xs">
                <div className="border-r px-3 py-2.5">
                  <p className="text-muted-foreground">Vendas · 30 dias</p>
                  <p className="mt-0.5 font-bold text-primary-strong">{brl(ch.revenue30d)}</p>
                </div>
                <div className="px-3 py-2.5">
                  <p className="text-muted-foreground">Pedidos</p>
                  <p className="mt-0.5 font-bold">{int(ch.orders30d)}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <h2 className="text-lg font-bold">
        Contas <span className="ml-1 rounded-md bg-muted px-2 py-0.5 text-xs">{data?.accounts.length ?? "–"}</span>
      </h2>

      {data && data.accounts.length === 0 ? (
        <Card>
          <EmptyState
            icon={Plug}
            title="Nenhuma conta adicionada"
            text="Adicione as contas que você opera (Mercado Livre, Shopee, SHEIN, loja própria…). A conexão automática com as APIs dos marketplaces pode ser ligada depois."
            action={add}
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data?.accounts.map((c) => (
            <Card key={c.id} className="p-4">
              <div className="flex items-center gap-3">
                <ChannelMark channel={c.channel} />
                <p className="min-w-0 flex-1 truncate font-semibold">{c.name}</p>
                <StatusBadge status={c.status} />
              </div>
              <div className="mt-3 flex justify-between gap-2 text-xs text-muted-foreground">
                <span className="truncate">
                  {c.store ? `${c.store} · ` : ""}
                  <b className="text-primary-strong">{c.channel}</b>
                </span>
                <span className="shrink-0">{c.externalId}</span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t pt-3 text-xs">
                <span className="text-muted-foreground">
                  {int(c.anuncios)} anúncios · {int(c.pedidos)} vendas
                </span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => setDialog({ open: true, conta: c })} aria-label={`Editar ${c.name}`}>
                    <Pencil />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-8 hover:text-destructive" onClick={() => remove(c)} aria-label={`Remover ${c.name}`}>
                    <Trash2 />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ContaDialog open={dialog.open} conta={dialog.conta} onClose={() => setDialog((d) => ({ ...d, open: false }))} onSaved={reload} />
    </>
  );
}
