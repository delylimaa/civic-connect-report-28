import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, MapPin, BellRing, ShieldCheck, ArrowRight, TrendingUp } from "lucide-react";
import heroCidade from "@/assets/hero-cidade.jpg";
import { Button } from "@/components/ui/button";
import { NumeroAnimado, Revelar } from "@/components/Revelar";
import { useRevelar, useRolagem } from "@/hooks/useAnimacoes";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Alerta Cidadão — Reporte problemas da sua cidade" },
      {
        name: "description",
        content:
          "Envie fotos de buracos, falta de iluminação e lixo acumulado direto para a prefeitura e acompanhe o andamento do seu chamado em tempo real.",
      },
      { property: "og:title", content: "Alerta Cidadão — Reporte problemas da sua cidade" },
      {
        property: "og:description",
        content:
          "Tecnologia a serviço da sociedade: registre problemas urbanos com foto e localização e acompanhe a resposta da prefeitura.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const PASSOS = [
  {
    numero: "1",
    icone: Camera,
    titulo: "Fotografe o local",
    texto: "Mostre o problema como ele está agora. A imagem ajuda a equipe a entender a situação.",
  },
  {
    numero: "2",
    icone: MapPin,
    titulo: "Marque o local",
    texto: "O endereço é capturado automaticamente. Se preferir, mova o pino no mapa.",
  },
  {
    numero: "3",
    icone: BellRing,
    titulo: "Acompanhe o status",
    texto: "Você vê cada etapa: registrado, em análise, em atendimento e resolvido.",
  },
];

const INDICADORES = [
  { valor: 4, sufixo: " tipos", rotulo: "de problema atendidos" },
  { valor: 60, sufixo: "s", rotulo: "é o tempo médio do registro" },
  { valor: 100, sufixo: "%", rotulo: "do histórico com data e hora" },
];

function Landing() {
  const { progresso, rolou } = useRolagem();

  return (
    <div className="relative min-h-screen overflow-x-clip bg-background">
      {/* Barra de progresso da rolagem */}
      <div
        aria-hidden
        className="fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-linear-to-r from-primary to-accent transition-transform duration-150"
        style={{ transform: `scaleX(${progresso})` }}
      />

      {/* Brilhos decorativos */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 right-[-10%] size-96 animate-flutuar rounded-full bg-primary/20 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-[-15%] size-96 animate-flutuar rounded-full bg-chart-2/10 blur-[120px]"
        style={{ animationDelay: "-3s" }}
      />

      <header
        className={cn(
          "sticky top-0 z-40 mx-auto flex w-full items-center justify-between px-4 transition-all duration-300",
          rolou
            ? "border-b border-border/60 bg-background/80 py-3 backdrop-blur-xl"
            : "border-b border-transparent py-6",
        )}
      >
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
          <div>
            <p className="text-lg font-extrabold italic tracking-tight">
              ALERTA<span className="text-accent not-italic">CIDADÃO</span>
            </p>
            <p
              className={cn(
                "overflow-hidden text-[10px] font-semibold uppercase tracking-widest text-muted-foreground transition-all duration-300",
                rolou ? "h-0 opacity-0" : "h-4 opacity-100",
              )}
            >
              Prefeitura em ação
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden size-10 items-center justify-center rounded-xl border border-border bg-card transition-transform duration-300 hover:rotate-6 hover:scale-110 sm:flex">
              <ShieldCheck className="size-5 text-accent" aria-hidden />
            </span>
            <Button
              asChild
              variant="ghost"
              className="pressionar text-muted-foreground hover:text-foreground"
            >
              <Link to="/auth">Entrar</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero */}
        <section className="mx-auto grid w-full max-w-6xl items-center gap-8 px-4 py-6 md:grid-cols-2 md:py-14">
          <div className="animate-surgir">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/15 px-3 py-1 text-xs font-bold text-accent">
              <span className="size-1.5 animate-brilhar rounded-full bg-primary" aria-hidden />
              Sua voz tem poder
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] md:text-6xl">
              Transforme sua rua com <span className="text-accent">um clique</span>.
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">
              Buraco na rua, poste apagado ou lixo acumulado? Registre em menos de um minuto, com
              foto e localização, e acompanhe a resposta da prefeitura sem sair de casa.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="brilho-acao pressionar text-base font-extrabold uppercase tracking-wide"
              >
                <Link to="/auth" className="group">
                  Reportar agora
                  <ArrowRight
                    className="size-5 transition-transform duration-300 group-hover:translate-x-1"
                    aria-hidden
                  />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="pressionar">
                <Link to="/auth">Já tenho conta</Link>
              </Button>
            </div>
          </div>

          <Revelar
            atraso={120}
            className="elevar group relative overflow-hidden rounded-3xl border border-border card-suave"
          >
            <img
              src={heroCidade}
              alt="Pessoa fotografando um buraco no asfalto de uma avenida da cidade"
              width={1600}
              height={1104}
              className="aspect-4/3 w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-linear-to-t from-background via-background/20 to-transparent" />
            <div className="absolute right-5 bottom-5 left-5">
              <span className="mb-2 inline-block rounded-md border border-primary/30 bg-primary/20 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-accent">
                Tecnologia a serviço da sociedade
              </span>
              <p className="text-lg font-bold leading-tight">
                Um canal direto entre você e a sua cidade.
              </p>
            </div>
          </Revelar>
        </section>

        {/* Indicadores */}
        <section className="mx-auto w-full max-w-6xl px-4 py-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {INDICADORES.map((item, indice) => (
              <Revelar
                key={item.rotulo}
                atraso={indice * 110}
                as="article"
                className="elevar rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm"
              >
                <p className="text-3xl font-black tracking-tight text-accent">
                  <NumeroAnimado valor={item.valor} sufixo={item.sufixo} />
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{item.rotulo}</p>
              </Revelar>
            ))}
          </div>
        </section>

        {/* Passos */}
        <section className="mx-auto w-full max-w-6xl px-4 py-10">
          <Revelar>
            <h2 className="text-2xl font-bold">Como funciona</h2>
          </Revelar>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {PASSOS.map((passo, indice) => (
              <Revelar
                key={passo.numero}
                atraso={indice * 130}
                as="article"
                className="elevar group flex flex-col items-start gap-3 rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm"
              >
                <span className="flex size-9 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-sm font-extrabold text-accent transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                  {passo.numero}
                </span>
                <passo.icone
                  className="size-5 text-muted-foreground transition-colors duration-300 group-hover:text-accent"
                  aria-hidden
                />
                <h3 className="font-semibold">{passo.titulo}</h3>
                <p className="text-sm text-muted-foreground">{passo.texto}</p>
              </Revelar>
            ))}
          </div>
        </section>

        {/* Transparência */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-16">
          <Revelar className="rounded-2xl border border-border/60 bg-card/70 p-6 backdrop-blur-sm md:p-10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="max-w-lg">
                <h2 className="text-2xl font-bold md:text-3xl">
                  Transparência do registro até a solução
                </h2>
                <p className="mt-3 text-muted-foreground">
                  Cada mudança de situação fica registrada com data e hora. A equipe da prefeitura
                  acompanha tudo em um painel com mapa e indicadores para priorizar o que é mais
                  urgente.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <TrendingUp className="size-8 animate-flutuar text-accent" aria-hidden />
                <div>
                  <p className="text-3xl font-black tracking-tight">Tempo real</p>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Atualização automática
                  </p>
                </div>
              </div>
            </div>
            <BarraProgresso />
            <Button asChild size="lg" className="pressionar mt-8">
              <Link to="/auth">Criar minha conta gratuita</Link>
            </Button>
          </Revelar>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border py-6 text-center text-sm text-muted-foreground">
        Alerta Cidadão · plataforma de tecnologia cívica
      </footer>
    </div>
  );
}

function BarraProgresso() {
  const { ref, visivel } = useRevelar<HTMLDivElement>();
  return (
    <div ref={ref} className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
      <div
        className={cn(
          "h-full rounded-full bg-primary brilho-acao transition-[width] duration-1000 ease-out",
          visivel ? "w-5/6" : "w-0",
        )}
      />
    </div>
  );
}
