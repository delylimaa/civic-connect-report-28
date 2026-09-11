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
