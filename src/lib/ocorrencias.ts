import { Construction, Lightbulb, Trash2, HelpCircle, type LucideIcon } from "lucide-react";

export type Categoria = "buraco_via" | "iluminacao_publica" | "lixo" | "outros";
export type StatusOcorrencia = "registrado" | "em_analise" | "em_atendimento" | "resolvido";

export type Ocorrencia = {
  id: string;
  usuario_id: string;
  titulo: string;
  descricao: string;
  categoria: Categoria;
  foto_url: string | null;
  latitude: number | null;
  longitude: number | null;
  status: StatusOcorrencia;
  criado_em: string;
  atualizado_em: string;
};

export type HistoricoStatus = {
  id: string;
  ocorrencia_id: string;
  status_anterior: StatusOcorrencia | null;
  status_novo: StatusOcorrencia;
  alterado_por: string | null;
  alterado_em: string;
};

export const CATEGORIAS: Record<
  Categoria,
  { rotulo: string; descricao: string; icone: LucideIcon }
> = {
  buraco_via: {
    rotulo: "Buraco na via",
    descricao: "Asfalto danificado, calçada quebrada",
    icone: Construction,
  },
  iluminacao_publica: {
    rotulo: "Iluminação pública",
    descricao: "Poste apagado ou piscando",
    icone: Lightbulb,
  },
  lixo: {
    rotulo: "Acúmulo de lixo",
    descricao: "Entulho ou lixo acumulado",
    icone: Trash2,
  },
  outros: {
    rotulo: "Outro problema",
    descricao: "Qualquer outra situação da cidade",
    icone: HelpCircle,
  },
};

export const STATUS: Record<
  StatusOcorrencia,
  { rotulo: string; explicacao: string; classe: string; cor: string }
> = {
  registrado: {
    rotulo: "Registrado",
    explicacao: "Recebemos seu chamado",
    classe: "bg-registrado text-registrado-foreground",
    cor: "oklch(0.5 0.09 255)",
  },
  em_analise: {
    rotulo: "Em análise",
    explicacao: "A equipe está avaliando",
    classe: "bg-analise text-analise-foreground",
    cor: "oklch(0.62 0.14 85)",
  },
  em_atendimento: {
    rotulo: "Em atendimento",
    explicacao: "O serviço já começou",
    classe: "bg-atendimento text-atendimento-foreground",
    cor: "oklch(0.62 0.16 50)",
  },
  resolvido: {
    rotulo: "Resolvido",
    explicacao: "Problema solucionado",
    classe: "bg-resolvido text-resolvido-foreground",
    cor: "oklch(0.55 0.13 163)",
  },
};

export const ORDEM_STATUS: StatusOcorrencia[] = [
  "registrado",
  "em_analise",
  "em_atendimento",
  "resolvido",
];

export function formatarData(valor: string) {
  return new Date(valor).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
