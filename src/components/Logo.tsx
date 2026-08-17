import { cn } from "@/lib/utils";
import logoAsset from "@/assets/logo-xfts-lockup.png.asset.json";

const LOGO_URL = logoAsset.url;

/** Dimensões da arte original e da área com conteúdo (sem transparência) */
const IMG_W = 1916;
const IMG_H = 821;
const CONTENT = { x: 75, y: 73, w: 1787, h: 676 };
const MARK = { x: 75, y: 73, w: 660, h: 617 };

type LogoProps = {
  /** Altura útil do símbolo/lockup em px */
  size?: number;
  /** "full" = símbolo + wordmark, "mark" = apenas o símbolo */
  variant?: "full" | "mark";
  /** Arte em off-white, para fundos escuros. Em fundos claros usa verde petróleo. */
  inverted?: boolean;
  /** Mantido por compatibilidade — sem efeito no lockup em imagem */
  compactSubtitle?: boolean;
  className?: string;
};

export function Logo({
  size = 32,
  variant = "full",
  inverted = false,
  className,
}: LogoProps) {
  const region = variant === "mark" ? MARK : CONTENT;

  // Escala a imagem inteira de modo que a região visível tenha altura `size`
  const scale = size / region.h;
  const fullW = IMG_W * scale;
  const fullH = IMG_H * scale;
  const boxW = region.w * scale;
  const offsetX = -region.x * scale;
  const offsetY = -region.y * scale;

  const inner = inverted ? (
    <img
      src={LOGO_URL}
      alt=""
      aria-hidden="true"
      style={{
        position: "absolute",
        left: offsetX,
        top: offsetY,
        width: fullW,
        height: fullH,
        maxWidth: "none",
      }}
    />
  ) : (
    <span
      aria-hidden="true"
      className="bg-primary"
      style={{
        position: "absolute",
        left: offsetX,
        top: offsetY,
        width: fullW,
        height: fullH,
        WebkitMaskImage: `url(${LOGO_URL})`,
        maskImage: `url(${LOGO_URL})`,
        WebkitMaskSize: "100% 100%",
        maskSize: "100% 100%",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
      }}
    />
  );

  return (
    <span
      role="img"
      aria-label="XFTS Inteligência Analítica"
      className={cn("relative inline-block shrink-0 overflow-hidden align-middle", className)}
      style={{ width: boxW, height: size }}
    >
      {inner}
    </span>
  );
}
