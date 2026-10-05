import type { ReactNode } from "react";
import { Lock, X } from "lucide-react";

interface Props {
  onClose: () => void;
  children: ReactNode;
}

/** Casca responsiva do checkout: rola em telas baixas e mantém o fechar sempre visível. */
export function CheckoutModal({ onClose, children }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-2 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Finalizar assinatura"
    >
      <div className="flex min-h-full items-start justify-center sm:items-center">
        <div className="relative flex w-full max-w-xl flex-col overflow-hidden rounded-xl bg-background shadow-2xl md:max-w-2xl max-h-[calc(100dvh-1rem)] sm:max-h-[min(92dvh,900px)]">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-2">
              <Lock className="h-4 w-4 shrink-0 text-primary" />
              <h2 className="truncate text-base font-semibold text-foreground">Finalizar assinatura</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar checkout"
              className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-muted"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-4 sm:px-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
