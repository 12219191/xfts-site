# Catálogo de produtos: status, visibilidade e conteúdo no Control Center

## O que já existe hoje

- **Tabela `catalog_products`** no banco (chave, nome, domínio, rota da landing, prefixo de preço, `available` booleano, ordem) e **`catalog_plans`** com preço, features, entitlements, trial, lookup keys.
- **Edição no Control Center** em `/admin/produtos` (aba Catálogo): dá para editar nome, domínio, landing, ordem e o booleano Disponível/Em breve, além dos planos, com auditoria.
- **Imagens** editáveis em `/admin/produtos` (aba Imagens), gravadas em `product_images` (URL + alt).
- **Site lendo o banco** para preços e planos, com fallback para o catálogo em código.

## O que ainda falta (as lacunas reais)

1. **Só existe um booleano `available`** — ele mistura "o sistema está pronto" com "aparece no site". Não há `development`, `beta`, `paused`, `discontinued`.
2. **A lista de produtos na página /produtos está no código** (`src/routes/produtos.tsx`): título, descrição curta, ícone e link são um array fixo. Criar um produto novo hoje exige mudar código.
3. **As landings de produto são arquivos de código**, uma por produto — não existe página genérica alimentada pelo banco.
4. **Não há CTA, descrição nem headline do produto no banco** (só o CTA do plano existe).
5. **`flexus-apps.ts` continua sendo a fonte de verdade operacional** (SSO, provisionamento, saúde) — o `available` de lá é o que bloqueia acesso, não o do banco.
6. **Imagem vive em outra tabela**, separada do produto, com slug fixo — produto novo não tem onde colocar imagem sem tocar no código.

## O que este plano entrega

### 1. Status e visibilidade separados

`catalog_products` ganha:

- **`status`**: `active` | `development` | `beta` | `paused` | `discontinued`
- **`show_on_website`**: sim/não (independente do status)
- **`beta_note`**: texto opcional exibido em produtos beta

Regras derivadas (calculadas no servidor, não digitadas à mão):

| Status | Aparece no site (se show_on_website) | Pode comprar | Pode entrar no sistema |
| --- | --- | --- | --- |
| active | sim | sim | sim |
| beta | sim, com selo Beta | sim | sim |
| development | sim, como "Em breve", sem preço | não | não |
| paused | sim, com aviso "temporariamente indisponível" | não | assinantes atuais sim |
| discontinued | não (a menos que marcado) | não | assinantes atuais sim |

O `available` atual é convertido: `true` → `active`, `false` → `development`, todos com `show_on_website = true`. Nada muda visualmente na virada.

### 2. Conteúdo do produto no banco

`catalog_products` passa a guardar também: **título de exibição, descrição curta (card), headline e subtítulo da landing, ícone (nome do ícone), rótulo e destino do CTA principal, imagem e texto alternativo**. As imagens atuais de `product_images` são migradas para o produto correspondente; a aba Imagens continua funcionando e grava no mesmo lugar.

### 3. Site consumindo o banco

- **/produtos**: a grade de cards passa a vir do banco (produtos com `show_on_website`), ordenada por `sort_order`, com selo por status. Fim do array fixo no código.
- **Landings existentes**: continuam nos mesmos endereços, mas título, descrição, imagem, CTA e bloco de preços passam a ler o produto do banco. Sem preço e com aviso quando o status não permite compra.
- **Checkout**: bloqueia produto que não está `active`/`beta`, com mensagem clara.
- **Menu, rodapé e comparação de planos**: listam apenas produtos visíveis.
- Fallback para o catálogo em código se o banco falhar, como já é hoje.

### 4. Control Center

Em `/admin/produtos`:

- Criar produto novo pelo painel (chave, nome, textos, imagem, status, visibilidade, ordem).
- Seletor de status com explicação do efeito de cada um, e chave separada "Mostrar no site".
- Pré-visualização do card como aparece em /produtos.
- Aviso quando o produto está visível no site mas não tem plano ativo.
- Toda alteração de status/visibilidade gravada na auditoria (antes/depois). Acesso: Superadmin e Produto.

### 5. Operação alinhada

O SSO, o provisionamento e a saúde das integrações passam a considerar o status do banco em vez do `available` fixo em código: `paused`/`discontinued` param novas contratações mas mantêm o acesso de quem já assina; `development` continua bloqueado.

## Detalhes técnicos

- Migração: enum `product_status`; colunas `status`, `show_on_website`, `beta_note`, `display_name`, `short_description`, `headline`, `subheadline`, `icon`, `cta_label`, `cta_href`, `image_url`, `image_alt` em `public.catalog_products`; backfill a partir de `available`, do array de `src/routes/produtos.tsx` e de `product_images`; política SELECT pública restrita a `show_on_website = true`; escrita só service_role; GRANTs mantidos.
- `src/lib/catalog.ts` / `catalog.server.ts`: novos campos no `CatalogProduct`, helpers `canPurchase(status)`, `canAccess(status)`, `statusBadge(status)`; `codeCatalog()` atualizado como fallback.
- `src/lib/admin-catalog.functions.ts`: `createProduct`, campos novos no update, validação de chave, auditoria via `recordAudit`.
- `src/routes/produtos.tsx`: array removido; `ProdutosIndex` recebe produtos por loader (`ensureQueryData` sobre `catalog.functions.ts`).
- Rotas de produto e `produtos.comparar-planos.tsx`: leem o produto do snapshot em vez de constantes locais.
- `src/lib/sso.functions.ts`, `provisioning.server.ts`, `reliability.server.ts`, `AcessarSistemaButton.tsx`, `MeusSistemas.tsx`: trocam `app.available` por status do catálogo (com fallback ao código).
- `src/components/admin/CatalogPanel.tsx`: formulário de produto ampliado + criação; `ProductImagesPanel` passa a gravar em `catalog_products`.
