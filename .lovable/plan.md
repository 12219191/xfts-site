# Ajustar a assinatura dos leads para o formato que o CRM espera

O endpoint do CRM já está no ar e exige a assinatura em **hexadecimal**. Hoje o hub assina o corpo em **base64url** (a mesma função usada no provisionamento dos sistemas). Do jeito que está, todo lead enviado voltaria com 401 e ficaria como "Falhou" no /admin.

## O que muda

1. Passar a enviar o `x-flexus-signature` em hexadecimal no envio de leads ao CRM.
2. Manter a assinatura do provisionamento/SSO como está hoje, para não quebrar Barbearia, CRM e Casa360 que já validam no formato atual.
3. Confirmar no /admin (aba **Integração CRM**) a URL `https://awehexeiciruuqxqtdgk.supabase.co/functions/v1/flexus-lead`, modo **Assinatura HMAC** e header `x-flexus-signature`.
4. Reenviar os protocolos que ficaram como **Pendente** — o retry automático já cuida disso, e há o botão de reenvio manual.

## Detalhes técnicos

- `src/lib/sso.server.ts`: adicionar `signBodyHex(secret, body)` (mesmo HMAC-SHA256, saída hex). `signBody` continua base64url e segue usada por `provisioning.server.ts`.
- `src/lib/crm-lead.server.ts`: usar `signBodyHex` no header de assinatura.
- `src/lib/crm-settings.ts`: nova opção `signature_encoding` (`hex` | `base64url`), padrão `hex`, para permitir ajuste sem deploy.
- `src/components/admin/CrmIntegrationPanel.tsx`: seletor de formato da assinatura ao lado do modo de autenticação.
- `docs/integracao-hub/crm.md`: registrar que a assinatura enviada é hex.

## Validação

Depois do ajuste: **Enviar lead de teste** no /admin deve retornar `created`, e o CRM deve registrar a requisição como válida na aba "Requisições do hub".
