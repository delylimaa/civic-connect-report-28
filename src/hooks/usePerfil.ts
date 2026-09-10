import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Perfil = {
  id: string;
  nome: string;
  perfil: "cidadao" | "gestor";
  criado_em: string;
};

export function useSessao() {
  const [session, setSession] = useState<Session | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      setSession(novaSessao);
      setCarregando(false);
    });
    supabase.auth.getSession().then(({ data: atual }) => {
      setSession(atual.session);
      setCarregando(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return { session, carregando };
}

export function usePerfil() {
  return useQuery({
    queryKey: ["perfil"],
    queryFn: async (): Promise<Perfil | null> => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome, perfil, criado_em")
        .eq("id", auth.user.id)
        .maybeSingle();
      if (error) throw error;
      return (data as Perfil) ?? null;
    },
    staleTime: 60_000,
  });
}

export function useFotoUrl(caminho: string | null | undefined) {
  return useQuery({
    queryKey: ["foto", caminho],
    enabled: Boolean(caminho),
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("ocorrencias")
        .createSignedUrl(caminho as string, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}
