import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, MapPin, BellRing, ShieldCheck, ArrowRight } from "lucide-react";
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
    ],
  }),
  component: Landing,
});

const PASSOS = [
  {
    icone: Camera,
    titulo: "Tire uma foto",
    texto: "Mostre o problema como ele está agora. A imagem ajuda a equipe a entender a situação.",
  },
  {
    icone: MapPin,
    titulo: "Marque o local",
    texto: "O endereço é capturado automaticamente. Se preferir, mova o pino no mapa.",
  },
  {
    icone: BellRing,
    titulo: "Acompanhe a resposta",
    texto: "Você vê cada etapa: registrado, em análise, em atendimento e resolvido.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5">
        <span className="flex items-center gap-2 text-lg font-extrabold">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ShieldCheck className="size-5" aria-hidden />
          </span>
          Alerta Cidadão
        </span>
        <Button asChild variant="ghost">
          <Link to="/auth">Entrar</Link>
        </Button>
      </header>

      <main>
        <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-8 md:grid-cols-2 md:py-16">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">
              Tecnologia a serviço da sociedade
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight md:text-5xl">
              Um canal direto entre você e a sua cidade
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Buraco na rua, poste apagado ou lixo acumulado? Registre em menos de um minuto, com
              foto e localização, e acompanhe o andamento sem sair de casa.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link to="/auth">
                  Reportar um problema
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/auth">Já tenho conta</Link>
              </Button>
            </div>
          </div>

          <img
            src={heroCidade}
            alt="Pessoa fotografando um buraco no asfalto de uma avenida da cidade"
            width={1600}
            height={1104}
            className="w-full rounded-2xl object-cover card-suave"
          />
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-10">
          <h2 className="text-2xl font-bold">Como funciona</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {PASSOS.map((passo) => (
              <article key={passo.titulo} className="rounded-2xl bg-card p-6 card-suave">
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <passo.icone className="size-5" aria-hidden />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{passo.titulo}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{passo.texto}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 pb-16">
          <div className="rounded-2xl bg-primary p-8 text-primary-foreground md:p-12">
            <h2 className="text-2xl font-bold md:text-3xl">
              Transparência do registro até a solução
            </h2>
            <p className="mt-3 max-w-2xl opacity-90">
              Cada mudança de situação fica registrada com data e hora. A equipe da prefeitura vê
              tudo em um painel com mapa e indicadores para priorizar o que é mais urgente.
            </p>
            <Button asChild size="lg" variant="secondary" className="mt-6">
              <Link to="/auth">Criar minha conta gratuita</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        Alerta Cidadão · plataforma de tecnologia cívica
      </footer>
    </div>
  );
}
