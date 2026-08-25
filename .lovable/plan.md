# Rotacionar a FLEXUS_APP_KEY_CASA360

O valor de um segredo salvo nunca pode ser exibido — nem para mim, nem no painel. Como essa chave precisa ser **idêntica nos dois lados** (este hub e o projeto Casa360°), a solução é gerar uma chave nova e trocá-la nos dois projetos.

## Onde a chave é usada

Neste hub ela autentica o Casa360° em duas frentes:

- `src/lib/sso.server.ts` — valida o header `x-flexus-app-key` em `/api/public/sso/verify` e `/api/public/entitlements`.
- Provisionamento — assina (HMAC) o webhook enviado para `https://xfts-flexus8.com/api/public/provision`.

Nada disso muda no código: é apenas troca de valor de segredo.

## Passos

1. Você gera uma chave forte de 64 caracteres hex. No terminal: `openssl rand -hex 32`. (Se preferir, eu gero uma no chat para você copiar.)
2. Eu abro o formulário seguro de segredos deste projeto para você colar o valor em `FLEXUS_APP_KEY_CASA360`.
3. Você cola exatamente o mesmo valor no segredo `FLEXUS_APP_KEY_CASA360` do projeto Casa360° (Segredos do projeto lá).
4. Publicamos/atualizamos os dois lados e eu testo:
   - login no hub → "Abrir sistema" no Casa360° (fluxo SSO completo);
   - uma chamada de `entitlements` com a nova chave;
   - um evento de provisionamento (aceita `{"ok":true}` e sem 401).

## Janela de indisponibilidade

Entre o passo 2 e o passo 3, o Casa360° responde 401 nas chamadas ao hub (SSO e revalidação). Fazendo os dois em sequência, são poucos minutos. Recomendo executar fora do horário de pico.

## Observação

Barbearia e CRM não são afetados — cada sistema tem a sua própria chave.
