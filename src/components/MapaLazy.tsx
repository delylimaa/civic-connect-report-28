import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Ocorrencia } from "@/lib/ocorrencias";

const MapaOcorrencias = lazy(() => import("@/components/MapaOcorrencias"));
const SeletorLocalizacao = lazy(() => import("@/components/SeletorLocalizacao"));

function Espera() {
  return <Skeleton className="h-full w-full rounded-xl bg-surface" />;
}

export function MapaOcorrenciasLazy({ ocorrencias }: { ocorrencias: Ocorrencia[] }) {
  return (
    <ClientOnly fallback={<Espera />}>
      <Suspense fallback={<Espera />}>
        <MapaOcorrencias ocorrencias={ocorrencias} />
      </Suspense>
    </ClientOnly>
  );
}

export function SeletorLocalizacaoLazy(props: {
  latitude: number;
  longitude: number;
  onChange: (lat: number, lng: number) => void;
}) {
  return (
    <ClientOnly fallback={<Espera />}>
      <Suspense fallback={<Espera />}>
        <SeletorLocalizacao {...props} />
      </Suspense>
    </ClientOnly>
  );
}
