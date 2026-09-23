# Inspeção: existe API oficial de catálogo para o CRM consumir?

## 1. Existe endpoint oficial de catálogo consumível externamente?

**Não.** Nenhum endpoint público expõe produtos, planos, features/add-ons ou preços. Os endpoints públicos existentes são apenas:

| Caminho | Para que serve |
|---|---|
| `/api/public/entitlements` | recursos/limites de **um usuário assinante** (não catálogo) |
| `/api/public/capability-check` | valida **uma** funcionalidade de um usuário |
| `/api/public/capability-routes` | mapa tela → funcionalidade de um sistema |
| `/api/public/sso/verify` | validação de token de login único |
| `/api/public/seats-usage` | uso de assentos |
| `/api/public/crm-retry`, `provision-retry`, `email-queue-flush`, `payments/*`, `health`, `blog-image/*` | rotinas internas/webhooks |

O catálogo (`catalog_products`, `catalog_plans`) só é lido internamente: `getPublicCatalog` (função de servidor usada pelas páginas do site) e `getAdminCatalog` (Control Center, exige login de admin). Nenhuma das duas é chamável de fora por chave de sistema. Não existe conceito de **add-on** no projeto — a busca por addon/adicional não retorna nada; hoje só existem planos (básico/pro/enterprise) com features e limites.

## 2. URL/path exata

Não há. O mais próximo, e que **não** serve como catálogo, é:
`GET https://xfts-flexus.com/api/public/entitlements?app=crm&user_id=<uuid>`

## 3. Método e autenticação do que existe hoje

`GET`, header `x-flexus-app-key: <FLEXUS_APP_KEY_CRM>` (comparação segura no servidor; sem chave → 401). CORS liberado, `Cache-Control: no-store`.

## 4. Formato real da resposta (entitlements)

```json
{
  "ativo": true, "status": "active", "plano": "pro", "papel": "owner",
  "limite_usuarios": 10, "usuarios_em_uso": 3,
  "recursos": { "relatorios_avancados": true, "automacoes": true },
  "limites": { "usuarios": 10 },
  "capabilities": ["leads.manage", "reports.sales_funnel"],
  "acesso_ate": "2026-10-01T00:00:00Z", "cancelamento_agendado": false
}
```

Ou seja: é por usuário, sem preços, sem lista de planos, sem produtos.

## 5. Endpoint mínimo que deveríamos criar

`GET /api/public/catalog` — leitura do catálogo do banco, autenticado por `x-flexus-app-key` (qualquer chave de sistema válida), com `?app=crm` opcional para filtrar um produto.

Resposta proposta (espelha `CatalogSnapshot`, já existente):

```json
{
  "products": [
    { "key": "crm", "name": "FLEXUS | CRM", "status": "active",
      "available_for_purchase": true, "landing": "/produtos/flexus-crm",
      "url": "https://...", "display_name": "...", "short_description": "..." }
  ],
  "plans": [
    { "id": "uuid", "product_key": "crm", "name": "Pro", "tier": "pro",
      "description": "...", "price_month_cents": 19900, "price_year_cents": 191000,
      "currency": "BRL", "features": ["..."], "seats": 10, "trial_days": 7,
      "entitlements": { "relatorios_avancados": true, "usuarios": 10 },
      "price_lookup_key": "...", "annual_lookup_key": "...", "active": true, "sort_order": 2 }
  ],
  "generated_at": "2026-09-23T19:00:00Z"
}
```

### Detalhes técnicos da implementação sugerida

- Novo arquivo `src/routes/api/public/catalog.ts` no padrão dos demais: `OPTIONS` + `GET`, CORS igual, `appApiKey`/`safeEqual` de `@/lib/sso.server`, `logIntegrationEvent` com um novo `kind` (`catalog`).
- Reutiliza `loadPublicCatalog()` de `src/lib/catalog.server.ts` (já tem normalização e fallback em código) — nada de query nova nem tabela nova.
- Só planos `active` e produtos não descontinuados; nomes de campo em snake_case para o adapter externo.
- `Cache-Control: public, max-age=60` (catálogo muda pouco; alinhado ao cache de 60s do kit do gate).
- Add-ons ficam fora: não existem no modelo atual. Se o CRM precisar, o campo `addons: []` pode já vir vazio para compatibilidade futura.

Nenhuma alteração foi feita nesta inspeção.
