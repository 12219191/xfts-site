import { trackCTAClick } from "@/lib/tracking";

export const WHATSAPP_URL =
  "https://wa.me/5517997943349?text=" +
  encodeURIComponent("Olá! Gostaria de saber mais sobre as soluções FLEXUS da XFTS.");

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 016.988 2.896 9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.464 3.488" />
    </svg>
  );
}

export function WhatsAppFloatingButton() {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar com a XFTS no WhatsApp"
      title="Falar no WhatsApp"
      onClick={() => trackCTAClick({ section: "whatsapp-flutuante", label: "WhatsApp" })}
      className="group fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 inline-flex h-14 w-14 items-center justify-center gap-2 rounded-full bg-cta shadow-lg md:bottom-5 md:right-5 md:h-auto md:w-auto md:px-5 md:py-3.5 ring-1 ring-cta-foreground/20 transition-colors hover:bg-cta/90 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <WhatsAppIcon className="relative h-7 w-7 shrink-0 text-cta-foreground md:h-6 md:w-6" />
      <span className="relative hidden whitespace-nowrap md:inline text-sm font-bold text-cta-foreground">
        Fale conosco
      </span>
    </a>
  );
}

export function WhatsAppInlineButton({ className }: { className?: string }) {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar com a XFTS no WhatsApp"
      onClick={() => trackCTAClick({ section: "whatsapp-inline", label: "WhatsApp" })}
      className={`inline-flex w-full items-center justify-center gap-2 rounded-md bg-cta px-4 py-3 text-sm font-semibold text-cta-foreground transition-colors hover:bg-cta/90 ${className ?? ""}`}
    >
      <WhatsAppIcon className="h-5 w-5" />
      Conversar no WhatsApp
    </a>
  );
}
