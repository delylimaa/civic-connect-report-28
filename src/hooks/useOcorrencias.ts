import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { HistoricoStatus, Ocorrencia } from "@/lib/ocorrencias";

/** Lista as ocorrências visíveis para o usuário logado (RLS decide o alcance). */
export function useOcorrencias() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const canal = supabase
      .channel("ocorrencias-tempo-real")
      .on("postgres_changes", { event: "*", schema: "public", table: "ocorrencias" }, () => {
        queryClient.invalidateQueries({ queryKey: ["ocorrencias"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "historico_status" }, () => {
        queryClient.invalidateQueries({ queryKey: ["historico"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["ocorrencias"],
    queryFn: async (): Promise<Ocorrencia[]> => {
      const { data, error } = await supabase
        .from("ocorrencias")
        .select("*")
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Ocorrencia[];
    },
  });
}

export function useHistorico(ocorrenciaId: string | null) {
  return useQuery({
    queryKey: ["historico", ocorrenciaId],
    enabled: Boolean(ocorrenciaId),
    queryFn: async (): Promise<HistoricoStatus[]> => {
      const { data, error } = await supabase
        .from("historico_status")
        .select("*")
        .eq("ocorrencia_id", ocorrenciaId as string)
        .order("alterado_em", { ascending: true });
      if (error) throw error;
      return (data ?? []) as HistoricoStatus[];
    },
  });
}

export type Comentario = {
  id: string;
  ocorrencia_id: string;
  autor_id: string;
  texto: string;
  criado_em: string;
  autor_nome?: string | undefined;
};

export function useComentarios(ocorrenciaId: string | null) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!ocorrenciaId) return;
    const canal = supabase
      .channel(`comentarios-${ocorrenciaId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comentarios", filter: `ocorrencia_id=eq.${ocorrenciaId}` },
        () => queryClient.invalidateQueries({ queryKey: ["comentarios", ocorrenciaId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [ocorrenciaId, queryClient]);

  return useQuery({
    queryKey: ["comentarios", ocorrenciaId],
    enabled: Boolean(ocorrenciaId),
    queryFn: async (): Promise<Comentario[]> => {
      const { data, error } = await supabase
        .from("comentarios")
        .select("*")
        .eq("ocorrencia_id", ocorrenciaId as string)
        .order("criado_em", { ascending: true });
      if (error) throw error;
      const ids = [...new Set((data ?? []).map((c) => c.autor_id))];
      const { data: perfis } = ids.length
        ? await supabase.from("profiles").select("id, nome").in("id", ids)
        : { data: [] as { id: string; nome: string }[] };
      const nomes = new Map((perfis ?? []).map((p) => [p.id, p.nome]));
      return (data ?? []).map((c) => ({ ...c, autor_nome: nomes.get(c.autor_id) }));
    },
  });
}

export function useAvaliacao(ocorrenciaId: string | null) {
  return useQuery({
    queryKey: ["avaliacao", ocorrenciaId],
    enabled: Boolean(ocorrenciaId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("avaliacoes")
        .select("*")
        .eq("ocorrencia_id", ocorrenciaId as string)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export type Notificacao = {
  id: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  criado_em: string;
  ocorrencia_id: string | null;
};

export function useNotificacoes() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const canal = supabase
      .channel("notificacoes-usuario")
      .on("postgres_changes", { event: "*", schema: "public", table: "notificacoes" }, () => {
        queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["notificacoes"],
    queryFn: async (): Promise<Notificacao[]> => {
      const { data, error } = await supabase
        .from("notificacoes")
        .select("*")
        .order("criado_em", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Membros ativos de uma secretaria (para atribuição). */
export function useMembrosSecretaria(secretaria: string | null, habilitado: boolean) {
  return useQuery({
    queryKey: ["membros", secretaria],
    enabled: habilitado && Boolean(secretaria),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("secretaria", secretaria as string)
        .eq("ativo", true)
        .in("role", ["gestor", "servidor"]);
      if (error) throw error;
      const ids = (data ?? []).map((m) => m.user_id);
      const { data: perfis } = ids.length
        ? await supabase.from("profiles").select("id, nome").in("id", ids)
        : { data: [] as { id: string; nome: string }[] };
      const nomes = new Map((perfis ?? []).map((p) => [p.id, p.nome]));
      return (data ?? []).map((m) => ({ id: m.user_id, nome: nomes.get(m.user_id) ?? "—", role: m.role }));
    },
  });
}
