# Capabilities da Agenda no FLEXUS | Atende

## O que será feito
Cadastrar duas capabilities novas no produto **atende**, ligadas à tela `/app/agenda`, no mesmo padrão das 10 já existentes (sem exigir recurso de plano, como as demais do Atende):

| Chave | Nome | Escopo | Recurso |
|---|---|---|---|
| `agenda.view` | Agenda — visualizar | TENANT (todos os usuários da empresa) | UI_ROUTE `/app/agenda` |
| `agenda.manage` | Agenda — gerenciar | TENANT_ADMIN (dono/administrador) | ACTION `agenda.manage` |

- A tela `/app/agenda` abre para qualquer usuário da empresa com assinatura live ativa do Atende (`agenda.view`).
- Criar, editar ou excluir itens da agenda fica para dono/administrador (`agenda.manage`), validado no servidor do Atende com `requireCan`.
- Entra automaticamente no mapa `/api/public/capability-routes?app=atende`, no `capabilities` do `/api/public/entitlements` e no `/api/public/capability-check`, sem deploy do Atende.

## O que não muda
- Nenhuma outra capability, produto, plano, preço, Stripe ou assinatura.
- A página pública do Atende continua sem prometer agendamento integrado.
- Regra v1 mantida: o Atende envia `acting_as` com o papel real do usuário; o Hub nunca eleva.

## Detalhes técnicos
- Uma migração aditiva: `INSERT ... ON CONFLICT (product_key, key) DO NOTHING` em `product_capabilities` e os dois registros em `capability_resources` (ligados por subselect do id).
- Verificação: consulta no banco, chamada ao `capability-routes?app=atende` com a chave do Atende (deve listar `/app/agenda → agenda.view`), testes, typecheck e build. Sem publicar.
