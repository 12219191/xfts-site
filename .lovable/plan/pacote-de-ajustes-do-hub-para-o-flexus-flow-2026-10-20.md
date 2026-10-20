# Pacote de ajustes do Hub para o FLEXUS | Flow

Tudo aditivo: Estética, CRM, Barbearia, Casa360 e Atende continuam iguais. A provisionUrl do Flow não é tocada. Depois de cada item implementado, mostro requisições e respostas reais (sem simulação).

## 1) Sessão de Suporte no Flow
- Recusar já, para `app=flow`, o suporte antigo (token `purpose: "support"` que entra como dono): na emissão e no `/sso/verify`, com 403 "Use a Sessão de Suporte XFTS", independente da chave estar ligada (mesma regra do Atende, que só aceita titular).
- A chave `support_session.flow` fica desligada até você confirmar que o `/support` do Flow está publicado; aí ligo e testo.
- Confirmo com requisição real que `/api/public/support-session/verify` aceita a chave do Flow e devolve `tenant_id` = id do usuário no Hub (o Flow mapeia por `workspaces.hub_user_id`).

## 2) Campo `environment` ("sandbox" | "live")
- Novo campo em `/sso/verify` e em `/entitlements` só quando `app=flow`; campos existentes não mudam.
- Escolha da assinatura do Flow: prefere a ativa; se houver sandbox e live ao mesmo tempo, devolve "live" só se a live estiver ativa, senão a sandbox ativa; nenhuma ativa → ambiente da mais recente.
- Teste unitário para essa regra e exemplos reais (sandbox com a compra de teste; live não existe hoje — mostro o caso live com o teste unitário e aviso que não há assinatura live real).

## 3) Período e teste
- Novos campos opcionais `periodo_inicio` (ISO) e `trial_fim` (ISO ou null) no `/entitlements?app=flow` e no corpo do webhook de provisionamento do Flow. Outros sistemas não recebem nada novo. Contrato em `docs/integracao-hub/README.md` atualizado.

## 4) usuarios_em_uso (só proposta, no fim)
- (a) Sistema envia ao Hub `POST` com `{ user_id, usuarios_em_uso }` assinado pela chave do app: dado em tempo real, Hub não depende do sistema estar no ar; exige trabalho em cada sistema. Esforço: Hub pequeno, cada sistema pequeno.
- (b) Hub consulta o sistema: centralizado, mas depende de endpoint novo em cada sistema, do sistema responder e de agenda de consultas. Esforço: médio no Hub e em cada sistema.
- Recomendação: (a), já existe a coluna `seats_used` para gravar.

## 5) Página do Flow
- Mantém "Em breve", sem compra pública e sem trocar a imagem.
- Marca como "em desenvolvimento": campanhas, agentes de IA, API pública, webhooks de saída e canais reais (WhatsApp, Instagram, Facebook) — na lista de recursos e na comparação de planos.

## 6) Teste de ponta a ponta (explicação, sem implementar)
- Como um admin aciona "Acessar Sistema" com a assinatura sandbox enquanto o Flow está "Em breve" (hoje o acesso é bloqueado por "disponível no Hub" desligado; descrevo a liberação só-admin equivalente à da compra de teste, a ser aprovada à parte).
- Como gerar uma Sessão de Suporte para uma empresa do Flow no painel de clientes, e a lista do que configurar (chave do app, flag, `/support` publicado), sem expor segredos.

## 7) MFA no Control Center (só proposta)
- Hoje não existe MFA no código do Hub para quem gera acesso de suporte.
- Proposta: exigir segundo fator (app autenticador) para superadmin e suporte; emissão de suporte e ações sensíveis checam nível de autenticação reforçado no servidor; tela de cadastro do fator e recuperação.

## Detalhes técnicos
- Arquivos: `src/routes/api/public/sso/verify.ts`, `src/routes/api/public/entitlements.ts`, `src/lib/sso.functions.ts` (emissão), `src/lib/provisioning.server.ts` (campos extras só para flow), novo helper `resolveFlowSub` com teste em `src/lib/__tests__`, `src/routes/produtos.flexus-flow.tsx`, `src/lib/product-plans.ts`, docs.
- Nenhuma mudança de banco nem de Stripe. Nada publicado sem sua conferência.
