import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, MapPin, BellRing, ShieldCheck, ArrowRight, TrendingUp } from "lucide-react";
import heroCidade from "@/assets/hero-cidade.jpg";
import { Button } from "@/components/ui/button";

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

function Landing() {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-background">
      {/* Brilhos decorativos */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 right-[-10%] size-96 rounded-full bg-primary/20 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-[-15%] size-96 rounded-full bg-chart-2/10 blur-[120px]"
      />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-4 pt-8 pb-4">
        <div>
          <p className="text-lg font-extrabold italic tracking-tight">
            ALERTA<span className="text-accent not-italic">CIDADÃO</span>
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Prefeitura em ação
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden size-10 items-center justify-center rounded-xl border border-border bg-card sm:flex">
            <ShieldCheck className="size-5 text-accent" aria-hidden />
          </span>
          <Button asChild variant="ghost" className="text-muted-foreground hover:text-foreground">
            <Link to="/auth">Entrar</Link>
          </Button>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero */}
        <section className="mx-auto grid w-full max-w-6xl items-center gap-8 px-4 py-6 md:grid-cols-2 md:py-14">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/15 px-3 py-1 text-xs font-bold text-accent">
              <span className="size-1.5 animate-pulse rounded-full bg-primary" aria-hidden />
              Sua voz tem poder
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] md:text-6xl">
              Transforme sua rua com{" "}
              <span className="text-accent">um clique</span>.
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">
              Buraco na rua, poste apagado ou lixo acumulado? Registre em menos de um minuto, com
              foto e localização, e acompanhe a resposta da prefeitura sem sair de casa.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="brilho-acao text-base font-extrabold uppercase tracking-wide">
                <Link to="/auth">
                  Reportar agora
                  <ArrowRight className="size-5" aria-hidden />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/auth">Já tenho conta</Link>
              </Button>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-border card-suave">
            <img
              src={heroCidade}
              alt="Pessoa fotografando um buraco no asfalto de uma avenida da cidade"
              width={1600}
              height={1104}
              className="aspect-4/3 w-full object-cover"
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
          </div>
        </section>

        {/* Passos */}
        <section className="mx-auto w-full max-w-6xl px-4 py-10">
          <h2 className="text-2xl font-bold">Como funciona</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {PASSOS.map((passo) => (
              <article
                key={passo.numero}
                className="flex flex-col items-start gap-3 rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm transition-transform duration-300 hover:-translate-y-1"
              >
                <span className="flex size-9 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-sm font-extrabold text-accent">
                  {passo.numero}
                </span>
                <passo.icone className="size-5 text-muted-foreground" aria-hidden />
                <h3 className="font-semibold">{passo.titulo}</h3>
                <p className="text-sm text-muted-foreground">{passo.texto}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Transparência */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-16">
          <div className="rounded-2xl border border-border/60 bg-card/70 p-6 backdrop-blur-sm md:p-10">
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
                <TrendingUp className="size-8 text-accent" aria-hidden />
                <div>
                  <p className="text-3xl font-black tracking-tight">Tempo real</p>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Atualização automática
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div className="h-full w-5/6 rounded-full bg-primary brilho-acao" />
            </div>
            <Button asChild size="lg" className="mt-8">
              <Link to="/auth">Criar minha conta gratuita</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border py-6 text-center text-sm text-muted-foreground">
        Alerta Cidadão · plataforma de tecnologia cívica
      </footer>
    </div>
  );
}
