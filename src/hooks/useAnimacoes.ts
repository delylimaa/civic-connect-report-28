import { useEffect, useRef, useState } from "react";

/** Revela um elemento quando ele entra na área visível da tela. */
export function useRevelar<T extends HTMLElement = HTMLDivElement>(margem = "0px 0px -10% 0px") {
  const ref = useRef<T | null>(null);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const elemento = ref.current;
    if (!elemento) return;

    if (typeof IntersectionObserver === "undefined") {
      setVisivel(true);
      return;
    }

    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (entrada.isIntersecting) {
            setVisivel(true);
            observador.disconnect();
          }
        }
      },
      { rootMargin: margem, threshold: 0.12 },
    );

    observador.observe(elemento);
    return () => observador.disconnect();
  }, [margem]);

  return { ref, visivel };
}

/** Anima um número de 0 até o valor final. */
export function useContagem(valor: number, duracao = 900) {
  const [atual, setAtual] = useState(0);
  const anterior = useRef(0);

  useEffect(() => {
    const reduzir =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reduzir || duracao <= 0) {
      anterior.current = valor;
      setAtual(valor);
      return;
    }

    const inicio = performance.now();
    const de = anterior.current;
    let quadro = 0;

    const passo = (agora: number) => {
      const progresso = Math.min(1, (agora - inicio) / duracao);
      const suave = 1 - Math.pow(1 - progresso, 3);
      setAtual(de + (valor - de) * suave);
      if (progresso < 1) quadro = requestAnimationFrame(passo);
      else anterior.current = valor;
    };

    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [valor, duracao]);

  return atual;
}

/** Informa quanto a página já foi rolada (0 a 1) e se saiu do topo. */
export function useRolagem() {
  const [progresso, setProgresso] = useState(0);
  const [rolou, setRolou] = useState(false);

  useEffect(() => {
    const atualizar = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const y = window.scrollY;
      setProgresso(total > 0 ? Math.min(1, y / total) : 0);
      setRolou(y > 12);
    };

    atualizar();
    window.addEventListener("scroll", atualizar, { passive: true });
    window.addEventListener("resize", atualizar);
    return () => {
      window.removeEventListener("scroll", atualizar);
      window.removeEventListener("resize", atualizar);
    };
  }, []);

  return { progresso, rolou };
}
