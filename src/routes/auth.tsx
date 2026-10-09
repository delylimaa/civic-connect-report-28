import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Loader2, MailCheck, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useSessao } from "@/hooks/usePerfil";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar no Alerta Cidadão" },
      {
        name: "description",
        content:
          "Acesse sua conta para reportar problemas urbanos com foto e localização e acompanhar cada chamado.",
      },
      { property: "og:title", content: "Entrar no Alerta Cidadão" },
      {
        property: "og:description",
        content: "Crie sua conta e acompanhe seus chamados junto à prefeitura.",
      },
    ],
  }),
  component: PaginaAuth,
});

const esquemaEntrada = z.object({
  email: z.string().trim().email({ message: "Informe um e-mail válido" }).max(255),
  senha: z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres" }).max(72),
});

const esquemaCadastro = esquemaEntrada.extend({
  nome: z.string().trim().min(2, { message: "Informe seu nome" }).max(80),
  perfil: z.enum(["cidadao", "gestor"]),
});

function PaginaAuth() {
  const { session } = useSessao();
  const navigate = useNavigate();
  const [carregando, setCarregando] = useState(false);
  const [confirmarEmail, setConfirmarEmail] = useState(false);
  const [perfil, setPerfil] = useState<"cidadao" | "gestor">("cidadao");

  useEffect(() => {
    if (session) navigate({ to: "/painel", replace: true });
  }, [session, navigate]);

  async function entrar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const form = new FormData(evento.currentTarget);
    const dados = esquemaEntrada.safeParse({
      email: form.get("email"),
      senha: form.get("senha"),
    });
    if (!dados.success) {
      toast.error(dados.error.issues[0]?.message ?? "Confira os campos.");
      return;
    }
    setCarregando(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: dados.data.email,
      password: dados.data.senha,
    });
    setCarregando(false);
    if (error) {
      toast.error("Não foi possível entrar. Verifique o e-mail e a senha.");
      return;
    }
    toast.success("Bem-vindo de volta!");
    navigate({ to: "/painel" });
  }

  async function cadastrar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const form = new FormData(evento.currentTarget);
    const dados = esquemaCadastro.safeParse({
      nome: form.get("nome"),
      email: form.get("email"),
      senha: form.get("senha"),
      perfil,
    });
    if (!dados.success) {
      toast.error(dados.error.issues[0]?.message ?? "Confira os campos.");
      return;
    }
    setCarregando(true);
    const { data, error } = await supabase.auth.signUp({
      email: dados.data.email,
      password: dados.data.senha,
      options: {
        emailRedirectTo: window.location.origin,
        data: { nome: dados.data.nome, perfil: dados.data.perfil },
      },
    });
    setCarregando(false);
    if (error) {
      const msg = error.message.toLowerCase();
      toast.error(
        msg.includes("already")
          ? "Este e-mail já tem conta. Faça login."
          : msg.includes("weak") || msg.includes("pwned") || error.code === "weak_password"
            ? "Essa senha é muito comum e fácil de adivinhar. Escolha uma senha mais forte (misture letras, números e símbolos)."
            : msg.includes("rate limit")
              ? "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo."
              : "Não foi possível criar a conta agora.",
      );
      return;
    }
    if (!data.session) {
      setConfirmarEmail(true);
      return;
    }
    toast.success("Conta criada!");
    navigate({ to: "/painel" });
  }

  async function entrarComGoogle() {
    const resultado = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (resultado.error) {
      toast.error("Não foi possível entrar com o Google.");
      return;
    }
    if (resultado.redirected) return;
    navigate({ to: "/painel" });
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5">
        <Link to="/" className="flex items-center gap-2 font-extrabold">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ShieldCheck className="size-5" aria-hidden />
          </span>
          Alerta Cidadão
        </Link>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 pb-16">
        <div className="w-full max-w-md rounded-2xl bg-card p-6 card-suave">
          {confirmarEmail ? (
            <div className="space-y-3 text-center">
              <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent/15 text-accent">
                <MailCheck className="size-6" aria-hidden />
              </span>
              <h1 className="text-xl font-bold">Confirme seu e-mail</h1>
              <p className="text-sm text-muted-foreground">
                Enviamos um link de confirmação para o seu e-mail. Depois de clicar nele, você já
                pode entrar e registrar seu primeiro chamado.
              </p>
              <Button variant="outline" className="w-full" onClick={() => setConfirmarEmail(false)}>
                Voltar
              </Button>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold">Acesse sua conta</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                É rápido e serve para acompanhar seus chamados.
              </p>

              <Tabs defaultValue="entrar" className="mt-5">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="entrar">Entrar</TabsTrigger>
                  <TabsTrigger value="cadastrar">Criar conta</TabsTrigger>
                </TabsList>

                <TabsContent value="entrar">
                  <form onSubmit={entrar} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="email-entrar">E-mail</Label>
                      <Input
                        id="email-entrar"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        placeholder="voce@email.com"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="senha-entrar">Senha</Label>
                      <Input
                        id="senha-entrar"
                        name="senha"
                        type="password"
                        autoComplete="current-password"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={carregando}>
                      {carregando ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                      Entrar
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="cadastrar">
                  <form onSubmit={cadastrar} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="nome">Nome completo</Label>
                      <Input id="nome" name="nome" required placeholder="Maria da Silva" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email-cadastro">E-mail</Label>
                      <Input
                        id="email-cadastro"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        placeholder="voce@email.com"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="senha-cadastro">Senha</Label>
                      <Input
                        id="senha-cadastro"
                        name="senha"
                        type="password"
                        autoComplete="new-password"
                        required
                        placeholder="Mínimo de 6 caracteres"
                      />
                    </div>
                    <fieldset className="space-y-2">
                      <legend className="text-sm font-medium">Como você vai usar o app?</legend>
                      <RadioGroup
                        value={perfil}
                        onValueChange={(valor) => setPerfil(valor as "cidadao" | "gestor")}
                        className="gap-2"
                      >
                        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                          <RadioGroupItem value="cidadao" className="mt-0.5" />
                          <span>
                            <span className="font-semibold">Sou morador</span>
                            <span className="block text-muted-foreground">
                              Quero reportar problemas e acompanhar respostas
                            </span>
                          </span>
                        </label>
                        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                          <RadioGroupItem value="gestor" className="mt-0.5" />
                          <span>
                            <span className="font-semibold">Sou da prefeitura</span>
                            <span className="block text-muted-foreground">
                              Quero atender chamados e ver os indicadores
                            </span>
                          </span>
                        </label>
                      </RadioGroup>
                    </fieldset>
                    <Button type="submit" className="w-full" disabled={carregando}>
                      {carregando ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                      Criar conta
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                ou
                <span className="h-px flex-1 bg-border" />
              </div>

              <Button variant="outline" className="w-full" onClick={entrarComGoogle}>
                Continuar com o Google
              </Button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
