# Teste completo de pagamentos com Stripe — piloto FLEXUS | Casa360°

Objetivo: validar em ambiente de teste (cartões de teste, sem cobrança real) todo o ciclo de assinatura do Casa360°: compra, plano mensal e anual, limite de usuários, upgrade/downgrade, cancelamento, falha de pagamento com e-mails da XFTS e reativação.

## O que será montado

1. **Catálogo Casa360° completo (mensal + anual)**
   - Hoje só existem preços mensais (Básico R$ 99, Pro R$ 199). Enterprise é "Falar com Consultor".
   - Criar os preços anuais com 20% de desconto: Básico R$ 950/ano, Pro R$ 1.910/ano (arredondamento a confirmar na execução).
   - Adicionar o seletor mensal/anual na página do Casa360° e na comparação de planos, e permitir troca mensal ↔ anual pela área do cliente.

2. **Limite de usuários (moradores) por plano**
   - Básico = 1, Pro = 6, Enterprise = ilimitado — mesmo limite para mensal e anual.
   - O hub já envia o limite no provisionamento; será estendido para os novos preços anuais e conferido de ponta a ponta com o sistema Casa360° (bloqueio ao tentar convidar além do limite).

3. **E-mails da XFTS para falta de pagamento**
   - Régua: D+1 (primeira falha), D+3 (aviso) e D+5 (último aviso), todos com botão "Regularizar pagamento" que leva para a área do cliente.
   - Após a carência de 3 dias sem regularização, o acesso ao sistema é bloqueado e o titular recebe o e-mail de cancelamento.
   - E-mail de boas-vindas na compra e confirmação de cancelamento/reativação.
   - Envio pelo domínio de notificações já iniciado (`notify.xfts-flexus.com`), com registro de cada disparo para auditoria no /admin.

4. **Unificação do webhook**
   - Existem hoje dois handlers do mesmo evento (função de borda antiga e rota do app). Fica apenas a rota do app `/api/public/payments/webhook`, que já faz provisionamento e histórico; a função antiga é removida para evitar estado divergente.

5. **Roteiro de teste ponta a ponta (sandbox)**
   Cada passo confirma banco, painel /admin, e-mail e liberação no Casa360°:
   - Compra Básico mensal com cartão `4242…` → assinatura ativa, e-mail de boas-vindas, acesso liberado com limite 1.
   - Upgrade Básico → Pro: cobrança pró-rata imediata, limite passa a 6 na hora.
   - Downgrade Pro → Básico: agendado para a próxima renovação, limite só muda depois.
   - Troca mensal → anual e anual → mensal.
   - Falha de pagamento com cartão `4000 0000 0000 0341` → status inadimplente, régua de e-mails, bloqueio após a carência.
   - Cancelamento: acesso mantido até o fim do período pago, depois bloqueio automático.
   - Reativação antes do fim do período.
   - Assinatura duplicada / mesmo e-mail: confirmar que não cria cliente duplicado no Stripe.

6. **Checklist visível no /admin**
   Uma aba "Testes de pagamento" lista os cenários acima com o resultado de cada um (assinatura, evento gravado, e-mail enviado, provisionamento) para você acompanhar sem olhar código.

## Detalhes técnicos

- Preços anuais criados via ferramenta de preços com `lookup_key` estável: `flexus_casa360_basico_anual`, `flexus_casa360_pro_anual`. `seatsFromPriceId` e `planTierFromPriceId` em `src/lib/flexus-apps.ts` passam a reconhecê-los.
- `src/lib/product-plans.ts` ganha os preços anuais por produto; a UI (`PricingCards`, página do Casa360°, comparação) recebe o alternador mensal/anual.
- E-mails: nova tabela `public.email_log` (destinatário, tipo, assinatura, status, erro, enviado_em) com GRANTs e RLS (leitura só admin, escrita só service role). Disparo a partir do webhook (`invoice.payment_failed`, `customer.subscription.deleted`, `checkout.session.completed`) e uma rota `/api/public/dunning-cron` protegida por segredo, chamada por `pg_cron`, para os avisos D+3 e D+5 e para o bloqueio após a carência.
- Bloqueio: após a carência, `provisionApp` recebe `canceled` (limite 0) para o Casa360°, mantendo o padrão HMAC já existente.
- Webhook único na rota do app; `supabase/functions/payments-webhook` e a entrada em `supabase/config.toml` são removidas.
- Testes de UI executados com Playwright no fluxo real de checkout embutido em sandbox; eventos do Stripe conferidos pelos registros de `subscription_events`.

## Ordem de execução

1. Preços anuais + UI de mensal/anual do Casa360°.
2. Unificação do webhook e ajuste de limites por preço.
3. Régua de e-mails + cron de carência + registro no /admin.
4. Roteiro de teste completo em sandbox e relatório dos resultados.
5. Depois de aprovado no Casa360°, replicar para os demais produtos.
