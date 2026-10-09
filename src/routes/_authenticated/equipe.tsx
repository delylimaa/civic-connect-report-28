import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Revelar } from "@/components/Revelar";
import { ROTULO_PAPEL, usePerfil } from "@/hooks/usePerfil";
import { supabase } from "@/integrations/supabase/client";
import { SECRETARIAS } from "@/lib/ocorrencias";
import { criarMembroEquipe } from "@/lib/equipe.functions";

export const Route = createFileRoute("/_authenticated/equipe")({
  head: () => ({
    meta: [
      { title: "Equipe da prefeitura — Alerta Cidadão" },
      { name: "description", content: "Cadastre servidores e gestores das secretarias municipais." },
      { property: "og:title", content: "Equipe da prefeitura — Alerta Cidadão" },
      { property: "og:description", content: "Cadastro de servidores e gestores por secretaria." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaginaEquipe,
});

type Papel = "admin" | "gestor" | "servidor";

function PaginaEquipe() {
  const { data: perfil, isLoading } = usePerfil();
  const queryClient = useQueryClient();
  const criar = useServerFn(criarMembroEquipe);
  const admin = perfil?.papel === "admin";
  const [papel, setPapel] = useState<Papel>("servidor");
  const [secretaria, setSecretaria] = useState<string>("obras");
  const [enviando, setEnviando] = useState(false);

  const membros = useQuery({
    queryKey: ["equipe"],
    enabled: Boolean(perfil?.papel && perfil.papel !== "servidor"),
    queryFn: async () => {
      const { data: papeis, error } = await supabase
        .from("user_roles")
        .select("user_id, role, secretaria, criado_em")
        .order("criado_em", { ascending: false });
      if (error) throw error;
      const ids = papeis.map((p) => p.user_id);
      const { data: perfis } = await supabase.from("profiles").select("id, nome").in("id", ids);
      const nomes = new Map((perfis ?? []).map((p) => [p.id, p.nome]));
      return papeis.map((p) => ({ ...p, nome: nomes.get(p.user_id) ?? "—" }));
    },
  });

  if (isLoading) return <Skeleton className="h-72 w-full rounded-2xl" />;
  if (!perfil?.papel || perfil.papel === "servidor") {
    return (
      <div className="rounded-2xl bg-card p-8 text-center card-suave">
        <h1 className="text-xl font-extrabold">Área do administrador e dos gestores</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sua conta não tem permissão para cadastrar a equipe.
        </p>
      </div>
    );
  }

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const form = new FormData(formulario);
    setEnviando(true);
    try {
      const r = await criar({
        data: {
          nome: String(form.get("nome") ?? ""),
          email: String(form.get("email") ?? ""),
          senha: String(form.get("senha") ?? ""),
          papel: admin ? papel : "servidor",
          secretaria: admin ? (papel === "admin" ? null : secretaria) : perfil!.secretaria,
        },
      });
      if (!r.ok) {
        toast.error(r.erro ?? "Não foi possível cadastrar.");
        return;
      }
      toast.success("Conta criada! Envie o e-mail e a senha provisória para a pessoa.");
      formulario.reset();
      queryClient.invalidateQueries({ queryKey: ["equipe"] });
    } catch {
      toast.error("Confira os campos: nome, e-mail válido e senha com 8+ caracteres.");
    } finally {
      setEnviando(false);
    }
  }

  const seletor =
    "h-10 w-full rounded-xl border border-input bg-background/60 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="space-y-6">
      <Revelar>
        <h1 className="text-2xl font-extrabold md:text-3xl">Equipe da prefeitura</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {admin
            ? "Cadastre administradores, gestores e servidores de cada secretaria."
            : `Cadastre servidores da ${SECRETARIAS[perfil.secretaria ?? ""] ?? "sua secretaria"}.`}
        </p>
      </Revelar>

      <Revelar atraso={80}>
        <form
          onSubmit={enviar}
          className="grid gap-4 rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm card-suave md:grid-cols-2"
        >
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome completo</Label>
            <Input id="nome" name="nome" required maxLength={80} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail institucional</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="senha">Senha provisória</Label>
            <Input id="senha" name="senha" type="text" required minLength={8} placeholder="Mínimo de 8 caracteres" />
          </div>
          {admin && (
            <div className="space-y-1.5">
              <Label htmlFor="papel">Função</Label>
              <select id="papel" className={seletor} value={papel} onChange={(e) => setPapel(e.target.value as Papel)}>
                <option value="servidor">Servidor municipal</option>
                <option value="gestor">Gestor de secretaria</option>
                <option value="admin">Administrador da prefeitura</option>
              </select>
            </div>
          )}
          {admin && papel !== "admin" && (
            <div className="space-y-1.5">
              <Label htmlFor="secretaria">Secretaria</Label>
              <select id="secretaria" className={seletor} value={secretaria} onChange={(e) => setSecretaria(e.target.value)}>
                {Object.entries(SECRETARIAS).map(([chave, rotulo]) => (
                  <option key={chave} value={chave}>{rotulo}</option>
                ))}
              </select>
            </div>
          )}
          <div className="md:col-span-2">
            <Button type="submit" disabled={enviando} className="pressionar">
              {enviando ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <UserPlus className="size-4" aria-hidden />}
              Cadastrar
            </Button>
          </div>
        </form>
      </Revelar>

      <Revelar atraso={160}>
        <div className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm card-suave">
          <h2 className="text-lg font-bold">Membros</h2>
          {membros.isLoading ? (
            <Skeleton className="mt-3 h-24 w-full rounded-xl" />
          ) : (
            <ul className="mt-3 divide-y divide-border/60">
              {(membros.data ?? []).map((m) => (
                <li key={m.user_id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <span className="font-semibold">{m.nome}</span>
                  <span className="text-muted-foreground">
                    {ROTULO_PAPEL[m.role]}
                    {m.secretaria ? ` · ${SECRETARIAS[m.secretaria] ?? m.secretaria}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Revelar>
    </div>
  );
}
