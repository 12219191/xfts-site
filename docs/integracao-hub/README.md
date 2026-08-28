# Contrato de integração — hub XFTS ↔ sistemas FLEXUS

Hub: `https://xfts-flexus.com` (este projeto). Sistemas: Barbearia (`xfts-flexus6.com`),
CRM (`xfts-flexus7.com`), Casa360° (`xfts-flexus8.com`).

Cada sistema tem uma chave própria, já configurada nos dois lados:
`FLEXUS_APP_KEY_BARBEARIA`, `FLEXUS_APP_KEY_CRM`, `FLEXUS_APP_KEY_CASA360`.

## 1. Entrada do titular (SSO)

O hub redireciona para `https://<sistema>/sso?token=<jwt>` (HS256, 2 minutos, uso único).

O sistema troca o token no hub:

```
POST https://xfts-flexus.com/api/public/sso/verify
x-flexus-app-key: <chave do sistema>
content-type: application/json

{ "token": "<jwt>" }
```

Resposta `200`:

```json
{
  "user_id": "uuid do titular no hub",
  "email": "lbruttin@xfts.com.br",
  "produto": "barbearia",
  "plano": "Pro",
  "papel": "owner",
  "limite_usuarios": 6,
  "status": "active",
  "ativo": true,
  "acesso_ate": "2026-09-16T00:00:00Z",
  "cancelamento_agendado": false
}
```

Erros `401`: token inválido/expirado, token já utilizado, chave de API inválida.

Regras do lado do sistema:

- `ativo !== true` → **bloqueio total**: não cria sessão, mostra aviso e link para
  `https://xfts-flexus.com/minha-conta`.
- Buscar o usuário local **pelo e-mail**; se existir, vincular (não duplicar);
  se não existir, criar.
- Guardar `hub_user_id`, `plano`, `limite_usuarios`, `status`, `acesso_ate`.

## 2. Provisionamento (webhook do hub)

O hub envia, a cada mudança de assinatura:

```
POST <endpoint de provisionamento do sistema>
x-flexus-signature: base64url(HMAC-SHA256(FLEXUS_APP_KEY_<APP>, corpo cru))
content-type: application/json

{
  "event": "created" | "updated" | "canceled" | "payment_failed",
  "user_id": "...", "produto": "barbearia", "plano": "Pro",
  "limite_usuarios": 6, "price_id": "gestao_barbearias_pro_mensal",
  "status": "active", "acesso_ate": "2026-09-16T00:00:00Z",
  "environment": "sandbox", "timestamp": "2026-08-17T20:00:00.000Z"
}
```

O sistema **precisa responder JSON** (`{"ok":true}`) — o hub trata HTML de SPA como falha.
Validar assinatura em tempo constante e rejeitar `timestamp` com mais de 5 minutos.

Endpoints configurados no hub (`src/lib/flexus-apps.ts`):

| Sistema | Endpoint |
| --- | --- |
| Barbearia | `https://xqosihkaxmgjrrtfrscm.supabase.co/functions/v1/flexus-provision` |
| CRM | `https://awehexeiciruuqxqtdgk.supabase.co/functions/v1/flexus-provision` |
| Casa360° | `https://xfts-flexus8.com/api/public/provision` |

## 3. Revalidação periódica

```
GET https://xfts-flexus.com/api/public/entitlements?app=<key>&user_id=<uuid>
x-flexus-app-key: <chave do sistema>
```

Devolve `{ ativo, status, plano, papel, limite_usuarios, acesso_ate, cancelamento_agendado }`.
Recomendado a cada login e uma vez por dia; `ativo === false` → bloquear.

## Implementação por sistema

- [Barbearia](./barbearia.md) — SPA (Vite) + funções de backend
- [CRM](./crm.md) — SPA (Vite) + funções de backend
- [Casa360°](./casa360.md) — TanStack Start (rotas nativas)

## Teste de conexão (evento `ping`)

Todos os sistemas devem tratar, no endpoint de provisionamento, o evento de teste enviado
pelo hub: payload assinado com `event: "ping"` e `dry_run: true`. Resposta esperada:
`{ "ok": true, "pong": true }` em JSON, sem gravar dados.

Classificação no `/admin`:

- `2xx` JSON → conexão saudável;
- `401/403` → chave/assinatura recusada;
- `400/404/422` → chave aceita, evento de teste ainda não tratado (**Parcial**);
- timeout/erro de rede → falha.

## Política de entrada (a partir de 08/2026)

Toda a cobrança e a titularidade vivem no hub (`xfts-flexus.com`). Por isso os sistemas
**não têm autocadastro**: criar conta direto no sistema gera usuário sem assinatura,
sem plano e sem assento.

Três blocos na tela de login de cada sistema:

1. **Entrar pelo hub** (botão primário — titular):
   `https://xfts-flexus.com/login?redirect=%2Fminha-conta&app=<key>`
   O hub autentica e, quando a assinatura está ativa, redireciona de volta ao sistema
   já com o token de SSO. `<key>` = `barbearia` | `crm` | `casa360`; valores desconhecidos
   são ignorados pelo hub.
2. **Entrar como equipe** (e-mail + senha local): mantido, **sem link de "criar conta"**.
   Contas de equipe só nascem por convite do titular dentro do sistema, respeitando
   `limite_usuarios` devolvido pelo hub.
3. **Quero assinar** (visitante sem conta): link para a landing do produto no hub.

Regras complementares:

- Remover o `signUp` público (UI e backend). Criação de usuário apenas por service role,
  no fluxo `/sso` e no aceite de convite.
- Recuperação de senha local continua para a equipe; o titular recupera no hub.
- `ativo !== true` vindo do hub bloqueia titular **e** equipe, com link para
  `https://xfts-flexus.com/minha-conta`.
- O portal do cliente final por token (WhatsApp) segue local ao sistema, fora do SSO,
  e nunca pode ser trocado por sessão administrativa.

### Recuperação de senha

- **Titular:** sempre no hub — `https://xfts-flexus.com/login?app=<key>` → "Esqueci minha senha".
  O link do e-mail volta para `https://xfts-flexus.com/reset-password?app=<key>` e, depois de
  salvar a nova senha, o hub abre o sistema por SSO automaticamente.
- **Equipe:** recuperação local do próprio sistema (e-mail + senha), sem passar pelo hub.
- **Primeiro acesso de conta criada pela empresa:** usar o mesmo fluxo de "Esqueci minha senha"
  para definir a primeira senha.

#### Ajuste recomendado na tela de login dos sistemas

- Bloco "Entrar pelo hub": link secundário "Esqueci minha senha" →
  `https://xfts-flexus.com/login?app=<key>`
- Bloco "Entrar como equipe": manter o link local, rotulado "Esqueci minha senha (equipe)".
- Linha de apoio: "É o titular da assinatura? Recupere a senha pelo hub."
