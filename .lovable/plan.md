# Preparação do E2E Atende com cortesia (somente leitura até aprovação)

## Conta
- O e-mail informado, `lbruttin@xfts.com`, **não existe**. A conta real é `lbruttin@xfts.com.br` (UUID `f654ced0-9e06-4b2e-8f06-a72d806e7df5`).
- Papéis atuais: superadmin no Control Center e administrador legado.
- Tem 4 assinaturas em outros produtos e **nenhuma do Atende**, então não há risco de duplicar.
- Atenção: conceder para `lbruttin@xfts.com`, que não existe, **envia um convite por e-mail** e cria uma conta nova. Use sempre o `.com.br`.

## Fluxo oficial atual (Controle → Cortesias)
Tela `https://xfts-flexus.com/admin/cortesias`, função `grantCourtesy` em `src/lib/courtesy.functions.ts`.
- Campos: e-mail, sistema, plano (só `basico` ou `pro`), dias (de 1 a 365, então 24h = 1 dia), nota e ambiente (live).
- Na mesma ação, ele grava a assinatura de cortesia (`is_courtesy`, sem Stripe) e **chama o provisionamento do Atende na hora**, sem opção de pular. Também registra o evento e a auditoria.
- Para conta existente, não envia e-mail nem toca no Stripe.

## Bloqueio confirmado
Pelo fluxo atual, a cortesia do Atende **não funciona**. O código monta o preço `flexus_atende_basico_mensal`, mas o plano real é `flexus_atende_basic_mensal`. O resultado:
- o provisionamento é recusado com "plano não reconhecido";
- o login único e os recursos não acham o plano.

O fluxo de cortesia ignora o mapa de tiers por produto.

## Correção mínima proposta (próxima etapa, só com seu aval)
- Fazer `grantCourtesy` aceitar os tiers do produto via `tiersForProduct`: para o Atende, basic, standard e corporate, sem conversão automática.
- Na tela de cortesias, mostrar as opções certas para cada produto.
- Teste do preço gerado para o Atende e regressão dos demais produtos.

## Titular x ator XFTS no login único
- O login único do Atende sempre emite como titular (`purpose: "owner"`). O acesso de suporte é recusado.
- O fato de lbruttin ser superadmin não muda nada: ele entra no Atende como titular da própria cortesia, sem nenhum privilégio interno.
- Teste do usuário: `https://xfts-flexus.com/minha-conta`, e depois o botão de acesso ao FLEXUS | Atende.

## Coordenação com o Atende (antes de gravar)
- O provisionamento envia `user_id f654ced0…`, plano Basic e os limites do catálogo para `https://xfts-flexus10.com/api/public/provision`.
- O Atende precisa confirmar que esse `user_id` não está ligado a nenhuma organização real que já exista.
- Revogar a cortesia envia o cancelamento, com limites zerados.
