# P1-02D — Auditoria de consumo dos limites nos SaaS FLEXUS

Data: 04/11/2026. Escopo: inspeção somente leitura de repositórios Lovable e bancos PostgreSQL/Supabase dos projetos relacionados. Nenhuma migração, alteração de dados, função, usuário, licença ou assinatura foi executada.

## Fonte de verdade esperada

O Control Center usa `entitlements.usuarios` explícito (inteiro não negativo ou `null` ilimitado), com `catalog_plans.seats` numérico como compatibilidade. PR #13 removeu o fallback presumido por tier no resolver central. **Os bancos individuais dos SaaS aplicam lógica própria e não foram alterados por esse PR.**

## Evidência por produto

| Produto | Projeto Lovable | Banco / implementação observada | Risco / ação |
|---|---|---|---|
| Barbearia | `d91aeab2-db89-4030-90fa-4301f52f043c` | 138 tabelas públicas; `hub_accounts`; plano de Capability Gate em `.lovable/plan/bloqueio-de-telas-pelo-control-center-xfts-capability-gate-2026-09-16.md` descreve `unmanaged: true` quando não vinculado. | Verificar implementação efetiva (o arquivo é plano, não prova de deploy), limites de profissionais, membros e capacidades em rotas sensíveis. |
| Estética | `1cc73ba3-52d7-4aca-b752-e5b3fded6772` | 163 tabelas públicas; `hub_accounts`; mesmo arquivo de plano citado para Barbearia, inclusive `XFTS_APP=barbearia`. | Validar `XFTS_APP`/chave em produção, distinção de profissionais/salas e autorização por tenant. Plano não demonstra estado implantado. |
| CRM | `f449e934-4570-4049-b2eb-95faa06bd3b2` | `enforce_tenant_seat_limit` retorna sem bloquear se `tenant_hub_links.limite_usuarios IS NULL`; `tenant_entitlement_status` dá exceção `exempt_internal` / `exempt_unlinked`. | Formalizar política para não vinculados; se vinculado, distinguir `null` ilimitado de ausente. Na coleta: **0** registros em `tenant_hub_links`; risco potencial, não incidente demonstrado. |
| Flow | `530d94fa-e699-4754-af14-489052724280` | `workspace_entitlement`: quando falta `limites.key`, retorna JSON `null` se `hub_ativo` e `confirmed=true`; `guard_seat_limit` lê `entitlements->>'limite_usuarios'` e retorna sem impor limite quando nulo. | **Alta prioridade**: evitar atribuir ilimitado ao ausente; reconciliar duas fontes (`limites.usuarios` vs `limite_usuarios`); teste de insert/invite em Sandbox. Na coleta: 1 assinatura Hub ativa, 0 com usuários ausentes. |
| Casa360° | `9378f367-e6ed-49b8-adcb-df4637cb2246` | `_tenant_seat_limit` lê `hub_accounts.limite_usuarios`; `_guard_invite_seats` permite convite caso o limite retorne SQL `NULL`. | **Alta prioridade**: distinguir limite nulo por ilimitado explícito de ausência/erro de sincronização. Coleta: 3 contas `hub_accounts`, 0 com limite nulo. Não confundir usuários da equipe com moradores. |
| Atende | `c6619476-061c-416a-a510-73945010c9c9` | `limite_efetivo_org` usa `least(max_operators|max_agents` do plano local, limites `hub_org_links`) e converte limite JSON inválido/null em zero. `hub_limite_agentes` verifica insert para orgs vinculadas. | Pode restringir plano concedido pelo Hub quando o plano local estiver desatualizado; confirmar regra comercial. Coleta: 2 vínculos, 0 limites de usuários nulos. |
| Clínica | `9d031f63-fe7d-4dbb-9857-28a4210d7b64` | 67 tabelas públicas; nenhuma função pública encontrada com nomes contendo `entitle`, `seat`, `hub` ou `limit`. | **Cobertura não demonstrada**: auditar login, provisionamento, middleware e restrições no backend antes de declarar integração completa. |
| ABA 2.0 | `d2805e6c-2697-404b-a767-db5ce29e9a26` | Projeto encontrado, status do banco `enabled`; consulta ao PostgreSQL retornou erro de acessibilidade. | **Não auditado no banco**: repetir leitura quando disponível; verificar versão efetivamente publicada e entitlements. |

## Evidência adicional de uso (dados agregados, sem informação pessoal)

- Flow: `subscriptions` tem **1** registro `source='hub'`, `hub_ativo=true`; **0** casos com limites de usuários ausentes na amostra.
- CRM: `tenant_hub_links` possui **0** registros. Não inferir que não há tenants: esta tabela apenas registra vínculos.
- Casa360°: `hub_accounts` possui **3** registros; **0** com `limite_usuarios` SQL nulo.
- Atende: `hub_org_links` possui **2** registros; **0** com `limite_usuarios` SQL nulo.
- Clínica: ausência de função com nome específico não comprova falta total de bloqueio; pode existir no aplicativo/edge/server.

## Divergências de contrato a eliminar

1. **Ausente vs ilimitado**: JSON `null` explícito é ilimitado; chave inexistente ou snapshot indisponível é **não configurado**, normalmente zero para um tenant vinculado. SQL `NULL` não preserva sozinho a distinção.
2. **Fonte e precedência**: assinaturas Hub devem consumir o limite efetivo recebido; não misturar silenciosamente o teto local com o do Hub, salvo se for um máximo operacional documentado.
3. **Unidade da métrica**: `usuarios` (assentos de login), `moradores`, `profissionais`, `agentes_ia`, `unidades`, `channels` são capacidades distintas. Não inferir uma da outra.
4. **Tenant não vinculado**: documentar quando um ambiente legado/interno pode operar sem plano e por quanto tempo, com auditoria.
5. **Aplicação no servidor**: validar no banco/RPC/edge e não apenas na interface, inclusive concorrência de convites e onboarding.

## Sequência de remediação recomendada — alterações somente em PRs independentes

1. **Flow (P1-02D-01):** corrigir funções para retornar 0 quando falta limite em assinatura Hub confirmada, preservando `null` JSON **explícito** como ilimitado; unificar `guard_seat_limit` com a função de entitlement; teste de convites e concorrência.
2. **Casa360° (P1-02D-02):** persistir modo explícito de limite no snapshot do Hub, preservando contratos ilimitados e rejeitando ausência de sincronização; migração reversível e testes de morador.
3. **Atende / CRM (P1-02D-03):** reconciliar plano local, Hub e exceções para tenants sem vínculo; testar limite de operadores, agentes e acesso expirado.
4. **Barbearia / Estética (P1-02D-04):** confirmar implantação real do Capability Gate, chaves de aplicativo, RBAC e limites de profissionais/unidades. Não confundir plano `.lovable` com código ativo.
5. **Clínica / ABA (P1-02D-05):** identificar sistema e versão ativos e finalizar auditoria de backend antes da homologação.

## Critérios de aceite

- Nenhuma operação de leitura ou correção pode alterar tenants, quotas ou cobranças fora do escopo autorizado.
- `null` explícito permanece ilimitado; ausência retorna não configurado/fail-closed para tenants gerenciados.
- Overrides existentes permanecem funcionais, sem extrapolar o significado da unidade da métrica.
- Testes com assinatura ativa, cancelada, expirada, lookup inválido, valores `0`, numéricos, `null` explícito e chave ausente.
- Testes de acessos em servidores/bancos de cada produto, com rollback documentado.


---

## Retomada somente leitura — 12/11/2026

**Fonte:** definições atuais de funções SQL (pg_get_functiondef) em projetos originais Lovable e contagens agregadas. Sem escrita, sem teste mutável em produção. **PR permanece DRAFT / NO-GO para encerramento transversal.**

| Produto | Achados atualizados | Status / próximos testes |
|---|---|---|
| **Flow** | `resolve_entitlement` atual retorna `0` JSON quando a chave não existe em limites Hub confirmados; mantém `null` JSON explícito como ilimitado e `guard_seat_limit` usa esse resolvedor. 1 assinatura Hub confirmada ativa, nenhuma com limite de usuários ausente. | **Risco original mitigado no SQL atual**, sem prova de regressão completa. Testar convites, concorrência, 0, positivo, null, ausente, expiração e rastrear a migração/versão que alterou a função. |
| **Casa360°** | `_tenant_seat_limit` lê `hub_accounts.limite_usuarios`; `_guard_invite_seats` libera quando retorna SQL NULL. 3 contas Hub; 0 com limite nulo. | **Risco de código confirmado**, impacto atual não observado. Distinguir ilimitado explícito de ausência/erro com snapshot versionado, QA e concorrência. |
| **Atende** | `limite_efetivo_org` parte do plano local e aplica `least` para os limites do Hub; se a chave JSON está presente, valor nulo/inválido retorna 0. 2 vínculos Hub; 0 `limite_usuarios` nulos; 1 vínculo com chave `agentes_ia`. | **Regra potencialmente restritiva confirmada**, prejuízo real não comprovado. Aprovar precedência comercial e testar plano local divergente, null, zero, ausente, expirado. |
| **CRM** | `enforce_tenant_seat_limit` ainda libera `exempt_internal`, `exempt_unlinked` e limite SQL NULL; `tenant_entitlement_status` considera expiração e sincronização. 0 registros em `tenant_hub_links`. | **Exceções confirmadas**, impacto não comprovado. Formalizar política não vinculado e teste de contrato gerenciado. |
| **Barbearia / Estética** | Projetos originais acessíveis; respectivamente 138 e 164 tabelas públicas. Não inspecionados nesta retomada os gates implantados ou variáveis. | **Não comprovados**: verificar código ativo, enforcement e `XFTS_APP` real da Estética, sem expor segredos. |
| **Clínica** | Projeto acessível, 67 tabelas públicas; sem inspeção adicional de middleware. | **Incompleto**: inspeção de backend e versão efetiva. |
| **ABA 2.0** | Banco continuou inacessível na consulta autorizada. | **BLOCKED**: retomar acesso e evidências sem declarar aprovação. |

### Ordem atualizada de remediação (sem execução nesta rodada)

1. **P0 Casa360° / Atende:** especificar correções isoladas por produto, validar contratos e ensaiar em QA antes de qualquer mudança produtiva.
2. **P0/P1 Flow:** não reaplicar correção de limite ausente às cegas; o resolvedor atual já faz fail-closed. Obter regressão dirigida e trilha de migração para marcar RESOLVED.
3. **P1 CRM:** formalizar exceções dos não vinculados e limites nulos.
4. **P1 Barbearia/Estética:** demonstrar implantação de Capability Gate e identidade correta do aplicativo.
5. **P1 Clínica/ABA:** completar auditoria ou registrar bloqueio técnico documentado.
6. **Encerramento PR #14:** evidências de QA, classificação por produto e contrato aprovado. Merge do relatório não equivale à correção dos SaaS.

**Integridade:** nenhuma função, trigger, tenant, conta, migração, plano ou assinatura foi alterada nesta inspeção. Contagens representam uma amostra instantânea.


## Decisão de escopo — 12/11/2026 (orientação do responsável)

**Clínica e ABA ainda não são produtos disponíveis. Excluídos temporariamente do escopo ativo da auditoria e da homologação do PR #14.** As observações anteriores sobre esses projetos ficam retidas apenas como histórico; não representam falhas operacionais de produtos ativos, nem impedimentos para finalizar esta rodada.

**Escopo ativo:** FLEXUS | Flow, Casa360°, Atende, CRM, Barbearia e Estética; integrações respectivas com Control Center/Hub e enforcement de entitlements.

**Fora de escopo / adiado:** FLEXUS | Clínica e FLEXUS | ABA. A auditoria será realizada em ocasião futura, quando os produtos estiverem disponíveis para implantação. Não exigir acesso a seus bancos ou testes de homologação para fechar o PR #14.

**Precedência:** esta decisão substitui os itens antigos que classificavam Clínica/ABA como bloqueios, pendências P1 ou condições de encerramento deste PR. Os demais achados e gates permanecem inalterados.


---

## Revisão dirigida — Casa360° seguido de Atende (12/11/2026)

**Modo:** somente leitura, SQL das funções e triggers nos projetos Lovable originais; sem alterações, convites de teste ou escrita no banco. Os valores agregados são instantâneos. A existência das regras atuais não equivale a teste funcional no app publicado.

### Casa360° — comportamento efetivamente observado

- `_tenant_seat_limit(tenant)` lê somente `hub_accounts.limite_usuarios` do owner mais recentemente atualizado. A tabela `hub_accounts` expõe limite inteiro/SQL NULL, mas não um campo que preserve explicitamente o *modo* (não configurado vs ilimitado) na função examinada.
- `_guard_invite_seats` está conectado por trigger `BEFORE INSERT OR UPDATE` em `tenant_invites`. Quando `_tenant_seat_limit` retorna SQL NULL, a função **permite** o convite; quando numérico, bloqueia ocupação >= limite. O cálculo conta membros + convites pendentes válidos e exclui o próprio convite em atualização. Há `SELECT FOR UPDATE` em `tenants` para serializar a concorrência no caminho de limite numérico.
- `accept_invite` também usa o limite e bloqueia novos membros quando numérico e lotado; para SQL NULL, não impõe teto. `_guard_tenant_members_direct` impede alterações diretas de membros por `authenticated` e `anon`, exigindo RPC.
- `resend_invite` renova o convite, sujeito ao trigger de vagas; `get_seat_usage` apresenta limite, membros e uso, mas o `null` mostrado não distingue origem.
- Amostra: 3 vínculos em `hub_accounts`, zero com `limite_usuarios` SQL NULL. **Não houve incidência observada; o comportamento permissivo quando NULL está confirmado no código**.
- **Atenção:** o caminho `accept_invite` usa bloqueio de tenant e conferência de membros; a concorrência entre aceite e novo convite requer testes dirigidos. Não assumir que todas as condições estão cobertas apenas pela inspeção estática.

**Correção proposta (NÃO APLICADA):** snapshot do Hub com `limit_mode` explícito (unlimited / limited / unconfigured) e limite, ou estrutura canônica equivalente; `unconfigured` em tenant gerenciado deve falhar de forma restritiva e rastreável; `unlimited` explícito permanece permitido. Preservar tenants legados não vinculados por política específica e validar `tenant_invites`, `accept_invite`, `get_seat_usage` sob o mesmo contrato. Testes de 0, 1, cheio, ilimitado, ausência de sincronização, aceite, reenvio e concorrência.

### Atende — comportamento efetivamente observado

- `hub_sincronizar_vinculo` armazena `limite_usuarios` SQL inteiro e `limites` JSONB e atualiza o plano local através de `hub_definir_plano_org` para slugs `basic`, `standard`, `corporate`. O vínculo ativo não dispensa comparação de direitos.
- `limite_efetivo_org(org,recurso)` inicia em `plans.max_operators/max_agents`, aplica `LEAST` com limite legado `limite_usuarios` (usuarios) e depois `LEAST` para o JSON `limites.usuarios/agentes_ia`. **Chave JSON presente com `null` ou valor inválido força zero**, não ilimitado. Chave ausente mantém teto do plano local.
- `hub_limite_agentes` está conectado por trigger `BEFORE INSERT` em `agents`, exige limite quando há vínculo e serializa pela advisory lock. Não foram observados triggers específicos de **limite de assentos** em `organization_members` ou `user_roles`; há apenas guardas `bloquear_super_admin` e timestamps nessas tabelas. Isto **não comprova** ausência de enforcement no aplicativo/RPC, que requer inspeção separada.
- `aceitar_convite` valida autenticação, destinatário, expiração e papel; na definição SQL inspecionada não consulta `limite_efetivo_org` antes de ativar participação. Deve-se conferir possíveis guardas adicionais em backend e RLS.
- Amostra de 2 vínculos: um ativo com plano local `max_operators=2/max_agents=2` e limites Hub de 2 usuários/2 agentes; outro inativo com `limite_usuarios=0` e plano local de teto maior. **Não há evidência de restrição indevida no vínculo ativo desta amostra**.
- **Risco confirmado de contrato:** `LEAST` com plano local e a conversão de `null` para zero podem negar concessões ilimitadas ou superiores do Hub. O contrato comercial precisa decidir se teto local é implementação técnica legítima ou apenas legado.

**Correção proposta (NÃO APLICADA):** definir precedência canônica por entitlement e separar `missing`, `zero`, `number` e `unlimited` antes da conversão para SQL inteiro; impor limite em caminhos de criação, convite e aceite de operadores no backend e não apenas interface; preservar status de assinatura, sandbox/live, idempotência e concorrência. Testar 0, positivos, ilimitado, ausente, expiração, mudança de plano, 2 convites simultâneos, plano local inferior e superior ao Hub.

### Decisão e critérios de saída desta rodada

1. **Casa360° — P0:** caso SQL NULL fail-open comprovado no trigger e no aceite, nenhum caso no snapshot atual. Gate de mudança requer contrato de limite e compatibilidade com legados.
2. **Atende — P0:** precedência via mínimo e `null` forçado a zero comprovados; enforcement da quantidade de operadores no aceite ainda **não demonstrado**, pode ser problema adicional. Não inferir defeito em produção real a partir de teste estático.
3. **Ambos:** nenhuma alteração autorizada/executada; PR #14 permanece draft, aguardando planos de correção por projeto e testes direcionados em QA, não deploy automático.


### Acompanhamento Casa360° — 12/11/2026

Foi aberto o [PR #4 do Casa360°](https://github.com/12219191/flexus-casa360/pull/4), em **draft**, com contrato de modo de limite, rollout em duas etapas e 18 cenários de homologação. **Somente documentação; nenhuma função, migration ou teste do sistema foi alterado/executado.** A remediação P0/P1 ainda não está concluída. O PR #14 continua em draft.
