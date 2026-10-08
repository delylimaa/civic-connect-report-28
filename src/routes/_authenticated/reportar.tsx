import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Camera, Loader2, LocateFixed, MapPin, Search, Send, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SeletorLocalizacaoLazy } from "@/components/MapaLazy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useOcorrencias } from "@/hooks/useOcorrencias";
import { classificarProblema } from "@/lib/classificar.functions";
import { buscarEndereco, type ResultadoEndereco } from "@/lib/localizacao.functions";
import {
  CATEGORIAS,
  CATEGORIA_CHAVES,
  rotuloOcorrencia,
  rotuloSecretaria,
  type Categoria,
} from "@/lib/ocorrencias";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/reportar")({
  head: () => ({
    meta: [
      { title: "Reportar problema — Alerta Cidadão" },
      {
        name: "description",
        content:
          "Envie foto, descrição e localização de um problema urbano direto para a prefeitura.",
      },
      { property: "og:title", content: "Reportar problema — Alerta Cidadão" },
      {
        property: "og:description",
        content: "Registre problemas de saneamento, trânsito, limpeza e mais, com foto e local.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Reportar,
});

const esquema = z.object({
  titulo: z.string().trim().min(4, { message: "Escreva um título com pelo menos 4 letras" }).max(120),
  descricao: z.string().trim().max(1000).optional().default(""),
  categoria: z.enum(CATEGORIA_CHAVES as [Categoria, ...Categoria[]], {
    message: "Escolha o tipo de problema",
  }),
  subcategoria: z.string({ message: "Escolha qual é o problema específico" }).min(1),
});

const LOCAL_PADRAO = { lat: -23.5505, lng: -46.6333 };

type FonteLocal = "gps" | "endereco" | "pino" | "padrao";

function distanciaKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r;
  const dLng = (b.lng - a.lng) * r;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

function Reportar() {
  const navigate = useNavigate();
  const classificar = useServerFn(classificarProblema);
  const buscarNoServidor = useServerFn(buscarEndereco);
  const { data: existentes } = useOcorrencias();
  const [categoria, setCategoria] = useState<Categoria | null>(null);
  const [subcategoria, setSubcategoria] = useState<string | null>(null);
  const [classificando, setClassificando] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [local, setLocal] = useState(LOCAL_PADRAO);
  const [localObtido, setLocalObtido] = useState(false);
  const [buscandoLocal, setBuscandoLocal] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const inputFoto = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Sugere o tipo mais registrado num raio de 1 km do local marcado.
  const sugestao = useMemo(() => {
    const contagem = new Map<string, number>();
    for (const o of existentes ?? []) {
      if (o.latitude == null || o.longitude == null || !o.subcategoria) continue;
      if (o.categoria === "outros") continue;
      if (distanciaKm(local, { lat: o.latitude, lng: o.longitude }) > 1) continue;
      const k = `${o.categoria}/${o.subcategoria}`;
      contagem.set(k, (contagem.get(k) ?? 0) + 1);
    }
    const topo = [...contagem.entries()].sort((a, b) => b[1] - a[1])[0];
    if (!topo) return null;
    const [c, s = ""] = topo[0].split("/");
    if (!CATEGORIAS[c as Categoria]?.subs[s]) return null;
    return { categoria: c as Categoria, subcategoria: s };
  }, [existentes, local]);

  async function classificarComIA() {
    const form = formRef.current ? new FormData(formRef.current) : null;
    const texto = `${form?.get("titulo") ?? ""}. ${form?.get("descricao") ?? ""}`.trim();
    if (texto.length < 6) {
      toast.info("Escreva o título ou os detalhes primeiro para a IA entender o problema.");
      return;
    }
    setClassificando(true);
    try {
      const r = await classificar({ data: { texto } });
      if (r.categoria && r.subcategoria) {
        setCategoria(r.categoria as Categoria);
        setSubcategoria(r.subcategoria);
        toast.success(`Classificado como: ${rotuloOcorrencia({ categoria: r.categoria, subcategoria: r.subcategoria })}`);
      } else {
        setCategoria("outros");
        setSubcategoria("outro");
        toast.info("Não identificamos um tipo específico. Vai para a triagem da Ouvidoria.");
      }
    } catch {
      toast.error("A classificação automática falhou. Escolha o tipo manualmente.");
    } finally {
      setClassificando(false);
    }
  }

  async function pegarLocalAtual() {
    if (!("geolocation" in navigator)) {
      setBuscandoLocal(false);
      toast.info("Seu navegador não permite busca de localização. Toque no mapa para marcar o local.");
      return;
    }

    // Se a permissão já foi negada, orienta o usuário em vez de tentar de novo.
    try {
      const permissao = await navigator.permissions?.query({ name: "geolocation" as PermissionName });
      if (permissao?.state === "denied") {
        setBuscandoLocal(false);
        toast.warning(
          "A localização está bloqueada neste navegador. Toque no cadeado da barra de endereço, permita a localização e tente de novo — ou arraste o pino no mapa.",
          { duration: 8000 },
        );
        return;
      }
    } catch {
      // Alguns navegadores não expõem a consulta de permissão; seguimos com a tentativa normal.
    }

    setBuscandoLocal(true);
    navigator.geolocation.getCurrentPosition(
      (posicao) => {
        setLocal({ lat: posicao.coords.latitude, lng: posicao.coords.longitude });
        setLocalObtido(true);
        setBuscandoLocal(false);
        toast.success("Localização encontrada!");
      },
      (erro) => {
        setBuscandoLocal(false);
        if (erro.code === erro.PERMISSION_DENIED) {
          toast.warning(
            "Você negou o acesso à localização. Permita no cadeado da barra de endereço ou arraste o pino no mapa.",
            { duration: 8000 },
          );
        } else if (erro.code === erro.TIMEOUT) {
          toast.info("O GPS demorou demais. Tente novamente em área aberta ou arraste o pino no mapa.");
        } else {
          toast.info("Não conseguimos sua localização. Arraste o pino no mapa para marcar o local.");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  useEffect(() => {
    pegarLocalAtual();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!arquivo) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(arquivo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [arquivo]);

  function escolherFoto(evento: React.ChangeEvent<HTMLInputElement>) {
    const escolhido = evento.target.files?.[0];
    if (!escolhido) return;
    if (escolhido.size > 10 * 1024 * 1024) {
      toast.error("A foto é muito grande. Escolha uma imagem de até 10 MB.");
      return;
    }
    setArquivo(escolhido);
  }

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const form = new FormData(evento.currentTarget);
    const dados = esquema.safeParse({
      titulo: form.get("titulo"),
      descricao: form.get("descricao") ?? "",
      categoria: categoria ?? undefined,
      subcategoria: subcategoria ?? undefined,
    });
    if (!dados.success) {
      toast.error(dados.error.issues[0]?.message ?? "Escolha uma categoria e preencha o título.");
      return;
    }

    setEnviando(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("sem sessão");

      let caminhoFoto: string | null = null;
      if (arquivo) {
        const extensao = arquivo.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const caminho = `${auth.user.id}/${crypto.randomUUID()}.${extensao}`;
        const { error: erroUpload } = await supabase.storage
          .from("ocorrencias")
          .upload(caminho, arquivo, { contentType: arquivo.type });
        if (erroUpload) throw erroUpload;
        caminhoFoto = caminho;
      }

      const { error } = await supabase.from("ocorrencias").insert({
        usuario_id: auth.user.id,
        titulo: dados.data.titulo,
        descricao: dados.data.descricao ?? "",
        categoria: dados.data.categoria,
        subcategoria: dados.data.subcategoria,
        secretaria:
          CATEGORIAS[dados.data.categoria].subs[dados.data.subcategoria]?.secretaria ?? "ouvidoria",
        foto_url: caminhoFoto,
        latitude: local.lat,
        longitude: local.lng,
      });
      if (error) throw error;

      toast.success("Chamado registrado! Você pode acompanhar a resposta em Meus chamados.");
      navigate({ to: "/chamados" });
    } catch {
      toast.error("Não foi possível enviar agora. Tente novamente em instantes.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={enviar} className="space-y-8">
      <div className="animate-surgir">
        <h1 className="text-2xl font-extrabold md:text-3xl">Reportar problema</h1>
        <p className="mt-1 text-muted-foreground">
          Três passos simples: escolha o tipo, envie uma foto e confirme o local.
        </p>
      </div>

      <fieldset className="animate-surgir space-y-3" style={{ animationDelay: "80ms" }}>
        <legend className="text-lg font-bold">1. Qual é o problema?</legend>
        {sugestao ? (
          <button
            type="button"
            onClick={() => {
              setCategoria(sugestao.categoria);
              setSubcategoria(sugestao.subcategoria);
            }}
            className="flex w-full items-center gap-2 rounded-xl border border-accent/40 bg-accent/10 p-3 text-left text-sm"
          >
            <Sparkles className="size-4 shrink-0 text-accent" aria-hidden />
            <span>
              Mais comum perto deste local:{" "}
              <strong>{rotuloOcorrencia(sugestao)}</strong> — toque para usar
            </span>
          </button>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          {CATEGORIA_CHAVES.map((chave) => {
            const item = CATEGORIAS[chave];
            const ativa = categoria === chave;
            return (
              <button
                key={chave}
                type="button"
                onClick={() => {
                  setCategoria(chave);
                  const subs = Object.keys(item.subs);
                  setSubcategoria(subs.length === 1 ? (subs[0] ?? null) : null);
                }}
                aria-pressed={ativa}
                className={cn(
                  "flex items-start gap-3 rounded-2xl border-2 bg-card p-4 text-left transition-all",
                  ativa
                    ? "border-primary bg-primary/5 shadow-[var(--shadow-card)]"
                    : "border-border hover:border-primary/40",
                )}
              >
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-xl",
                    ativa ? "bg-primary text-primary-foreground" : "bg-surface text-primary",
                  )}
                >
                  <item.icone className="size-5" aria-hidden />
                </span>
                <span>
                  <span className="block font-semibold">{item.rotulo}</span>
                  <span className="block text-xs text-muted-foreground">{item.descricao}</span>
                </span>
              </button>
            );
          })}
        </div>

        {categoria && categoria !== "outros" ? (
          <div className="animate-abrir space-y-2">
            <p className="text-sm font-semibold">Qual destes?</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(CATEGORIAS[categoria].subs).map(([chave, sub]) => (
                <Button
                  key={chave}
                  type="button"
                  size="sm"
                  variant={subcategoria === chave ? "default" : "outline"}
                  aria-pressed={subcategoria === chave}
                  onClick={() => setSubcategoria(chave)}
                >
                  {sub.rotulo}
                </Button>
              ))}
            </div>
          </div>
        ) : null}

        {categoria === "outros" ? (
          <p className="text-sm text-muted-foreground">
            Descreva o problema no passo 2 e toque em "Classificar com IA" — nós sugerimos o tipo certo.
          </p>
        ) : null}

        {categoria && subcategoria ? (
          <p className="text-xs text-muted-foreground">
            Será encaminhado para{" "}
            <strong className="text-accent">
              {rotuloSecretaria(CATEGORIAS[categoria].subs[subcategoria]?.secretaria ?? null)}
            </strong>
          </p>
        ) : null}
      </fieldset>

      <fieldset className="animate-surgir space-y-4" style={{ animationDelay: "160ms" }}>
        <legend className="text-lg font-bold">2. Conte o que está acontecendo</legend>
        <div className="space-y-1.5">
          <Label htmlFor="titulo">Título</Label>
          <Input
            id="titulo"
            name="titulo"
            maxLength={120}
            required
            placeholder="Ex.: Buraco grande na Rua das Flores"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="descricao">Detalhes (opcional)</Label>
          <Textarea
            id="descricao"
            name="descricao"
            maxLength={1000}
            rows={4}
            placeholder="Perto de qual referência? Há risco para quem passa?"
          />
          {categoria === "outros" || !categoria ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="pressionar"
              onClick={classificarComIA}
              disabled={classificando}
            >
              {classificando ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="size-4" aria-hidden />
              )}
              Classificar com IA
            </Button>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="foto">Foto do problema</Label>
          <input
            ref={inputFoto}
            id="foto"
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={escolherFoto}
          />
          {preview ? (
            <div className="relative w-full max-w-sm overflow-hidden rounded-2xl">
              <img src={preview} alt="Pré-visualização da foto escolhida" className="w-full" />
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="absolute right-2 top-2"
                onClick={() => setArquivo(null)}
                aria-label="Remover foto"
              >
                <X className="size-4" aria-hidden />
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="h-24 w-full border-dashed"
              onClick={() => inputFoto.current?.click()}
            >
              <Camera className="size-5" aria-hidden />
              Tirar ou escolher uma foto
            </Button>
          )}
        </div>
      </fieldset>

      <fieldset className="animate-surgir space-y-3" style={{ animationDelay: "240ms" }}>
        <legend className="text-lg font-bold">3. Onde fica?</legend>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="size-4" aria-hidden />
          {buscandoLocal
            ? "Procurando sua localização..."
            : localObtido
              ? "Local encontrado. Se estiver errado, arraste o pino."
              : "Toque no mapa ou arraste o pino até o local exato."}
        </p>
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={pegarLocalAtual}
            disabled={buscandoLocal}
            className="pressionar"
          >
            {buscandoLocal ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <LocateFixed className="size-4" aria-hidden />
            )}
            Usar minha localização
          </Button>
        </div>
        <p className="text-xs text-muted-foreground" aria-live="polite">
          Coordenadas: {local.lat.toFixed(6)}, {local.lng.toFixed(6)}
          {localObtido ? " (GPS)" : " (padrão — ajuste o pino)"}
        </p>
        <div className="h-72 overflow-hidden rounded-xl border border-border">
          <SeletorLocalizacaoLazy
            latitude={local.lat}
            longitude={local.lng}
            onChange={(lat, lng) => setLocal({ lat, lng })}
          />
        </div>
      </fieldset>

      <div className="sticky bottom-20 md:bottom-4">
        <Button type="submit" size="lg" className="pressionar w-full" disabled={enviando}>
          {enviando ? (
            <Loader2 className="size-5 animate-spin" aria-hidden />
          ) : (
            <Send className="size-5" aria-hidden />
          )}
          Enviar chamado
        </Button>
      </div>
    </form>
  );
}
