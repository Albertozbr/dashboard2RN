import * as React from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Bell, ChevronRight, CornerDownLeft, LogOut, Moon, Search, ShoppingCart, Sun, Tag, UserCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/app-1-utils/sidebar";
import { App1Sidebar } from "@/components/ui/app-1-utils/app-1-sidebar";
import { useTheme } from "@/components/theme/theme-provider";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useApi, useDebounced } from "@/lib/use-api";
import { brl, initials } from "@/lib/format";
import { ALL_LEAVES, NAV_GESTAO, findLeaf } from "@/lib/nav";

function Breadcrumb() {
  const { pathname } = useLocation();
  const leaf = findLeaf(pathname);
  const group = NAV_GESTAO.find((g) => g.children.some((c) => c.path === pathname));
  if (!leaf || pathname === "/") return <span className="text-sm font-semibold">Visão geral</span>;
  return (
    <nav aria-label="Você está em" className="flex min-w-0 items-center gap-1.5 text-sm">
      {group && (
        <>
          <group.icon className="size-4 shrink-0 text-primary" aria-hidden />
          <span className="hidden text-primary-strong sm:inline">{group.label}</span>
          <ChevronRight className="hidden size-3.5 text-muted-foreground sm:block" aria-hidden />
        </>
      )}
      <span className="truncate font-semibold">{leaf.label}</span>
    </nav>
  );
}

type SearchResult = {
  clientes: { id: number; name: string; city: string }[];
  anuncios: { id: number; title: string; sku: string; price: number }[];
  pedidos: { id: number; number: string; clienteName: string; total: number }[];
};

/* Busca global (Ctrl + K): páginas, clientes e anúncios */
function CommandSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const navigate = useNavigate();
  const [q, setQ] = React.useState("");
  const dq = useDebounced(q, 250);
  const [res, setRes] = React.useState<SearchResult>({ clientes: [], anuncios: [], pedidos: [] });
  const [active, setActive] = React.useState(0);

  React.useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  React.useEffect(() => {
    if (dq.trim().length < 2) return setRes({ clientes: [], anuncios: [], pedidos: [] });
    api<SearchResult>(`/busca?q=${encodeURIComponent(dq)}`).then(setRes).catch(() => {});
  }, [dq]);

  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const pages = ALL_LEAVES.filter((l) => !q || norm(`${l.label} ${l.group ?? ""}`).includes(norm(q))).slice(0, q ? 6 : 8);

  const items = [
    ...pages.map((p) => ({ key: `p${p.path}`, label: p.label, sub: p.group ?? "Página", icon: p.icon, to: p.path })),
    ...res.clientes.map((c) => ({ key: `c${c.id}`, label: c.name, sub: `Cliente${c.city ? ` · ${c.city}` : ""}`, icon: UserCircle, to: `/operacao/clientes?id=${c.id}` })),
    ...res.anuncios.map((a) => ({ key: `a${a.id}`, label: a.title, sub: `Anúncio${a.sku ? ` · ${a.sku}` : ""} · ${brl(a.price)}`, icon: Tag, to: `/operacao/anuncios?q=${encodeURIComponent(a.sku || a.title)}` })),
    ...res.pedidos.map((p) => ({ key: `v${p.id}`, label: p.number ? `Pedido #${p.number}` : `Venda ${p.id}`, sub: `Venda${p.clienteName ? ` · ${p.clienteName}` : ""} · ${brl(p.total)}`, icon: ShoppingCart, to: `/operacao/vendas?q=${encodeURIComponent(p.number || p.clienteName)}` })),
  ];

  React.useEffect(() => setActive(0), [q, res]);

  const go = (to: string) => {
    onOpenChange(false);
    navigate(to);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[15%] max-w-xl translate-y-0 gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">Buscar</DialogTitle>
        <DialogDescription className="sr-only">Busque páginas, clientes e anúncios</DialogDescription>
        <div className="flex items-center gap-3 border-b px-4">
          <Search className="size-4 text-muted-foreground" aria-hidden />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(items.length - 1, a + 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
              if (e.key === "Enter" && items[active]) go(items[active].to);
            }}
            placeholder="Buscar páginas, clientes, anúncios ou SKU…"
            className="h-14 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-2" role="listbox">
          {items.length === 0 && <li className="px-3 py-8 text-center text-sm text-muted-foreground">Nada encontrado para “{q}”.</li>}
          {items.map((it, i) => (
            <li key={it.key} role="option" aria-selected={i === active}>
              <button
                onMouseEnter={() => setActive(i)}
                onClick={() => go(it.to)}
                className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left", i === active && "bg-accent")}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-strong">
                  <it.icon className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{it.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{it.sub}</span>
                </span>
                {i === active && <CornerDownLeft className="size-4 text-muted-foreground" aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

function Notifications() {
  const { pathname } = useLocation();
  const { data } = useApi<{ items: { id: string; title: string; level: string; detail: string; link: string; dismissed: boolean }[] }>(
    `/prioridades?_=${encodeURIComponent(pathname)}`,
  );
  const open = data?.items.filter((p) => !p.dismissed) ?? [];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative size-9" aria-label={`Notificações (${open.length})`}>
          <Bell />
          {open.length > 0 && (
            <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-warning px-1 text-[9px] font-bold leading-4 text-white ring-2 ring-background">
              {open.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Prioridades em aberto</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {open.length === 0 && <p className="px-3 py-4 text-sm text-muted-foreground">Nenhum alerta no momento.</p>}
        {open.slice(0, 4).map((p) => (
          <DropdownMenuItem key={p.id} asChild>
            <Link to={p.link} className="flex-col items-start gap-0.5">
              <span className="text-sm font-medium leading-snug">{p.title}</span>
              <span className="text-xs text-muted-foreground">
                <span className={p.level === "Crítico" ? "text-destructive" : "text-warning"}>{p.level}</span> · {p.detail}
              </span>
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/acoes" className="justify-center font-semibold text-primary-strong">
            Ver todas as ações
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppLayout() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [searchOpen, setSearchOpen] = React.useState(false);
  const isDark = theme === "dark";
  const mainRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  React.useEffect(() => {
    window.scrollTo({ top: 0 });
    const leaf = findLeaf(pathname);
    document.title = `${leaf && pathname !== "/" ? leaf.label : "Visão geral"} · RV Commerce AI`;
  }, [pathname]);

  return (
    <SidebarProvider>
      <App1Sidebar />
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border/60 bg-background/85 px-3 backdrop-blur sm:px-5">
          <SidebarTrigger aria-label="Alternar navegação" />
          <Breadcrumb />
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden h-9 w-56 items-center gap-2 rounded-lg border border-border/70 bg-card px-3 text-xs text-muted-foreground shadow-soft transition-colors hover:border-primary/40 md:flex"
            >
              <Search className="size-4" aria-hidden />
              Buscar…
              <kbd className="ml-auto rounded border bg-muted px-1.5 font-sans text-[10px]">Ctrl K</kbd>
            </button>
            <Button variant="ghost" size="icon" className="size-9 md:hidden" aria-label="Buscar" onClick={() => setSearchOpen(true)}>
              <Search />
            </Button>
            <Button variant="ghost" size="icon" className="size-9" onClick={toggleTheme} aria-label={isDark ? "Mudar para modo claro" : "Mudar para modo escuro"}>
              {isDark ? <Sun /> : <Moon />}
            </Button>
            <Notifications />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="ml-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Menu da conta">
                  <Avatar className="size-8 ring-2 ring-primary/30">
                    <AvatarFallback className="bg-primary-soft text-xs text-primary-strong">{initials(user?.name ?? "")}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="leading-tight">
                  {user?.name}
                  <span className="block text-xs font-normal text-muted-foreground">{user?.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate("/configuracoes/conta")}>
                  <UserCircle /> Minha conta
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={toggleTheme}>
                  {isDark ? <Sun /> : <Moon />} Modo {isDark ? "claro" : "escuro"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={async () => {
                    await logout();
                    navigate("/login", { replace: true });
                  }}
                >
                  <LogOut /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main ref={mainRef} className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
          <Outlet />
        </main>
      </SidebarInset>
      <CommandSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </SidebarProvider>
  );
}
