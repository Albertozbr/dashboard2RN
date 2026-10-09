import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, Construction } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ALL_LEAVES, findLeaf } from "@/lib/nav";

/* Página provisória para os itens do menu que ainda não foram construídos. */
export function EmBrevePage() {
  const { pathname } = useLocation();
  const leaf = findLeaf(pathname);
  const ready = ALL_LEAVES.filter((l) => l.ready && !l.path.includes("#") && l.path !== pathname).slice(0, 6);
  const Icon = leaf?.icon ?? Construction;

  return (
    <Card className="mx-auto mt-6 w-full max-w-2xl p-8 text-center sm:p-12">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary-strong">
        <Icon className="size-7" aria-hidden />
      </span>
      <h1 className="mt-5 text-2xl font-bold tracking-tight">
        {leaf?.label ?? "Página"} <span className="text-primary">em breve.</span>
      </h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Esta área já está no menu e na rota <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{pathname}</code>, pronta
        para receber a tela. Enquanto isso, estas já funcionam:
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {ready.map((l) => (
          <Button key={l.path} variant="outline" size="sm" asChild>
            <Link to={l.path}>
              <l.icon /> {l.label}
            </Link>
          </Button>
        ))}
      </div>
      <Button variant="link" className="mt-6" asChild>
        <Link to="/">
          <ArrowLeft /> Voltar para a visão geral
        </Link>
      </Button>
    </Card>
  );
}

export function NotFoundPage() {
  return (
    <Card className="mx-auto mt-6 w-full max-w-lg p-10 text-center">
      <p className="text-5xl font-bold text-primary">404</p>
      <h1 className="mt-3 text-xl font-bold">Página não encontrada</h1>
      <p className="mt-1 text-sm text-muted-foreground">O endereço pode ter mudado ou não existe.</p>
      <Button className="mt-6" asChild>
        <Link to="/">Ir para a visão geral</Link>
      </Button>
    </Card>
  );
}
