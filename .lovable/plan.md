

## Adicionar Plano Enterprise a Cada Página de Produto

### Resumo

Adicionar um terceiro card de plano "Enterprise" em cada uma das 3 páginas de produto, e criar os produtos correspondentes no sistema de pagamentos.

### Preços

| Produto | Básico (atual) | Pro (atual) | Enterprise (novo) |
|---------|---------------|-------------|-------------------|
| Gestão Clínica | R$ 99/mês | R$ 199/mês | R$ 399/mês |
| Gestão Barbearias | R$ 89/mês | R$ 169/mês | R$ 349/mês |
| Gestão Estéticas | R$ 99/mês | R$ 189/mês | R$ 379/mês |

### Alteracoes

**1. Criar 3 produtos Enterprise no sistema de pagamentos** via `batch_create_product`:
- `gestao_clinica_enterprise` - R$ 399/mês
- `gestao_barbearias_enterprise` - R$ 349/mês
- `gestao_esteticas_enterprise` - R$ 379/mês

**2. Adicionar card Enterprise em cada pagina de produto** (3 arquivos):
- `src/routes/produtos.gestao-clinica.tsx`
- `src/routes/produtos.gestao-barbearias.tsx`
- `src/routes/produtos.gestao-esteticas.tsx`

Cada card Enterprise tera visual diferenciado (borda dourada ou destaque premium), com descricao "Para redes e grandes operacoes" e botao CTA apontando para `/contato`.

**3. Tambem criar os produtos Basico e Pro** no sistema de pagamentos (6 produtos adicionais), para que todos os planos estejam registrados e prontos para checkout futuro.

### Detalhes Tecnicos

- Total de 9 produtos criados via `batch_create_product` (3 tiers x 3 produtos)
- Cards seguem o mesmo padrao visual existente (Card + CardContent)
- Enterprise usa estilo premium diferenciado dos demais

