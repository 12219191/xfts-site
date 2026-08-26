# XFTS Control Center — Fase 1

Transformar `/admin` de "abas escondidas no site" em uma aplicação administrativa própria: rotas dedicadas, papéis de acesso, dashboard executivo, auditoria de tudo que for alterado manualmente e acesso de suporte (impersonation) com registro.

## 1. Estrutura de rotas

Hoje `/admin` é uma única página com abas em estado local. Passa a ser um layout com rotas reais:

```text
/admin                → redireciona para /admin/dashboard
/admin/dashboard      → visão executiva (MRR, clientes, inadimplentes, por produto)
/admin/clientes       → lista de clientes, detalhe, entitlements, acesso de suporte
/admin/assinaturas    → painel de assinaturas atual
/admin/cobranca       → dunning atual
/admin/cortesias      → cortesias atual
/admin/produtos       → catálogo (somente leitura nesta fase) + imagens de produto
/admin/conteudo       → blog
/admin/leads          → formulários, UTM, CTA
/admin/integracoes    → CRM + webhooks Stripe
/admin/equipe         → gestão de usuários admin e papéis
/admin/auditoria      → histórico de ações administrativas
```

Cada painel existente é reaproveitado como está — só muda o container e a navegação (sidebar com grupos: Visão geral, Clientes, Receita, Catálogo, Marketing, Sistema).

O login do admin sai do meio da página e vira uma tela própria `/admin/login`, com o gate aplicado no layout, não em cada tela.

## 2. RBAC (papéis)

Hoje existe só `admin_users` (é admin ou não é). Passa a ter papéis:

| Perfil | Acesso |
| --- | --- |
| Superadmin | Tudo, inclusive equipe e integrações |
| Financeiro | Assinaturas, cobrança, cortesias, dashboard |
| Comercial | Clientes, assinaturas (upgrade), leads, dashboard |
| Suporte | Clientes, entitlements, acesso de suporte |
| Produto | Produtos, imagens, conteúdo/blog |

Regras:
- Papéis em tabela separada (`admin_roles`), nunca no perfil do usuário.
- Verificação sempre no servidor: cada função administrativa checa o papel antes de executar. Esconder o item do menu é só conforto visual.
- Menu e rotas filtram pelo papel; acesso direto por URL sem permissão mostra "sem permissão".
- Superadmin gerencia a equipe em `/admin/equipe` (convidar, trocar papel, remover), com registro em auditoria.

## 3. Dashboard executivo

Cartões no topo: MRR, clientes ativos, cortesias/trials, cancelamentos do mês, inadimplentes.
Abaixo: quebra por produto (clientes e MRR de cada FLEXUS) e três listas de atenção — assinaturas com problema, cortesias terminando, pagamentos falhos — cada uma linkando para a tela correspondente.

Os números vêm de uma única função de servidor que agrega `subscriptions`, `dunning_state` e o catálogo de preços. MRR calculado a partir do preço do plano, normalizando anual para mensal.

## 4. Clientes e entitlements

Nova tela `/admin/clientes`: busca por e-mail, lista com produtos contratados, plano, status e limite de usuários. No detalhe do cliente:
- produtos contratados e entitlements efetivos (o mesmo JSON que os SaaS recebem);
- ajuste manual de limite de assentos com **motivo obrigatório** (grava antes/depois na auditoria);
- botão "Abrir sistema como suporte".

## 5. Acesso de suporte (impersonation) com auditoria

Reaproveita o SSO já existente: o Control Center emite um token SSO de curta duração para o sistema alvo, marcado como acesso de suporte, sem precisar da senha do cliente.

- Motivo é obrigatório antes de gerar o token.
- Token curto (5 min), uso único, marcado como `support` e vinculado ao admin que gerou.
- Cada emissão gera registro de auditoria: quando, quem, qual cliente, qual sistema, motivo.
- O sistema alvo recebe a indicação de que é sessão de suporte no payload do token (cabe a cada SaaS exibir o aviso e restringir ações — fica documentado para eles).

## 6. Auditoria

Toda alteração manual feita pelo Control Center grava: quem, quando, ação, alvo, valor antes, valor depois, motivo. Cobre no mínimo: cortesias, ajuste de limites, mudança de papel na equipe, alteração de integrações e acesso de suporte.

`/admin/auditoria` lista com filtro por admin, tipo de ação e período.

## 7. O que não muda agora

- Catálogo de produtos/planos/features continua no código (`product-plans.ts`, `flexus-apps.ts`); `/admin/produtos` só exibe. Tornar o catálogo editável no banco é a Fase 2.
- API central continua neste projeto sob `/api/public/*` (mesmo padrão de entitlements/SSO já usado). O subdomínio `api.xfts-flexus.com` pode apontar para cá depois, sem mudar código.
- `/minha-conta` continua como está — apenas confirmamos que nenhuma rota `/admin` fica acessível a cliente comum.
- O frontend nunca fala com a Stripe: tudo passa pelas funções de servidor, como já é hoje.

## Detalhes técnicos

- Banco (uma migração): enum `admin_role`; tabela `admin_roles (user_id, role)` com GRANT + RLS (leitura do próprio papel para autenticados, escrita só superadmin); tabela `admin_audit_log (actor_id, action, target_type, target_id, before, after, reason, created_at)` com GRANT + RLS (leitura para admins, escrita via service role); função `private.has_admin_role(_user_id, _role)` security definer; coluna `purpose`/`created_by_admin` em `sso_tokens` para marcar sessão de suporte. Superadmin inicial: o admin atual em `admin_users`.
- Rotas: `src/routes/admin.tsx` vira layout com `<Outlet />` + gate de sessão/papel; telas em `src/routes/admin.dashboard.tsx`, `admin.clientes.tsx`, etc. Painéis atuais em `src/components/admin/*` são reaproveitados sem reescrita.
- Servidor: `src/lib/admin-rbac.server.ts` (resolve papel + `requireAdminRole`), `src/lib/admin-audit.server.ts` (grava log), `src/lib/admin-dashboard.functions.ts` (KPIs), `src/lib/admin-customers.functions.ts` (busca, entitlements, ajuste de assentos), `src/lib/admin-team.functions.ts`, `src/lib/admin-audit.functions.ts`. Todas com `requireSupabaseAuth` + checagem de papel dentro do handler.
- Impersonation: nova função de servidor que emite token via `sso.server.ts` com `purpose: "support"`, TTL 5 min, e grava auditoria antes de retornar a URL.
- Redirecionamento: `/admin` mantém a URL pública e redireciona para `/admin/dashboard`, sem quebrar links existentes.
