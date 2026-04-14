

## Upgrade Premium da Experiencia XFTS/FLEXUS

Este plano cobre 7 frentes de melhoria para elevar o visual e UX ao nivel de um SaaS global.

### 1. Pagina de Comparacao de Planos - Redesign Premium

**Arquivo**: `src/routes/produtos.comparar-planos.tsx`

- Layout horizontal com 3 colunas lado a lado (nao tabela HTML), cada plano como Card independente
- Coluna Pro com escala maior (transform scale ou padding extra), borda `cta`, badge "Mais Popular"
- Coluna Enterprise com gradiente dourado sutil e badge "Premium"
- Toggle mensal/anual no topo com desconto visual (e.g. "Economize 20%")
- Feature rows com icones Check (verde) e tracos (cinza), nao X vermelho
- Sticky header com nome do plano + preco visivel ao scrollar
- CTA buttons com hierarquia visual clara (outline / solid cta / solid amber)
- Tooltip ou hover info em features complexas
- FAQ colapsavel abaixo da tabela ("Posso trocar de plano?", "Como funciona o trial?")

### 2. Cards de Pricing nas Paginas de Produto - Upgrade Visual

**Arquivos**: `produtos.gestao-clinica.tsx`, `produtos.gestao-barbearias.tsx`, `produtos.gestao-esteticas.tsx`

- Pricing em grid horizontal (3 colunas em desktop) em vez de lista vertical
- Cada card com lista de features incluidas (3-5 bullet points)
- Pro card elevado com `shadow-xl`, borda `cta`, ribbon "Mais Popular"
- Enterprise card com gradiente premium e icone de coroa/shield
- Basico com texto "Ideal para comecar" e features basicas listadas
- Garantia de 7 dias abaixo dos cards

### 3. Dashboard Admin Executivo

**Arquivo**: `src/routes/admin.tsx`

- Sidebar lateral com navegacao (Blog, Assinaturas, Configuracoes)
- Header com avatar do admin, nome e botao de logout
- Cards de metricas no topo: Total de artigos, Publicados, Rascunhos, Assinaturas ativas
- Tabela de artigos com colunas (Titulo, Status, Categoria, Data, Acoes) em vez de cards empilhados
- Status badges coloridos (verde = publicado, amarelo = rascunho)
- Modal para edicao em vez de formulario inline
- Secao de assinaturas com lista de subscribers, status, plano, datas

### 4. Estados de Assinatura Claros - Componente de Status

**Novo arquivo**: `src/components/SubscriptionStatus.tsx`

- Componente reutilizavel que mostra estado visual da assinatura
- Estados: Ativa (verde com icone check), Trial (azul com timer), Vencida (vermelho), Cancelada (cinza), Pendente (amarelo)
- Barra de progresso para trial days remaining
- Data de renovacao/expiracao formatada
- Usado no admin dashboard e futura area do cliente

### 5. Fluxo de Upgrade/Downgrade Convincente

**Novo arquivo**: `src/components/PlanUpgradeCard.tsx`

- Card de comparacao lado-a-lado: plano atual vs plano desejado
- Highlight visual do que o usuario ganha ao fazer upgrade (features novas em verde)
- Calculo pro-rata visivel ("Voce paga apenas R$ X pelo restante do mes")
- CTA forte: "Fazer Upgrade Agora" com icone de seta
- Para downgrade: aviso amigavel do que sera perdido (features em vermelho claro)

### 6. Retencao em Cancelamento - UX de Offboarding

**Novo arquivo**: `src/components/CancelSubscriptionFlow.tsx`

- Flow multi-step em modal:
  - Step 1: "Sentiremos sua falta" + motivo do cancelamento (radio options)
  - Step 2: Oferta de retencao baseada no motivo (desconto, pause, downgrade)
  - Step 3: Confirmacao final com resumo do que sera perdido
- Opcao de pausar assinatura em vez de cancelar
- Countdown visual "Acesso ate DD/MM/AAAA"
- Botao "Manter Meu Plano" sempre visivel e destacado

### 7. Clareza Visual de Acesso - Feature Gating

**Novo arquivo**: `src/components/FeatureGate.tsx`

- Componente wrapper que mostra/bloqueia features baseado no plano
- Visual de lock com overlay blur para features bloqueadas
- Badge "PRO" ou "ENTERPRISE" indicando qual plano libera
- Tooltip explicativo ao hover: "Disponivel no plano Pro. Faca upgrade para desbloquear."
- Aplicavel em qualquer secao do sistema

### Detalhes Tecnicos

- **Sem mudancas de banco de dados** - usa tabela `subscriptions` existente
- **Sem novas dependencias** - apenas Tailwind CSS + componentes shadcn existentes
- **8 arquivos editados, 4 arquivos novos**
- Queries na tabela `subscriptions` para dados reais de assinatura no admin
- Componentes exportados para reuso futuro na area do cliente

