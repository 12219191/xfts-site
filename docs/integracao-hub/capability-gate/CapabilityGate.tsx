/**
 * Colar como `src/components/CapabilityGate.tsx` em cada SaaS FLEXUS.
 * Bloqueia a tela pela capability cadastrada no Control Center e mostra a tela de
 * "recurso indisponível". Fail-closed: enquanto não houver resposta, nada aparece.
 *
 * A decisão final é sempre do backend do SaaS (requireRoute/requireCan) — este componente
 * é apresentação. Ele consulta a rota interna do próprio SaaS (/api/xfts/gate),
 * porque a chave do sistema não pode ir para o browser.
 */
import { useEffect, useState } from "react";

type State = "loading" | "allowed" | "denied";

async function checkGate(path: string): Promise<boolean> {
  const res = await fetch(`/api/xfts/gate?path=${encodeURIComponent(path)}`);
  if (res.status === 403) return false;
  if (!res.ok) return false; // fail-closed
  const data = (await res.json()) as { allowed?: boolean };
  return data.allowed === true;
}

export function CapabilityUnavailable({ reason }: { reason?: string }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h2 className="text-lg font-semibold">Recurso indisponível no seu plano</h2>
      <p className="mt-2 text-sm opacity-80">
        {reason ?? "Este recurso não está incluído no plano contratado."}
      </p>
      <a
        className="mt-4 inline-block rounded-md border px-4 py-2 text-sm font-medium"
        href="https://xfts-flexus.com/minha-conta"
        target="_blank"
        rel="noreferrer"
      >
        Ver planos e fazer upgrade
      </a>
    </div>
  );
}

export function CapabilityGate({
  path,
  children,
  fallback = null,
}: {
  path: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    let alive = true;
    checkGate(path)
      .then((ok) => alive && setState(ok ? "allowed" : "denied"))
      .catch(() => alive && setState("denied"));
    return () => {
      alive = false;
    };
  }, [path]);

  if (state === "loading") return <>{fallback}</>;
  if (state === "denied") return <CapabilityUnavailable />;
  return <>{children}</>;
}
