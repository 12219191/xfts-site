# Verificar o 401 e deixar o motivo visível no /admin

## O que os dados mostram agora

- O último protocolo (`XF-260819-XEW4M`) está com status **Atualizado** no CRM, sincronizado às 16:43 UTC, após 3 tentativas — ou seja, o reenvio seguinte ao ajuste da assinatura funcionou. O 401 foi de uma tentativa anterior, ainda com a assinatura em base64url.
- Não existe nenhuma configuração salva na tabela de integrações: o envio está usando os padrões do código (URL do CRM, HMAC hex, chave `FLEXUS_APP_KEY_CRM` do servidor).
- Três protocolos anteriores estão como **Ignorado** — provavelmente sem e-mail/telefone ou criados antes da integração.

Importante: o site publicado ainda roda a versão antiga (base64url) até uma nova publicação. Se o 401 veio do domínio publicado, é isso.

## O que fazer

1. Publicar o site para que produção passe a assinar em hexadecimal.
2. Reenviar no /admin o protocolo que falhou e confirmar `Criado`/`Atualizado`.
3. Se ainda vier 401 depois disso, a causa é chave diferente entre os projetos: `FLEXUS_APP_KEY_CRM` no CRM precisa ter exatamente o mesmo valor salvo aqui (sem espaços/quebra de linha). Nesse caso, regerar e recolar nos dois lados.

## Melhorias para não ficar às cegas

- Guardar em `form_submissions` o corpo curto da resposta de erro (primeiros 200 caracteres), não só `HTTP 401`, e mostrar no detalhe do protocolo.
- Ao dar 401/403, exibir no /admin a dica direta: "assinatura recusada — confira se `FLEXUS_APP_KEY_CRM` é idêntica nos dois projetos".
- No botão **Enviar lead de teste** da aba Integração CRM, mostrar status HTTP, formato de assinatura usado e resposta bruta.

## Detalhes técnicos

- `src/lib/crm-lead.server.ts`: ler `await res.text()` em respostas não-ok e devolver no campo `error` (`HTTP 401 — <trecho>`), preservando a classificação atual (400/401/403 = falha permanente).
- `src/lib/crm-settings.functions.ts`: o teste de conexão retorna também `status`, `signature_encoding` e trecho da resposta.
- `src/components/admin/CrmIntegrationPanel.tsx` e `src/components/admin/FormSubmissionsPanel.tsx`: exibir esses detalhes e a dica de chave divergente.
