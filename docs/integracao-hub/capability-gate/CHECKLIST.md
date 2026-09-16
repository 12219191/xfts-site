# Checklist de instalação e validação do capability gate

Um roteiro por sistema (Barbearia, Clínica, Estética, CRM, ABA, Casa360°).
Nada muda em planos, Stripe, checkout ou assinaturas.

## 1. Colar (5 min)

- [ ] `xfts-hub-client.ts` → `src/lib/xfts-hub.ts`
- [ ] `CapabilityGate.tsx` → `src/components/CapabilityGate.tsx`
- [ ] `gate-endpoint.ts` → rota `GET /api/xfts/gate` + `xftsGuard` no backend
- [ ] `getCurrentUserId` apontando para a sessão real do sistema

## 2. Configurar (servidor do SaaS)

- [ ] `XFTS_HUB_URL=https://xfts-flexus.com`
- [ ] `XFTS_APP=` barbearia | clinica | estetica | crm | aba | casa360
- [ ] `XFTS_APP_KEY=` chave do sistema (nunca no browser)

## 3. Aplicar nas telas

- [ ] Cada tela protegida envolvida em `<CapabilityGate path="/...">`
- [ ] Cada rota de dados dessa tela com `xftsGuard("<capability>")`
- [ ] Removidos os antigos `if (plan === "PRO")` e `entitlements.<recurso>`

## 4. Validar automaticamente

Rode o validador (ele testa o hub e, se informado, o próprio sistema):

```bash
XFTS_APP=barbearia \
XFTS_APP_KEY=<chave> \
XFTS_USER_ID=<uuid de um usuário do tenant> \
SAAS_URL=https://barbearia.exemplo.com \
SAAS_COOKIE="<cookie de sessão de um usuário logado>" \
node validate-gate.mjs
```

Ele confirma:

- [ ] Mapa de telas do hub responde com rotas
- [ ] Chave inválida é recusada (401)
- [ ] Cada tela do mapa tem decisão clara (liberado 200 / bloqueado 403)
- [ ] Escopo interno da XFTS não pode ser pedido de fora (403)
- [ ] Rotas bloqueadas no hub também devolvem **403 dentro do sistema**

Exit code 0 = tudo consistente. Exit code 1 = a lista de pendências sai no final.

## 5. Aceite manual (2 conferências)

- [ ] Usuário sem o recurso vê "Recurso indisponível no seu plano" com link para /minha-conta
- [ ] Hub fora do ar bloqueia (fail-closed), não libera

## Status das chaves

| Sistema | Chave cadastrada |
| --- | --- |
| Barbearia | sim |
| CRM | sim |
| Casa360° | sim |
| Clínica | **não** |
| Estética | **não** |
| ABA | **não** |

Sem chave o gate responde 401 para tudo — cadastrar antes de validar esses três.
