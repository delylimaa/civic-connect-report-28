import { Check } from "lucide-react";
import { STATUS, formatarData, type HistoricoStatus } from "@/lib/ocorrencias";
import { Skeleton } from "@/components/ui/skeleton";

export function TimelineStatus({
  historico,
  carregando,
}: {
  historico: HistoricoStatus[];
  carregando?: boolean;
}) {
  if (carregando) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-5 w-32" />
      </div>
    );
  }

  if (historico.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma movimentação ainda.</p>;
  }

  return (
    <ol className="relative space-y-4 border-l border-border pl-6">
      {historico.map((item, indice) => {
        const info = STATUS[item.status_novo];
        const atual = indice === historico.length - 1;
        return (
          <li key={item.id} className="relative">
            <span
              className="absolute -left-[31px] flex size-5 items-center justify-center rounded-full ring-4 ring-card"
              style={{ backgroundColor: info.cor }}
              aria-hidden
            >
              {atual ? <Check className="size-3 text-primary-foreground" /> : null}
            </span>
            <p className="text-sm font-semibold text-foreground">{info.rotulo}</p>
            <p className="text-xs text-muted-foreground">{info.explicacao}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{formatarData(item.alterado_em)}</p>
          </li>
        );
      })}
    </ol>
  );
}
