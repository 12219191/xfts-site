# Planos oficiais do FLEXUS | Atende (live)

## Situação atual (conferida no banco)
Os 3 planos já existem com nome, tier minúsculo, preço mensal, usuários, agentes e créditos corretos, e o produto já está ativo e liberado para compra. Faltam só estes ajustes:

| Plano | Anual hoje | Anual pedido | Observação |
|---|---|---|---|
| Basic (basic) | R$ 1.239 | R$ 1.290 | atualizar preço |
| Standard (standard) | R$ 4.119 | R$ 4.290 | atualizar preço |
| Corporate (corporate) | sem anual | R$ 8.690 | criar plano anual |

- A descrição do produto ainda não traz o aviso da Meta.
- Mensal (R$ 129 / 429 / 869), limites (2/2/2.500, 10/10/11.500, 25/20/30.000) e "disponível para compra" já estão certos e continuam iguais.

## O que será feito
1. **Preços anuais no Stripe live.** Uso a mesma sincronização do painel de catálogo: o novo valor ganha um preço novo, o código do preço é transferido para ele e o preço antigo é arquivado. Para o Corporate anual será criado o código `flexus_atende_corporate_anual`. Quem já assina continua com o preço que contratou; nada é cancelado nem recobrado.
2. **Catálogo.** Gravar os novos valores anuais e o código anual do Corporate. Todos os campos são conferidos de novo (nome, tier, mensal, usuários, agentes, créditos), sem mudar o que já está certo.
3. **Descrição.** Acrescentar à descrição curta do produto: "As mensagens e conversas do WhatsApp oficial são faturadas pela Meta diretamente na conta WABA da empresa." Ajustar também o aviso de custos da página do Atende para usar a mesma frase.
4. **Registro.** Cada alteração entra no histórico de auditoria do admin.
5. **Conferência.** Ler o banco e o Stripe (só leitura) para confirmar que os 6 códigos de preço existem com os valores certos, e que o catálogo público mostra os 3 planos com o aviso.

## Detalhes técnicos
- As mudanças de dados são feitas por consulta direta (sem migração), e os preços pela mesma lógica de `syncPrice` (`src/lib/catalog-stripe.server.ts`) em `environment: "live"`. Os tiers passam por `planTierError("atende", …)` antes de qualquer gravação.
- A única mudança de código é a frase do aviso em `src/routes/produtos.flexus-atende.tsx`.
- O credit_cycle passa a reconhecer o Corporate anual como `year` assim que o `annual_lookup_key` existir. Contrato e regras continuam iguais.
- Nada é publicado. A mudança de texto na página só aparece no site depois que você publicar; preços e catálogo valem na hora, porque o banco e o Stripe live são os mesmos.
