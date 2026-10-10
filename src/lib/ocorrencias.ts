import {
  Accessibility,
  Car,
  Construction,
  Droplets,
  HelpCircle,
  ShieldAlert,
  Trees,
  type LucideIcon,
} from "lucide-react";

export type Categoria =
  | "infraestrutura"
  | "saneamento"
  | "mobilidade"
  | "meio_ambiente"
  | "ordem_publica"
  | "acessibilidade"
  | "outros";
export type StatusOcorrencia =
  | "registrado"
  | "em_analise"
  | "em_atendimento"
  | "aguardando_cidadao"
  | "resolvido"
  | "reaberto"
  | "cancelado"
  | "indeferido";

export type Prioridade = "baixa" | "media" | "alta" | "urgente";

export const PRIORIDADES: Record<Prioridade, { rotulo: string; dias: number }> = {
  urgente: { rotulo: "Urgente", dias: 2 },
  alta: { rotulo: "Alta", dias: 5 },
  media: { rotulo: "Média", dias: 10 },
  baixa: { rotulo: "Baixa", dias: 20 },
};

/** Situações que exigem justificativa (RN008/RN011). */
export const EXIGE_JUSTIFICATIVA: StatusOcorrencia[] = [
  "resolvido",
  "cancelado",
  "indeferido",
  "aguardando_cidadao",
];

export const ENCERRADOS: StatusOcorrencia[] = ["resolvido", "cancelado", "indeferido"];

export function atrasado(o: { prazo: string | null; status: StatusOcorrencia }) {
  return Boolean(o.prazo) && !ENCERRADOS.includes(o.status) && new Date(o.prazo!).getTime() < Date.now();
}

export type Ocorrencia = {
  id: string;
  usuario_id: string;
  titulo: string;
  descricao: string;
  categoria: Categoria;
  subcategoria: string | null;
  secretaria: string | null;
  foto_url: string | null;
  latitude: number | null;
  longitude: number | null;
  status: StatusOcorrencia;
  criado_em: string;
  atualizado_em: string;
  protocolo: string;
  atribuido_a: string | null;
  prioridade: Prioridade;
  prazo: string | null;
  justificativa: string | null;
};

export type HistoricoStatus = {
  id: string;
  ocorrencia_id: string;
  status_anterior: StatusOcorrencia | null;
  status_novo: StatusOcorrencia;
  alterado_por: string | null;
  alterado_em: string;
  observacao: string | null;
};

export const SECRETARIAS: Record<string, string> = {
  obras: "Secretaria de Obras",
  saneamento: "Companhia de Águas e Esgoto",
  transito: "Secretaria de Trânsito",
  meio_ambiente: "Secretaria de Meio Ambiente",
  saude: "Vigilância em Saúde / Zoonoses",
  seguranca: "Guarda Municipal",
  acessibilidade: "Secretaria de Acessibilidade",
  ouvidoria: "Ouvidoria (triagem)",
};

export type Subcategoria = { rotulo: string; secretaria: keyof typeof SECRETARIAS };

export const CATEGORIAS: Record<
  Categoria,
  { rotulo: string; descricao: string; icone: LucideIcon; subs: Record<string, Subcategoria> }
> = {
  infraestrutura: {
    rotulo: "Infraestrutura",
    descricao: "Buracos, iluminação, calçadas",
    icone: Construction,
    subs: {
      buraco_via: { rotulo: "Buraco na via", secretaria: "obras" },
      iluminacao_publica: { rotulo: "Iluminação pública", secretaria: "obras" },
      calcada_quebrada: { rotulo: "Calçada quebrada", secretaria: "obras" },
    },
  },
  saneamento: {
    rotulo: "Saneamento básico",
    descricao: "Água, esgoto, bueiros",
    icone: Droplets,
    subs: {
      vazamento_agua: { rotulo: "Vazamento de água", secretaria: "saneamento" },
      esgoto_bueiro: { rotulo: "Esgoto a céu aberto / bueiro entupido", secretaria: "saneamento" },
      falta_agua: { rotulo: "Falta de água", secretaria: "saneamento" },
    },
  },
  mobilidade: {
    rotulo: "Mobilidade e trânsito",
    descricao: "Semáforos, placas, veículos",
    icone: Car,
    subs: {
      semaforo: { rotulo: "Semáforo quebrado", secretaria: "transito" },
      sinalizacao: { rotulo: "Sinalização danificada ou ausente", secretaria: "transito" },
      veiculo_abandonado: { rotulo: "Veículo abandonado", secretaria: "transito" },
      estacionamento_irregular: { rotulo: "Estacionamento irregular", secretaria: "transito" },
    },
  },
  meio_ambiente: {
    rotulo: "Meio ambiente e limpeza",
    descricao: "Lixo, árvores, mato, dengue",
    icone: Trees,
    subs: {
      lixo: { rotulo: "Acúmulo de lixo / entulho", secretaria: "meio_ambiente" },
      arvore: { rotulo: "Poda ou queda de árvore", secretaria: "meio_ambiente" },
      terreno_mato: { rotulo: "Terreno abandonado / mato alto", secretaria: "meio_ambiente" },
      dengue: { rotulo: "Foco de dengue (água parada)", secretaria: "saude" },
    },
  },
  ordem_publica: {
    rotulo: "Ordem pública",
    descricao: "Vandalismo, animais, barulho",
    icone: ShieldAlert,
    subs: {
      vandalismo: { rotulo: "Vandalismo / pichação", secretaria: "seguranca" },
      animais: { rotulo: "Animais soltos / maus-tratos", secretaria: "saude" },
      sossego: { rotulo: "Perturbação do sossego", secretaria: "seguranca" },
    },
  },
  acessibilidade: {
    rotulo: "Acessibilidade",
    descricao: "Calçadas obstruídas, rampas",
    icone: Accessibility,
    subs: {
      calcada_obstruida: { rotulo: "Calçada obstruída", secretaria: "acessibilidade" },
      rampa_quebrada: { rotulo: "Rampa de acessibilidade quebrada", secretaria: "acessibilidade" },
    },
  },
  outros: {
    rotulo: "Outro problema",
    descricao: "Descreva e a IA classifica",
    icone: HelpCircle,
    subs: { outro: { rotulo: "Outro", secretaria: "ouvidoria" } },
  },
};

export const CATEGORIA_CHAVES = Object.keys(CATEGORIAS) as Categoria[];

export function infoCategoria(categoria: string) {
  return CATEGORIAS[categoria as Categoria] ?? CATEGORIAS.outros;
}

export function rotuloOcorrencia(o: { categoria: string; subcategoria: string | null }) {
  const cat = infoCategoria(o.categoria);
  const sub = o.subcategoria ? cat.subs[o.subcategoria] : undefined;
  return sub && o.categoria !== "outros" ? `${cat.rotulo} › ${sub.rotulo}` : cat.rotulo;
}

export function rotuloSecretaria(chave: string | null) {
  return chave ? (SECRETARIAS[chave] ?? chave) : SECRETARIAS["ouvidoria"];
}

export const STATUS: Record<
  StatusOcorrencia,
  { rotulo: string; explicacao: string; classe: string; cor: string }
> = {
  registrado: {
    rotulo: "Aberto",
    explicacao: "Protocolo gerado",
    classe: "bg-registrado text-registrado-foreground",
    cor: "oklch(0.5 0.09 255)",
  },
  em_analise: {
    rotulo: "Em triagem",
    explicacao: "Identificando a secretaria responsável",
    classe: "bg-analise text-analise-foreground",
    cor: "oklch(0.62 0.14 85)",
  },
  em_atendimento: {
    rotulo: "Em atendimento",
    explicacao: "O serviço já começou",
    classe: "bg-atendimento text-atendimento-foreground",
    cor: "oklch(0.62 0.16 50)",
  },
  aguardando_cidadao: {
    rotulo: "Aguardando morador",
    explicacao: "A prefeitura pediu mais informações",
    classe: "bg-analise text-analise-foreground",
    cor: "oklch(0.7 0.15 300)",
  },
  resolvido: {
    rotulo: "Concluído",
    explicacao: "Problema solucionado",
    classe: "bg-resolvido text-resolvido-foreground",
    cor: "oklch(0.55 0.13 163)",
  },
  reaberto: {
    rotulo: "Reaberto",
    explicacao: "O morador informou que o problema persiste",
    classe: "bg-atendimento text-atendimento-foreground",
    cor: "oklch(0.62 0.2 25)",
  },
  cancelado: {
    rotulo: "Cancelado",
    explicacao: "Chamado cancelado com justificativa",
    classe: "bg-muted text-muted-foreground",
    cor: "oklch(0.55 0.02 258)",
  },
  indeferido: {
    rotulo: "Indeferido",
    explicacao: "Solicitação não aceita, com motivo",
    classe: "bg-muted text-muted-foreground",
    cor: "oklch(0.45 0.02 258)",
  },
};

export const ORDEM_STATUS: StatusOcorrencia[] = [
  "registrado",
  "em_analise",
  "em_atendimento",
  "aguardando_cidadao",
  "resolvido",
  "reaberto",
  "cancelado",
  "indeferido",
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
