# Webhook do Zapier no servidor

## Objetivo

Hoje a URL do webhook fica salva no navegador de quem configurou (localStorage), então formulários
enviados por outros visitantes falham. Passar a URL para um segredo no servidor, de modo que todo
envio funcione para qualquer visitante e a URL não fique exposta no navegador.

## O que muda para você

- Você me informa a URL do webhook uma única vez; ela é guardada como segredo do projeto.
- Some o ícone de engrenagem ao lado dos formulários (Contato, Exclusão de Dados, Home).
- Todos os formulários passam a enviar de verdade, com mensagem de erro clara se o webhook não
  estiver configurado.
- Como o envio passa a ser pelo servidor, dá para saber se o Zapier realmente recebeu (hoje isso é
  invisível pelo modo `no-cors`).

## Passos no Zapier (você faz)

1. Criar um Zap com trigger **Webhooks by Zapier → Catch Hook** e copiar a URL.
2. Ação **Email by Zapier** (ou Gmail) enviando para `xfts@xfts.com.br` com os campos recebidos.
3. Me passar a URL para eu salvar como segredo; depois enviar um teste pelo formulário e publicar o Zap.

## Detalhes técnicos

- Novo segredo `ZAPIER_WEBHOOK_URL` (solicitado via o fluxo de segredos do projeto).
- Nova função de servidor `src/lib/zapier.functions.ts` (`createServerFn`, POST) que:
  lê `process.env['ZAPIER_WEBHOOK_URL']` dentro do handler, valida a entrada com Zod
  (nome/e-mail/telefone/segmento/mensagem/assunto, com limites de tamanho), faz `POST` real
  para o webhook e devolve `{ success, message }`.
- `src/lib/zapier.ts` passa a apenas chamar essa função (sem `localStorage`, sem `no-cors`);
  as funções `getZapierWebhookUrl`/`setZapierWebhookUrl` são removidas.
- `src/components/ZapierSettings.tsx` é removido e suas referências saem de
  `src/routes/contato.tsx`, `src/routes/exclusao-de-dados.tsx` e `src/routes/index.tsx`.
- Após salvar o segredo, é preciso publicar o app para valer também em produção.
