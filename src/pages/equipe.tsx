import * as React from "react";
import { ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { ErrorBox, Field, PageHeader, Spinner } from "@/components/layout/shared";
import { api, STATIC_MODE } from "@/lib/api";
import { useAuth, type User } from "@/lib/auth";
import { useApi } from "@/lib/use-api";
import { dateTime, initials } from "@/lib/format";

export default function EquipePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data, error, reload } = useApi<{ items: User[] }>("/usuarios");
  const [form, setForm] = React.useState({ name: "", email: "", password: "", role: "membro" });
  const [saving, setSaving] = React.useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api("/usuarios", { body: form });
      toast.success(`Acesso criado para ${form.name}`, { description: "Envie o e-mail e a senha provisória para a pessoa." });
      setForm({ name: "", email: "", password: "", role: "membro" });
      reload();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(u: User) {
    if (!window.confirm(`Remover o acesso de ${u.name}?`)) return;
    try {
      await api(`/usuarios/${u.id}`, { method: "DELETE" });
      toast.success("Acesso removido");
      reload();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <>
      <PageHeader title="Acesso da" highlight="equipe." description="Só quem tem acesso criado aqui consegue entrar no painel." />
      {error && <ErrorBox message={error} onRetry={reload} />}

      {STATIC_MODE && (
        <p className="rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning">
          Nesta versão sem servidor (GitHub Pages), os acessos ficam salvos <b>neste navegador</b>. Para a equipe usar em outros
          computadores com os mesmos dados, publique a versão com servidor.
        </p>
      )}

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Novo acesso</CardTitle>
            <CardDescription>Crie com uma senha provisória; a pessoa pode trocar em Minha conta.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={add} className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_160px_auto] md:items-end">
              <Field label="Nome">
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
              <Field label="E-mail">
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </Field>
              <Field label="Senha provisória">
                <Input type="text" autoComplete="off" placeholder="mín. 8 caracteres" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </Field>
              <Field label="Permissão">
                <NativeSelect value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="membro">Membro</option>
                  <option value="admin">Administrador</option>
                </NativeSelect>
              </Field>
              <Button type="submit" disabled={saving}>
                {saving ? <Spinner /> : <UserPlus />} Criar acesso
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden">
        <ul className="divide-y">
          {data?.items.map((u) => (
            <li key={u.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <Avatar className="size-10">
                <AvatarFallback className="bg-primary-soft text-sm text-primary-strong">{initials(u.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-semibold">
                  {u.name} {u.id === user?.id && <span className="text-xs font-normal text-muted-foreground">(você)</span>}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {u.email} · desde {dateTime(u.createdAt).date}
                </p>
              </div>
              {u.role === "admin" ? (
                <Badge className="gap-1">
                  <ShieldCheck className="size-3" /> Administrador
                </Badge>
              ) : (
                <Badge variant="secondary">Membro</Badge>
              )}
              {isAdmin && u.id !== user?.id && (
                <Button variant="ghost" size="icon" className="size-8 hover:text-destructive" onClick={() => remove(u)} aria-label={`Remover ${u.name}`}>
                  <Trash2 />
                </Button>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
