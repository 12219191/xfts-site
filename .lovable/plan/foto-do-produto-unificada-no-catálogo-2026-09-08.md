# Foto do produto unificada no catálogo

Hoje a foto de um produto vive em dois lugares diferentes:

- o painel "Imagens dos produtos" (upload) grava numa lista separada, usada só pela página inicial;
- o cadastro do produto no Control Center tem seu próprio campo de imagem, usado pela página "Nossos Produtos" e pelas páginas de cada produto.

Por isso a nova foto enviada apareceu só na home.

## O que vai mudar

- O upload de imagem passa a gravar direto no cadastro do produto (imagem + texto alternativo). Uma única foto por produto, válida em todo o site.
- A página inicial passa a usar a mesma foto do cadastro, em vez da lista separada.
- As fotos já enviadas hoje são copiadas para o cadastro do produto, para nada mudar de aparência sem querer.
- O botão "Restaurar padrão" volta a usar a foto original que já vem no site.
- Alterar a foto pelo painel de imagens ou pelo cadastro do produto passa a ter exatamente o mesmo efeito.

## Onde ver o resultado

Após enviar uma foto no painel, ela aparece na home, na página "Nossos Produtos" e na página do produto correspondente (pode levar alguns segundos até a página recarregar os dados).

## Detalhes técnicos

- `ProductImagesPanel.tsx` passa a chamar a função de gravação do catálogo (`saveCatalogProduct`, campos `image_url` / `image_alt`) em vez de escrever em `product_images`; o "Padrão" limpa esses campos, fazendo o mapeamento cair no fallback de `product-content.ts`.
- Ele carrega o estado atual via `getAdminCatalog`, casando `slug` com `catalog_products.key` (as chaves já coincidem: clinica, barbearia, estetica, aba, crm, casa360).
- `src/routes/index.tsx` deixa de usar `useProductImageData()` e passa a ler `imageUrl` / `imageAlt` do catálogo público (`getPublicCatalog`, já usado em `/produtos`), via loader da rota.
- Migração de dados única: copiar `product_images.image_url` / `alt_text` para `catalog_products` onde o catálogo ainda estiver vazio ou com a imagem padrão.
- `src/lib/product-images.ts` fica reduzido aos rótulos/defaults usados pelo painel; hooks que consultavam `product_images` são removidos junto com seus usos.
- A tabela `product_images` permanece no banco (sem uso) para não perder histórico; nenhuma alteração de schema é necessária.
