# FLEXUS | CRM — implementação do lado do sistema

Stack: Vite SPA (`src/pages`, react-router) + funções de backend Supabase — igual ao Barbearia.

Segredo necessário no projeto CRM: `FLEXUS_APP_KEY_CRM`.

A implementação é idêntica à de [Barbearia](./barbearia.md), com três trocas:

1. `Deno.env.get("FLEXUS_APP_KEY_BARBEARIA")` → `Deno.env.get("FLEXUS_APP_KEY_CRM")`
   nas duas funções (`flexus-sso` e `flexus-provision`).
2. A página de SSO entra em `src/pages/Sso.tsx` e a rota `/sso` é registrada em
   `src/App.tsx` (pública, fora do guard de autenticação); após a sessão, redirecionar
   para o dashboard do CRM (`/` ou `/leads`, conforme a rota inicial atual).
3. O vínculo do titular precisa considerar o modelo multi-tenant do CRM: ao criar um
   usuário novo, criar também o tenant e o papel de `owner`; ao encontrar um usuário
   existente pelo e-mail, apenas gravar `hub_user_id`, `plano` e `limite_usuarios`
   no `hub_accounts` e manter o tenant atual.

Resumo dos artefatos:

- Migração `public.hub_accounts` (mesma SQL do Barbearia, com GRANTs e RLS).
- `supabase/functions/flexus-sso/index.ts` — troca o token no hub, casa o usuário por
  e-mail, devolve `token_hash` de magic link.
- `supabase/functions/flexus-provision/index.ts` — valida HMAC, aplica evento.
- `supabase/config.toml`: `verify_jwt = false` para as duas funções.
- Guard: `ativo === false` → bloqueio total com link para `https://xfts-flexus.com/minha-conta`.
- Convite de membros (`MembersSettings`): respeitar `limite_usuarios` do hub.

Endpoint de provisionamento já configurado no hub:
`https://awehexeiciruuqxqtdgk.supabase.co/functions/v1/flexus-provision`

---

## Captura de leads dos formulários do site (hub → CRM)

O hub envia automaticamente os leads dos formulários **contato** e **demo** para o CRM,
criando um novo lead ou atualizando um existente (upsert por e-mail **ou** telefone).

Endpoint que o CRM precisa expor:
`POST https://awehexeiciruuqxqtdgk.supabase.co/functions/v1/flexus-lead`
(`verify_jwt = false` no `supabase/config.toml`).

### Autenticação

Header `x-flexus-signature`: HMAC-SHA256 **em hexadecimal** do corpo bruto usando
`FLEXUS_APP_KEY_CRM` (mesma chave do SSO/provisionamento). Comparar em tempo constante e
recusar com 401. O formato pode ser alternado para base64url no /admin, mas o padrão é hex.

### Corpo enviado

```json
{
  "reference_id": "XF-250212-ABCDE",
  "form_type": "contato",
  "nome": "Maria Silva",
  "email": "maria@empresa.com",
  "telefone": "+55 17 99999-0000",
  "empresa": "Clínica Alfa",
  "segmento": "clinica",
  "assunto": "Planos",
  "mensagem": "Gostaria de uma demonstração",
  "tela": "/contato",
  "cta_id": "contato.form.enviar",
  "cta_label": "Enviar mensagem",
  "cta_page": "/contato",
  "cta_placement": "corpo",
  "utm_source": "google",
  "utm_medium": "cpc",
  "utm_campaign": "flexus-clinica",
  "utm_term": null,
  "utm_content": null,
  "gclid": null,
  "gbraid": null,
  "wbraid": null,
  "fbclid": null,
  "li_fat_id": null,
  "fbc": null,
  "fbp": null,
  "lt_gclid": null,
  "lt_gbraid": null,
  "lt_wbraid": null,
  "lt_fbclid": null,
  "lt_li_fat_id": null,
  "referrer": "https://www.google.com/",
  "landing_page": "https://xfts-flexus.com/produtos/clinica",
  "origem": "site-xfts",
  "timestamp": "2026-02-12T14:03:11.000Z"
}
```

> **IDs de anúncio** (`gclid`, `gbraid`, `wbraid`, `fbclid`, `li_fat_id`, `fbc`, `fbp` e os `lt_*`) são
> usados pelo CRM para devolver conversões (qualificado / venda fechada) a Google Ads, Meta e LinkedIn.
> Exigem a migration `20261013220000_form_submissions_ad_click_ids.sql` aplicada antes do deploy.
> `fbc`/`fbp` vêm dos cookies do pixel da Meta; `li_fat_id`, da URL ou do cookie do Insight Tag.

### Resposta esperada

```json
{ "lead_id": "uuid-do-lead", "action": "created" }
```

`action` deve ser `created` ou `updated`. Content-Type **precisa** ser `application/json`
— HTML é interpretado pelo hub como "endpoint ainda não implementado" e o protocolo fica
como `pending` para nova tentativa.

### Regras de deduplicação

1. Procurar lead com o mesmo e-mail (case-insensitive).
2. Se não houver, procurar pelo telefone normalizado (somente dígitos, últimos 11).
3. Encontrando, atualizar os campos vazios e registrar nova interação/nota com a mensagem
   e a origem (UTMs + botão). Não sobrescrever dados preenchidos manualmente.
4. Não encontrando, criar o lead com estágio inicial de entrada e origem `site-xfts`.

### Códigos de status

- `2xx` → hub grava `created`/`updated`.
- `400/401/403` → hub grava `failed` (não tenta de novo automaticamente; há botão de
  reenvio manual no `/admin`).
- Demais erros/timeout → `pending`, reprocessado pelo retry automático
  (`POST /api/public/crm-retry`, autenticado com a `FLEXUS_APP_KEY_CRM`).

## Teste de conexão do hub (evento `ping`)

O botão "Testar conexão" do `/admin` envia à função `flexus-provision` um payload assinado
com `event: "ping"` e `dry_run: true`. Depois de validar a assinatura, responder de imediato:

```ts
if (p.event === "ping" || p.dry_run === true) {
  return json({ ok: true, pong: true });
}
```

Enquanto isso não existir, o CRM responde HTTP 400 ao ping e o hub classifica o teste como
**Parcial** — a `FLEXUS_APP_KEY_CRM` está correta; falta apenas tratar o evento.

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

#### Ajuste recomendado na tela de login do sistema

Separar os dois caminhos de recuperação, para o titular não usar a recuperação local (ele não tem senha local):

- Bloco "Entrar pelo hub": link secundário **"Esqueci minha senha"** →
  `https://xfts-flexus.com/login?app=crm`
- Bloco "Entrar como equipe": manter o link local, com o rótulo **"Esqueci minha senha (equipe)"**.
- Linha de apoio: "É o titular da assinatura? Recupere a senha pelo hub."
