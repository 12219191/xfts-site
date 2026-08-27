# Alerta de integrações vermelho sem falha real

## O que os dados mostram

Consultei os eventos das últimas 24h dos três sistemas:

- Os únicos eventos com status de erro são três testes de conexão de **26/08 às 21:42** (Barbearia HTTP 400, CRM HTTP 400, Casa360° HTTP 500).
- Poucos minutos depois, **21:49–21:51 do mesmo dia**, os mesmos testes voltaram 200, e hoje (27/08, 18:30) os três testaram 200 de novo.
- Depois disso só há acessos SSO e entitlements com status ok; o único "recusado" é um `sem assinatura` da Barbearia (comportamento correto, não falha).

Ou seja: os três sistemas estão saudáveis. O alerta está vermelho porque o semáforo marca vermelho quando existe **qualquer** erro na janela de 24h, mesmo que já tenha havido sucesso depois. Como o erro é de 23h atrás, ele some sozinho em ~30 minutos — mas o mesmo vai se repetir a cada teste que falhar uma vez.

## O que mudar

1. **Semáforo por recência, não por acúmulo.** Para cada sistema, comparar o último sucesso com a última falha:
   - vermelho: chave não configurada, ou a última falha é mais recente que o último sucesso;
   - amarelo: houve falhas nas 24h, mas já houve sucesso depois (situação de agora) ou só recusas;
   - verde: só sucessos;
   - cinza: sem eventos.
2. **Alerta do painel inicial** passa a listar apenas sistemas em vermelho por esse novo critério, evitando alarme de falha já resolvida.
3. **Texto de apoio na Saúde do SSO**: quando o sistema estiver amarelo por falha já recuperada, mostrar "falha às HH:MM, recuperado às HH:MM" em vez de só a contagem.
4. **/api/public/health** segue a mesma regra, para o monitor externo não disparar por erro antigo.

## Detalhes técnicos

- `src/lib/reliability.server.ts`: em `buildSsoHealth`, calcular `ultimoSucessoAt` e `ultimaFalhaAt` (já existem) e derivar `semaforo` da comparação entre eles em vez de `errored.length > 0`; `buildOpsAlerts` passa a filtrar por esse semáforo recalculado.
- Manter os contadores `erros24h`/`recusas24h` como estão — eles continuam úteis no painel.
- Sem mudança de schema, de chaves ou dos endpoints dos sistemas.
