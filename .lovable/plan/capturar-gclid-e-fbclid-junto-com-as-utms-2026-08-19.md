# Capturar gclid e fbclid junto com as UTMs

## Situação atual (verificada no código)

Já são capturados e gravados hoje, em first-touch e last-touch:
`utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `referrer`, `landing_page`.

Faltam apenas os identificadores de clique de anúncio: **`gclid`** (Google Ads) e **`fbclid`** (Meta Ads). Não há nenhuma referência a eles no projeto.

## O que será feito

1. Captura no navegador: ler `gclid` e `fbclid` da URL e guardá-los junto da atribuição existente (mesma janela de atribuição configurável, mesma lógica first-touch/last-touch). Um clique de anúncio passa a contar como "sinal de origem", atualizando o last-touch mesmo sem UTMs na URL.
2. Envio: os dois campos (e suas versões last-touch) seguem no payload do Zapier e são gravados no banco junto com o protocolo.
3. Banco: novas colunas `gclid`, `fbclid`, `lt_gclid`, `lt_fbclid` em `public.form_submissions` (text, nullable). Sem mudança de RLS/grants.
4. Admin (aba Formulários): os identificadores aparecem nos detalhes de origem de cada protocolo e entram na comparação first × last, com selo "Igual/Divergente" como os demais campos.

Registros antigos ficam com os novos campos vazios ("—").

## Detalhes técnicos

- `src/lib/attribution.ts`: adicionar `gclid`/`fbclid` ao tipo `Attribution`, à leitura de `URLSearchParams` em `readCurrent()` (com `hasSignal = true`) e ao payload `lt_`.
- `src/lib/zapier.functions.ts`: estender o schema Zod (max 255) e o insert em `form_submissions`.
- `src/lib/form-submissions.functions.ts`: incluir os campos no tipo `FormSubmissionRow` e no select.
- `src/components/admin/FormSubmissionsPanel.tsx`: exibir nos detalhes e incluir na comparação/`impactScore` (peso baixo, 2).
- Nova migração com os 4 `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.
