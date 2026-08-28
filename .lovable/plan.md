# Separar visibilidade, venda e acesso ao Hub

Hoje o produto tem `status` (active/development/beta/paused/discontinued) e `show_on_website`. A venda e o acesso ao Hub são **derivados** do status (`canPurchase`, `canAccess`), sem controle próprio. Este plano transforma os dois em campos independentes no Control Center.

## Os três conceitos

| Campo | Significa | Controla |
| --- | --- | --- |
| `show_on_website` | aparece publicamente | /produtos, menu, rodapé, comparação de planos, sitemap |
| `available_for_purchase` | pode ser contratado | CTA de compra e bloqueio no checkout |
| `available_in_hub` | aparece como aplicação no Hub | card em "Meus Sistemas", SSO e provisionamento |

O `status` continua existindo, mas passa a ser **rótulo de ciclo de vida + teto**, não a regra em si.

### Teto por status (o status nunca é sobrescrito para mais)

- `development` e `discontinued`: nunca vendem, mesmo com `available_for_purchase = true`.
- `paused`: não vende; quem já assina continua acessando se `available_in_hub` estiver ligado.
- `active` e `beta`: vendem e acessam conforme as chaves.

Assim, "poder vender" = `available_for_purchase` **e** o status permite. Isso evita um produto em desenvolvimento ser vendido por engano.

### Como o site interpreta

| Situação | O que aparece |
| --- | --- |
| `development` | selo "Em breve", sem preço, sem botão de compra |
| `beta` | selo "Acesso antecipado" (+ nota beta, se houver) |
| `active` + pode comprar | "Comece agora" (CTA de compra, preços visíveis) |
| `active` + não pode comprar | "Saiba mais" (leva à landing, sem checkout) |
| `paused` | aviso "temporariamente indisponível", sem compra |
| `discontinued` | oculto por padrão; se `show_on_website`, selo "Descontinuado" |

## Exemplos pedidos

- **FLEXUS | Clínica**: active, no site, vende, **não** aparece no Hub — vendável mas ainda sem app conectado.
- **FLEXUS | ABA**: development, no site como "Em breve", não vende, não aparece no Hub.

## Control Center

Em `/admin/produtos`:

- Três chaves separadas no formulário do produto, cada uma com uma linha explicando o efeito.
- Aviso quando a chave contradiz o status (ex.: "vender" ligado num produto em desenvolvimento — o status vence).
- Aviso quando o produto vende mas não tem plano ativo, ou vende mas não aparece no Hub (comprador sem porta de entrada).
- Pré-visualização do selo/CTA como sairá no site.
- Alterações gravadas na auditoria (antes/depois), como já ocorre hoje.

## Backfill (nada muda visualmente na virada)

- `available_for_purchase` = status é active/beta
- `available_in_hub` = status != development (mesma regra do `canAccess` atual)

## Detalhes técnicos

- Migração: colunas `available_for_purchase boolean not null default false` e `available_in_hub boolean not null default false` em `public.catalog_products`; UPDATE de backfill pela regra acima; GRANTs e RLS atuais preservados (SELECT público continua restrito a `show_on_website = true`).
- `src/lib/catalog.ts`: `CatalogProduct` ganha `availableForPurchase` e `availableInHub`; `canPurchase(product)` e `canAccess(product)` passam a receber o produto (status + chave) em vez de só o status; novo `siteCta(product)` devolve selo/rótulo/ação conforme a tabela acima; `statusLabel` ganha "Acesso antecipado" para beta.
- `src/lib/catalog.server.ts`: mapear as colunas novas; `codeCatalog()` preenche pelo backfill; `loadProductStatuses` vira `loadProductFlags` retornando `{ status, availableForPurchase, availableInHub }` por chave, com o mesmo fallback ao catálogo em código.
- Chamadores atualizados para a nova assinatura: `src/lib/checkout.functions.ts` (bloqueio de compra), `src/lib/sso.functions.ts` e `src/lib/provisioning.server.ts` (acesso ao Hub), `src/components/MeusSistemas.tsx` e `AcessarSistemaButton.tsx` (esconder/rotular cards).
- `src/lib/admin-catalog.functions.ts`: campos novos em `CatalogProductInput` e no update, com auditoria.
- `src/components/admin/CatalogPanel.tsx`: três switches, avisos de coerência e badges na listagem.
- `src/routes/produtos.tsx` / `produtos.index.tsx` / landings / `produtos.comparar-planos.tsx`: usam `siteCta(product)` para decidir selo, preço e destino do CTA.
