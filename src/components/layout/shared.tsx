import * as React from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/* Título no padrão: primeira parte escura, última palavra em azul. */
export function PageHeader({
  title,
  highlight,
  description,
  actions,
  className,
}: {
  title: string;
  highlight?: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">
          {title} {highlight && <span className="text-primary">{highlight}</span>}
        </h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export const CHANNELS = ["Mercado Livre", "Shopee", "SHEIN", "Loja própria", "Outro"] as const;

/* Estado vazio padrão */
export function EmptyState({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="grid place-items-center gap-2 px-6 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary-strong">
        <Icon className="size-6" />
      </span>
      <p className="mt-1 font-semibold">{title}</p>
      {text && <p className="max-w-sm text-sm text-muted-foreground">{text}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/* Selo genérico do canal (não usa os logos oficiais). */
export function ChannelMark({ channel, className }: { channel: string; className?: string }) {
  const map: Record<string, { bg: string; fg: string; txt: string }> = {
    "Mercado Livre": { bg: "bg-[#FFE600]", fg: "text-[#2D3277]", txt: "ML" },
    Shopee: { bg: "bg-[#EE4D2D]", fg: "text-white", txt: "S" },
    SHEIN: { bg: "bg-black dark:bg-white", fg: "text-white dark:text-black", txt: "SH" },
  };
  const m = map[channel] ?? { bg: "bg-primary-soft", fg: "text-primary-strong", txt: channel === "Outro" ? "•" : "LP" };
  return (
    <span
      aria-hidden
      className={cn("grid size-8 shrink-0 place-items-center rounded-lg text-[10px] font-bold", m.bg, m.fg, className)}
    >
      {m.txt}
    </span>
  );
}

const STATUS_VARIANT: Record<string, "default" | "success" | "warning" | "secondary" | "destructive"> = {
  Sincronizando: "default",
  Conectado: "success",
  "Atenção necessária": "warning",
  Ativo: "success",
  Inativo: "secondary",
  Ganhando: "success",
  Perdendo: "warning",
  Desativado: "secondary",
  Ativa: "success",
  Pausada: "secondary",
  Pago: "default",
  Enviado: "warning",
  Entregue: "success",
  Cancelado: "destructive",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge variant={STATUS_VARIANT[status] ?? "secondary"} className={cn("whitespace-nowrap", className)}>
      {status}
    </Badge>
  );
}

export function Pagination({
  page,
  pages,
  total,
  pageSize,
  label,
  onPage,
}: {
  page: number;
  pages: number;
  total: number;
  pageSize: number;
  label: string;
  onPage: (p: number) => void;
}) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const nums = Array.from(new Set([1, page - 1, page, page + 1, pages])).filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
      <span>
        Exibindo <b className="text-foreground">{from}–{to}</b> de <b className="text-foreground">{total}</b> {label}
      </span>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="size-8" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Página anterior">
          <ChevronLeft />
        </Button>
        {nums.map((n, i) => (
          <React.Fragment key={n}>
            {i > 0 && n - nums[i - 1] > 1 && <span className="px-1">…</span>}
            <button
              onClick={() => onPage(n)}
              aria-current={n === page ? "page" : undefined}
              className={cn(
                "grid size-8 place-items-center rounded-full text-xs font-semibold transition-colors hover:bg-accent",
                n === page && "bg-primary text-primary-foreground hover:bg-primary",
              )}
            >
              {n}
            </button>
          </React.Fragment>
        ))}
        <Button variant="ghost" size="icon" className="size-8" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Próxima página">
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}

export function LoadingRows({ cols, rows = 6 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: cols }).map((__, j) => (
            <td key={j} className="px-4 py-4">
              <div className="h-3.5 animate-pulse rounded bg-muted" style={{ width: `${50 + ((i + j) % 4) * 12}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-4 animate-spin", className)} aria-hidden />;
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
      <span>{message}</span>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Tentar de novo
        </Button>
      )}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}
