# Instalar o capability gate em um SaaS FLEXUS

Kit pronto para colar. Vale para Barbearia, Clínica, Estética, CRM, ABA e Casa360°.
Nada muda em planos, Stripe, checkout ou assinaturas.

## Arquivos

| Copiar deste kit | Para o SaaS |
| --- | --- |
| `xfts-hub-client.ts` | `src/lib/xfts-hub.ts` |
| `CapabilityGate.tsx` | `src/components/CapabilityGate.tsx` |
| `gate-endpoint.ts` | rota `GET /api/xfts/gate` + `xftsGuard` no backend |

## Variáveis de ambiente (servidor do SaaS)

```
XFTS_HUB_URL=https://xfts-flexus.com
XFTS_APP=barbearia            # clinica | estetica | crm | aba | casa360
XFTS_APP_KEY=<chave do sistema no Control Center>
```

A chave nunca vai para o browser: quem fala com o hub é sempre o backend do SaaS.

## Passo a passo

1. Copiar os três arquivos e ajustar `getCurrentUserId` para a sessão do SaaS.
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
