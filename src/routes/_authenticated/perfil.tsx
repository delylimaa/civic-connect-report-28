import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, KeyRound, Loader2, Mail, Phone, ShieldCheck, UserCog } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ROTULO_PAPEL, usePerfil, useSessao } from "@/hooks/usePerfil";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Revelar } from "@/components/Revelar";
import { formatarData } from "@/lib/ocorrencias";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [
      { title: "Editar perfil — Alerta Cidadão" },
      {
        name: "description",
        content: "Atualize suas informações pessoais, telefone e senha da sua conta.",
      },
      { property: "og:title", content: "Editar perfil — Alerta Cidadão" },
      { property: "og:description", content: "Atualize suas informações pessoais e senha." },
    ],
  }),
  component: PaginaPerfil,
});

const esquemaPerfil = z.object({
  nome: z.string().trim().min(2, { message: "Informe seu nome" }).max(80),
  telefone: z
    .string()
    .trim()
    .regex(/^\(\d{2}\) \d{4,5}-\d{4}$/, { message: "Telefone inválido" })
    .or(z.literal("")),
});

function formatarTelefone(valor: string) {
  const digitos = valor.replace(/\D/g, "").slice(0, 11);
  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 6) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  if (digitos.length <= 10)
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
}

function PaginaPerfil() {
  const { data: perfil, isLoading } = usePerfil();
  const { session } = useSessao();
  const queryClient = useQueryClient();

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [salvando, setSalvando] = useState(false);

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [trocandoSenha, setTrocandoSenha] = useState(false);

  const provedor = session?.user.app_metadata?.provider;
  const contaEmail = !provedor || provedor === "email";
  const email = session?.user.email ?? "";

  useEffect(() => {
    if (perfil) {
      setNome(perfil.nome);
      setTelefone(perfil.telefone ?? "");
    }
  }, [perfil]);

  async function salvar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = esquemaPerfil.safeParse({ nome, telefone });
    if (!dados.success) {
      toast.error(dados.error.issues[0]?.message ?? "Verifique os campos");
      return;
    }
    setSalvando(true);
    const { error } = await supabase
      .from("profiles")
      .update({ nome: dados.data.nome, telefone: dados.data.telefone || null })
      .eq("id", session!.user.id);
    setSalvando(false);
    if (error) {
      toast.error("Não foi possível salvar agora. Tente novamente em instantes.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["perfil"] });
    toast.success("Perfil atualizado!");
  }

  async function trocarSenha(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (novaSenha.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (novaSenha !== confirmarSenha) {
      toast.error("As senhas não coincidem");
      return;
    }
    setTrocandoSenha(true);
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    setTrocandoSenha(false);
    if (error) {
      toast.error("Não foi possível trocar a senha agora. Tente novamente em instantes.");
      return;
    }
    setNovaSenha("");
    setConfirmarSenha("");
    toast.success("Senha alterada com sucesso!");
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16" role="status" aria-label="Carregando perfil">
        <Loader2 className="size-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="animate-surgir">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold md:text-3xl">
          <UserCog className="size-7 text-accent" aria-hidden />
          Editar perfil
        </h1>
        <p className="mt-1 text-muted-foreground">
          Mantenha suas informações em dia para a prefeitura entrar em contato.
        </p>
      </section>

      <Revelar
        atraso={80}
        className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-sm card-suave"
      >
        <form onSubmit={salvar} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome completo</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome"
              maxLength={80}
              autoComplete="name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefone" className="flex items-center gap-1.5">
              <Phone className="size-4 text-accent" aria-hidden />
              Telefone (WhatsApp)
            </Label>
            <Input
              id="telefone"
              value={telefone}
              onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
              placeholder="(00) 00000-0000"
              inputMode="tel"
              autoComplete="tel"
            />
            <p className="text-xs text-muted-foreground">
              Opcional — usado pela prefeitura se precisar de mais detalhes do chamado.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Mail className="size-4 text-accent" aria-hidden />
                E-mail
              </Label>
              <p className="rounded-xl border border-border/60 bg-secondary/50 px-3 py-2.5 text-sm">
                {email || "—"}
              </p>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <BadgeCheck className="size-4 text-accent" aria-hidden />
                Tipo de conta
              </Label>
              <p className="rounded-xl border border-border/60 bg-secondary/50 px-3 py-2.5 text-sm">
                {perfil?.papel ? ROTULO_PAPEL[perfil.papel] : "Cidadão"}
              </p>
            </div>
          </div>

          {perfil?.criado_em && (
            <p className="text-xs text-muted-foreground">
              Participa do Alerta Cidadão desde {formatarData(perfil.criado_em)}.
            </p>
          )}

          <Button type="submit" disabled={salvando} className="pressionar w-full sm:w-auto">
            {salvando ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ShieldCheck className="size-4" aria-hidden />}
            Salvar alterações
          </Button>
        </form>
      </Revelar>

      {contaEmail && (
        <Revelar
          atraso={160}
          className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-sm card-suave"
        >
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <KeyRound className="size-5 text-accent" aria-hidden />
            Alterar senha
          </h2>
          <form onSubmit={trocarSenha} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nova-senha">Nova senha</Label>
                <Input
                  id="nova-senha"
                  type="password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmar-senha">Confirmar nova senha</Label>
                <Input
                  id="confirmar-senha"
                  type="password"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  placeholder="Repita a senha"
                  autoComplete="new-password"
                />
              </div>
            </div>
            <Button
              type="submit"
              variant="outline"
              disabled={trocandoSenha}
              className="pressionar w-full sm:w-auto"
            >
              {trocandoSenha && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Trocar senha
            </Button>
          </form>
        </Revelar>
      )}
    </div>
  );
}
