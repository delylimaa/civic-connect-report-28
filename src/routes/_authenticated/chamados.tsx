import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown, PlusCircle } from "lucide-react";
import { useOcorrencias } from "@/hooks/useOcorrencias";
import { useSessao } from "@/hooks/usePerfil";
import { DetalheChamado } from "@/components/DetalheChamado";
import { BadgeStatus } from "@/components/BadgeStatus";
import { FotoOcorrencia } from "@/components/FotoOcorrencia";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Revelar } from "@/components/Revelar";
import { CATEGORIAS, formatarData, type Ocorrencia , rotuloOcorrencia } from "@/lib/ocorrencias";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/chamados")({
  head: () => ({
    meta: [
      { title: "Meus chamados — Alerta Cidadão" },
      {
        name: "description",
        content: "Acompanhe cada etapa dos seus chamados, do registro até a solução.",
      },
      { property: "og:title", content: "Meus chamados — Alerta Cidadão" },
      { property: "og:description", content: "Histórico completo de cada chamado registrado." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Chamados,
});

function CardChamado({ ocorrencia, atraso = 0, usuarioId }: { ocorrencia: Ocorrencia; atraso?: number; usuarioId: string | null }) {
  const [aberto, setAberto] = useState(ocorrencia.status === "aguardando_cidadao");

  return (
    <Revelar
      atraso={atraso}
      as="article"
      className="elevar overflow-hidden rounded-2xl bg-card card-suave"
    >
      <div className="flex gap-4 p-4">
        <FotoOcorrencia
          caminho={ocorrencia.foto_url}
          alt={`Foto do chamado ${ocorrencia.titulo}`}
          className="size-24 shrink-0 rounded-xl"
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold tracking-wide text-accent">{ocorrencia.protocolo}</p>
          <p className="font-semibold">{ocorrencia.titulo}</p>
          <p className="text-xs text-muted-foreground">
            {rotuloOcorrencia(ocorrencia)} · {formatarData(ocorrencia.criado_em)}
          </p>
          {ocorrencia.descricao ? (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {ocorrencia.descricao}
            </p>
          ) : null}
          <BadgeStatus status={ocorrencia.status} className="mt-2" />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setAberto((valor) => !valor)}
        aria-expanded={aberto}
        className="flex w-full items-center justify-between border-t border-border px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-surface"
      >
        {ocorrencia.status === "aguardando_cidadao" ? "Responder à prefeitura" : "Ver andamento e mensagens"}
        <ChevronDown
          className={cn("size-4 transition-transform", aberto && "rotate-180")}
          aria-hidden
        />
      </button>

      {aberto ? (
        <div className="animate-abrir overflow-hidden border-t border-border bg-surface/50 p-4">
          <DetalheChamado ocorrencia={ocorrencia} souDono usuarioId={usuarioId} />
        </div>
      ) : null}
    </Revelar>
  );
}

function Chamados() {
  const { data, isLoading } = useOcorrencias();
  const { session } = useSessao();
  const usuarioId = session?.user.id ?? null;
  const lista = (data ?? []).filter((o) => o.usuario_id === usuarioId);

  return (
    <div className="space-y-6">
      <div className="animate-surgir flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold md:text-3xl">Meus chamados</h1>
          <p className="mt-1 text-muted-foreground">
            O andamento é atualizado sozinho, sem precisar recarregar a página.
          </p>
        </div>
        <Button asChild className="pressionar">
          <Link to="/reportar" className="group">
            <PlusCircle
              className="size-5 transition-transform duration-300 group-hover:rotate-90"
              aria-hidden
            />
            Novo chamado
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      ) : lista.length === 0 ? (
        <p className="rounded-2xl bg-card p-8 text-center text-sm text-muted-foreground card-suave">
          Nenhum chamado por aqui ainda. Quando você registrar um problema, ele aparece nesta lista
          com todo o histórico.
        </p>
      ) : (
        <div className="space-y-3">
          {lista.map((o, indice) => (
            <CardChamado key={o.id} ocorrencia={o} usuarioId={usuarioId} atraso={Math.min(indice, 6) * 90} />
          ))}
        </div>
      )}
    </div>
  );
}
