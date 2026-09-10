import { STATUS, type StatusOcorrencia } from "@/lib/ocorrencias";
import { cn } from "@/lib/utils";

export function BadgeStatus({
  status,
  className,
}: {
  status: StatusOcorrencia;
  className?: string;
}) {
  const info = STATUS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        info.classe,
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {info.rotulo}
    </span>
  );
}
