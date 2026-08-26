# Control Center — Fase 3: confiabilidade das operações (começando pelo SSO)

Hoje, quando algo falha entre o hub e os sistemas FLEXUS, ninguém fica sabendo. O provisionamento só registra um evento de texto na trilha (`provisionamento_falhou`) e nunca tenta de novo; as chamadas de SSO e de revalidação de acesso feitas pelos sistemas (verificação de token e consulta de recursos) não deixam nenhum registro consultável; e um webhook do Stripe que falha fica marcado como falha, sem forma de reprocessar pelo painel.

Esta fase transforma essas integrações em algo observável, com nova tentativa automática e ação manual no Control Center.

## 1. Saúde do SSO (prioridade)

Nova aba **Integrações → Saúde do SSO** com:

- Últimos acessos por sistema (Barbearia, CRM, Casa360): quem entrou, quando, sucesso ou motivo da recusa (token expirado, token já usado, chave de API inválida, assinatura bloqueada, sistema indisponível).
- Contadores das últimas 24h por sistema: acessos concedidos, recusas por motivo e tempo médio de resposta.
- Semáforo por sistema: verde quando houve troca de token com sucesso recentemente, amarelo quando só houve recusas, vermelho quando o sistema não responde ou a chave está inválida.
- Botão **Testar conexão** por sistema: dispara uma verificação de ponta a ponta (chave configurada, endpoint responde, formato de resposta correto) e mostra o resultado na hora, sem afetar clientes.
- Limpeza automática dos links de acesso único já expirados, para a tabela não crescer sem controle.

Todo acesso gerado no hub e toda troca de token/consulta de recursos feita pelos sistemas passa a ser registrada — sem gravar o token em si.

## 2. Provisionamento com nova tentativa automática

- Toda notificação enviada a um sistema (nova assinatura, mudança de plano, cancelamento, falha de pagamento) passa a ter registro próprio com estado: pendente, entregue ou falhou.
- Falha entra em fila e é reenviada automaticamente com espera crescente (1 min, 5 min, 15 min, 1 h, 6 h), até 6 tentativas.
- Painel **Provisionamento** mostra a fila com cliente, sistema, evento, tentativas, último erro e botões **Reenviar agora** e **Descartar** (ambos auditados).
- Se um item esgotar as tentativas, entra no bloco de alertas do dashboard.

## 3. Reprocessar webhooks do Stripe pelo painel

- Na tela de Webhooks, cada evento com falha ganha o botão **Reprocessar**: o hub busca o evento original na Stripe pelo identificador e roda o processamento novamente.
- A deduplicação já implantada continua valendo: o reprocesso é uma ação explícita e registrada, e reentregas automáticas seguem ignoradas.
- Ação restrita a Superadmin, com registro na auditoria.

## 4. Alertas

- Resumo diário por e-mail para a equipe interna quando, nas últimas 24h, houver: webhook com falha, provisionamento esgotado, sistema FLEXUS fora do ar ou chave de API recusada.
- Os mesmos avisos aparecem no bloco "Atenção" do dashboard do Control Center, com link direto para a tela correspondente.

## 5. O que não muda

- Nada muda para o cliente final: preços, planos, checkout, cobrança e área do cliente seguem iguais.
- Os contratos das APIs usadas pelos sistemas FLEXUS continuam idênticos — nenhum ajuste necessário do lado deles.

## Detalhes técnicos

- Migração: `public.integration_events` (app_key, kind: `sso_issue|sso_verify|entitlements|provision|test`, status, http_status, error, user_id, duration_ms, environment, created_at + índices por app/kind/created_at) e `public.provision_queue` (user_id, app_key, event, price_id, payload jsonb, attempts, next_attempt_at, status, last_error, environment). GRANT: `SELECT` para `authenticated` (leitura via `private.is_admin`), `ALL` para `service_role`; RLS com policies de admin + service_role. Índice parcial em `provision_queue(next_attempt_at)` para itens pendentes.
- Instrumentação: `src/lib/sso.functions.ts` (emissão), `src/routes/api/public/sso/verify.ts` e `src/routes/api/public/entitlements.ts` gravam em `integration_events` por um helper `logIntegrationEvent` novo em `src/lib/integration-log.server.ts` (nunca lança, nunca bloqueia a resposta).
- `src/lib/provisioning.server.ts`: `provisionApp` passa a enfileirar em `provision_queue` quando falha e a marcar entregue quando dá certo; nova `retryProvisionQueue()` para o sweep.
- Novo endpoint `src/routes/api/public/provision-retry.ts` protegido por `verify_cron_key` (mesmo padrão de `crm-retry.ts` e `payments/dunning.ts`), agendado no `pg_cron` a cada 5 minutos; a migração cria a chave em `private.cron_config`.
- Reprocesso de webhook: `src/lib/admin-webhooks.functions.ts` com `requireSupabaseAuth` + checagem de papel superadmin, usando `createStripeClient(env).events.retrieve(id)` e `handleStripeEvent`; grava `attempts`/`status` em `webhook_events` e chama `recordAudit`.
- UI: `src/components/admin/SsoHealthPanel.tsx` e `ProvisionQueuePanel.tsx`, plugados em `/admin/integracoes`; botão de reprocessar em `WebhooksPanel.tsx`; alertas somados ao dashboard existente.
- Limpeza: `delete from sso_tokens where expires_at < now() - interval '7 days'` no mesmo sweep de 5 minutos.
- Testes: casos novos em `src/lib/__tests__` para fila de provisionamento (backoff, esgotamento, sucesso após retry) e para o reprocesso idempotente de webhook.
