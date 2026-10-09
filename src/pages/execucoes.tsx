import * as React from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { ErrorBox, PageHeader, Pagination } from "@/components/layout/shared";
import type { Page } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { dateTime, initials, relTime } from "@/lib/format";

type Atividade = { id: number; person: { name: string; avatar: string | null }; action: string; at: string };

export default function ExecucoesPage() {
  const [page, setPage] = React.useState(1);
  const { data, error, reload } = useApi<Page<Atividade>>(`/atividades?page=${page}&pageSize=15`);

  return (
    <>
      <PageHeader title="Histórico de" highlight="execuções." description="Tudo o que foi feito no painel, do mais recente ao mais antigo." />
      {error && <ErrorBox message={error} onRetry={reload} />}
      <Card className="overflow-hidden">
        <ol className="divide-y">
          {data?.items.map((a) => {
            const { date, time } = dateTime(a.at);
            return (
              <li key={a.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <Avatar className="size-9">
                  {a.person.avatar && <AvatarImage src={a.person.avatar} alt={a.person.name} />}
                  <AvatarFallback className="bg-primary-soft text-xs text-primary-strong">{initials(a.person.name)}</AvatarFallback>
                </Avatar>
                <p className="min-w-0 flex-1 text-sm">
                  <span className="font-semibold">{a.person.name}</span>{" "}
                  <span className="text-muted-foreground">{a.action}</span>
                </p>
                <div className="shrink-0 text-right text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">{relTime(a.at)}</p>
                  <p>
                    {date} {time}
                  </p>
                </div>
              </li>
            );
          })}
          {!data && <li className="px-5 py-10 text-center text-sm text-muted-foreground">Carregando…</li>}
        </ol>
      </Card>
      {data && <Pagination {...data} label="registros" onPage={setPage} />}
    </>
  );
}
