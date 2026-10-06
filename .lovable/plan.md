# Ativar a FLEXUS | Estética com os dados de produção

## O que muda
Na lista de sistemas, a entrada da Estética passa a usar os dados reais:
- Endereço do sistema: https://xfts-flexus9.com
- Endereço de provisionamento: https://fhtjdctzpeurqgfqkypx.supabase.co/functions/v1/flexus-provision
- Marcada como disponível

O resto (nome, prefixo de preço `gestao_esteticas`, página `/produtos/gestao-esteticas`) não muda.

## Fora do escopo
- Não altero o catálogo no banco: status, venda e acesso continuam como estão no Control Center. Se o produto estiver marcado como indisponível lá, o acesso e o provisionamento continuam bloqueados até você liberar no admin.
- Não altero chaves, assinaturas, pagamentos ou o SSO real. Também não publico.

## Detalhes técnicos
- Editar só o objeto `estetica` em `src/lib/flexus-apps.ts` com o bloco enviado.
- O segredo `FLEXUS_APP_KEY_ESTETICA` já existe e é usado pelo `appApiKey("estetica")`.
- Validação: rodar `tsgo` e `bunx vitest run`, depois conferir o build. Ler (sem alterar) os campos `status`, `available_in_hub` e `available_for_purchase` de `catalog_products` da Estética para dizer se o acesso já está liberado de ponta a ponta.
