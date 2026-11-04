# P1-02B — Auditoria de limites por plano e assinatura

## Situação

O código atual mantém `entitlements.usuarios` como primeira fonte de verdade, seguido por `catalog_plans.seats` e, caso ambos faltem, `seatsFromPriceId`. Override individual de assinatura (`seats_override`) tem prioridade.

**Importante:** esta auditoria não consultou o banco do Supabase, não confirma número de tenants/assinaturas e não modifica dados. O usuário informou que os tenants existentes são de sua propriedade. A coleta abaixo deve ser realizada em conexão administrativa autorizada, em modo somente leitura, e revisada antes de qualquer atualização.

## Consulta SQL de inventário (somente leitura)

Execute no projeto correto (Sandbox/Live), registrando ambiente e instante da coleta. Exportar somente dados necessários. Não exportar informações pessoais.

```sql
select
  p.id as plan_id,
  p.product_key,
  p.name as plan_name,
  p.tier,
  p.active,
  p.seats,
  case
    when p.entitlements ? 'usuarios' then
      case
        when p.entitlements->'usuarios' = 'null'::jsonb then 'unlimited'
        when jsonb_typeof(p.entitlements->'usuarios') = 'number' then 'limited'
        else 'invalid'
      end
    when p.seats is not null then 'legacy_seats'
    else 'undefined'
  end as usuarios_mode,
  p.entitlements->'usuarios' as usuarios_entitlement,
  p.price_lookup_key,
  p.annual_lookup_key
from catalog_plans p
order by p.product_key, p.sort_order, p.name;
```

Em consulta SEPARADA, agregue assinaturas por `price_id`, sem expor nomes de clientes:

```sql
select
  price_id,
  status,
  environment,
  count(*) as quantidade,
  count(*) filter (where seats_override is not null) as overrides,
  min(seats_override) as menor_override,
  max(seats_override) as maior_override
from subscriptions
group by price_id, status, environment
order by price_id, status, environment;
```

Verifique no schema real os nomes de colunas e o ambiente antes da execução; não altere registros nesta etapa.

## Matriz de classificação

- **OK explícito:** `entitlements.usuarios` é inteiro >= 0 ou `null` intencional.
- **Legado:** `entitlements.usuarios` ausente e `seats` numérico — confirmar e copiar explicitamente apenas após homologação.
- **Indefinido:** `entitlements.usuarios` ausente e `seats = null` — não alterar resolver enquanto houver assinatura associada.
- **Conflito:** `seats` numérico diverge de `entitlements.usuarios` — revisar condição contratual e overrides.
- **Override:** `seats_override` não nulo — preservar até verificação de necessidade e prazo.
- **Plano não encontrado:** assinatura sem correspondência de lookup key — não derivar limite do tier sem revisão.

## Próximas etapas obrigatórias

1. Executar inventário real (somente leitura), revisar resultados por produto e identificar planos usados em assinaturas.
2. Definir separadamente os limites de **usuários**, **profissionais**, **moradores**, **unidades** e **canais** em cada sistema; não inferir um a partir do outro.
3. Documentar direitos esperados de cada plano e seus overrides; aprovar os casos legados e os indefinidos.
4. Fazer backup, gerar script de migração idempotente com relatório antes/depois e rollback.
5. Só após homologação em Sandbox, alterar o fallback do resolver `entitlements.server.ts` e executar testes de cada produto antes do merge.

## Segurança

Não modificar preço, cobrança, plano, assinatura, tenant, direitos efetivos, Stripe nem RLS nesta fase. O classificador `auditSeatLimits` é puro e permite analisar snapshots sem acesso ao banco.


## Execução real — 04/11/2026 (somente leitura)

Fonte: banco do projeto Lovable **XFTS Launchpad**, com stack Supabase. O projeto **XFTS Website** não expôs as três tabelas no banco consultado; **XFTS Billing Hub** retornou erro de acessibilidade. Estes resultados referem-se exclusivamente ao banco XFTS Launchpad; não representam auditoria consolidada de outros bancos/SaaS.

Consultas `SELECT` executadas sem modificação de dados e sem exportação de informações pessoais.

### Catálogo

- **8 produtos e 25 planos**, dos quais **24 ativos e 1 inativo** (Flow Enterprise).
- **25/25 planos** têm `entitlements.usuarios` explícito.
- **6 planos** possuem `entitlements.usuarios = null` explícito e `seats = null`: Enterprise de ABA, Barbearia, Casa360, Clínica, CRM e Estética.
- **0 divergências** entre `seats` numérico e `entitlements.usuarios` explícito nos 25 planos.
- **0 planos** com limite `usuarios` ausente; portanto o fallback `seatsFromPriceId` não é necessário para estes registros do catálogo atualmente.
- Atenção: os limites de profissionais, moradores e unidades não possuem definições dedicadas com as chaves literais `profissionais`, `moradores` e `unidades` nesta base. A definição `usuarios` de Casa360 tem rótulo **Usuários da equipe** no banco, enquanto o comparador usa **Moradores**. Alinhar semântica antes de declarar equivalência contratual.

### Assinaturas

- **20 registros:** 11 `active`, 9 `canceled`.
- **14 registros `live`**, **6 `sandbox`**. `live` é o ambiente de cobrança, não prova de cliente externo; o gestor informou que os tenants atuais pertencem a ele.
- **1 registro com `seats_override`**, valor **6**, associado a uma assinatura `canceled` de Barbearia Pro em `live`. Verificar antes de excluir qualquer override.
- **0 price IDs órfãos**: todas as assinaturas encontraram plano por `price_lookup_key` ou `annual_lookup_key`.
- Não foram coletados IDs de assinaturas, e-mails ou nomes de usuários.

### Recomendação atualizada

O catálogo consultado está consistente quanto a `usuarios`. O trabalho de maior valor agora é:
1. Homologar o resultado desta coleta contra o ambiente de hospedagem efetivamente usado pelo Hub.
2. Definir separadamente `usuarios`, `profissionais`, `moradores`, `unidades` e `canais`, quando aplicável, respeitando os consumidores de cada SaaS.
3. Criar testes de regressão com snapshot dos 25 planos e das assinaturas de teste antes de desligar `seatsFromPriceId`.
4. Em etapa independente, remover o fallback por tier **somente depois** de verificar efeitos sobre assinaturas sem plano e eventuais períodos de transição.
