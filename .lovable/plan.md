# Telas reais do FLEXUS | Barbearia no Control Center

Hoje o Control Center tem 10 funcionalidades para a Barbearia com telas genéricas
(`/agenda`, `/vendas`, `/relatorios/...`, `/automacoes`, `/configuracoes/marca`), que não
existem no sistema. Vou trocar por todas as rotas reais que você enviou, do mesmo jeito que
foi feito no Casa360°.

## O que muda

Removo as telas antigas da Barbearia e cadastro as rotas reais, agrupadas por área:

- **Acesso** — `/login`, `/sso`, `/reset-password`, `/aceitar-convite`, `/cliente/oferta/:token`, `/b/:slug`
- **Portal do cliente** — `/cliente/login`, `/cliente`, `/cliente/agendamentos`, `/cliente/beneficios`,
  `/cliente/perfil` e as legadas `/agendar`, `/historico`, `/avaliacoes`, `/fidelidade`,
  `/assinaturas`, `/campanhas`, `/perfil`
- **Portal do profissional** — `/profissional` e `/profissional/{agenda, atendimentos, metas,
  comissoes, avaliacoes, clientes, produtos, notificacoes, perfil}`
- **Painel admin** — `/admin/login`, `/admin`, agenda, recepção, PDV, caixa (+ supervisão e
  conciliação), clientes (+ duplicados), CRM comercial, serviços, pacotes vendidos, estoque,
  profissionais, metas (+ planejamento), financeiro, DRE, analytics, os 4 relatórios,
  marketing, WhatsApp logs, configurações, usuários, segurança, auditoria de agendamentos,
  agendamentos órfãos, backup (+ restore), contratação de plano, documentação de rotas
- **Central XFTS** — `/superadmin/...` (8 telas), marcadas com escopo interno XFTS, nunca
  liberadas ao cliente pelo gate

## Quais telas exigem plano superior

Mantendo o critério já usado no Casa360° (liberar por padrão, restringir só o que é claramente
avançado):

| Telas | Exige |
| --- | --- |
| DRE, Analytics, Dados 360, Comparecimento, Proteção de agenda | Relatórios avançados |
| Exportação de relatórios | Exportação de dados |
| Marketing, WhatsApp Logs | Automações |
| Configurações (integrações), Backup e Restaurar | Integrações e API |
| Configurações de marca | Marca própria |
| Central XFTS (`/superadmin/*`) | escopo interno XFTS |

Todo o resto (agenda, recepção, PDV, caixa, clientes, CRM, serviços, estoque, profissionais,
metas, financeiro, portais do cliente e do profissional, acesso) fica liberado em todos os planos.
Você pode mudar qualquer uma dessas exigências em **Produtos → Capabilities**, e passa a valer no
sistema em até 60s, sem novo deploy.

## Detalhes técnicos

- Uma migração só: remove os `capability_resources` do tipo `UI_ROUTE` das capabilities de
  `product_key = 'barbearia'`, apaga as capabilities que não têm equivalente real, insere as novas
  (`key` por área: `access.*`, `client.*`, `pro.*`, `admin.*`, `xfts.*`) com `required_entitlement_key`
  e `visibility_scope` conforme a tabela acima, e cadastra um `UI_ROUTE` por rota.
- Rotas com parâmetro entram como cadastradas (`/cliente/oferta/:token`, `/b/:slug`); o
  `capability-routes` já filtra apelidos sem `/`, então o mapa continua só com caminhos reais.
- Nenhuma mudança em planos, Stripe, checkout, assinaturas ou nos entitlements existentes.
- Nenhum arquivo de código alterado — a aba **Telas dos SaaS** passa a listar as novas rotas
  automaticamente.
