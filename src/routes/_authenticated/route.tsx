import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Home, MapPin, ListChecks, PlusCircle, BarChart3, LogOut, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePerfil } from "@/hooks/usePerfil";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: LayoutApp,
});

const ITENS = [
  { para: "/painel", rotulo: "Início", icone: Home },
  { para: "/reportar", rotulo: "Reportar", icone: PlusCircle },
  { para: "/chamados", rotulo: "Chamados", icone: ListChecks },
  { para: "/mapa", rotulo: "Mapa", icone: MapPin },
] as const;

function LayoutApp() {
  const { data: perfil } = usePerfil();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const gestor = perfil?.perfil === "gestor";

  async function sair() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const itens = gestor
    ? [...ITENS, { para: "/gestor", rotulo: "Gestão", icone: BarChart3 } as const]
    : ITENS;

  return (
    <div className="min-h-screen bg-background md:flex">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card p-5 md:flex">
        <Link to="/painel" className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ShieldCheck className="size-5" aria-hidden />
          </span>
          <span className="text-base font-extrabold leading-tight">
            Alerta
            <br />
            Cidadão
          </span>
        </Link>

        <nav className="mt-8 flex flex-1 flex-col gap-1" aria-label="Menu principal">
          {itens.map((item) => (
            <Link
              key={item.para}
              to={item.para}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
              activeProps={{ className: "bg-primary/10 text-primary" }}
            >
              <item.icone className="size-5" aria-hidden />
              {item.rotulo}
            </Link>
          ))}
        </nav>

        <div className="border-t border-border pt-4">
          <p className="truncate text-sm font-semibold">{perfil?.nome ?? "Carregando..."}</p>
          <p className="text-xs text-muted-foreground">
            {gestor ? "Gestor municipal" : "Cidadão"}
          </p>
          <Button variant="outline" size="sm" className="mt-3 w-full" onClick={sair}>
            <LogOut className="size-4" aria-hidden />
            Sair
          </Button>
        </div>
      </aside>

      <div className="flex-1 pb-24 md:pb-0">
        <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 md:hidden">
          <span className="flex items-center gap-2 font-extrabold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="size-4" aria-hidden />
            </span>
            Alerta Cidadão
          </span>
          <Button variant="ghost" size="sm" onClick={sair} aria-label="Sair da conta">
            <LogOut className="size-4" aria-hidden />
          </Button>
        </header>

        <main className="mx-auto w-full max-w-5xl p-4 md:p-8">
          <Outlet />
        </main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-card/95 backdrop-blur md:hidden"
        aria-label="Navegação"
      >
        {itens.map((item) => (
          <Link
            key={item.para}
            to={item.para}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-3 text-[11px] font-semibold text-muted-foreground transition-colors",
            )}
            activeProps={{ className: "text-primary" }}
          >
            <item.icone className="size-5" aria-hidden />
            {item.rotulo}
          </Link>
        ))}
      </nav>
    </div>
  );
}
