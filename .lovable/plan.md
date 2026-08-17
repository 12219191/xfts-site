# Limpar os CTAs da página inicial

Hoje o topo da home mostra três chamadas concorrentes: "Solicite Demo Grátis", "Fale Conosco" (ambas apontando para /contato) e o botão flutuante verde do WhatsApp com o texto "Fale conosco". Isso duplica a mensagem e polui a tela.

## Mudanças

1. **Hero com um CTA principal**
   - Manter apenas "Solicite Demo Grátis" como botão sólido.
   - Trocar o segundo botão por um link discreto "Ver produtos" (leva à seção de produtos), evitando dois botões que vão para a mesma página.

2. **Botão do WhatsApp mais leve**
   - Manter o botão flutuante, mas só com o ícone (círculo verde), sem o texto "Fale conosco" e sem o efeito de pulso contínuo.
   - O texto aparece apenas ao passar o mouse (tooltip/expansão suave), mantendo o rótulo acessível para leitores de tela.

3. Nenhuma mudança em formulários, rotas ou lógica de contato.

## Detalhes técnicos

- `src/routes/index.tsx`: ajustar o bloco de CTAs do hero (linhas ~111-122); o segundo botão vira link para a seção de produtos com variante `heroOutline` mais sutil ou `ghost`.
- `src/components/WhatsAppButton.tsx`: `WhatsAppFloatingButton` passa a ser um botão circular icon-only com expansão no hover (`group-hover:max-w-[10rem]`), remove `animate-ping`, mantém `aria-label`.
- `WhatsAppInlineButton` (usado em /contato) permanece igual.
