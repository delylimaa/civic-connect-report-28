import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MapaOcorrenciasLazy } from "@/components/MapaLazy";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NumeroAnimado, Revelar } from "@/components/Revelar";
import { useOcorrencias } from "@/hooks/useOcorrencias";
import {
  CATEGORIAS,
  ORDEM_STATUS,
  STATUS,
  type Categoria,
  type StatusOcorrencia,
} from "@/lib/ocorrencias";

export const Route = createFileRoute("/_authenticated/mapa")({
  head: () => ({
    meta: [
      { title: "Mapa dos chamados — Alerta Cidadão" },
      {
        name: "description",
        content:
          "Veja no mapa onde estão os problemas urbanos registrados e em que situação cada um está.",
      },
      { property: "og:title", content: "Mapa dos chamados — Alerta Cidadão" },
      {
        property: "og:description",
        content: "Mapa com os problemas da cidade agrupados por região e situação.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Mapa,
});

const CATEGORIA_CHAVES = Object.keys(CATEGORIAS) as Categoria[];

function Mapa() {
  const { data, isLoading } = useOcorrencias();
  const [categoria, setCategoria] = useState<Categoria | "todas">("todas");
  const [status, setStatus] = useState<StatusOcorrencia | "todos">("todos");

  const lista = useMemo(() => {
    return (data ?? []).filter(
      (o) =>
        (categoria === "todas" || o.categoria === categoria) &&
        (status === "todos" || o.status === status),
    );
  }, [data, categoria, status]);

  const comLocal = lista.filter((o) => o.latitude != null && o.longitude != null);

  return (
    <div className="space-y-5">
      <div className="animate-surgir">
        <h1 className="text-2xl font-extrabold md:text-3xl">Mapa dos chamados</h1>
        <p className="mt-1 text-muted-foreground">
          Cada ponto é um problema registrado. A cor mostra em que situação ele está.
        </p>
      </div>

      <Revelar className="space-y-3 rounded-2xl bg-card p-4 card-suave">
        <div>
          <p className="mb-2 text-sm font-semibold">Tipo de problema</p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={categoria === "todas" ? "default" : "outline"}
              onClick={() => setCategoria("todas")}
            >
              Todos
            </Button>
            {CATEGORIA_CHAVES.map((chave) => (
              <Button
                key={chave}
                size="sm"
                variant={categoria === chave ? "default" : "outline"}
                onClick={() => setCategoria(chave)}
              >
                {CATEGORIAS[chave].rotulo}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold">Situação</p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={status === "todos" ? "default" : "outline"}
              onClick={() => setStatus("todos")}
            >
              Todas
            </Button>
            {ORDEM_STATUS.map((chave) => (
              <Button
                key={chave}
                size="sm"
                variant={status === chave ? "default" : "outline"}
                onClick={() => setStatus(chave)}
              >
                <span
                  className="size-2 rounded-full"
                  style={{ background: STATUS[chave].cor }}
                  aria-hidden
                />
                {STATUS[chave].rotulo}
              </Button>
            ))}
          </div>
        </div>
      </Revelar>

      <Revelar
        atraso={120}
        className="h-[65vh] min-h-96 overflow-hidden rounded-2xl bg-card card-suave"
      >
        {isLoading ? (
          <Skeleton className="h-full w-full rounded-2xl" />
        ) : (
          <MapaOcorrenciasLazy ocorrencias={comLocal} />
        )}
      </Revelar>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {isLoading ? (
          "Carregando chamados..."
        ) : (
          <>
            <NumeroAnimado valor={comLocal.length} className="font-bold text-accent" />{" "}
            {comLocal.length === 1 ? "chamado no mapa" : "chamados no mapa"}.
          </>
        )}
      </p>
    </div>
  );
}
