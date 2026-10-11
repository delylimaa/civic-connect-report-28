import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, MessageSquare, RotateCcw, Send, Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAvaliacao, useComentarios, useHistorico } from "@/hooks/useOcorrencias";
import { TimelineStatus } from "@/components/TimelineStatus";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatarData, type Ocorrencia } from "@/lib/ocorrencias";
import { cn } from "@/lib/utils";

export function DetalheChamado({
  ocorrencia,
  souDono,
  usuarioId,
}: {
  ocorrencia: Ocorrencia;
  souDono: boolean;
  usuarioId: string | null;
}) {
  const queryClient = useQueryClient();
  const { data: historico, isLoading } = useHistorico(ocorrencia.id);
  const { data: comentarios } = useComentarios(ocorrencia.id);
  const { data: avaliacao } = useAvaliacao(souDono ? ocorrencia.id : null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [nota, setNota] = useState(0);
  const [comentarioNota, setComentarioNota] = useState("");
  const [motivo, setMotivo] = useState("");
  const [reabrindo, setReabrindo] = useState(false);

  async function enviarMensagem() {
    if (!usuarioId || !texto.trim()) return;
    setEnviando(true);
    const { error } = await supabase
      .from("comentarios")
      .insert({ ocorrencia_id: ocorrencia.id, autor_id: usuarioId, texto: texto.trim().slice(0, 2000) });
    setEnviando(false);
    if (error) return toast.error("Não foi possível enviar a mensagem.");
    setTexto("");
    queryClient.invalidateQueries({ queryKey: ["comentarios", ocorrencia.id] });
    queryClient.invalidateQueries({ queryKey: ["ocorrencias"] });
  }

  async function avaliar() {
    if (!usuarioId || nota < 1) return toast.error("Escolha de 1 a 5 estrelas.");
    const { error } = await supabase.from("avaliacoes").insert({
      ocorrencia_id: ocorrencia.id,
      usuario_id: usuarioId,
      nota,
      comentario: comentarioNota.trim() || null,
    });
    if (error) return toast.error("Não foi possível salvar a avaliação.");
    toast.success("Obrigado pela avaliação!");
    queryClient.invalidateQueries({ queryKey: ["avaliacao", ocorrencia.id] });
  }

  async function reabrir() {
    if (!motivo.trim()) return toast.error("Conte por que o problema continua.");
    setReabrindo(true);
    const { error } = await supabase.rpc("reabrir_chamado", { _id: ocorrencia.id, _motivo: motivo.trim() });
    setReabrindo(false);
    if (error) return toast.error("Não foi possível reabrir o chamado.");
    toast.success("Chamado reaberto. A equipe vai analisar de novo.");
    setMotivo("");
    queryClient.invalidateQueries({ queryKey: ["ocorrencias"] });
    queryClient.invalidateQueries({ queryKey: ["historico"] });
  }

  return (
    <div className="space-y-5">
      {souDono && ocorrencia.status === "aguardando_cidadao" ? (
        <p className="rounded-xl border border-accent/40 bg-accent/10 p-3 text-sm">
          <strong>A prefeitura precisa de mais informações:</strong>{" "}
          {ocorrencia.justificativa ?? "veja as mensagens abaixo."} Responda pelas mensagens.
        </p>
      ) : null}

      <section>
        <h3 className="mb-3 text-sm font-bold">Andamento</h3>
        <TimelineStatus historico={historico ?? []} carregando={isLoading} />
      </section>

      <section>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-bold">
          <MessageSquare className="size-4" aria-hidden /> Mensagens
        </h3>
        {(comentarios ?? []).length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma mensagem ainda.</p>
        ) : (
          <ul className="space-y-2">
            {(comentarios ?? []).map((c) => {
              const meu = c.autor_id === usuarioId;
              const doMorador = c.autor_id === ocorrencia.usuario_id;
              return (
                <li
                  key={c.id}
                  className={cn(
                    "max-w-[85%] rounded-xl px-3 py-2 text-sm",
                    meu ? "ml-auto bg-primary/15" : "bg-muted/50",
                  )}
                >
                  <p className="text-xs font-semibold text-muted-foreground">
                    {doMorador ? "Morador" : "Prefeitura"} · {c.autor_nome ?? ""}
                  </p>
                  <p className="whitespace-pre-wrap">{c.texto}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{formatarData(c.criado_em)}</p>
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-2 flex gap-2">
          <Textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={souDono ? "Escreva para a prefeitura..." : "Escreva para o morador..."}
            rows={2}
            maxLength={2000}
            aria-label="Nova mensagem"
          />
          <Button onClick={enviarMensagem} disabled={enviando || !texto.trim()} size="icon" aria-label="Enviar mensagem">
            {enviando ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </div>
      </section>

      {souDono && ocorrencia.status === "resolvido" ? (
        <section className="space-y-4 rounded-xl border border-border/60 p-3">
          {avaliacao ? (
            <p className="text-sm">
              Sua avaliação: {"★".repeat(avaliacao.nota)}
              {"☆".repeat(5 - avaliacao.nota)}
              {avaliacao.comentario ? ` — ${avaliacao.comentario}` : ""}
            </p>
          ) : (
            <div className="space-y-2">
              <h3 className="text-sm font-bold">Como foi o atendimento?</h3>
              <div className="flex gap-1" role="radiogroup" aria-label="Nota do atendimento">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={nota === n}
                    aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
                    onClick={() => setNota(n)}
                    className="rounded p-0.5 transition-transform hover:scale-110"
                  >
                    <Star className={cn("size-6", n <= nota ? "fill-accent text-accent" : "text-muted-foreground")} />
                  </button>
                ))}
              </div>
              <Textarea
                value={comentarioNota}
                onChange={(e) => setComentarioNota(e.target.value)}
                placeholder="Comentário (opcional)"
                rows={2}
                maxLength={1000}
              />
              <Button size="sm" onClick={avaliar}>Enviar avaliação</Button>
            </div>
          )}
          <div className="space-y-2 border-t border-border/60 pt-3">
            <h3 className="text-sm font-bold">O problema continua?</h3>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Explique o que ainda está errado"
              rows={2}
              maxLength={1000}
            />
            <Button size="sm" variant="outline" onClick={reabrir} disabled={reabrindo}>
              {reabrindo ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
              Reabrir chamado
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
