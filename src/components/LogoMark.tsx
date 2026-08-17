import { cn } from "@/lib/utils";

type LogoMarkProps = {
  /** Tamanho em px (quadrado) */
  size?: number;
  className?: string;
  /** Cor do acento (quadrado dourado) */
  accent?: string;
};

/**
 * Símbolo XFTS: composição de quadrados rotacionados 45° em torno de um
 * quadrado central, com um acento dourado no canto superior esquerdo.
 * O corpo usa `currentColor` para se adaptar a fundos claros e escuros.
 */
export function LogoMark({ size = 32, className, accent = "#FFC107" }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-hidden="true"
      focusable="false"
      className={cn("shrink-0", className)}
      style={{ height: size, width: size }}
    >
      <g transform="rotate(45 50 50)" fill="currentColor">
        {/* quadrado central */}
        <rect x="35" y="35" width="30" height="30" rx="2.5" />
        {/* satélites médios */}
        <rect x="42" y="16" width="16" height="16" rx="1.8" />
        <rect x="68" y="42" width="16" height="16" rx="1.8" />
        <rect x="42" y="68" width="16" height="16" rx="1.8" />
        {/* satélites pequenos nas diagonais */}
        <rect x="22" y="22" width="10" height="10" rx="1.4" />
        <rect x="68" y="22" width="10" height="10" rx="1.4" />
        <rect x="22" y="68" width="10" height="10" rx="1.4" />
        <rect x="68" y="68" width="10" height="10" rx="1.4" />
        {/* acento dourado */}
        <rect x="19" y="45" width="10" height="10" rx="1.4" fill={accent} />
      </g>
    </svg>
  );
}
