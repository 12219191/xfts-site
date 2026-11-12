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


### Casa360° — Etapa A implementada no projeto original (12/11/2026)

- [PR Casa360° #4](https://github.com/12219191/flexus-casa360/pull/4) **MERGED** em `main`, merge SHA `5b328ddaa9f4e3bc0314683996b947f19825dba5`.
- Banco original: três colunas aditivas em `hub_accounts` (`seat_limit_mode`, `seat_limit_source`, `seat_limit_observed_at`), constraints e comentários aplicados com autorização. **Nenhum backfill**: três vínculos existentes continuam com modo NULL até sincronização legítima.
- Backend: classificação de `limites.usuarios=null` explícito como unlimited; inteiro não negativo como limited; ausência/inválido como unconfigured; fallback legado numérico rotulado `hub_legacy`. Integração do registro no SSO e na revalidação diária; tipos ajustados.
- Lovable original confirmou sincronização; commit automático posterior `cf59da07a4ed31bae32a7c9cbb266eebf06537fb`. Teste direcionado **13/13 Vitest PASS** e verificação de tipos (`tsgo -b --noEmit`) **PASS**. Nenhum teste de convite mutável executado.
- Publicação solicitada via Lovable para `https://flexus-casa360.lovable.app`, implantação ID `58a6cda8-17e2-43a3-8c36-76bf596e09d0`; retorno `pending` no instante da solicitação, ainda sem confirmação da versão live.
- **Risco de convites NÃO corrigido pela Etapa A**: `_tenant_seat_limit`, `_guard_invite_seats` e `accept_invite` permanecem com o comportamento anterior. Etapa B exige remediação de enforcement e homologação dirigida.


### Casa360° — Etapa B implementada no banco e código (12/11/2026)

- [PR Casa360° #5](https://github.com/12219191/flexus-casa360/pull/5) **MERGED**; commit de integração `4ca875155a4a77648e9c51da8708fd27f6b4d675`.
- No projeto original, migration `docs/pending-migrations/0008_casa360_seat_enforcement_stage_b.sql` aplicada com autorização. Nova coluna `seat_limit_value`; política `_tenant_seat_policy` consulta o modo canônico e impede tratar ausente como ilimitado; criação/aceitação de convites usa a política no backend; `get_seat_usage` informa modo e origem.
- Compatibilidade: vínculos legados ainda não revalidados com `limite_usuarios` numérico mantêm teto limitado, não recebem infinito. Vínculos sem limite válido, inativos ou ambíguos não ampliam assentos. Usuários antigos não são removidos.
- Inspeção SQL pós-migration: 3 vínculos Hub, 1 tenant com política `limited`, 2 membros, 1 convite histórico, 0 convites pendentes; nenhum `seat_limit_value` revalidado (ainda aguardam nova sincronização legítima com Hub). Sem alteração desses registros.
- Testes automatizados de classificação e typecheck solicitados ao agente Lovable, ainda pendentes de comprovação no instante desta nota. Testes transacionais reais de concorrência/convites ainda exigem homologação. **Não considerar o risco totalmente encerrado sem essa evidência.**

 
### Casa360° — Etapa B: regressão final e solicitação de publicação (12/11/2026)

- Etapa B integrada no [PR Casa360° #5](https://github.com/12219191/flexus-casa360/pull/5), merge `4ca875155a4a77648e9c51da8708fd27f6b4d675`; mensagens de erro amigáveis integradas no [PR #6](https://github.com/12219191/flexus-casa360/pull/6), merge `09c78e7c25fcbc0fe38e25aa1f74261f5f981e30`.
- Lovable original confirmou ambos os merges e working tree limpo. Vitest de classificação **13/13 PASS** e `tsgo -b --noEmit` **PASS**. Sem convite artificial em produção e sem homologação concorrente real.
- SQL aplicado diretamente ao banco original: coluna canônica `seat_limit_value` e funções `_tenant_seat_policy`, `_tenant_seat_limit`, `_guard_invite_seats`, `accept_invite`, `get_seat_usage`. A função SQL original preserva exceção `legacy_unlinked`, distingue `unconfigured` de `unlimited` explícito e preserva limite numérico legado até revalidação. Um tenant existente está classificado como `limited/legacy_pending_refresh`, com 2 membros, 0 convites pendentes e limite 6.
- A tela de membros foi ajustada para mostrar indisponibilidade do limite gerenciado (em vez de 0 usuários do plano) e traduzir o erro `seat_limit_unconfigured`; o aceite de convite também traduz o erro.
- Publicação solicitada para `https://flexus-casa360.lovable.app`, deployment `a6e5e1e9-1328-4564-9a91-7b456982c08f`, estado inicial **pending**, sem comprovação de release live no instante da solicitação.
- **Ainda pendente para resolução completa do P0:** evidência de publicação da versão correta, smoke autenticado de convites/reenvios/aceites e teste de concorrência com dados controlados no projeto original, além de conferência do primeiro snapshot pós-revalidação do Hub. A migration 0008 foi aplicada manualmente, sem entrada nova no journal de migrações; conciliar antes de nova execução automatizada.


### Casa360° — confirmação de publicação pelo responsável (12/11/2026)

O responsável confirmou explicitamente que a publicação do Casa360° foi realizada. Portanto, a **pendência de confirmação da publicação foi encerrada por atestado operacional do responsável**. Esta confirmação não substitui evidência independente do SHA efetivamente servido pelo endereço público. Permanecem pendentes para encerrar o P0: testes funcionais dirigidos de criação, aceite e reenvio de convites (incluindo concorrência), primeira sincronização do valor canônico do Hub e conciliação do journal da migração 0008 aplicada manualmente. Não foram executadas alterações nos SaaS nesta atualização documental.


### Casa360° — aceite funcional adicional pelo responsável (12/11/2026)

O responsável confirmou expressamente como concluídos os itens **(1) criação, reenvio e aceitação de convites; (2) dois convites simultâneos disputando a última vaga; e (3) primeira sincronização do limite canônico recebido do Hub**. Estes itens passam a **homologados por aceite do responsável**, sem afirmar que logs ou rastros técnicos independentes tenham sido anexados a este relatório. A publicação também havia sido confirmada pelo responsável.

**Única pendência remanescente da lista de encerramento do Casa360°:** conciliar o histórico/journal da migração 0008 aplicada diretamente ao banco, evitando execução duplicada. A remediação funcional do limite de convites está confirmada; encerramento documental completo aguarda reconciliação do journal.


### Casa360° — Migração 0008 RECONCILIADA (12/11/2026)

- [PR Casa360° #7](https://github.com/12219191/flexus-casa360/pull/7) **MERGED** (commit `5d1f4e59905f79192f9be31d8be470be617c0845`). Registro técnico: `docs/manual-migrations/README.md` e script `20261112_casa360_0007_0008_registry.sql`.
- Foram criadas **duas entradas auditáveis** no ledger `public.xfts_manual_schema_migrations`, referentes às SQL 0007 (Etapa A) e 0008 (Etapa B) aplicadas manualmente no banco do Casa360°. Cada entrada preserva caminho, Git blob SHA, data conhecida de aplicação e evidências SQL; NÃO reaplicou funções nem modificou contas/convites.
- Controle restrito: RLS ativa, `anon` e `authenticated` sem SELECT, `service_role` com leitura. Colunas, constraints, cinco funções da 0008 e triggers foram conferidos; hashes das definições SQL registrados.
- Journal oficial `drizzle.__drizzle_migrations` **não alterado**, permanecendo com 5 registros (0000–0004). A 0008 não pertence a esse journal; não é correto inserir um registro artificial. A trilha Supabase também não foi alterada.
- **Pendência de reconciliação 0008 encerrada.** A remediação Casa360° desta rodada tem código, SQL, testes direcionados, publicação, aceite funcional e rastreabilidade da migration confirmados. O registro manual e a regra de pré-checagem previnem duplicação operacional por procedimento, não por bloqueio automático do deploy.


### Atende — Revisão dirigida da precedência do Hub e dos convites (12/11/2026)

- SQL atual do Atende `limite_efetivo_org` usa `LEAST` entre `plans.max_operators/max_agents` e `hub_org_links` (legado/JSON), e transforma chave JSON `null` explícita em zero. Com o contrato do Hub, isso pode restringir direitos do plano contratado; o tipo de limite deve ser tratado explicitamente.
- `hub_limite_agentes` impede novos INSERTs de agentes quando esgotado, mas `aceitar_convite` não verifica o limite de operadores na definição SQL examinada. A interface de agentes consulta `org.plano.max_agents`, não os entitlements canônicos.
- Amostra somente leitura: 2 vínculos Hub (1 ativo, 1 inativo). A organização ativa tem `usuarios=2`, `agentes_ia=2`, plano local 2/2, 2 membros ativos e **3 agentes cadastrados**; nenhum dado foi alterado. A situação acima do limite não é prova de inserção recente irregular, e não deve provocar remoção automática de agentes.
- Os arquivos `AGENTS.md` do Atende alertam que certos testes são executados contra banco de produção. Qualquer ensaio de inserção deve exigir escopo sintético/isolamento verificado antes de executar.
- A mudança proposta é aplicar o contrato Hub como fonte canônica para vinculados, manter plano local para não vinculados, separar `limited`, `unlimited` e `unconfigured`, e verificar todos os caminhos de criação/convite/aceite de operadores e agentes, preservando RLS, credits e assinaturas.
- Análise e proposta de implementação solicitadas ao agente do projeto original Lovable; **não declarar implementado/homologado antes da confirmação de edição, SQL e testes**.
