# Corrigir "Acesso Negado" no Control Center

## O que está acontecendo

A conta `isabela.fernanda.buosi@gmail.com` entra corretamente (login pelo Google funciona) e tem o papel **superadmin** gravado. O bloqueio não é de login: é a leitura da tabela de papéis que falha.

A regra de segurança que autoriza essa leitura chama uma função interna de verificação, e essa função **não tem permissão de execução para usuários logados**. Resultado: a consulta aos papéis retorna erro, o sistema entende "nenhum papel" e mostra "Sua conta não tem perfil administrativo no Control Center".

Isso afeta qualquer pessoa que dependa da tabela de papéis — não é específico da Isabela.

## Correção

1. Conceder execução da função de verificação de papéis para usuários autenticados (ela é `security definer`, então continua não expondo dados de outras pessoas).
2. Confirmar, com uma consulta feita no papel de usuário logado, que a leitura dos papéis passa a devolver `superadmin`.
3. Deixar a tela de "Acesso Negado" distinguir os dois casos: conta realmente sem papel × falha ao consultar permissões — para que um erro assim não volte a parecer falta de permissão.

## Detalhes técnicos

- Migração: `GRANT EXECUTE ON FUNCTION private.has_admin_role(uuid, admin_role) TO authenticated;` (verificado: `has_function_privilege('authenticated', ...)` = false hoje, enquanto `private.is_admin` já tem).
- A política `Admins veem os proprios papeis` em `public.admin_roles` usa `user_id = auth.uid() OR private.has_admin_role(auth.uid(),'superadmin')`; o `OR` não protege do erro de permissão da função, então o `select` inteiro falha.
- `loadAdminRoles` em `src/lib/admin-rbac.server.ts` ignora `error` e usa `data ?? []`. Passar a propagar o erro para que `getAdminSession` retorne a causa real, e `src/routes/admin.tsx` exiba mensagem de falha técnica em vez de "sem perfil".
- Nenhuma mudança em papéis, contas ou chaves.
