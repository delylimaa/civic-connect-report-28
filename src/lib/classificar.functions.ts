import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CATEGORIAS } from "@/lib/ocorrencias";

const opcoes = Object.entries(CATEGORIAS)
  .filter(([c]) => c !== "outros")
  .flatMap(([c, info]) => Object.entries(info.subs).map(([s, sub]) => `${c}/${s}: ${sub.rotulo}`))
  .join("\n");

const vazio = { categoria: null as string | null, subcategoria: null as string | null };

export const classificarProblema = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ texto: z.string().trim().min(4).max(1200) }).parse(d))
  .handler(async ({ data }) => {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Lovable-API-Key": process.env.LOVABLE_API_KEY ?? "",
        "X-Lovable-AIG-SDK": "fetch",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        instructions: `Classifique o relato de problema urbano em UMA das opções abaixo. Responda só com o código "categoria/subcategoria", ou "nenhuma" se nada servir.\n${opcoes}`,
        input: data.texto,
      }),
    });
    if (!resp.ok || !resp.body) return vazio;

    const leitor = resp.body.getReader();
    const dec = new TextDecoder();
    let buffer = "";
    let texto = "";
    for (;;) {
      const { done, value } = await leitor.read();
      if (done) break;
      buffer += dec.decode(value, { stream: true });
      const linhas = buffer.split("\n");
      buffer = linhas.pop() ?? "";
      for (const l of linhas) {
        if (!l.startsWith("data:")) continue;
        try {
          const ev = JSON.parse(l.slice(5).trim());
          if (ev.type === "response.output_text.delta") texto += ev.delta ?? "";
        } catch {
          /* ignora linhas não-JSON */
        }
      }
    }

    const [c, s] = texto.trim().replace(/[`"\s.]/g, "").split("/");
    const cat = CATEGORIAS[c as keyof typeof CATEGORIAS];
    if (!cat || c === "outros" || !s || !cat.subs[s]) return vazio;
    return { categoria: c, subcategoria: s };
  });
