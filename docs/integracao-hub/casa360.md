# FLEXUS | Casa360° — implementação do lado do sistema

Stack: TanStack Start — o domínio serve rotas de servidor nativamente, então
`/sso` e `/api/public/provision` ficam no próprio app.

Segredo necessário no projeto Casa360°: `FLEXUS_APP_KEY_CASA360`.

## 1. Migração — `public.hub_accounts`

```sql
CREATE TABLE public.hub_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_user_id uuid NOT NULL UNIQUE,
  email text NOT NULL,
  user_id uuid,
  plano text,
  limite_usuarios integer,
  status text NOT NULL DEFAULT 'none',
  ativo boolean NOT NULL DEFAULT false,
  acesso_ate timestamptz,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX hub_accounts_email_idx ON public.hub_accounts (lower(email));

GRANT SELECT ON public.hub_accounts TO authenticated;
GRANT ALL ON public.hub_accounts TO service_role;

ALTER TABLE public.hub_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê o próprio vínculo"
  ON public.hub_accounts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
```

## 2. `src/lib/hub.server.ts`

```ts
const HUB = "https://xfts-flexus.com";

export interface HubVerify {
  user_id: string; email: string; produto: string; plano: string | null;
  papel: string; limite_usuarios: number | null; status: string;
  ativo: boolean; acesso_ate: string | null;
}

export async function verifyHubToken(token: string): Promise<HubVerify | { error: string }> {
  const r = await fetch(`${HUB}/api/public/sso/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-flexus-app-key": process.env["FLEXUS_APP_KEY_CASA360"]! },
    body: JSON.stringify({ token }),
    signal: AbortSignal.timeout(10_000),
  });
  const data = await r.json();
  if (!r.ok) return { error: data.error ?? "token inválido" };
  return data as HubVerify;
}

const enc = new TextEncoder();
function b64url(bytes: Uint8Array) {
  let bin = ""; for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export async function hmacBase64Url(secret: string, body: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(body))));
}
export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
```

## 3. `src/lib/hub-sso.functions.ts`

```ts
import { createServerFn } from "@tanstack/react-start";

export const trocarTokenHub = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    const { verifyHubToken } = await import("@/lib/hub.server");
    const hub = await verifyHubToken(data.token);
    if ("error" in hub) return { error: hub.error };
    if (!hub.ativo) return { error: "assinatura_inativa" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = hub.email.toLowerCase();

    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    let user = list?.users.find((u) => (u.email ?? "").toLowerCase() === email) ?? null;
    if (!user) {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email, email_confirm: true, user_metadata: { hub_user_id: hub.user_id, origem: "hub-xfts" },
      });
      if (error) return { error: error.message };
      user = created.user;
    }

    await supabaseAdmin.from("hub_accounts").upsert({
      hub_user_id: hub.user_id, email, user_id: user!.id, plano: hub.plano,
      limite_usuarios: hub.limite_usuarios, status: hub.status, ativo: true,
      acesso_ate: hub.acesso_ate, atualizado_em: new Date().toISOString(),
    }, { onConflict: "hub_user_id" });

    const { data: link, error: linkErr } =
      await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email });
    if (linkErr) return { error: linkErr.message };

    return { ok: true as const, email, token_hash: link.properties.hashed_token };
  });
```

## 4. `src/routes/sso.tsx` (pública, `ssr: false`)

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { trocarTokenHub } from "@/lib/hub-sso.functions";

export const Route = createFileRoute("/sso")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({ token: String(s.token ?? "") }),
  component: Sso,
});

function Sso() {
  const { token } = Route.useSearch();
  const trocar = useServerFn(trocarTokenHub);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setErro("Link de acesso inválido."); return; }
    (async () => {
      const r = await trocar({ data: { token } });
      if ("error" in r) {
        setErro(r.error === "assinatura_inativa"
          ? "Sua assinatura não está ativa. Regularize no portal XFTS."
          : "Link expirado ou já utilizado. Volte ao portal e clique em Abrir sistema novamente.");
        return;
      }
      const { error } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: r.token_hash });
      if (error) { setErro("Não foi possível criar a sessão."); return; }
      window.location.replace("/");
    })();
  }, [token, trocar]);

  return (
    <main className="min-h-screen grid place-items-center p-6 text-center">
      {erro ? (
        <div className="space-y-4">
          <h1 className="text-xl font-semibold">Acesso bloqueado</h1>
          <p className="text-muted-foreground">{erro}</p>
          <a className="underline" href="https://xfts-flexus.com/minha-conta">Ir para o portal XFTS</a>
        </div>
      ) : <p>Entrando…</p>}
    </main>
  );
}
```

## 5. `src/routes/api/public/provision.ts`

```ts
import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-flexus-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  Response.json(b, { status: s, headers: { ...CORS, "Cache-Control": "no-store" } });

export const Route = createFileRoute("/api/public/provision")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const raw = await request.text();
        const { hmacBase64Url, safeEqual } = await import("@/lib/hub.server");
        const expected = await hmacBase64Url(process.env["FLEXUS_APP_KEY_CASA360"]!, raw);
        if (!safeEqual(request.headers.get("x-flexus-signature") ?? "", expected)) {
          return json({ error: "assinatura inválida" }, 401);
        }

        const p = JSON.parse(raw);
        if (!(Date.now() - new Date(p.timestamp ?? 0).getTime() < 5 * 60_000)) {
          return json({ error: "timestamp fora da janela" }, 401);
        }

        const bloqueado = p.event === "canceled" || p.event === "payment_failed";
        const aindaNoPeriodo = p.acesso_ate ? new Date(p.acesso_ate).getTime() > Date.now() : false;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.from("hub_accounts").upsert({
          hub_user_id: p.user_id, email: p.email ?? "", plano: p.plano,
          limite_usuarios: p.limite_usuarios, status: p.status ?? p.event,
          ativo: bloqueado ? aindaNoPeriodo : true, acesso_ate: p.acesso_ate,
          atualizado_em: new Date().toISOString(),
        }, { onConflict: "hub_user_id" });

        return json({ ok: true });
      },
    },
  },
});
```

## 6. Bloqueio total e assentos

- No layout `_authenticated`, carregar `hub_accounts` do usuário; `ativo === false`
  → tela de bloqueio + `signOut()` + link para `https://xfts-flexus.com/minha-conta`.
- Convite de membros: recusar acima de `limite_usuarios` (`null` = ilimitado).
