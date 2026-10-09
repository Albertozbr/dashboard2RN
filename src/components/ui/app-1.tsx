"use client";

import * as React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  CircleDollarSign,
  ClipboardList,
  PackageX,
  Plus,
  Receipt,
  RefreshCw,
  ShoppingCart,
  Truck,
  Users,
  Warehouse,
  XCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Progress } from "@/components/ui/progress";
import { ChannelMark, ErrorBox } from "@/components/layout/shared";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/use-api";
import { brl, firstName, initials, int, pct, relTime } from "@/lib/format";

type Dashboard = {
  period: string;
  hasData: boolean;
  stats: { revenue: number; previous: number; revenueDelta: number | null; orders: number; units: number; ticket: number; canceled: number };
  chart: { label: string; vendas: number; anterior: number }[];
  operational: Record<"aEnviar" | "tarefas" | "atrasadas" | "estoqueBaixo" | "semEstoque" | "clientes", number>;
  accounts: { id: string; name: string; channel: string; revenue: number; orders: number; share: number }[];
  priorities: { id: string; title: string; level: string; detail: string; link: string }[];
  prioritiesTotal: number;
  activity: { id: number; person: { name: string }; action: string; at: string }[];
  setup: { contas: number; anuncios: number; pedidos: number; usuarios: number };
};

const PERIODS = [
  { id: "hoje", label: "Hoje", compare: "ontem" },
  { id: "ontem", label: "Ontem", compare: "anteontem" },
  { id: "7d", label: "Últimos 7 dias", compare: "7 dias anteriores" },
  { id: "30d", label: "Últimos 30 dias", compare: "30 dias anteriores" },
  { id: "mes", label: "Mês", compare: "mesmo período do mês anterior" },
] as const;

const chartConfig = {
  vendas: { label: "Vendas", theme: { light: "hsl(200 66% 59%)", dark: "hsl(199 78% 60%)" } },
  anterior: { label: "Período anterior", theme: { light: "hsl(207 14% 52%)", dark: "hsl(205 14% 60%)" } },
} satisfies ChartConfig;

const LEVEL_CLASS: Record<string, string> = {
  "Alta prioridade": "text-warning",
  Crítico: "text-destructive",
  Média: "text-primary-strong",
};

function Skel({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

export function App1() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const period = PERIODS.find((p) => p.id === params.get("periodo")) ?? PERIODS[0];
  const { data, error, loading, reload } = useApi<Dashboard>(`/dashboard?period=${period.id}`);
  const s = data?.stats;

  const deltaText =
    s && (s.revenueDelta === null ? (s.revenue ? `sem vendas no período anterior` : "nenhuma venda no período") : `${pct(s.revenueDelta)} vs. ${period.compare}`);

  const STATS = [
    { label: "Faturamento", value: s && brl(s.revenue), hint: deltaText, trend: s?.revenueDelta == null ? "neutral" : s.revenueDelta >= 0 ? "up" : "down", icon: CircleDollarSign },
    { label: "Pedidos", value: s && int(s.orders), hint: s && `${int(s.units)} ${s.units === 1 ? "item" : "itens"}`, trend: "neutral", icon: ShoppingCart },
    { label: "Ticket médio", value: s && brl(s.ticket), hint: "por pedido", trend: "neutral", icon: Receipt },
    { label: "Cancelados", value: s && int(s.canceled), hint: s && (s.orders + s.canceled ? `${((s.canceled / (s.orders + s.canceled)) * 100).toFixed(1).replace(".", ",")}% dos pedidos` : "nenhum pedido"), trend: "neutral", icon: XCircle },
  ] as const;

  const op = data?.operational;
  const OPERATIONAL = [
    { label: "Pedidos a enviar", hint: "Status pago", value: op?.aEnviar, icon: Truck, alert: (op?.aEnviar ?? 0) > 0, to: "/operacao/vendas?status=Pago" },
    { label: "Tarefas pendentes", hint: op?.atrasadas ? `${op.atrasadas} atrasada(s)` : "Em dia", value: op?.tarefas, icon: ClipboardList, alert: (op?.atrasadas ?? 0) > 0, to: "/tarefas" },
    { label: "Estoque baixo", hint: "Até 5 unidades", value: op?.estoqueBaixo, icon: Warehouse, alert: (op?.estoqueBaixo ?? 0) > 0, to: "/operacao/anuncios?estoque=baixo" },
    { label: "Ativos sem estoque", hint: "Anúncios zerados", value: op?.semEstoque, icon: PackageX, alert: (op?.semEstoque ?? 0) > 0, to: "/operacao/anuncios?estoque=zerado" },
    { label: "Clientes", hint: "Cadastrados", value: op?.clientes, icon: Users, to: "/operacao/clientes" },
  ];

  const setup = data?.setup;
  const STEPS = setup
    ? [
        { done: setup.contas > 0, label: "Adicione suas contas de marketplace", to: "/configuracoes/integracoes" },
        { done: setup.anuncios > 0, label: "Cadastre seus anúncios e estoque", to: "/operacao/anuncios?novo=1" },
        { done: setup.pedidos > 0, label: "Registre sua primeira venda", to: "/operacao/vendas?novo=1" },
        { done: setup.usuarios > 1, label: "Dê acesso à sua equipe", to: "/configuracoes/equipe" },
      ]
    : [];
  const stepsDone = STEPS.filter((x) => x.done).length;
  const chartHasValues = data?.chart.some((c) => c.vendas || c.anterior);

  return (
    <>
      {/* Título + período */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">
            Visão <span className="text-primary">geral.</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Olá, {firstName(user?.name ?? "")}. Este é o resumo da sua operação.</p>
        </div>
        <div className="flex items-center gap-2">
          <div
            role="tablist"
            aria-label="Período"
            className="-mx-1 flex max-w-[calc(100vw-2rem)] gap-0.5 overflow-x-auto rounded-xl border border-border/70 bg-card p-1 shadow-soft"
          >
            {PERIODS.map((p) => (
              <button
                key={p.id}
                role="tab"
                aria-selected={period.id === p.id}
                onClick={() => setParams(p.id === "hoje" ? {} : { periodo: p.id })}
                className={cn(
                  "shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground",
                  period.id === p.id && "bg-primary-soft text-primary-strong shadow-sm",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="icon" className="size-10 shrink-0" onClick={reload} aria-label="Atualizar dados">
            <RefreshCw className={cn(loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {error && <ErrorBox message={error} onRetry={reload} />}

      {/* Primeiros passos — some quando tudo estiver feito */}
      {setup && stepsDone < STEPS.length && (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
            <div>
              <p className="font-semibold">Primeiros passos</p>
              <p className="text-xs text-muted-foreground">O painel se monta a partir do que você cadastra.</p>
            </div>
            <div className="flex w-40 items-center gap-2 text-xs font-semibold text-primary-strong">
              <Progress value={(stepsDone / STEPS.length) * 100} aria-label="Progresso da configuração" />
              {stepsDone}/{STEPS.length}
            </div>
          </div>
          <ul className="grid divide-y sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4">
            {STEPS.map((st, i) => (
              <li key={st.label}>
                <Link
                  to={st.to}
                  className={cn("flex h-full items-center gap-3 px-5 py-4 text-sm transition-colors hover:bg-accent/40", st.done && "text-muted-foreground")}
                >
                  {st.done ? <CheckCircle2 className="size-5 shrink-0 text-success" aria-hidden /> : <Circle className="size-5 shrink-0 text-primary" aria-hidden />}
                  <span className={cn(st.done && "line-through")}>
                    <span className="mr-1 text-xs font-bold text-primary-strong">0{i + 1}</span> {st.label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {STATS.map((stat) => (
          <Link key={stat.label} to="/operacao/vendas" className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:border-primary/40">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-4 pb-2 sm:p-5 sm:pb-3">
                <CardTitle className="text-xs font-medium text-muted-foreground">{stat.label}</CardTitle>
                <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-strong sm:size-9">
                  <stat.icon aria-hidden className="size-[18px]" />
                </span>
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
                {stat.value ? (
                  <p className="truncate text-lg font-bold tabular-nums tracking-tight text-primary-strong sm:text-2xl">{stat.value}</p>
                ) : (
                  <Skel className="h-7 w-28" />
                )}
                <p
                  className={cn(
                    "mt-1 truncate text-xs",
                    stat.trend === "up" && "text-success",
                    stat.trend === "down" && "text-warning",
                    stat.trend === "neutral" && "text-muted-foreground",
                  )}
                >
                  {stat.hint ?? "…"}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Gráfico + operação */}
      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="min-w-0 xl:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div className="space-y-1.5">
              <CardTitle>Vendas</CardTitle>
              <CardDescription>
                {period.id === "hoje" || period.id === "ontem" ? "Por hora" : "Por dia"} · {period.label.toLowerCase()} comparado a {period.compare}
              </CardDescription>
            </div>
            <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
              <Link to="/operacao/vendas">Ver vendas</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              {s ? <p className="text-3xl font-bold tabular-nums tracking-tight text-primary-strong">{brl(s.revenue)}</p> : <Skel className="h-9 w-48" />}
              <p className="text-xs text-muted-foreground">
                {period.id === "hoje" ? "Total de hoje até agora" : "Total do período"} · pedidos cancelados não entram
              </p>
            </div>
            {!data ? (
              <Skel className="h-64 w-full" />
            ) : !chartHasValues ? (
              <div className="grid h-64 place-items-center rounded-xl border border-dashed text-center">
                <div className="space-y-2 px-6">
                  <p className="text-sm font-medium">Nenhuma venda neste período</p>
                  <p className="text-xs text-muted-foreground">Registre vendas para ver o gráfico aqui.</p>
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/operacao/vendas?novo=1">
                      <Plus /> Registrar venda
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
                <AreaChart data={data.chart} margin={{ left: 4, right: 4, top: 8 }} accessibilityLayer>
                  <defs>
                    <linearGradient id="app1Vendas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-vendas)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="var(--color-vendas)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} />
                  <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : v)} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Area dataKey="anterior" type="monotone" stroke="var(--color-anterior)" strokeDasharray="4 4" fill="none" strokeWidth={1.5} />
                  <Area
                    dataKey="vendas"
                    type="monotone"
                    stroke="var(--color-vendas)"
                    fill="url(#app1Vendas)"
                    strokeWidth={2.25}
                    dot={data.chart.length <= 24 ? { r: 3, strokeWidth: 0, fill: "var(--color-vendas)" } : false}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Operação</CardTitle>
            <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
              <Link to="/tarefas">Abrir tarefas</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
              {OPERATIONAL.map((o) => (
                <li key={o.label}>
                  <Link
                    to={o.to}
                    className="flex items-center gap-3 rounded-xl border border-border/60 px-3 py-2.5 transition-colors hover:border-primary/40 hover:bg-accent/50"
                  >
                    <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", o.alert ? "bg-warning-soft text-warning" : "bg-primary-soft text-primary-strong")}>
                      <o.icon className="size-[18px]" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-tight">{o.label}</p>
                      <p className="text-xs text-muted-foreground">{o.hint}</p>
                    </div>
                    <span className="text-lg font-bold tabular-nums">{o.value ?? "–"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Participação + prioridades */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div className="space-y-1.5">
              <CardTitle>Participação da receita</CardTitle>
              <CardDescription>Por conta · {period.label.toLowerCase()}</CardDescription>
            </div>
            <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
              <Link to="/configuracoes/integracoes">Ver contas</Link>
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {!data && Array.from({ length: 3 }).map((_, i) => <Skel key={i} className="h-14 w-full" />)}
            {data?.accounts.length === 0 && (
              <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">Sem vendas no período.</p>
            )}
            {data?.accounts.map((acc) => (
              <div key={acc.id} className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <ChannelMark channel={acc.channel} />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold">{acc.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {acc.channel} · {int(acc.orders)} {acc.orders === 1 ? "pedido" : "pedidos"}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold tabular-nums">{brl(acc.revenue)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={acc.share} aria-label={`Participação de ${acc.name}`} />
                  <span className="w-9 shrink-0 text-right text-xs text-muted-foreground tabular-nums">{acc.share}%</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div className="space-y-1.5">
              <CardTitle>Prioridades</CardTitle>
              <CardDescription>Alertas calculados a partir dos seus dados</CardDescription>
            </div>
            <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
              <Link to="/acoes">Ver todas{data && data.prioritiesTotal > 0 ? ` (${data.prioritiesTotal})` : ""}</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data && data.priorities.length === 0 ? (
              <div className="flex items-center gap-3 rounded-xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
                <CheckCircle2 className="size-5 shrink-0 text-success" aria-hidden /> Nenhum alerta no momento.
              </div>
            ) : (
              <ul className="divide-y overflow-hidden rounded-xl border">
                {data?.priorities.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                    <AlertTriangle className={cn("size-4 shrink-0", LEVEL_CLASS[p.level])} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{p.title}</p>
                      <p className="truncate text-xs">
                        <span className={LEVEL_CLASS[p.level]}>{p.level}</span>
                        <span className="text-muted-foreground"> · {p.detail}</span>
                      </p>
                    </div>
                    <Button variant="outline" size="sm" className="h-8 shrink-0 px-3 text-xs" asChild>
                      <Link to={p.link}>Resolver</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Atividade recente */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div className="space-y-1.5">
            <CardTitle>Atividade recente</CardTitle>
            <CardDescription>Últimas ações no painel</CardDescription>
          </div>
          <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
            <Link to="/execucoes">Ver histórico</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <ol className="grid gap-4 md:grid-cols-2">
            {data?.activity.map((entry) => (
              <li key={entry.id} className="flex items-start gap-3">
                <Avatar className="size-8">
                  <AvatarFallback className="bg-primary-soft text-[11px] text-primary-strong">{initials(entry.person.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-sm leading-snug">
                    <span className="font-semibold">{entry.person.name}</span> <span className="text-muted-foreground">{entry.action}</span>
                  </p>
                  <p className="text-xs text-muted-foreground/80">{relTime(entry.at)}</p>
                </div>
              </li>
            ))}
          </ol>
          {data && !data.hasData && data.activity.length <= 1 && (
            <Badge variant="secondary" className="mt-2">
              As ações da equipe aparecem aqui conforme o painel é usado.
            </Badge>
          )}
        </CardContent>
      </Card>
    </>
  );
}

export default App1;
