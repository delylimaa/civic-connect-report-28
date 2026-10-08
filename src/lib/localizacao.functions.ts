import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const LIMITE = 5;

const FALHA = {
  resultados: [] as ResultadoEndereco[],
  erro: "A busca de endereços não respondeu agora. Tente de novo em instantes.",
};

export type ResultadoEndereco = {
  rotulo: string;
  lat: number;
  lng: number;
};

const entrada = z.object({
  endereco: z
    .string()
    .trim()
    .min(3, { message: "Digite pelo menos 3 caracteres" })
    .max(160, { message: "Endereço muito longo" }),
});

export const buscarEndereco = createServerFn({ method: "GET" })
  .inputValidator((d) => entrada.parse(d))
  .handler(async ({ data }) => {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", data.endereco);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", String(LIMITE));
    url.searchParams.set("countrycodes", "br");
    url.searchParams.set("accept-language", "pt-BR");

    let resposta: Response;
    try {
      resposta = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "AlertaCidadao/1.0 (https://alerta-cidadao.lovable.app)",
        },
      });
    } catch {
      return FALHA;
    }
    if (!resposta.ok) return FALHA;

    let lista: unknown;
    try {
      lista = await resposta.json();
    } catch {
      return FALHA;
    }
    if (!Array.isArray(lista)) return FALHA;

    const resultados = lista
      .map((item) => {
        const bruto = item as { lat?: string; lon?: string; display_name?: string };
        const lat = Number(bruto?.lat);
        const lng = Number(bruto?.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        const partes = (bruto.display_name ?? "")
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean);
        const rotulo = partes.slice(0, 4).join(", ");
        if (!rotulo) return null;
        return {
          rotulo: rotulo.length > 110 ? `${rotulo.slice(0, 107)}…` : rotulo,
          lat,
          lng,
        } satisfies ResultadoEndereco;
      })
      .filter((r): r is ResultadoEndereco => r !== null)
      .slice(0, LIMITE);

    return { resultados, erro: null as string | null };
  });
