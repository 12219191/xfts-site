# Quem entra por onde: 3 tipos de usuário

Hoje o hub só conhece **um** tipo de pessoa: o titular da assinatura. O token de SSO carrega `sub` (user_id do hub), `email`, `app` e `plan`, e `/api/public/entitlements` responde olhando a tabela de assinaturas por `user_id`. Barbeiro convidado e cliente final com link de WhatsApp não existem nesse modelo — e não devem existir da mesma forma.

A proposta é separar em três camadas:

## 1. Titular (dono da conta) — vive no hub
Quem compra, paga, faz upgrade/downgrade e cancela. Login no hub, entra no sistema por SSO. Nada muda.

## 2. Equipe convidada (barbeiros, recepção, terapeutas) — vive no sistema
Não faz sentido cada barbeiro ter conta no hub: ele não paga nada e não deve ver faturamento nem assinatura. O convite continua sendo feito **dentro do sistema** (xfts-flexus6/7/8), com login próprio do sistema.

O hub entra só como fonte de verdade de dois dados:
- **Limite de assentos por plano** (ex.: Basic 2, Pro 6, Enterprise ilimitado) — devolvido pelo hub em `/api/public/entitlements` e no SSO.
- **Corte de acesso**: se a assinatura do titular vence ou é cancelada, o sistema bloqueia a equipe junto (o provisionamento já avisa o sistema em `canceled`/`payment_failed`).

Efeito prático: quando o titular tenta convidar além do limite, o sistema mostra "seu plano permite X usuários — faça upgrade" e leva para `/minha-conta` no hub.

## 3. Cliente final (portal do cliente por token de WhatsApp) — nunca toca o hub
O cliente que agenda um corte não é usuário do FLEXUS nem do hub. O link com token do WhatsApp continua 100% local ao sistema: token curto, uso limitado, escopo restrito ao próprio agendamento/histórico. Ele não passa por `/api/public/sso/verify`, não conta assento e não aparece em nenhuma métrica de assinatura.

Regra de segurança que fica registrada: esse token nunca pode ser trocado por um token de SSO nem dar acesso ao painel administrativo do sistema.

## O que muda neste projeto (hub)

1. **Assentos por plano** em `src/lib/flexus-apps.ts`: mapa `plano -> limite de usuários` por produto (Basic/Pro/Enterprise).
2. **`/api/public/entitlements`** e **`/api/public/sso/verify`** passam a devolver também `limite_usuarios` e `papel: "owner"`, para o sistema saber quantos convites permitir.
3. **Provisionamento** (`src/lib/provisioning.server.ts`): incluir `limite_usuarios` no payload, para o sistema já ajustar os assentos quando o plano muda.
4. **UI em `/minha-conta`**: no card de cada sistema, mostrar "Plano X — até N usuários" e o CTA de upgrade quando o limite estiver no teto.
5. **Comparação de planos**: linha "Usuários inclusos" na tabela, para o limite ficar visível antes da compra.

## O que fica do lado dos sistemas (xfts-flexus6/7/8)
- Manter cadastro/convite de equipe e o portal do cliente por token — nada disso migra.
- Ler `limite_usuarios` do hub e recusar convites acima do limite.
- Bloquear equipe quando o hub informar assinatura inativa.

## Detalhes técnicos
- Payload de SSO ganha `role: "owner"` e `seats: number | null` (null = ilimitado); campos novos e opcionais, então nada quebra nos sistemas atuais.
- Limite calculado a partir do `price_id` (mesma função que já deriva o tier), sem nova tabela.
- Sem alteração de schema no banco nesta etapa.
