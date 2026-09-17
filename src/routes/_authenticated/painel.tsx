import { createFileRoute, Link } from "@tanstack/react-router";
import { PlusCircle, ArrowRight } from "lucide-react";
import { useOcorrencias } from "@/hooks/useOcorrencias";
import { usePerfil } from "@/hooks/usePerfil";
import { BadgeStatus } from "@/components/BadgeStatus";
import { FotoOcorrencia } from "@/components/FotoOcorrencia";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NumeroAnimado, Revelar } from "@/components/Revelar";
import { CATEGORIAS, formatarData, STATUS, type StatusOcorrencia } from "@/lib/ocorrencias";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Meu painel — Alerta Cidadão" },
      {
        name: "description",
        content: "Veja o resumo dos seus chamados e reporte um novo problema da sua cidade.",
      },
      { property: "og:title", content: "Meu painel — Alerta Cidadão" },
      { property: "og:description", content: "Resumo dos seus chamados e novo registro." },
    ],
  }),
  component: Painel,
});

function Painel() {
  const { data: perfil } = usePerfil();
  const { data: ocorrencias, isLoading } = useOcorrencias();
  const lista = ocorrencias ?? [];

  const contagem = (status: StatusOcorrencia) => lista.filter((o) => o.status === status).length;

  return (
    <div className="space-y-8">
      <section className="animate-surgir">
        <h1 className="text-2xl font-extrabold md:text-3xl">
          Olá{perfil?.nome ? `, ${perfil.nome.split(" ")[0]}` : ""}!
        </h1>
        <p className="mt-1 text-muted-foreground">
          Viu algo errado na rua? Registre agora — leva menos de um minuto.
        </p>
        <Button asChild size="lg" className="pressionar mt-5 w-full sm:w-auto">
          <Link to="/reportar" className="group">
            <PlusCircle
              className="size-5 transition-transform duration-300 group-hover:rotate-90"
              aria-hidden
            />
            Reportar problema
          </Link>
        </Button>
      </section>

      <section>
        <h2 className="text-lg font-bold">Situação dos chamados</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {(Object.keys(STATUS) as StatusOcorrencia[]).map((status, indice) => (
            <Revelar
              key={status}
              atraso={indice * 90}
              className="elevar rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur-sm card-suave"
            >
              <div className="flex items-center justify-between">
                {isLoading ? (
                  <Skeleton className="h-8 w-10" />
                ) : (
                  <p className="text-3xl font-extrabold">
                    <NumeroAnimado valor={contagem(status)} />
                  </p>
                )}
                <span
                  className="size-2.5 animate-brilhar rounded-full"
                  style={{ background: STATUS[status].cor, animationDelay: `${indice * 300}ms` }}
                  aria-hidden
                />
              </div>
              <p className="mt-1 text-xs font-semibold text-muted-foreground">
                {STATUS[status].rotulo}
              </p>
            </Revelar>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Últimos registros</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/chamados">
              Ver todos
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Button>
        </div>

        <div className="mt-3 space-y-3">
          {isLoading ? (
            <>
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-24 w-full rounded-2xl" />
            </>
          ) : lista.length === 0 ? (
            <p className="rounded-2xl bg-card p-6 text-sm text-muted-foreground card-suave">
              Você ainda não tem chamados. Assim que registrar um problema, ele aparece aqui.
            </p>
          ) : (
            lista.slice(0, 3).map((o, indice) => (
              <Revelar
                key={o.id}
                atraso={indice * 100}
                as="article"
                className="elevar flex items-center gap-4 rounded-2xl bg-card p-3 card-suave"
              >
                <FotoOcorrencia
                  caminho={o.foto_url}
                  alt={`Foto do chamado ${o.titulo}`}
                  className="size-20 shrink-0 rounded-xl"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{o.titulo}</p>
                  <p className="text-xs text-muted-foreground">
                    {CATEGORIAS[o.categoria].rotulo} · {formatarData(o.criado_em)}
                  </p>
                  <BadgeStatus status={o.status} className="mt-2" />
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
