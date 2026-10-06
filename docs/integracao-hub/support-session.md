# Sessão de Suporte XFTS — contrato para os produtos FLEXUS

O atendente XFTS entra no seu sistema **com identidade própria**, nunca como o admin do cliente.
O papel interno (`XFTS_SUPPORT` = somente leitura, `XFTS_SUPERADMIN` = leitura e escrita)
só vale quando vem desta sessão assinada pelo Hub. `acting_as` interno enviado pelo seu
backend continua recebendo **403**.

Rollout: cada sistema só passa a receber sessões novas quando a XFTS liga a chave
"Sessão de Suporte XFTS" para ele no Control Center (Clientes). Até lá, o fluxo antigo
continua. Implemente tudo abaixo **antes** de pedir a ativação.

Todas as chamadas: `POST https://xfts-flexus.com/api/public/support-session/<rota>`,
header `x-flexus-app-key: <sua chave>`, corpo JSON. A sessão só é aceita com a chave
do sistema dono dela **e** o `tenant_id` dela; qualquer divergência = 403.

| Rota | Corpo | Resposta |
|---|---|---|
| `verify` | `{ token }` | 200 `{ session_id, actor{id,email,display_name}, role, can_write, tenant_id, app, ticket, session_expires_at, capabilities[], entitlements }` · 401 inválido/expirado/reuso · 403 outro sistema/tenant sem assinatura |
| `status` | `{ session_id, tenant_id }` | 200 `{ active, state, role, can_write, session_expires_at, ended_reason }` |
| `end` | `{ session_id, tenant_id }` | 200 `{ ok: true }` |
| `audit` | `{ session_id, tenant_id, action, resource?, detail? }` | 200 `{ allowed: true }` · 403 somente leitura |

Também aceitam `support_session_id`:
- `POST /api/public/capability-check` (`{ app, user_id: <tenant_id>, capability, support_session_id }`)
- `GET /api/public/entitlements?app=..&user_id=<tenant_id>&support_session_id=..` (acrescenta `support{}` e as capabilities XFTS, como o Dados 360)

## O que implementar

1. **Rota `/support`** com header `Referrer-Policy: no-referrer`. O token chega no
   **fragmento** (`/support#token=...`), nunca na query:

```ts
// página /support (cliente)
const token = new URLSearchParams(location.hash.slice(1)).get("token");
history.replaceState(null, "", location.pathname); // limpa a URL na hora
if (!token) showError("Acesso de suporte inválido ou expirado");
else await fetch("/api/support/open", { method: "POST", body: JSON.stringify({ token }) });
```

```ts
// backend do produto: /api/support/open
const r = await fetch("https://xfts-flexus.com/api/public/support-session/verify", {
  method: "POST",
  headers: { "content-type": "application/json", "x-flexus-app-key": process.env.FLEXUS_APP_KEY! },
  body: JSON.stringify({ token }),
});
if (!r.ok) return deny("Acesso de suporte inválido ou expirado");
const s = await r.json();
// sessão LOCAL separada (não cria nem reaproveita usuário do tenant)
createSupportSession({
  sessionId: s.session_id, tenantId: s.tenant_id, role: s.role, canWrite: s.can_write,
  displayName: s.actor.display_name, capabilities: s.capabilities,
  expiresAt: s.session_expires_at, // máx. 60 min
});
```

2. **Identidade:** mostre `display_name` ("Nome (XFTS Suporte)") em todo lugar do usuário
   logado e nos seus logs. Nunca o nome do admin do cliente.
3. **Faixa fixa** no topo: "Sessão de suporte XFTS · <papel> · expira em mm:ss" com botão
   **Encerrar** → `end` + apagar a sessão local.
4. **Revalidação** a cada 60 s e antes de cada escrita (`status`). `active=false` → encerrar na hora.
5. **Capabilities:** envie `support_session_id` no capability-check (nunca `acting_as` interno).
   Telas XFTS (ex.: Dados 360) aparecem só se vierem em `capabilities`.
6. **Escrita:** `XFTS_SUPPORT` é somente leitura — bloqueie no backend. Com `XFTS_SUPERADMIN`,
   chame `audit` **antes** de gravar; se não vier 200, cancele a escrita.

## Checklist de aceite
- [ ] Link com `?token=` é ignorado; só `#token=` funciona e some da barra de endereço.
- [ ] Segundo uso do mesmo link → "inválido ou expirado".
- [ ] Usuário exibido = "Nome (XFTS Suporte)".
- [ ] Faixa + Encerrar visíveis em todas as telas; Encerrar derruba a sessão.
- [ ] Revogar no Control Center derruba a sessão em até 60 s.
- [ ] Suporte (leitura) não consegue salvar nada; superadmin salva e aparece na auditoria do Hub.
- [ ] Após 60 min a sessão termina sozinha.
