import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/LogoMark";

type LogoProps = {
  /** Altura do símbolo em px */
  size?: number;
  /** "full" = símbolo + wordmark, "mark" = apenas o símbolo */
  variant?: "full" | "mark";
  /** Usa cores claras no wordmark (para fundos escuros) */
  inverted?: boolean;
  /** Esconde o subtítulo "Inteligência Analítica" em telas pequenas */
  compactSubtitle?: boolean;
  className?: string;
};

export function Logo({
  size = 32,
  variant = "full",
  inverted = false,
  compactSubtitle = false,
  className,
}: LogoProps) {
  const mark = (
    <LogoMark size={size} className={inverted ? "text-primary-foreground" : "text-primary"} />
  );

  if (variant === "mark") {
    return (
      <span className={cn("inline-flex", className)} aria-label="XFTS Inteligência Analítica">
        {mark}
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {mark}
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "text-xl font-extrabold tracking-tight",
            inverted ? "text-primary-foreground" : "text-primary",
          )}
        >
          XFTS
        </span>
        <span
          className={cn(
            "text-[11px] font-medium tracking-wide",
            inverted ? "text-primary-foreground/70" : "text-muted-foreground",
            compactSubtitle && "hidden sm:inline",
          )}
        >
          Inteligência Analítica
        </span>
      </span>
    </span>
  );
}
