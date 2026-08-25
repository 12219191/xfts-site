# Rotacionar as chaves do CRM e da Barbearia

Chaves novas geradas (64 hex). Cada uma precisa ficar **idêntica nos dois lados**: neste hub e no projeto do sistema.

**FLEXUS_APP_KEY_CRM**

```
6614b0ff1be184c653df7ebf4b8644ac02870057ff173cab1bc7909095979b31
```

**FLEXUS_APP_KEY_BARBEARIA**

```
7aceab184ef646d2ce385c5cf5187946dd66e80d4bf5356e7034b8dedaa57d50
```

## Onde cada chave é usada

- `src/lib/sso.server.ts` — valida o header `x-flexus-app-key` em `/api/public/sso/verify` e `/api/public/entitlements`.
- Provisionamento — assina (HMAC) o webhook enviado para a função `flexus-provision` de cada sistema.
- CRM também: assinatura dos leads enviados para `flexus-lead` (formato hexadecimal).

Nenhuma mudança de código: é só troca de valor de segredo.

## Passos

1. Eu abro o formulário seguro de segredos deste hub para você colar os dois valores em `FLEXUS_APP_KEY_CRM` e `FLEXUS_APP_KEY_BARBEARIA`.
2. Você cola os mesmos valores nos segredos correspondentes dos projetos **FLEXUS | CRM** e **FLEXUS | Barbearia**.
3. Publicar/atualizar os dois lados.
4. Eu valido: `entitlements` com a nova chave em cada sistema, um evento de provisionamento (espera `{"ok":true}`, sem 401) e, no CRM, um reenvio de lead pela aba de integração do admin.

## Janela de indisponibilidade

Entre os passos 1 e 2 o sistema correspondente responde 401 nas chamadas ao hub (SSO, revalidação e leads no CRM). Fazendo em sequência são poucos minutos — de preferência fora do horário de pico.

Casa360° não é afetado: cada sistema tem a sua própria chave.
