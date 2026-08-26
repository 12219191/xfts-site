# FLEXUS | Barbearia — implementação do lado do sistema

Stack: Vite SPA (`src/pages`, react-router) + funções de backend Supabase.
Como o domínio serve apenas o SPA, as rotas de API vivem em funções de backend.

Segredos necessários no projeto Barbearia: `FLEXUS_APP_KEY_BARBEARIA` (mesmo valor do hub).

---

## 1. Migração — tabela de vínculo com o hub

```sql
CREATE TABLE public.hub_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_user_id uuid NOT NULL UNIQUE,
  email text NOT NULL,
  user_id uuid,                      -- usuário local (auth.users.id)
  plano text,
  limite_usuarios integer,           -- null = ilimitado
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

## 2. `supabase/functions/flexus-sso/index.ts` (verify_jwt = false)

```ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const HUB = "https://xfts-flexus.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { token } = await req.json();
    if (!token) return json({ error: "token ausente" }, 400);

    const r = await fetch(`${HUB}/api/public/sso/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-flexus-app-key": Deno.env.get("FLEXUS_APP_KEY_BARBEARIA")!,
      },
      body: JSON.stringify({ token }),
    });
    const hub = await r.json();
    if (!r.ok) return json({ error: hub.error ?? "token inválido" }, 401);
    if (hub.ativo !== true) {
      return json({ error: "assinatura_inativa", status: hub.status, hub_url: `${HUB}/minha-conta` }, 403);
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const email = String(hub.email).toLowerCase();

    // 1) procura o usuário local pelo e-mail
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    let user = list?.users.find((u) => (u.email ?? "").toLowerCase() === email) ?? null;

    // 2) cria se não existir
    if (!user) {
      const { data: created, error } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { hub_user_id: hub.user_id, origem: "hub-xfts" },
      });
      if (error) return json({ error: error.message }, 500);
      user = created.user;
    }

    await admin.from("hub_accounts").upsert(
      {
        hub_user_id: hub.user_id,
        email,
        user_id: user!.id,
        plano: hub.plano,
        limite_usuarios: hub.limite_usuarios,
        status: hub.status,
        ativo: true,
        acesso_ate: hub.acesso_ate,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "hub_user_id" },
    );

    // 3) devolve um token de sessão de uso único (magic link)
    const { data: link, error: linkErr } = await admin.auth.admin.generateLink({ type: "magiclink", email });
    if (linkErr) return json({ error: linkErr.message }, 500);

    return json({
      email,
      token_hash: link.properties.hashed_token,
      plano: hub.plano,
      limite_usuarios: hub.limite_usuarios,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
```

`supabase/config.toml`:

```toml
[functions.flexus-sso]
verify_jwt = false
[functions.flexus-provision]
verify_jwt = false
```

## 3. `src/pages/Sso.tsx` + rota `/sso`

```tsx
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function Sso() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const token = params.get("token");
    if (!token) { setErro("Link de acesso inválido."); return; }
    (async () => {
      const { data, error } = await supabase.functions.invoke("flexus-sso", { body: { token } });
      if (error || data?.error) {
        setErro(data?.error === "assinatura_inativa"
          ? "Sua assinatura não está ativa. Regularize no portal XFTS."
          : "Link expirado ou já utilizado. Volte ao portal e clique em Abrir sistema novamente.");
        return;
      }
      const { error: sessErr } = await supabase.auth.verifyOtp({
        type: "magiclink", token_hash: data.token_hash,
      });
      if (sessErr) { setErro("Não foi possível criar a sessão."); return; }
      navigate("/", { replace: true });
    })();
  }, [params, navigate]);

  return (
    <main className="min-h-screen flex items-center justify-center p-6 text-center">
      {erro ? (
        <div className="space-y-4">
          <h1 className="text-xl font-semibold">Acesso bloqueado</h1>
          <p className="text-muted-foreground">{erro}</p>
          <a className="underline" href="https://xfts-flexus.com/minha-conta">Ir para o portal XFTS</a>
        </div>
      ) : (
        <p>Entrando…</p>
      )}
    </main>
  );
}
```

Registrar em `src/App.tsx`: `<Route path="/sso" element={<Sso />} />` (rota pública).

## 4. `supabase/functions/flexus-provision/index.ts` (verify_jwt = false)

```ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-flexus-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

function b64url(bytes: Uint8Array) {
  let bin = ""; for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const raw = await req.text();
  const secret = Deno.env.get("FLEXUS_APP_KEY_BARBEARIA")!;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = b64url(new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw))));
  if (!safeEqual(req.headers.get("x-flexus-signature") ?? "", expected)) {
    return json({ error: "assinatura inválida" }, 401);
  }

  const p = JSON.parse(raw);
  const idade = Date.now() - new Date(p.timestamp ?? 0).getTime();
  if (!(idade < 5 * 60_000)) return json({ error: "timestamp fora da janela" }, 401);

  const bloqueado = p.event === "canceled" || p.event === "payment_failed";
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const aindaNoPeriodo = p.acesso_ate ? new Date(p.acesso_ate).getTime() > Date.now() : false;

  await admin.from("hub_accounts").upsert({
    hub_user_id: p.user_id,
    email: p.email ?? "",
    plano: p.plano,
    limite_usuarios: p.limite_usuarios,
    status: p.status ?? p.event,
    ativo: bloqueado ? aindaNoPeriodo : true,
    acesso_ate: p.acesso_ate,
    atualizado_em: new Date().toISOString(),
  }, { onConflict: "hub_user_id" });

  return json({ ok: true });
});
```

## 5. Bloqueio e limite de usuários

- No guard de rotas autenticadas, ler `hub_accounts` do usuário: `ativo === false`
  → tela de bloqueio com link para `https://xfts-flexus.com/minha-conta` e `signOut()`.
- No convite de equipe, comparar o total de usuários ativos com `limite_usuarios`
  (`null` = ilimitado) e recusar acima do limite, indicando upgrade no hub.

## 6. Responder ao teste de conexão do hub (evento `ping`)

O painel `/admin` do hub tem um botão "Testar conexão" que envia um provisionamento
simulado, devidamente assinado, com `event: "ping"` e `dry_run: true`.

Logo após validar a assinatura (e antes de gravar qualquer coisa), a função
`flexus-provision` deve responder:

```ts
if (p.event === "ping" || p.dry_run === true) {
  return json({ ok: true, pong: true });
}
```

Sem esse trecho, o sistema costuma responder HTTP 400 ao ping. Nesse caso o hub mostra o
teste como **Parcial** (chave aceita, evento não tratado) — não é erro de credencial.
