import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CATEGORIAS } from "@/lib/ocorrencias";

const opcoes = Object.entries(CATEGORIAS)
  .filter(([c]) => c !== "outros")
  .flatMap(([c, info]) => Object.entries(info.subs).map(([s, sub]) => `${c}/${s}: ${sub.rotulo}`))
  .join("\n");

export const classificarProblema = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ texto: z.string().trim().min(4).max(1200) }).parse(d))
  .handler(async ({ data }) => {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Classifique o relato de problema urbano em UMA das opções abaixo. Responda só com o código "categoria/subcategoria", ou "nenhuma" se nada servir.\n${opcoes}`,
          },
          { role: "user", content: data.texto },
        ],
      }),
    });
    if (!resp.ok) return { categoria: null, subcategoria: null };
    const json = await resp.json();
    const saida = String(json.choices?.[0]?.message?.content ?? "").trim().replace(/[`"\s]/g, "");
    const [c, s] = saida.split("/");
    const cat = CATEGORIAS[c as keyof typeof CATEGORIAS];
    if (!cat || c === "outros" || !s || !cat.subs[s]) return { categoria: null, subcategoria: null };
    return { categoria: c, subcategoria: s };
  });
