# Exportar a documentação de integração em arquivo único

## Objetivo

Gerar um único arquivo markdown consolidado com todo o conteúdo de `docs/integracao-hub/`
(contrato geral + Barbearia + CRM + Casa360°), pronto para enviar aos outros três projetos Lovable.

## O que será feito

1. Concatenar, nesta ordem, em um só documento:
   - Contrato de integração (README): SSO, provisionamento assinado, revalidação, tabela de endpoints
   - FLEXUS | Barbearia (SPA + funções de backend)
   - FLEXUS | CRM (diferenças em relação ao Barbearia)
   - FLEXUS | Casa360° (TanStack Start, rotas nativas)
2. Adicionar no topo um sumário e uma nota curta de uso ("cole este arquivo no chat do projeto
   correspondente e peça a implementação da sua seção").
3. Ajustar os links internos entre arquivos para âncoras dentro do documento único.
4. Salvar como artefato para download: `integracao-hub-flexus.md`.

## Detalhes técnicos

- Nenhuma alteração em código do site; os arquivos em `docs/integracao-hub/` permanecem como estão.
- A saída vai para a área de documentos (download direto pelo chat), não para o repositório.
