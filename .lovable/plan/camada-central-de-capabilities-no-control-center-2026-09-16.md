# Camada central de Capabilities no Control Center

## O que já existe (verificado)

- `catalog_products` (produtos, chave = slug) e `catalog_plans` (planos, com `entitlements` em JSON).
- `entitlement_definitions`: recursos (liga/desliga) e limites por produto — é a base comercial atual.
- Resolução central já pronta em `entitlements.server.ts` (`resolveEntitlements`, `resolveUserEntitlements`, `toWirePayload`), usada pelo hub, pelo SSO e pela rota pública `/api/public/entitlements`.
- Papéis e permissões administrativas já existem (`admin_roles`, `admin-rbac`, `requireAdminModule`, `ModuleGuard`).
- Auditoria já existe (`admin_audit_log` + `recordAudit`) e já é usada no painel de entitlements.
- Aba de produtos já tem o padrão de abas (Catálogo / Entitlements / Imagens) e o painel `EntitlementsPanel`.

Conclusão: nada equivalente a Capabilities/Resources existe. Tudo o resto é reaproveitado, sem alterar Stripe, checkout, assinaturas ou os entitlements atuais.

## O que será feito

### 1. Duas tabelas novas (mínimo necessário)

- `product_capabilities`: produto, chave (única no produto), nome, descrição, categoria, entitlement exigido (opcional), escopo de visibilidade, ativo, datas.
- `capability_resources`: capability, tipo do recurso, chave do recurso, data.

Escopos: TENANT, TENANT_ADMIN, XFTS_SUPPORT, XFTS_SUPERADMIN, SYSTEM.
Tipos de recurso: UI_ROUTE, API_ENDPOINT, ACTION, REPORT, EXPORT, AUTOMATION, AI_FEATURE.
Leitura liberada apenas para contas autenticadas; escrita somente pelo servidor (mesmo padrão do catálogo).

### 2. Serviço central de autorização

Uma função no servidor resolve a lista de capabilities liberadas de um usuário em um produto, combinando: capability ativa + entitlement exigido presente no plano + escopo de visibilidade compatível com o papel do usuário. Capability sem entitlement exigido depende só do escopo (ex.: ferramentas internas da XFTS).

- Entrega para os sistemas: o retorno de `/api/public/entitlements` ganha um campo novo `capabilities` (lista de chaves liberadas). Nada do formato atual muda — os sistemas antigos continuam funcionando.
- Entrega para o hub: uma função `can("capability.key")` disponível no painel/hub, alimentada por uma única consulta resolvida por sessão (sem consulta por componente).

### 3. Aba "Capabilities" em Produtos

Mesma UI e padrão do painel de Entitlements (seletor de produto, lista, diálogo de edição):

- lista com nome, chave, categoria, entitlement exigido, escopo, status;
- busca por texto e filtro por categoria;
- criar/editar, ativar/desativar, escolher entitlement existente do produto, escolher escopo;
- cadastro dos resources da capability dentro do mesmo diálogo.

Toda gravação passa pela auditoria existente (antes/depois, autor, motivo do tipo de ação).

### 4. "Utilizado em" na tela de Entitlements

Cada recurso/limite listado passa a mostrar em quais produtos ele é exigido por capabilities e quantas são; ao expandir, lista as capabilities vinculadas.

## Impersonation

O modelo já grava sessões de suporte auditadas. As novas verificações recebem, além do usuário, o papel efetivo em uso (actor XFTS × papel dentro do tenant), sem transformar o usuário XFTS em usuário do cliente. Nada do fluxo atual de suporte é reescrito.

## Segurança

A verificação de escopo é feita no servidor em toda gravação de capability/resource (módulo `produtos` do Control Center) e na resolução entregue aos sistemas. O frontend apenas exibe o resultado; papéis nunca vêm do cliente.

## Detalhes técnicos

- Migração: `product_capabilities` (unique `product_key,key`, FK para `catalog_products.key`) e `capability_resources` (FK para capability, unique `capability_id,resource_type,resource_key`), com GRANTs, RLS e triggers de `updated_at` no padrão do projeto.
- Novos arquivos: `src/lib/capabilities.ts` (tipos/helpers client-safe), `src/lib/capabilities.server.ts` (resolução), `src/lib/admin-capabilities.functions.ts` (CRUD com `requireAdminModule("produtos")` + `recordAudit`), `src/components/admin/CapabilitiesPanel.tsx`.
- Arquivos alterados (mínimo): `src/routes/admin.produtos.tsx` (nova aba), `src/components/admin/EntitlementsPanel.tsx` ("Utilizado em"), `src/routes/api/public/entitlements.ts` (campo aditivo `capabilities`), `src/lib/entitlements.functions.ts` (expor capabilities resolvidas ao hub).
- `entitlements.server.ts`, planos, Stripe, checkout e SSO permanecem intactos.
