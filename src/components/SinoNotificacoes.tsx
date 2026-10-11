import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useNotificacoes } from "@/hooks/useOcorrencias";
import { formatarData } from "@/lib/ocorrencias";
import { cn } from "@/lib/utils";

export function SinoNotificacoes({ equipe }: { equipe: boolean }) {
  const { data } = useNotificacoes();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const lista = data ?? [];
  const naoLidas = lista.filter((n) => !n.lida).length;

  async function marcarTodas() {
    await supabase.from("notificacoes").update({ lida: true }).eq("lida", false);
    queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
  }

  async function abrir(id: string) {
    await supabase.from("notificacoes").update({ lida: true }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
    navigate({ to: equipe ? "/gestor" : "/chamados" });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative" aria-label={`Avisos${naoLidas ? `, ${naoLidas} novos` : ""}`}>
          <Bell className="size-4" aria-hidden />
          {naoLidas ? (
            <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
              {naoLidas > 9 ? "9+" : naoLidas}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <p className="text-sm font-bold">Avisos</p>
          {naoLidas ? (
            <button type="button" onClick={marcarTodas} className="text-xs font-semibold text-accent">
              Marcar todos como lidos
            </button>
          ) : null}
        </div>
        {lista.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">Nenhum aviso por enquanto.</p>
        ) : (
          <ul className="max-h-96 divide-y divide-border/60 overflow-y-auto">
            {lista.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => abrir(n.id)}
                  className={cn("block w-full px-3 py-2 text-left hover:bg-secondary", !n.lida && "bg-primary/10")}
                >
                  <p className="text-sm font-semibold">{n.titulo}</p>
                  {n.mensagem ? <p className="line-clamp-2 text-xs text-muted-foreground">{n.mensagem}</p> : null}
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{formatarData(n.criado_em)}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
