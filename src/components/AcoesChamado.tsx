import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMembrosSecretaria } from "@/hooks/useOcorrencias";
import { DetalheChamado } from "@/components/DetalheChamado";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  EXIGE_JUSTIFICATIVA,
  ORDEM_STATUS,
  PRIORIDADES,
  SECRETARIAS,
  STATUS,
  type Ocorrencia,
  type Prioridade,
  type StatusOcorrencia,
} from "@/lib/ocorrencias";
import { cn } from "@/lib/utils";

const seletor =
  "h-9 w-full rounded-xl border border-input bg-background/60 px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

function mensagemErro(e: { message?: string } | null) {
  const m = e?.message ?? "";
  if (m.includes("justificativa")) return "Informe a justificativa para esta situação.";
  if (m.includes("permiss") || m.includes("Servidores") || m.includes("row-level"))
    return "Você não tem permissão para esta ação neste chamado.";
  if (m.includes("responsável")) return "O responsável precisa ser da secretaria do chamado.";
  return "Não foi possível salvar agora. Tente novamente.";
}

export function AcoesChamado({
  ocorrencia,
  papel,
  usuarioId,
}: {
  ocorrencia: Ocorrencia;
  papel: "admin" | "gestor" | "servidor";
  usuarioId: string | null;
}) {
  const queryClient = useQueryClient();
  const podeGerir = papel !== "servidor";
  const podeAtualizar = podeGerir || ocorrencia.atribuido_a === usuarioId;
  const [status, setStatus] = useState<StatusOcorrencia>(ocorrencia.status);
  const [justificativa, setJustificativa] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [destino, setDestino] = useState(ocorrencia.secretaria ?? "ouvidoria");
  const [motivo, setMotivo] = useState("");
  const [aberto, setAberto] = useState(false);
  const { data: membros } = useMembrosSecretaria(ocorrencia.secretaria, podeGerir);
  const exige = status !== ocorrencia.status && EXIGE_JUSTIFICATIVA.includes(status);

  function atualizar() {
    queryClient.invalidateQueries({ queryKey: ["ocorrencias"] });
    queryClient.invalidateQueries({ queryKey: ["historico"] });
  }

  async function salvarStatus() {
    if (exige && !justificativa.trim()) { toast.error("Informe a justificativa para esta situação."); return; }
    setSalvando(true);
    const { error } = await supabase
      .from("ocorrencias")
      .update({ status, justificativa: justificativa.trim() || null })
      .eq("id", ocorrencia.id);
    setSalvando(false);
    if (error) { toast.error(mensagemErro(error)); return; }
    toast.success("Situação atualizada. O morador foi notificado.");
    setJustificativa("");
    atualizar();
  }

  async function mudarCampo(campos: { prioridade?: Prioridade; atribuido_a?: string | null }) {
    const { error } = await supabase.from("ocorrencias").update(campos).eq("id", ocorrencia.id);
    if (error) { toast.error(mensagemErro(error)); return; }
    toast.success(campos.prioridade ? "Prioridade e prazo atualizados." : "Responsável atualizado.");
    atualizar();
  }

  async function encaminhar() {
    if (destino === ocorrencia.secretaria) { toast.error("Escolha outra secretaria."); return; }
    if (!motivo.trim()) { toast.error("Informe o motivo do encaminhamento."); return; }
    const { error } = await supabase.rpc("encaminhar_chamado", {
      _id: ocorrencia.id,
      _secretaria: destino,
      _motivo: motivo.trim(),
    });
    if (error) { toast.error(mensagemErro(error)); return; }
    toast.success(`Encaminhado para ${SECRETARIAS[destino]}.`);
    setMotivo("");
    atualizar();
  }

  return (
    <div className="mt-3 space-y-3 border-t border-border/60 pt-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="space-y-1 text-xs font-semibold text-muted-foreground">
          Situação
          <select
            className={seletor}
            value={status}
            disabled={!podeAtualizar}
            onChange={(e) => setStatus(e.target.value as StatusOcorrencia)}
          >
            {ORDEM_STATUS.map((s) => (
              <option key={s} value={s}>{STATUS[s].rotulo}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs font-semibold text-muted-foreground">
          Prioridade
          <select
            className={seletor}
            value={ocorrencia.prioridade}
            disabled={!podeGerir}
            onChange={(e) => mudarCampo({ prioridade: e.target.value as Prioridade })}
          >
            {(Object.keys(PRIORIDADES) as Prioridade[]).map((p) => (
              <option key={p} value={p}>{PRIORIDADES[p].rotulo} ({PRIORIDADES[p].dias} dias)</option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs font-semibold text-muted-foreground">
          Responsável
          <select
            className={seletor}
            value={ocorrencia.atribuido_a ?? ""}
            disabled={!podeGerir}
            onChange={(e) => mudarCampo({ atribuido_a: e.target.value || null })}
          >
            <option value="">Sem responsável</option>
            {(membros ?? []).map((m) => (
              <option key={m.id} value={m.id}>{m.nome}</option>
            ))}
            {!podeGerir && ocorrencia.atribuido_a ? (
              <option value={ocorrencia.atribuido_a}>
                {ocorrencia.atribuido_a === usuarioId ? "Você" : "Outro servidor"}
              </option>
            ) : null}
          </select>
        </label>
      </div>

      {status !== ocorrencia.status ? (
        <div className="space-y-2">
          <Textarea
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder={
              status === "resolvido"
                ? "Descreva o serviço executado (obrigatório)"
                : status === "aguardando_cidadao"
                  ? "Quais informações o morador precisa enviar? (obrigatório)"
                  : exige
                    ? "Motivo (obrigatório)"
                    : "Observação para o morador (opcional)"
            }
            aria-label="Justificativa"
          />
          <Button size="sm" onClick={salvarStatus} disabled={salvando} className="pressionar">
            {salvando ? <Loader2 className="size-4 animate-spin" /> : null}
            Salvar situação
          </Button>
        </div>
      ) : null}

      {!podeAtualizar ? (
        <p className="text-xs text-muted-foreground">
          Só o servidor responsável ou o gestor podem atualizar este chamado.
        </p>
      ) : null}

      {podeGerir ? (
        <details className="rounded-xl border border-border/60 p-3 text-sm">
          <summary className="cursor-pointer font-semibold">Encaminhar para outra secretaria</summary>
          <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
            <select className={seletor} value={destino} onChange={(e) => setDestino(e.target.value)} aria-label="Secretaria de destino">
              {Object.entries(SECRETARIAS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <input
              className={seletor}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Motivo do encaminhamento"
              maxLength={300}
              aria-label="Motivo do encaminhamento"
            />
            <Button size="sm" variant="outline" onClick={encaminhar}>Encaminhar</Button>
          </div>
        </details>
      ) : null}

      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="flex items-center gap-1 text-sm font-semibold text-primary"
      >
        Histórico e mensagens
        <ChevronDown className={cn("size-4 transition-transform", aberto && "rotate-180")} aria-hidden />
      </button>
      {aberto ? (
        <div className="animate-abrir rounded-xl bg-surface/50 p-3">
          <DetalheChamado ocorrencia={ocorrencia} souDono={false} usuarioId={usuarioId} />
        </div>
      ) : null}
    </div>
  );
}
