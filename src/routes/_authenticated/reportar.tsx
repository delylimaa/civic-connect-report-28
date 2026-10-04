import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Camera, Loader2, LocateFixed, MapPin, Send, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SeletorLocalizacaoLazy } from "@/components/MapaLazy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIAS, type Categoria } from "@/lib/ocorrencias";
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
        content: "Registre buracos, iluminação ou lixo com foto e localização.",
      },
    ],
  }),
  component: Reportar,
});

const esquema = z.object({
  titulo: z.string().trim().min(4, { message: "Escreva um título com pelo menos 4 letras" }).max(120),
  descricao: z.string().trim().max(1000).optional().default(""),
  categoria: z.enum(["buraco_via", "iluminacao_publica", "lixo", "outros"]),
});

const LOCAL_PADRAO = { lat: -23.5505, lng: -46.6333 };

function Reportar() {
  const navigate = useNavigate();
  const [categoria, setCategoria] = useState<Categoria | null>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [local, setLocal] = useState(LOCAL_PADRAO);
  const [localObtido, setLocalObtido] = useState(false);
  const [buscandoLocal, setBuscandoLocal] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const inputFoto = useRef<HTMLInputElement>(null);

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
      categoria,
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
    <form onSubmit={enviar} className="space-y-8">
      <div className="animate-surgir">
        <h1 className="text-2xl font-extrabold md:text-3xl">Reportar problema</h1>
        <p className="mt-1 text-muted-foreground">
          Três passos simples: escolha o tipo, envie uma foto e confirme o local.
        </p>
      </div>

      <fieldset className="animate-surgir space-y-3" style={{ animationDelay: "80ms" }}>
        <legend className="text-lg font-bold">1. Qual é o problema?</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {(Object.keys(CATEGORIAS) as Categoria[]).map((chave) => {
            const item = CATEGORIAS[chave];
            const ativa = categoria === chave;
            return (
              <button
                key={chave}
                type="button"
                onClick={() => setCategoria(chave)}
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
