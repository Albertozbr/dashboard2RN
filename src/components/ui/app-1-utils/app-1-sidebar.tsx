"use client";

import * as React from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, ChevronRight, LogOut, Moon, Sparkles, Sun } from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTheme } from "@/components/theme/theme-provider";
import { Sidebar, useSidebar } from "@/components/ui/app-1-utils/sidebar";
import { useAuth } from "@/lib/auth";
import { firstName, initials } from "@/lib/format";
import { NAV_GESTAO, NAV_MAIN, type NavGroup as NavGroupT } from "@/lib/nav";

const itemBase =
  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-sidebar-foreground/95 transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70";
const itemActive =
  "bg-white/25 font-semibold shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)] dark:bg-white/10 dark:text-sidebar-active";

function NavGroup({ group }: { group: NavGroupT }) {
  const { pathname } = useLocation();
  const containsActive = group.children.some((c) => pathname.startsWith(c.path.split("#")[0]));
  const [open, setOpen] = React.useState(containsActive);
  React.useEffect(() => {
    if (containsActive) setOpen(true);
  }, [containsActive]);
  const Icon = group.icon;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(itemBase, "font-semibold")}
      >
        <Icon className="size-4 shrink-0" aria-hidden />
        <span className="truncate">{group.label}</span>
        <ChevronDown
          className={cn("ml-auto size-4 opacity-80 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>
      <div className={cn("grid transition-[grid-template-rows] duration-200", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <ul className="overflow-hidden pl-3">
          {group.children
            .filter((c) => !c.path.includes("#"))
            .map((child) => (
              <li key={child.path}>
                <NavLink
                  to={child.path}
                  tabIndex={open ? 0 : -1}
                  className={({ isActive }) =>
                    cn(itemBase, "py-1.5 text-[12.5px] font-normal", isActive && itemActive)
                  }
                >
                  <child.icon className="size-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{child.label}</span>
                  {!child.ready && (
                    <span className="ml-auto rounded bg-white/15 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide">
                      breve
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}

export function App1Sidebar() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { setOpenMobile } = useSidebar();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isDark = theme === "dark";

  // No celular, fecha a gaveta ao trocar de página
  React.useEffect(() => setOpenMobile(false), [pathname, setOpenMobile]);

  const name = user?.name ?? "";

  return (
    <Sidebar>
      {/* Marca */}
      <Link to="/" className="flex items-center gap-2.5 px-4 pb-4 pt-5">
        <span className="grid size-9 place-items-center rounded-xl bg-white/20 dark:bg-white/10">
          <Sparkles className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[15px] font-bold tracking-tight">RV Commerce AI</p>
          <p className="text-[11px] text-sidebar-muted">RN Design</p>
        </div>
      </Link>

      {/* Navegação */}
      <nav className="scrollbar-thin flex-1 space-y-0.5 overflow-y-auto px-3 pb-3" aria-label="Principal">
        {NAV_MAIN.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end
            className={({ isActive }) => cn(itemBase, isActive && itemActive)}
          >
            <item.icon className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{item.label}</span>
            {!item.ready && (
              <span className="ml-auto rounded bg-white/15 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide">
                breve
              </span>
            )}
          </NavLink>
        ))}
        <p className="px-3 pb-1 pt-4 text-[10px] font-bold uppercase tracking-[0.12em] text-sidebar-muted">Gestão</p>
        {NAV_GESTAO.map((group) => (
          <NavGroup key={group.label} group={group} />
        ))}
      </nav>

      {/* Usuário + tema */}
      <div className="border-t border-white/20 px-3 py-3">
        <NavLink
          to="/configuracoes/conta"
          className={({ isActive }) => cn(itemBase, "px-2", isActive && itemActive)}
        >
          <Avatar className="size-8 ring-2 ring-white/40">
            <AvatarFallback className="bg-white/25 text-[11px] text-white">{initials(name)}</AvatarFallback>
          </Avatar>
          <span className="min-w-0 text-left leading-tight">
            <span className="block truncate text-xs font-semibold">{firstName(name)}</span>
            <span className="block text-[10.5px] font-normal text-sidebar-muted">Minha conta</span>
          </span>
          <ChevronRight className="ml-auto size-4 opacity-80" aria-hidden />
        </NavLink>
      </div>
      <div className="flex items-center gap-1 border-t border-white/20 px-3 py-2.5">
        <button
          type="button"
          onClick={toggleTheme}
          className={cn(itemBase, "w-auto flex-1 px-2 text-xs font-semibold")}
          aria-label={isDark ? "Mudar para modo claro" : "Mudar para modo escuro"}
        >
          {isDark ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
          {isDark ? "Claro" : "Escuro"}
        </button>
        <button
          type="button"
          className={cn(itemBase, "w-auto px-2")}
          aria-label="Sair"
          title="Sair"
          onClick={async () => {
            await logout();
            navigate("/login", { replace: true });
          }}
        >
          <LogOut className="size-4" aria-hidden />
        </button>
      </div>
    </Sidebar>
  );
}
