import * as React from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, BarChart3, Eye, EyeOff, Moon, PlugZap, ShieldCheck, Sparkles, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/layout/shared";
import { useTheme } from "@/components/theme/theme-provider";
import { useAuth } from "@/lib/auth";
import { STATIC_MODE } from "@/lib/api";

function AuthShell({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  return (
    <div className="grid min-h-svh bg-background lg:grid-cols-[1.05fr_1fr]">
      {/* Painel da marca */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-sidebar-from to-sidebar-to p-10 text-white lg:flex lg:flex-col">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-white/10 blur-2xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-16 size-[28rem] rounded-full bg-white/10 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-white/20 dark:bg-white/10">
            <Sparkles className="size-6" aria-hidden />
          </span>
          <div className="leading-tight">
            <p className="text-lg font-bold">RV Commerce AI</p>
            <p className="text-xs text-white/75">RN Design</p>
          </div>
        </div>

        <div className="relative my-auto max-w-md">
          <h2 className="text-[34px] font-bold leading-tight tracking-tight">
            Toda a sua operação de marketplace em <span className="text-white/75">um só lugar.</span>
          </h2>
          <ul className="mt-8 space-y-4 text-sm">
            {[
              { icon: PlugZap, text: "Vendas, anúncios e clientes de todos os canais em um só painel." },
              { icon: BarChart3, text: "Faturamento, estoque e prioridades calculados a partir dos seus dados." },
              { icon: ShieldCheck, text: "Acesso só para quem você convidar, com histórico de cada ação." },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/15">
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="pt-1.5 text-white/90">{text}</span>
              </li>
            ))}
          </ul>
        </div>

      </aside>

      {/* Formulário */}
      <section className="relative flex flex-col px-5 py-8 sm:px-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 lg:invisible">
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-sidebar-from to-sidebar-to text-white">
              <Sparkles className="size-5" aria-hidden />
            </span>
            <span className="font-bold">RV Commerce AI</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-9"
            onClick={toggleTheme}
            aria-label={isDark ? "Mudar para modo claro" : "Mudar para modo escuro"}
          >
            {isDark ? <Sun /> : <Moon />}
          </Button>
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">{children}</div>
        <p className="text-center text-xs text-muted-foreground">
          {STATIC_MODE && "Os dados deste painel ficam salvos neste navegador. · "}© {new Date().getFullYear()} RV Commerce AI
        </p>
      </section>
    </div>
  );
}

function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = React.useState(false);
  return (
    <div className="relative">
      <Input {...props} type={show ? "text" : "password"} className="h-11 pr-11" />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:text-foreground"
        aria-label={show ? "Ocultar senha" : "Mostrar senha"}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

function useRedirectIfLogged() {
  const { user } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";
  return user ? <Navigate to={from} replace /> : null;
}

export function LoginPage() {
  const { login, hasUsers } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirect = useRedirectIfLogged();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  if (redirect) return redirect;
  if (!hasUsers) return <Navigate to="/cadastro" replace />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
      navigate((location.state as { from?: string } | null)?.from ?? "/", { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      <h1 className="text-[28px] font-bold tracking-tight">
        Bem-vindo <span className="text-primary">de volta.</span>
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">Entre para acompanhar sua operação de hoje.</p>

      <form onSubmit={onSubmit} className="mt-8 grid gap-4" noValidate>
        <div className="grid gap-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="voce@empresa.com"
            className="h-11"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="grid gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Senha</Label>
          </div>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="Sua senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" className="mt-1 h-11" disabled={busy}>
          {busy ? <Spinner /> : null}
          Entrar
          {!busy && <ArrowRight />}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Não tem acesso? Peça ao administrador do painel para criar o seu.
      </p>
    </AuthShell>
  );
}

export function RegisterPage() {
  const { register, hasUsers } = useAuth();
  const navigate = useNavigate();
  const redirect = useRedirectIfLogged();
  const [form, setForm] = React.useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  if (redirect) return redirect;
  if (hasUsers) return <Navigate to="/login" replace />;
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.password !== form.confirm) return setError("As senhas não conferem.");
    setBusy(true);
    try {
      await register(form.name, form.email, form.password);
      navigate("/", { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      <h1 className="text-[28px] font-bold tracking-tight">
        Primeiro <span className="text-primary">acesso.</span>
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Crie o acesso de administrador. Depois disso o cadastro fecha e só você adiciona a equipe.
      </p>

      <form onSubmit={onSubmit} className="mt-8 grid gap-4" noValidate>
        <div className="grid gap-1.5">
          <Label htmlFor="name">Seu nome</Label>
          <Input id="name" autoComplete="name" className="h-11" placeholder="Nome e sobrenome" value={form.name} onChange={set("name")} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" autoComplete="email" className="h-11" placeholder="voce@empresa.com" value={form.email} onChange={set("email")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="password">Senha</Label>
            <PasswordInput id="password" autoComplete="new-password" placeholder="mín. 8 caracteres" value={form.password} onChange={set("password")} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="confirm">Confirmar</Label>
            <PasswordInput id="confirm" autoComplete="new-password" placeholder="repita a senha" value={form.confirm} onChange={set("confirm")} />
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" className="mt-1 h-11" disabled={busy}>
          {busy ? <Spinner /> : null}
          Criar acesso e entrar
        </Button>
      </form>
    </AuthShell>
  );
}
