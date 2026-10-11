import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const esquema = z.object({
  nome: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(160),
  senha: z.string().min(8).max(72),
  papel: z.enum(["admin", "gestor", "servidor"]),
  secretaria: z.string().max(40).nullable(),
});

export const criarMembroEquipe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((dados: unknown) => esquema.parse(dados))
  .handler(async ({ data, context }) => {
    const { data: meu } = await context.supabase
      .from("user_roles")
      .select("role, secretaria")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (!meu || meu.role === "servidor") {
      return { ok: false, erro: "Você não tem permissão para cadastrar a equipe." };
    }
    let { papel, secretaria } = data;
    if (meu.role === "gestor") {
      // Gestor só cadastra servidores da própria secretaria
      if (papel !== "servidor") return { ok: false, erro: "Gestores só cadastram servidores." };
      secretaria = meu.secretaria;
    }
    if (papel !== "admin" && !secretaria) {
      return { ok: false, erro: "Escolha a secretaria." };
    }
    if (papel === "admin") secretaria = null;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: criado, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.senha,
      email_confirm: true,
      user_metadata: { nome: data.nome },
    });
    if (error || !criado.user) {
      const msg = error?.message?.toLowerCase() ?? "";
      return {
        ok: false,
        erro: msg.includes("already")
          ? "Já existe uma conta com este e-mail."
          : msg.includes("weak") || msg.includes("pwned")
            ? "Senha muito comum. Escolha uma senha mais forte."
            : "Não foi possível criar a conta agora.",
      };
    }
    const { error: erroPapel } = await supabaseAdmin.from("user_roles").insert({
      user_id: criado.user.id,
      role: papel,
      secretaria,
      criado_por: context.userId,
    });
    if (erroPapel) return { ok: false, erro: "Conta criada, mas o papel não foi salvo." };
    return { ok: true, erro: null };
  });

export const alterarAtivoMembro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((dados: unknown) =>
    z.object({ userId: z.string().uuid(), ativo: z.boolean() }).parse(dados),
  )
  .handler(async ({ data, context }) => {
    if (data.userId === context.userId) {
      return { ok: false, erro: "Você não pode desativar a própria conta." };
    }
    const { data: meu } = await context.supabase
      .from("user_roles")
      .select("role, secretaria, ativo")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!meu?.ativo || meu.role === "servidor") {
      return { ok: false, erro: "Você não tem permissão para esta ação." };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: alvo } = await supabaseAdmin
      .from("user_roles")
      .select("role, secretaria")
      .eq("user_id", data.userId)
      .maybeSingle();
    if (!alvo) return { ok: false, erro: "Membro não encontrado." };
    if (meu.role === "gestor" && (alvo.role !== "servidor" || alvo.secretaria !== meu.secretaria)) {
      return { ok: false, erro: "Gestores só gerenciam servidores da própria secretaria." };
    }
    const { error } = await supabaseAdmin
      .from("user_roles")
      .update({ ativo: data.ativo, criado_por: context.userId })
      .eq("user_id", data.userId);
    if (error) return { ok: false, erro: "Não foi possível salvar agora." };
    if (!data.ativo) {
      // Tira o servidor dos chamados abertos para que voltem à fila da secretaria
      await supabaseAdmin
        .from("ocorrencias")
        .update({ atribuido_a: null })
        .eq("atribuido_a", data.userId)
        .not("status", "in", "(resolvido,cancelado,indeferido)");
    }
    return { ok: true, erro: null };
  });
