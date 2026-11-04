# P1 — Padrão de limites dos planos FLEXUS (v1, compatível)

## Decisão

Toda definição de limite no Control Center distingue:

| Estado UI | Valor persistido em `catalog_plans.entitlements` | Regra |
|---|---|---|
| Não configurado | chave ausente | Negar capacidade por padrão; corrigir cadastro |
| Limitado | inteiro >= 0 | Aplicar a quantidade informada |
| Ilimitado | `null` explícito | Não impor teto numérico deste entitlement |

**Compatibilidade:** o contrato JSONB atual continua inalterado; a nova UI apenas explicita os três estados. `null` que já existe **continua significando ilimitado**, inclusive em assinaturas existentes. Não migrar automaticamente valores para outro significado.

## Escopo da primeira etapa

- Campo de entitlements tipados como `limit` no cadastro do plano: seletor Não configurado / Limitado / Ilimitado.
- Sem escrita de banco por este PR além dos salvamentos explícitos que o administrador fizer.
- Sem alterações no resolver de direitos, payloads aos SaaS, Stripe, contratos, limites dos clientes ou webhooks.
- Recursos booleanos seguem o fluxo atual.

## Segunda etapa necessária: usuários / moradores / profissionais

O campo paralelo `catalog_plans.seats` usa `null` tanto para ausência de configuração quanto, em alguns fluxos antigos, como ilimitado; há fallback por tier em `entitlements.server.ts`. Portanto, **não converter `seats = null` para ilimitado nem para zero sem inventário de dados e contrato assinado**.

Planejamento:
1. Inventariar `catalog_plans.seats`, `entitlements.usuarios`, overrides por assinatura, limites específicos de profissionais e de moradores por produto; registrar evidência do contrato de cada plano.
2. Definir fonte de verdade por métrica e distinguir equipe/assentos de profissionais, moradores, unidades e canais.
3. Introduzir representação explícita para `seats` (campo de modalidade ou contrato versionado), mantendo leitura legada dos contratos existentes. Migrar com classificação individual; não usar inferências por tier.
4. Atualizar API pública/comparador, verificando cenários `undefined`, `limited`, `unlimited`, contratos anteriores e produtos sem plano.
5. Só depois eliminar o fallback `seatsFromPriceId` para planos classificados, com rollout gradual e rollback.
6. Auditar a propagação dos limites em Barbearia, Estética, Clínica, ABA, CRM, Casa360°, Atende e Flow antes de habilitar edição geral em produção.

## Critérios de aceite

- Uma chave ausente nunca produz disponibilidade ilimitada.
- Um `null` legado explícito continua ilimitado, sem perda de direitos.
- Quantidade 0 é distinta de ausência e é respeitada.
- Alterar a modalidade exige ação explícita do administrador e preserva auditoria já existente do cadastro.
- Plano de produção, pagamento e entitlements efetivos não mudam apenas por publicar este PR.


## Segunda etapa — fase 2A: leitura pública e diagnóstico de divergência

Implementação incremental, **sem migração e sem mudança de direitos**:
- `entitlements.usuarios` explícito com número inteiro >= 0: anunciar o número.
- `entitlements.usuarios = null` explícito: anunciar ilimitado.
- `entitlements.usuarios` ausente, mas `seats` numérico: preservar o número legado na comunicação.
- Ambos ausentes ou `seats = null` sem entitlement explícito: anunciar **Sob consulta**, nunca ilimitado.
- Entitlement explicitamente inválido: não utilizar fallback comercial silencioso.
- O editor de planos mostra aviso quando os limites divergem, sem sincronizá-los automaticamente.

**Risco residual documentado:** `resolveEntitlements` continua aplicando `seatsFromPriceId` quando falta `entitlements.usuarios` e `seats` é nulo. Essa compatibilidade legada não pode ser removida sem inventário e classificação dos contratos. A comunicação pública conservadora evita anunciar capacidade ilimitada sem comprovação, mas não substitui o teste efetivo por tenant.

**Separação semântica:** `usuarios` representa assentos de acesso no contrato atual (para Casa360°, moradores). Profissionais habilitados para agenda, unidades, canais, sessões e demais métricas devem ter chaves de entitlement próprias; não derivar seus limites da quantidade de assentos.

### Fase 2B — antes de modificar aplicação de limites
1. Executar inventário somente leitura em banco de teste/produção sob controle operacional; reconciliar `seats`, `entitlements.usuarios`, `seats_override` e contratos.
2. Criar plano de migração versionado por tenant/plano, com snapshots e rollback.
3. Distinguir no armazenamento o modo explícito do campo `seats` (e não apenas dos entitlements).
4. Atualizar servidor de resolução e consumidores de entitlements por produto, com testes de regressão por tenant.
5. Homologar Sandbox e produção com plano de implantação controlado.
