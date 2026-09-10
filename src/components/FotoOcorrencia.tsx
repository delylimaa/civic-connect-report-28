import { ImageOff } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useFotoUrl } from "@/hooks/usePerfil";
import { cn } from "@/lib/utils";

export function FotoOcorrencia({
  caminho,
  alt,
  className,
}: {
  caminho: string | null;
  alt: string;
  className?: string;
}) {
  const { data, isLoading } = useFotoUrl(caminho);

  if (!caminho) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-surface text-muted-foreground",
          className,
        )}
      >
        <ImageOff className="size-6" aria-hidden />
        <span className="sr-only">Sem foto</span>
      </div>
    );
  }

  if (isLoading || !data) {
    return <Skeleton className={cn("bg-surface", className)} />;
  }

  return <img src={data} alt={alt} loading="lazy" className={cn("object-cover", className)} />;
}
