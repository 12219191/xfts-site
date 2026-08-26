# Teste de conexão do CRM devolvendo HTTP 400

## O que o teste faz hoje

O botão "Testar conexão" envia ao endpoint de provisionamento do sistema um corpo
`{ event: "ping", produto, timestamp }`, assinado com a chave compartilhada. Hoje o painel
trata qualquer resposta diferente de 2xx como falha, sem distinguir os casos.

O CRM respondeu **400** (e não 401), ou seja: o endpoint foi alcançado e a assinatura
**não** foi recusada — o sistema simplesmente não sabe lidar com o evento `ping`, porque o
contrato documentado só prevê eventos de assinatura (`activated`, `canceled`,
`payment_failed`, ...) e espera campos como `user_id`, `plano` e `limite_usuarios`.

Observação: o diagnóstico do lado do CRM é inferido pelo código do hub e pelo contrato
documentado; a resposta do CRM não foi inspecionada. A primeira etapa abaixo confirma isso.

## Correção proposta

1. **Confirmar a causa**: registrar e exibir o trecho do corpo devolvido pelo sistema
   (primeiros ~200 caracteres) junto do status, como já é feito no envio de leads ao CRM.
   Assim o admin mostra "HTTP 400 — evento não suportado" em vez de só o número.

2. **Ping compatível com o contrato**: passar a enviar no teste um payload válido de
   provisionamento marcado como simulação — `event: "ping"`, `dry_run: true`, `user_id`
   sintético e `email` de teste — para que o sistema possa responder `{ ok: true }` sem
   gravar nada.

3. **Classificação da resposta no painel**:
   - `2xx` → conexão saudável;
   - `401/403` → chave/assinatura recusada (problema real de credencial);
   - `400/404/422` → endpoint alcançado e chave aceita, mas o sistema ainda não trata o
     evento de ping → estado "Parcial" (amarelo) em vez de "Falha" (vermelho);
   - erro de rede/timeout → falha.

4. **Documentação**: acrescentar em `docs/integracao-hub/` (README, barbearia, crm, casa360)
   o trecho que cada função `flexus-provision` deve ter logo após validar a assinatura:
   se `event === "ping"` ou `dry_run === true`, responder `{ ok: true }` e encerrar.
   Com isso, depois de aplicado no CRM, o teste passa a ficar verde.

## Detalhes técnicos

- `src/lib/reliability.server.ts` → `testAppConnection`: novo corpo do ping, leitura do corpo
  da resposta, e retorno com um campo `nivel: "ok" | "parcial" | "erro"`.
- `src/lib/reliability.functions.ts` / `src/components/admin/SsoHealthPanel.tsx`: exibir o
  novo nível e o trecho da resposta.
- `logIntegrationEvent` continua registrando o teste, agora com `status` coerente com o nível.
- Nenhuma mudança de chave/segredo é necessária: o 400 indica que a `FLEXUS_APP_KEY_CRM`
  está correta nos dois lados.
