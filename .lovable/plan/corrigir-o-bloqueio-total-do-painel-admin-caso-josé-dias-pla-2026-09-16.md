# Corrigir o bloqueio total do painel admin (caso José Dias, plano Pro)

O teste está certo, e o problema não é o plano Pro: ele já recebe relatórios avançados e
automações. São duas falhas no cadastro/checagem que, juntas, bloqueiam tudo que é
administrativo.

## Causa 1 — o sistema pergunta ao hub como "cliente comum"

As telas do painel estão marcadas como **Administrador do cliente**. Quando o sistema
consulta o hub, ele hoje se identifica sempre como cliente comum, então o hub responde
"não liberado" para todas as telas de administrador. As telas do portal do cliente e do
profissional estão marcadas como **Cliente (todos os usuários)** — por isso só elas
passaram. É exatamente o padrão que apareceu no teste.

Correção: o sistema passa a informar o papel do usuário logado (dono/gerente = administrador
do cliente, cliente/profissional = cliente comum), e o hub passa a aceitar esse papel na
consulta.

## Causa 2 — 11 telas do cliente ficaram marcadas como internas da XFTS

Foram cadastradas com escopo **Superadmin XFTS** telas que são do próprio cliente, e por
isso nunca abririam para ninguém fora da XFTS:

- Clientes duplicados, CRM Comercial, Segurança, Usuários da barbearia (auditoria de
  agendamentos), Backup, Restaurar backup, Contratação de plano, Documentação de rotas
- Relatórios: Atendimentos, Dados 360, Proteção de agenda

Correção: essas passam para **Administrador do cliente**. Continuam válidas como internas
somente as 8 telas da Central XFTS (`/superadmin/*`).

## Causa 3 — Configurações e Backup exigem "Integrações e API"

O plano Pro não inclui esse recurso, então **Configurações**, **Backup** e **Restaurar**
ficariam bloqueadas mesmo depois das correções acima. Configurações é tela básica de
operação: passa a não exigir recurso nenhum. Backup e Restaurar continuam exigindo
Integrações e API (Enterprise) — se você preferir liberar no Pro, é um clique em
Produtos → Capabilities.

## Resultado esperado para o José Dias (Pro)

Liberado: todo o painel admin, incluindo DRE, Analytics, Dados 360, Comparecimento,
Proteção de agenda, Atendimentos, Marketing e WhatsApp Logs, além dos portais do cliente e
do profissional. Bloqueado: Backup/Restaurar (Enterprise), marca própria (Enterprise) e a
Central XFTS.

## Detalhes técnicos

- Migração única em `product_capabilities` (barbearia): `visibility_scope` de
  `XFTS_SUPERADMIN` → `TENANT_ADMIN` nas 11 chaves listadas (mantendo `xfts.*`);
  `required_entitlement_key` de `admin.settings` → `NULL`. Nada muda em planos, Stripe,
  assinaturas ou entitlements.
- `capability-check.ts`: aceitar `acting_as` `TENANT` ou `TENANT_ADMIN` do sistema chamador
  (hoje qualquer valor diferente de `TENANT` cai em `TENANT_ADMIN`, e o kit envia sempre
  `TENANT`). Escopos internos (`XFTS_SUPPORT`/`XFTS_SUPERADMIN`) continuam recusados para
  chamadas externas.
- Kit em `docs/integracao-hub/capability-gate/`: `xfts-hub-client.ts` recebe `actingAs`
  opcional em `requireCan`/`requireRoute`/`requireAction`; `gate-endpoint.ts` passa o papel
  do usuário da sessão do SaaS (nunca vindo do browser); `validate-gate.mjs` valida as duas
  vias — `TENANT` e `TENANT_ADMIN` — e falha se uma tela do painel só abrir como cliente
  comum.
- Depois de aplicar, rodar o validador com o usuário do José Dias para confirmar 200 nas
  telas do painel e 403 apenas em Backup/Restaurar, marca própria e `/superadmin/*`.
