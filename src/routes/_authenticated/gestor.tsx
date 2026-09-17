import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { BadgeStatus } from "@/components/BadgeStatus";
import { FotoOcorrencia } from "@/components/FotoOcorrencia";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePerfil } from "@/hooks/usePerfil";
import { useOcorrencias } from "@/hooks/useOcorrencias";
import { supabase } from "@/integrations/supabase/client";
import {
  CATEGORIAS,
  ORDEM_STATUS,
  STATUS,
  formatarData,
  type Categoria,
  type StatusOcorrencia,
} from "@/lib/ocorrencias";

export const Route = createFileRoute("/_authenticated/gestor")({
  head: () => ({
    meta: [
      { title: "Painel de gestão — Alerta Cidadão" },
      {
        name: "description",
        content:
          "Indicadores, gráficos e atualização rápida da situação de todos os chamados da cidade.",
      },
      { property: "og:title", content: "Painel de gestão — Alerta Cidadão" },
      {
        property: "og:description",
        content: "Acompanhe os indicadores da cidade e atualize os chamados.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PainelGestor,
});

function Cartao({
  titulo,
  valor,
  ajuda,
  atraso = 0,
}: {
  titulo: string;
  valor: ReactNode;
  ajuda: string;
  atraso?: number;
}) {
  return (
    <Revelar atraso={atraso} className="elevar rounded-2xl bg-card p-4 card-suave">
      <p className="text-sm text-muted-foreground">{titulo}</p>
      <p className="mt-1 text-3xl font-extrabold text-foreground">{valor}</p>
      <p className="mt-1 text-xs text-muted-foreground">{ajuda}</p>
    </Revelar>
  );
}

function PainelGestor() {
  const navigate = useNavigate();
  const { data: perfil, isLoading: carregandoPerfil } = usePerfil();
  const { data, isLoading } = useOcorrencias();
  const queryClient = useQueryClient();
  const [categoria, setCategoria] = useState<Categoria | "todas">("todas");
  const [status, setStatus] = useState<StatusOcorrencia | "todos">("todos");

  const alterar = useMutation({
    mutationFn: async ({ id, novo }: { id: string; novo: StatusOcorrencia }) => {
      const { error } = await supabase
        .from("ocorrencias")
        .update({ status: novo, atualizado_em: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Situação atualizada. O morador vê a mudança na hora.");
      queryClient.invalidateQueries({ queryKey: ["ocorrencias"] });
      queryClient.invalidateQueries({ queryKey: ["historico"] });
    },
    onError: () => toast.error("Não foi possível atualizar agora. Tente novamente."),
  });

  const todas = data ?? [];

  const metricas = useMemo(() => {
    const total = todas.length;
    const resolvidas = todas.filter((o) => o.status === "resolvido");
    const percentual = total ? Math.round((resolvidas.length / total) * 100) : 0;
    const dias = resolvidas.map(
      (o) =>
        (new Date(o.atualizado_em).getTime() - new Date(o.criado_em).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    const media = dias.length ? dias.reduce((a, b) => a + b, 0) / dias.length : 0;
    return { total, percentual, media };
  }, [todas]);

  const grafico = useMemo(
    () =>
      (Object.keys(CATEGORIAS) as Categoria[]).map((chave) => ({
        nome: CATEGORIAS[chave].rotulo,
        quantidade: todas.filter((o) => o.categoria === chave).length,
      })),
    [todas],
  );

  const lista = useMemo(
    () =>
      todas.filter(
        (o) =>
          (categoria === "todas" || o.categoria === categoria) &&
          (status === "todos" || o.status === status),
      ),
    [todas, categoria, status],
  );

  if (carregandoPerfil) {
    return <Skeleton className="h-72 w-full rounded-2xl" />;
  }

  if (perfil?.perfil !== "gestor") {
    return (
      <div className="rounded-2xl bg-card p-8 text-center card-suave">
        <h1 className="text-xl font-extrabold">Área exclusiva da equipe da prefeitura</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sua conta é de morador, por isso esta página não fica disponível.
        </p>
        <Button className="mt-4" onClick={() => navigate({ to: "/painel" })}>
          Voltar ao início
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold md:text-3xl">Painel de gestão</h1>
        <p className="mt-1 text-muted-foreground">
          Visão geral da cidade e atualização da situação de cada chamado.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Cartao
          titulo="Chamados recebidos"
          valor={String(metricas.total)}
          ajuda="Total registrado pelos moradores"
        />
        <Cartao
          titulo="Já resolvidos"
          valor={`${metricas.percentual}%`}
          ajuda="Proporção de problemas concluídos"
        />
        <Cartao
          titulo="Tempo médio"
          valor={`${metricas.media.toFixed(1)} dias`}
          ajuda="Do registro até a solução"
        />
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur-sm card-suave">
        <h2 className="text-lg font-bold">Chamados por tipo de problema</h2>
        <div className="mt-4 h-64">
          {isLoading ? (
            <Skeleton className="h-full w-full rounded-xl" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={grafico}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="nome"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  interval={0}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Tooltip
                  cursor={{ fill: "oklch(1 0 0 / 6%)" }}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: "0.75rem",
                    color: "var(--popover-foreground)",
                  }}
                />
                <Bar
                  dataKey="quantidade"
                  name="Chamados"
                  fill="var(--chart-1)"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="space-y-3 rounded-2xl bg-card p-4 card-suave">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-sm font-semibold">Tipo de problema</span>
            <Select
              value={categoria}
              onValueChange={(valor) => setCategoria(valor as Categoria | "todas")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todos os tipos</SelectItem>
                {(Object.keys(CATEGORIAS) as Categoria[]).map((chave) => (
                  <SelectItem key={chave} value={chave}>
                    {CATEGORIAS[chave].rotulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-semibold">Situação</span>
            <Select
              value={status}
              onValueChange={(valor) => setStatus(valor as StatusOcorrencia | "todos")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as situações</SelectItem>
                {ORDEM_STATUS.map((chave) => (
                  <SelectItem key={chave} value={chave}>
                    {STATUS[chave].rotulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
        ) : lista.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum chamado com esses filtros.
          </p>
        ) : (
          <ul className="space-y-3">
            {lista.map((o) => (
              <li key={o.id} className="rounded-xl border border-border p-3">
                <div className="flex gap-3">
                  <FotoOcorrencia
                    caminho={o.foto_url}
                    alt={`Foto do chamado ${o.titulo}`}
                    className="size-20 shrink-0 rounded-lg"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{o.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {CATEGORIAS[o.categoria].rotulo} · {formatarData(o.criado_em)}
                    </p>
                    {o.descricao ? (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {o.descricao}
                      </p>
                    ) : null}
                    <BadgeStatus status={o.status} className="mt-2" />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Mudar situação:
                  </span>
                  <Select
                    value={o.status}
                    onValueChange={(valor) =>
                      alterar.mutate({ id: o.id, novo: valor as StatusOcorrencia })
                    }
                  >
                    <SelectTrigger className="h-9 w-48" aria-label={`Situação de ${o.titulo}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ORDEM_STATUS.map((chave) => (
                        <SelectItem key={chave} value={chave}>
                          {STATUS[chave].rotulo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
