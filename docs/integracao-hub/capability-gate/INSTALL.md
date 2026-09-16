# Instalar o capability gate em um SaaS FLEXUS

Kit pronto para colar. Vale para Barbearia, Clínica, Estética, CRM, ABA e Casa360°.
Nada muda em planos, Stripe, checkout ou assinaturas.

## Arquivos

| Copiar deste kit | Para o SaaS |
| --- | --- |
| `xfts-hub-client.ts` | `src/lib/xfts-hub.ts` |
| `CapabilityGate.tsx` | `src/components/CapabilityGate.tsx` |
| `gate-endpoint.ts` | rota `GET /api/xfts/gate` + `xftsGuard` no backend |
| `validate-gate.mjs` | roda solto (não precisa copiar) — valida as rotas protegidas |
| `CHECKLIST.md` | roteiro de instalação + validação por sistema |

## Variáveis de ambiente (servidor do SaaS)

```
XFTS_HUB_URL=https://xfts-flexus.com
XFTS_APP=barbearia            # clinica | estetica | crm | aba | casa360
XFTS_APP_KEY=<chave do sistema no Control Center>
```

A chave nunca vai para o browser: quem fala com o hub é sempre o backend do SaaS.

## Papel do usuário dentro do tenant (obrigatório)

As telas do painel admin estão cadastradas como **Administrador do cliente**. O SaaS precisa
informar o papel do usuário logado ao hub (`acting_as`):

- `TENANT_ADMIN` — dono, gerente, recepção e demais perfis com acesso ao painel;
- `TENANT` — cliente final e profissional (portais).

Use `actingAsFromRole(role)` de `gate-endpoint.ts` ou a sua própria função. O papel vem
**sempre da sessão no servidor** — nunca de um parâmetro do browser. Enviar `TENANT` para
uma tela do painel gera 403 correto, e foi a causa do painel aparecer todo bloqueado.

## Passo a passo

1. Copiar os três arquivos e ajustar `getCurrentUserId` e `getActingAs` para a sessão do SaaS.
2. Registrar `GET /api/xfts/gate` (usa `xftsGateHandler`).
3. Envolver cada tela protegida:

```tsx
<CapabilityGate path="/relatorios/retencao">
  <RelatorioRetencao />
</CapabilityGate>
```

4. Proteger a rota de dados de cada tela — **obrigatório**, é aqui que o 403 é real:

```ts
app.get("/api/relatorios/retencao", xftsGuard("reports.retention_analysis", getCurrentUserId), handler);
app.post("/api/relatorios/export", xftsGuard("reports.export", getCurrentUserId), handler);
```

5. Remover os antigos `if (plan === "PRO")` e `entitlements.<recurso>` (tabela em `docs/flexus-can.md`, seção 3).

## Telas × capability por sistema

O mapa oficial vem do hub em `GET /api/public/capability-routes?app=<app>` e é editável em
**/admin/produtos → Telas dos SaaS**. Referência atual:

| Sistema | Tela | Capability |
| --- | --- | --- |
| Barbearia | `/agenda` | `agenda.view` |
| Barbearia | `/relatorios/retencao` | `reports.retention_analysis` |
| Barbearia | `/relatorios/ranking` | `reports.professional_ranking` |
| Barbearia | `/configuracoes/integracoes` | `integrations.api` |
| Barbearia | `/automacoes` | `automations.whatsapp` |
| Clínica / Estética | `/relatorios/retencao`, `/relatorios/ranking` | `reports.retention_analysis`, `reports.professional_ranking` |
| CRM | `/relatorios/funil`, `/relatorios/previsao` | `reports.sales_funnel`, `reports.revenue_forecast` |
| ABA | `/relatorios/evolucao` | `reports.progress_analysis` |
| Casa360° | `/relatorios/ocupacao`, `/relatorios/previsao-financeira` | `reports.occupancy_analysis`, `reports.financial_forecast` |
| Todos | `/configuracoes/marca` | `branding.custom` |
| Todos | exportação de relatórios | `reports.export` |

## Checklist de aceite por SaaS

- [ ] Usuário sem o recurso vê a tela "Recurso indisponível no seu plano" com link para /minha-conta.
- [ ] A rota de dados correspondente responde **403** mesmo chamada direto por `curl`.
- [ ] Queda do hub bloqueia (fail-closed), não libera.
- [ ] Mudança de plano exigido feita no admin passa a valer em até 60s, sem deploy do SaaS.
