# Corrigir o bloqueio indevido no FLEXUS Barbearia

## Diagnóstico confirmado

- A conta de José Dias possui assinatura **Pro ativa** do produto Barbearia.
- O plano Pro contém os recursos esperados, incluindo `relatorios_avancados` e `automacoes`.
- As telas administrativas estão corretamente cadastradas no Control Center com escopo `TENANT_ADMIN`.
- No projeto real **FLEXUS | Barbearia**, o cliente do hub envia `acting_as: "TENANT"` de forma fixa em toda verificação. Por isso, todas as telas administrativas são recusadas, mesmo para dono ou administrador.

## Implementação

1. **Resolver o papel no servidor do FLEXUS Barbearia**
   - Consultar o usuário autenticado e seus vínculos reais em `user_roles`/tenant.
   - Classificar `admin`, `super_admin`, `moderator` e usuários com acesso administrativo válido como `TENANT_ADMIN`.
   - Manter `profissional` e cliente final como `TENANT`.
   - Nunca aceitar o papel enviado pelo navegador.

2. **Propagar o papel até o Control Center**
   - Alterar `requireCan`, `requireRoute` e `requireAction` para receber o papel resolvido.
   - Remover o `acting_as: "TENANT"` fixo.
   - Fazer a função `xfts-gate` resolver o papel no servidor e enviá-lo em cada consulta.
   - Preservar o comportamento fail-closed e o retorno 403 real.

3. **Cobrir todos os acessos protegidos**
   - Aplicar a mesma resolução para tela, capability direta e ação protegida.
   - Manter a Central XFTS bloqueada para usuários do tenant.
   - Não alterar planos, entitlements, Stripe, assinatura ou cadastro de capabilities.

4. **Validar a conta afetada e os perfis negativos**
   - Confirmar José Dias como `TENANT_ADMIN` e validar abertura do painel, agenda, financeiro, DRE, Analytics, relatórios e configurações.
   - Confirmar que Backup/Restaurar continuam bloqueados no Pro por exigirem `integracoes_api`.
   - Confirmar que cliente final e profissional continuam recebendo 403 nas telas administrativas.
   - Confirmar que `/superadmin/*` continua recebendo 403 para qualquer usuário do tenant.

## Limite de execução

A alteração principal pertence ao projeto separado **FLEXUS | Barbearia**. O Control Center já está correto; não haverá afrouxamento de segurança nele. A correção deve ser aplicada naquele projeto e depois publicada para afetar o sistema real.
