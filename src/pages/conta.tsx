import * as React from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field, PageHeader, Spinner } from "@/components/layout/shared";
import { useTheme } from "@/components/theme/theme-provider";
import { api, STATIC_MODE } from "@/lib/api";
import { Download, Upload } from "lucide-react";
import { useAuth, type User } from "@/lib/auth";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function ContaPage() {
  const { user, setUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const { hash } = useLocation();
  const [profile, setProfile] = React.useState({ name: user?.name ?? "", email: user?.email ?? "" });
  const [pwd, setPwd] = React.useState({ current: "", next: "", confirm: "" });
  const [saving, setSaving] = React.useState<"perfil" | "senha" | null>(null);

  React.useEffect(() => {
    if (hash) document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" });
  }, [hash]);

  const fileRef = React.useRef<HTMLInputElement>(null);

  async function exportBackup() {
    try {
      const backup = await api("/backup");
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `rv-commerce-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success("Backup exportado");
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function importBackup(file: File) {
    if (!window.confirm("Restaurar este backup? Os dados atuais do painel serão substituídos.")) return;
    try {
      const body = JSON.parse(await file.text());
      await api("/backup", { body });
      toast.success("Backup restaurado");
      setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      toast.error(err instanceof SyntaxError ? "Arquivo inválido." : (err as Error).message);
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving("perfil");
    try {
      const d = await api<{ user: User }>("/me", { method: "PATCH", body: profile });
      setUser(d.user);
      toast.success("Dados atualizados");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(null);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pwd.next !== pwd.confirm) return toast.error("A confirmação não confere com a nova senha.");
    setSaving("senha");
    try {
      await api("/me/password", { body: { current: pwd.current, next: pwd.next } });
      setPwd({ current: "", next: "", confirm: "" });
      toast.success("Senha alterada");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(null);
    }
  }

  return (
    <>
      <PageHeader title="Minha" highlight="conta." description="Seus dados de acesso e preferências." />

      <Card className="flex flex-wrap items-center gap-4 p-5">
        <Avatar className="size-16 ring-4 ring-primary/20">
          <AvatarFallback className="bg-gradient-to-br from-sidebar-from to-sidebar-to text-xl text-white">
            {initials(user?.name ?? "")}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-lg font-bold">{user?.name}</p>
          <p className="text-sm text-muted-foreground">
            {user?.email} · {user?.role}
          </p>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dados pessoais</CardTitle>
            <CardDescription>Como seu nome aparece no painel e no histórico.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveProfile} className="grid gap-4">
              <Field label="Nome completo">
                <Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
              </Field>
              <Field label="E-mail de acesso">
                <Input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
              </Field>
              <Button type="submit" className="justify-self-start" disabled={saving === "perfil"}>
                {saving === "perfil" && <Spinner />} Salvar dados
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card id="senha" className="scroll-mt-24">
          <CardHeader>
            <CardTitle>Minha senha</CardTitle>
            <CardDescription>Use pelo menos 8 caracteres.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={savePassword} className="grid gap-4">
              <Field label="Senha atual">
                <Input type="password" autoComplete="current-password" value={pwd.current} onChange={(e) => setPwd({ ...pwd, current: e.target.value })} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nova senha">
                  <Input type="password" autoComplete="new-password" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} />
                </Field>
                <Field label="Confirmar nova senha">
                  <Input type="password" autoComplete="new-password" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} />
                </Field>
              </div>
              <Button type="submit" className="justify-self-start" disabled={saving === "senha"}>
                {saving === "senha" && <Spinner />} Alterar senha
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {user?.role === "admin" && (
        <Card>
          <CardHeader>
            <CardTitle>Backup dos dados</CardTitle>
            <CardDescription>
              {STATIC_MODE
                ? "Nesta versão os dados ficam salvos só neste navegador. Exporte backups com frequência e use-os para levar os dados a outro computador."
                : "Baixe uma cópia de todos os dados do painel ou restaure uma cópia anterior."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportBackup}>
              <Download /> Exportar backup
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload /> Restaurar backup
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importBackup(f);
                e.target.value = "";
              }}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Aparência</CardTitle>
          <CardDescription>Escolha o tema do painel. A preferência fica salva neste navegador.</CardDescription>
        </CardHeader>
        <CardContent className="grid max-w-md grid-cols-2 gap-3">
          {(["light", "dark"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              aria-pressed={theme === t}
              className={cn(
                "overflow-hidden rounded-xl border-2 text-left transition-colors",
                theme === t ? "border-primary" : "border-border hover:border-primary/40",
              )}
            >
              <div className={cn("flex h-20 gap-1.5 p-2", t === "light" ? "bg-[#F2F7FA]" : "bg-[#0A131B]")}>
                <div className={cn("w-6 rounded-md", t === "light" ? "bg-gradient-to-b from-[#47A7DD] to-[#34BAD9]" : "bg-gradient-to-b from-[#15496A] to-[#11475A]")} />
                <div className="flex flex-1 flex-col gap-1.5">
                  <div className={cn("h-5 rounded", t === "light" ? "bg-white" : "bg-[#111D27]")} />
                  <div className={cn("flex-1 rounded", t === "light" ? "bg-white" : "bg-[#111D27]")} />
                </div>
              </div>
              <p className="px-3 py-2 text-sm font-semibold">{t === "light" ? "Claro" : "Escuro"}</p>
            </button>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
