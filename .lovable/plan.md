# Pedido aditivo ao Hub: uso de usuários, MFA e acesso admin ao Flow

Nada muda para Estética, CRM, Barbearia, Casa360 ou Atende. Nada é publicado. Depois da implementação, os resultados vêm de chamadas reais no preview.

## Respostas às perguntas (consulta somente leitura, já feita)

- **Cortesia live do Flow Pro (assinatura 926d544f…):** o usuário `f654ced0…` é a própria conta `lbruttin@xfts.com.br`. Ela foi concedida por **lbruttin@xfts.com.br** em **20/10/2026 às 21:43 UTC** (18:43 em São Paulo), com duração de 30 dias. Ação registrada: `cortesia.concedida`. **Nenhum motivo foi registrado**, porque o campo ficou vazio.
- **Recursos do Flow Pro em /entitlements:** sim, deveriam vir preenchidos. Pelo catálogo, o retorno esperado é `campaigns`, `ai_agents` e `export_csv` = true, e `public_api` e `outbound_webhooks` = false. Rodei a leitura real do plano e ela já devolve esses valores. Então o retorno vazio que vimos provavelmente saiu do caminho "sem assinatura": a chamada pode ter sido feita antes da cortesia ou com outro user_id. Na fase de implementação, vou repetir a chamada real ao endpoint e mostrar o resultado. Se ainda vier vazio, corrijo a causa.

## A) Usuários em uso — novo `POST /api/public/usage`

- O app é identificado pela própria chave `x-flexus-app-key`, comparada em tempo constante com as chaves de todos os apps. Corpo aceito: `{ user_id, usuarios_em_uso, timestamp }`. Campos extras são recusados.
- Validações e respostas:
  - JSON malformado, número fora de 0–100000 ou não inteiro, ou timestamp fora de ±10 min: **400**.
  - Chave inválida: **401**.
  - Nenhuma assinatura daquele app para esse user_id: **404**.
  - Mais de 60 requisições por minuto por chave: **429**.
  - Sucesso: **200** `{ "ok": true }`.
- O valor é gravado nos campos que já existem (`seats_used` e `seats_reported_at`). Vale a última escrita: um timestamp mais antigo que o já guardado é ignorado, mas a resposta continua `ok` (repetição idempotente).
- O limite de taxa usa uma tabela pequena de contadores por janela de 1 minuto, fechada só para o servidor. Observação: não existe limite de taxa padrão na plataforma, por isso ele é feito à parte, como você pediu.
- O endpoint antigo `/api/public/seats-usage` continua igual.
- No Control Center, a ficha do cliente mostra "usuários em uso / limite" por produto, com a data do último relato. Isso não afeta cobrança, acesso nem entitlements.
- Testes: chave errada, user_id de outro app, valor negativo ou decimal, timestamp antigo, repetição e 61ª requisição.

## B) MFA (aplicativo autenticador) no Control Center

- Usa o MFA nativo da autenticação. O segredo TOTP fica guardado pela própria autenticação, nunca em texto puro nas tabelas do app.
- **Tela "Segurança da conta" no admin:**
  - cadastrar o fator, com QR code e confirmação por código;
  - gerar **10 códigos de recuperação de uso único**, mostrados uma única vez e guardados apenas como hash;
  - a sessão vira "verificada com segundo fator" após o código.
- **Conferência no servidor:** uma função comum exige sessão com nível `aal2` (ou um código de recuperação válido, que vira sessão aal2 após cadastrar um novo fator). Ela vale para superadmin e suporte nestas ações:
  - gerar Sessão de Suporte;
  - gerar acesso de suporte antigo;
  - ligar ou desligar chaves e flags de integração;
  - ações sensíveis de clientes: cortesia, transferência, reembolso, mudança de assentos, cancelamento e notas.
- **Recuperação:** um superadmin (com o próprio MFA verificado) redefine o fator de outra pessoa, com motivo obrigatório e registro `mfa.reset` na auditoria. Ninguém redefine o próprio fator por esse caminho.
- **Migração sem trancar ninguém:**
  - nova configuração `mfa.enforce_after`, inicialmente vazia, o que significa não obrigatório;
  - enquanto estiver vazia, as ações apenas avisam e registram `mfa.missing`;
  - uma lista no admin mostra quem já cadastrou e quem ainda não;
  - **não vou ativar a obrigatoriedade.** Antes disso, mostro a lista e você define a data.
- Testes:
  - sem segundo fator, com obrigatoriedade ligada no teste, nenhuma sessão de suporte é gerada;
  - código errado é negado;
  - código de recuperação reutilizado é negado;
  - a redefinição gera auditoria.

## C) "Acessar Sistema" do Flow só para administradores

- Enquanto o Flow estiver "Em breve", o botão aparece e o SSO do Flow é emitido **somente** para quem está em `admin_users` (conferido no servidor). Também é preciso ter assinatura Flow ativa: a de teste ou a cortesia live.
- Cada uso gera o registro `flow.admin_preview_access` na auditoria, com e-mail, ambiente e assinatura.
- Clientes comuns continuam bloqueados, e a página continua "Em breve".
- Tudo fica atrás da configuração `flow.admin_preview_access` (ligada). **Para desfazer:** desligar essa configuração no admin. O botão some e o SSO volta a recusar na hora, sem precisar publicar.

## Detalhes técnicos

- Novos arquivos:
  - `src/routes/api/public/usage.ts`
  - `src/lib/usage-report.server.ts` (validação pura e testável)
  - `src/lib/mfa.server.ts` (`requireStepUp`)
  - `src/routes/admin.seguranca.tsx`
  - testes em `src/lib/__tests__/`
- Migração:
  - tabela `api_rate_limits`, só para o servidor;
  - tabela `admin_mfa_recovery_codes` (hash, usado_em), lida pelo próprio usuário e gravada só pelo servidor;
  - chaves novas em `integration_settings`.
- O `requireStepUp` é chamado nas funções existentes de suporte, cortesia e integrações, sem mudar os dados que elas devolvem.
- A liberação do Flow é feita na emissão de SSO e na resolução do botão, só quando `app === "flow"`.
