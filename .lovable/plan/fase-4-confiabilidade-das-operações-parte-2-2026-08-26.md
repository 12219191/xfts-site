# Fase 4 — Confiabilidade das operações (parte 2)

A Fase 3 trouxe visibilidade do SSO e reenvio automático do provisionamento. A Fase 4 fecha os
pontos que hoje ainda podem falhar em silêncio: e-mails, rotinas agendadas e alertas.

## Situação atual (verificada)

- Existem 3 rotinas agendadas ativas: blog (5 min), cobrança (a cada hora) e confiabilidade
  (5 min). Todas com execuções bem-sucedidas.
- A rotina de reenvio de leads ao CRM (`/api/public/crm-retry`) **existe no código mas não está
  agendada** — leads que falham hoje só são reenviados se alguém clicar manualmente no admin.
- As chamadas agendadas são "dispare e esqueça": se o endpoint responder erro (401, 500), o banco
  registra a chamada, mas nada no painel avisa. Só descobrimos olhando os efeitos.
- E-mails de cobrança são enviados direto, sem fila: se o serviço de e-mail falhar naquele
  instante, o registro fica com status de erro e o e-mail nunca é reenviado.
- Não há tabela de fila de e-mails nem histórico de execuções das rotinas.

## O que a Fase 4 entrega

### 1. Fila de e-mails com reenvio automático
- Nova tabela `email_queue`: destinatário, template, dados, tentativas, próxima tentativa, status
  e último erro.
- Todo e-mail (cobrança D+1/D+3/D+5 e alertas internos) passa a ser enfileirado e enviado pela
  fila, com chave de idempotência para nunca enviar duas vezes o mesmo aviso.
- Falha de envio agenda nova tentativa com espera crescente (1min, 5min, 15min, 1h, 6h — até 6
  tentativas). Destinatário bloqueado/suprimido é marcado como "não enviável" sem retentativa.
- Painel "E-mails" no admin: fila, entregues, falhos, botão de reenviar agora e de descartar com
  motivo (auditado).

### 2. Monitor de rotinas agendadas
- Nova tabela `cron_runs`: cada rotina registra início, fim, duração, resultado e erro.
- Os quatro endpoints agendados (cobrança, confiabilidade, blog, CRM) passam a registrar sua
  execução nessa tabela.
- Painel "Rotinas" no admin: última execução de cada rotina, se está atrasada (ex.: confiabilidade
  sem rodar há mais de 20 min), taxa de sucesso dos últimos dias e botão "Executar agora".
- Agendamento da rotina de reenvio de leads ao CRM, hoje ausente (a cada 10 min).

### 3. Alertas que chegam a quem precisa
- Regras de alerta centralizadas: rotina atrasada, e-mail preso na fila, webhook de pagamento
  falho, provisionamento esgotado, sistema FLEXUS indisponível.
- Alerta imediato por e-mail interno quando uma regra crítica dispara (com anti-repetição: no
  máximo 1 e-mail por regra a cada 6 horas), somado ao resumo diário que já existe.
- Faixa de status no topo do Control Center mostrando "tudo em ordem" ou os problemas ativos, com
  link direto para o painel correspondente.

### 4. Endpoint público de saúde
- `/api/public/health` retornando um resumo objetivo (rotinas em dia, fila de e-mails, webhooks,
  sistemas) para monitoramento externo, sem expor dados de clientes.

### 5. Testes de ponta a ponta
- Testes cobrindo: reenvio de e-mail com espera crescente e esgotamento; idempotência (mesmo aviso
  duas vezes = um envio); detecção de rotina atrasada; anti-repetição dos alertas; e o encadeamento
  falha de pagamento → e-mail → fila → alerta.

## Detalhes técnicos

- Banco: `email_queue` (idempotency_key único, status, attempts, next_attempt_at, last_error) e
  `cron_runs` (job, started_at, finished_at, ok, result jsonb, error). GRANTs + RLS: leitura só
  para admins via `private.is_admin`, escrita só pelo `service_role`.
- `src/lib/email-queue.server.ts`: `enqueueEmail`, `flushEmailQueue`, `retryEmailItem`,
  `discardEmailItem`. `src/lib/dunning.server.ts` e `sendDailyOperationalDigest` passam a chamar
  `enqueueEmail`.
- `src/lib/cron-monitor.server.ts`: `recordCronRun` (envolve cada handler agendado) e
  `buildCronHealth`. `src/lib/reliability.server.ts` ganha as regras de alerta e o controle
  anti-repetição (chave em `app_settings`).
- Novas rotas: `src/routes/api/public/email-queue-flush.ts` e `src/routes/api/public/health.ts`;
  agendamento novo para `crm-retry` e para o flush da fila via `pg_cron` + `verify_cron_key`.
- Admin: `src/components/admin/EmailQueuePanel.tsx` e `CronHealthPanel.tsx`, expostos em
  `src/routes/admin.integracoes.tsx`; faixa de status em `src/routes/admin.route.tsx` (ou layout
  equivalente) alimentada por `buildOperationalAlerts`.
- Testes em `src/lib/__tests__/email-queue.test.ts` e `cron-monitor.test.ts`, no mesmo padrão de
  mock já usado nos testes atuais.

Nada muda para o cliente final nem nas APIs dos sistemas FLEXUS.
