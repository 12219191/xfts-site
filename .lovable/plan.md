# Estudo: nova paleta Verde Petróleo → Verde Escuro → Dourado → Off-White

## A paleta proposta

| Papel | Hex | Uso sugerido |
|---|---|---|
| Verde petróleo | `#006B63` | Cor principal (headers, títulos, hero, links) |
| Verde escuro | `#004E42` | Profundidade: gradientes, rodapé, hover do principal |
| Dourado | `#FFC107` | Destaque premium: Enterprise, badges, ícones de realce |
| Off-white | `#F7F8F5` | Fundo geral do site e superfícies suaves |

Vantagem: o verde petróleo é praticamente a cor do logo XFTS, então marca e interface passam a falar a mesma língua — hoje o site é azul-marinho e o logo é verde-azulado.

## Decisão importante: quem vira o botão de ação?

Hoje existem duas cores de ação: azul (primário) e verde (CTA "Assinar/Começar"). Na paleta nova o principal já é verde. Para os botões não sumirem uns nos outros, a proposta é:

- **Primário** = verde petróleo `#006B63` (navegação, botões secundários, cabeçalhos)
- **CTA de conversão** = dourado `#FFC107` com **texto escuro** (nunca texto branco — dourado com branco é ilegível)
- **Enterprise/Premium** = gradiente dourado → âmbar mais profundo, mantendo a leitura de "plano topo"

Isso deixa o dourado como a única cor que grita "clique aqui", o que tende a aumentar destaque dos planos.

Alternativa, caso prefira manter o CTA verde: CTA fica verde petróleo e o dourado é reservado só para Enterprise, selos e detalhes. Menos contraste entre CTA e resto do site.

## O que muda na prática

1. **Tokens de cor** (`src/styles.css`): substituir os valores de `--primary`, `--background`, `--cta`, `--brand`, `--secondary`, `--muted`, `--accent`, `--border`, `--ring`, `--surface`, `--sidebar-*` e as cores de gráfico pela nova paleta, mantendo os mesmos nomes — nenhum componente precisa saber que a cor mudou.
2. **Gradientes** (`.gradient-primary`, `.gradient-hero-overlay`): passam a ir de verde petróleo → verde escuro, usados no rodapé e nos heros.
3. **Novos tokens de dourado**: criar `--gold` / `--gold-foreground` (e um gradiente `--gradient-premium`) para os planos Enterprise.
4. **Trocar dourados soltos por token**: hoje `PricingCards.tsx` e `FeatureGate.tsx` usam classes `amber-500` fixas e `text-white`; passam a usar os tokens novos, garantindo texto escuro sobre dourado.
5. **Revisão de contraste**: heros, botões `heroOutline`, botão do WhatsApp, badges "Mais Popular"/"Premium" e a tabela de comparação de planos — todos verificados sobre os fundos novos.
6. **Screenshots antes/depois** da home, de uma landing de produto, da comparação de planos e de `/minha-conta` para você aprovar visualmente.

## Detalhes técnicos

- Valores convertidos para o formato `oklch` do design system: petróleo `oklch(0.475 0.083 186)`, verde escuro `oklch(0.379 0.070 178)`, dourado `oklch(0.844 0.172 85)`, off-white `oklch(0.978 0.004 122)`.
- `--primary-foreground` e `--cta-foreground` ajustados: branco sobre os verdes, texto escuro (`oklch(0.25 0.03 180)`) sobre o dourado.
- Somente CSS e classes de apresentação. Sem alteração em rotas, backend, Stripe, SSO ou lógica de negócio.
- Não há tema escuro ativo no projeto, então o trabalho fica no bloco `:root`.
