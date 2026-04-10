

## Cadastro do Primeiro Administrador

Vou criar o primeiro usuário administrador com as credenciais fornecidas:

- **Email:** lbruttin@xfts.com.br
- **Senha:** Xfts150!

### Etapas

1. **Habilitar auto-confirmação de email** temporariamente para que o usuário seja criado sem precisar verificar email (já que é o admin inicial).

2. **Criar o usuário** via signup no Supabase Auth com as credenciais informadas.

3. **Registrar como admin** — inserir o `user_id` do novo usuário na tabela `admin_users` para conceder permissões de administrador.

4. **Desabilitar auto-confirmação** após o cadastro, restaurando a exigência de verificação de email para futuros usuários.

Após isso, você poderá acessar `/admin`, fazer login com essas credenciais e gerenciar os artigos do blog.

