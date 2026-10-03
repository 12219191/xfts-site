# Auditoria técnica do XFTS Launchpad / Control Center (3 out 2026)

Somente leitura. Nada foi alterado. Fontes: código em `src/`, 44 migrações, leituras no banco e linter do banco (sem alertas).
Legenda: IMPLEMENTADO | PARCIAL | AUSENTE | NÃO VERIFICADO.

## 1. Funcionalidades implementadas e utilizáveis

- **Site público.** IMPLEMENTADO. Home, `/produtos/*` (6 páginas), comparar planos, `/contato`, blog (`blog.*`), páginas legais, `sitemap.xml` e head/SEO por rota.
- **Catálogo.** IMPLEMENTADO.
  - Dados em `catalog_products` (6 produtos) e `catalog_plans` (18 planos).
  - Flags `show_on_website`, `available_for_purchase` e `available_in_hub`.
  - Leitura em `catalog.server.ts`; edição em `admin.produtos` e `CatalogPanel`.
- **Checkout e assinaturas.** IMPLEMENTADO.
  - Checkout embutido: `checkout.tsx`, `checkout.functions.ts`, `stripe.server.ts`.
  - Webhook: `api/public/payments/webhook.ts` → `payments-webhook.server.ts`.
  - Tela `/minha-conta`: portal Stripe, faturas, cancelamento e upgrade/downgrade.
- **Admin.** IMPLEMENTADO. Rotas `admin.*`: dashboard, clientes, assinaturas, cobrança, financeiro, cortesias, promoções, produtos, conteúdo, leads, integrações, equipe e auditoria.
  - Controle de acesso por módulo com `requireAdminModule`, presente em 44 pontos dos `*.functions.ts`.
- **Entitlements e capabilities.** IMPLEMENTADO no hub.
  - `entitlements.server.ts`, `capabilities.server.ts` e `authz.server.ts`.
  - Banco: 131 capabilities e 177 recursos.
  - Endpoints públicos: `/api/public/entitlements`, `/capability-check`, `/capability-routes` e `/catalog`.
- **Rotinas automáticas.** IMPLEMENTADO.
  - 5 jobs agendados (pg_cron): dunning, reliability, email-queue, crm-retry e apply-blog-schedule.
  - `cron_runs` tem cerca de 28 mil execuções e zero falhas; a última foi hoje às 11:20 UTC.
- **Leads → FLEXUS CRM.** IMPLEMENTADO (`crm-lead.server.ts`, HMAC).
  - Os 7 envios registrados estão em created, updated ou skipped; nenhum falhou.
- **Auditoria.** IMPLEMENTADO. `admin_audit_log` (63 registros) via `recordAudit`, com tela em `admin.auditoria`.

## 2. Parcial, dependente de configuração ou sem fluxo completo

- **Pagamento live.** PARCIAL.
  - As 5 assinaturas live são cortesias. Nenhuma assinatura paga em produção.
  - Pagamentos de verdade aparecem só em sandbox (3 ativas e 2 canceladas).
  - Último evento do Stripe recebido: 19/09. O fluxo pago em produção não foi exercitado.
- **Provisionamento.** PARCIAL.
  - Barbearia, CRM e Casa360 têm `provisionUrl` em `flexus-apps.ts`. Clínica, Estética e ABA têm `url: ""`.
  - Só 2 provisionamentos com sucesso em 30 dias.
- **Chaves de sistema.** PARCIAL.
  - Barbearia, CRM, Casa360 e Estética têm chave (`appApiKey`). Clínica e ABA não têm, então qualquer chamada delas recebe 401.
  - Estética tem chave, mas segue em status development e sem URL.
- **SSO.** PARCIAL.
  - Emissão e verificação funcionam (15 emissões e 27 verificações em 30 dias).
  - 5 negativas por "sistema indisponível" (produto fora do hub).
- **Capability gate nos SaaS.** PARCIAL.
  - O hub responde: 793 respostas 200 e 127 respostas 403 em 30 dias.
  - A instalação nos SaaS é externa, via kit em `docs/integracao-hub/capability-gate/`.
  - O Barbearia ainda envia `acting_as` fixo, com patch pendente no outro projeto.
- **Correção do capability-check.** PARCIAL. `capability-check.ts` e o teste estão só no preview, não publicados. Em produção vale a regra antiga, que trata qualquer valor diferente de TENANT como administrador.
- **E-mail transacional.** PARCIAL.
  - Fila e templates existem (`email-templates/`: boas-vindas, convite, pagamento falhou, trial terminando, alerta).
  - Só 2 envios na história. Domínio de envio: NÃO VERIFICADO.
- **Zapier.** PARCIAL. `zapier.functions.ts` depende de `ZAPIER_WEBHOOK_URL` e convive com o envio direto ao CRM: dois destinos para leads.
- **Convites de equipe e assentos.** PARCIAL. `account_invites` tem 8 convites; `/api/public/seats-usage` depende de o SaaS reportar o uso.
- **Impersonação de suporte.** PARCIAL.
  - Há emissão de token com finalidade "support" e auditoria (`admin-customers.*`).
  - O escopo XFTS_SUPPORT só vale nas rotas do hub. Pelo capability-check externo, staff XFTS não é reconhecido.
- **Reembolsos.** IMPLEMENTADO no código, mas nunca usado (`finance_refunds` está vazia).

## 3. Planejado ou documentado, mas ausente

- **Prova do usuário da sessão no capability-check.** AUSENTE. A proposta de contrato v2 (`actor_assertion`) não foi implementada.
- **Migração dos SaaS de `hasEntitlement` para `can()`.** AUSENTE do lado dos SaaS; a decisão é externa.
- **Add-ons no catálogo.** AUSENTE: `/catalog` devolve `addons: []`.
- **Clínica, Estética e ABA operacionais.** AUSENTE: sem URL, sem provisionamento e sem venda.
- **E2E de checkout → provisionamento → card do cliente.** AUSENTE.
- **Ajustes de escopo pendentes.** AUSENTE: 6 capabilities do Barbearia ainda estão como XFTS_SUPERADMIN no banco, entre elas `reports.data_360` e `admin.backup`.

## 4. Integrações externas

| Integração | Estado | Evidência |
|---|---|---|
| Stripe sandbox | IMPLEMENTADO | webhook e assinaturas sandbox |
| Stripe live | PARCIAL | só cortesias; sem evento desde 19/09 |
| FLEXUS CRM (leads) | IMPLEMENTADO | 7 envios sem falha |
| SSO hub → SaaS | IMPLEMENTADO (3 apps) | `sso.server.ts`, `sso_tokens` |
| Provisionamento | PARCIAL | 3 de 6 apps com URL |
| Capability API | IMPLEMENTADO no hub | `integration_events` |
| E-mail | PARCIAL | 2 envios |
| Zapier | PARCIAL | depende de secret |
| Edge function `get-stripe-price` | Legado | `supabase/functions` (padrão antigo) |

## 5. Autenticação, permissões, impersonação, multi-tenant e auditoria

- **Login.** IMPLEMENTADO: e-mail/senha e Google; reset em `reset-password.tsx`.
- **Papéis do admin.** IMPLEMENTADO: `admin_roles` (2) com `admin_users` legado (1). `private.is_admin` reconhece os dois.
- **Multi-tenant.** PARCIAL.
  - O tenant é o titular da assinatura (`subscriptions.user_id`). Não existe tabela de tenant nem de membros com papel.
  - Membros só existem via `account_invites`.
- **Papel dentro do tenant.** Hoje é afirmado pelo SaaS. O hub não consegue verificá-lo (limite documentado em `capability-check.ts`).
- **Auditoria.** IMPLEMENTADO para ações administrativas. Chamadas de integração vão para `integration_events`.

## 6. Banco de dados

- **Regras de acesso.** RLS ativo em todas as tabelas listadas; linter sem alertas. Várias tabelas são só para o servidor, com escrita negada a usuários.
- **Volumes:** subscriptions 10, webhook_events 4, provision_queue sem pendências, email_queue sem pendências, dunning_state sem casos abertos, blog 15, form_submissions 7.
- **Ponto de atenção.** `cron_runs` cresce cerca de 900 linhas por dia, sem limpeza: NÃO VERIFICADO se existe rotina de limpeza.

## 7. Testes

- 5 arquivos de teste:
  - `src/lib/__tests__/` (email-queue, entitlements, provision-queue, stripe-webhook);
  - `src/lib/capability-check.test.ts`.
- **Não testados:** checkout de ponta a ponta, SSO, RBAC do admin, impersonação, dunning, CRM, catálogo público, regras de acesso do banco, upgrade/downgrade.
- Não há testes de interface ou de navegador ativos, apesar de existir `playwright.config.ts`.

## 8. Bugs, riscos e débitos

1. Em produção, o capability-check aceita qualquer `acting_as` diferente de TENANT como administrador. A correção existe só no preview.
2. O hub não tem prova do ator: com uma chave de SaaS válida é possível declarar TENANT_ADMIN.
3. `flexus-apps.ts` fixa URLs de provisionamento em código, com dois endpoints direto em backends de outros projetos.
4. Dois caminhos para leads (Zapier e CRM direto).
5. Edge function legada `get-stripe-price`, fora do padrão atual.
6. Dados de capabilities inconsistentes com o que foi combinado: 6 escopos do Barbearia.
7. Pendências antigas da revisão de segurança: NÃO VERIFICADO nesta auditoria.
8. Fluxo pago em produção nunca exercitado.

## 9. Bloqueios para produção

- Publicar a correção do capability-check, coordenando com os SaaS para enviarem o papel correto.
- Patch do Barbearia (`acting_as` real) aplicado e publicado.
- Uma compra live real (ou de teste controlado) validada: pagamento → webhook → provisionamento → acesso.
- Chaves e URLs para Clínica, Estética e ABA antes de liberar esses produtos.
- Domínio de e-mail verificado.

## 10. Checklist priorizado

1. Publicar a correção do capability-check junto com a atualização do Barbearia e do Casa360 (enviar TENANT_ADMIN para dono/admin).
2. Corrigir os 6 escopos do Barbearia no banco, após decisão sobre Dados 360 e backup.
3. Executar e documentar um E2E live: compra, provisionamento, SSO, capability e cancelamento.
4. Verificar o domínio de e-mail e testar os 5 templates.
5. Definir e implementar o contrato v2 de prova do ator.
6. Cadastrar chaves e URLs de Clínica, Estética e ABA, ou manter os três ocultos do hub.
7. Escolher um único destino de leads (CRM ou Zapier).
8. Tirar a edge function legada e as URLs de provisionamento do código, movendo-as para o catálogo.
9. Criar a rotina de limpeza de `cron_runs` e `integration_events`.
10. Ampliar testes: SSO, RBAC do admin, impersonação, dunning e checkout.
11. Rever os alertas da revisão de segurança.
