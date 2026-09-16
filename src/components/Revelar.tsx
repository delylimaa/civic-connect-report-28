import type { ReactNode } from "react";
import { useContagem, useRevelar } from "@/hooks/useAnimacoes";
import { cn } from "@/lib/utils";

/** Envolve um bloco e o faz surgir suavemente quando aparece na tela. */
export function Revelar({
  children,
  atraso = 0,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  atraso?: number;
  className?: string;
  as?: "div" | "section" | "article" | "li";
}) {
  const { ref, visivel } = useRevelar<HTMLDivElement>();

  return (
    <Tag
      ref={ref as never}
      style={{ transitionDelay: `${atraso}ms` }}
      className={cn(
        "transition-all duration-700 ease-out motion-reduce:transition-none",
        visivel ? "translate-y-0 opacity-100 blur-0" : "translate-y-6 opacity-0 blur-[2px]",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/** Número que sobe do zero até o valor, começando quando entra na tela. */
export function NumeroAnimado({
  valor,
  sufixo = "",
  decimais = 0,
  className,
}: {
  valor: number;
  sufixo?: string;
  decimais?: number;
  className?: string;
}) {
  const { ref, visivel } = useRevelar<HTMLSpanElement>();
  const atual = useContagem(visivel ? valor : 0);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {atual.toLocaleString("pt-BR", {
        minimumFractionDigits: decimais,
        maximumFractionDigits: decimais,
      })}
      {sufixo}
    </span>
  );
}
