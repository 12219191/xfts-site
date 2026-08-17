# Botão de WhatsApp para contato direto

## O que será feito

Um botão flutuante de WhatsApp, visível em todas as páginas do site, que abre uma conversa direta com o número (17) 99794-3349 já com uma mensagem inicial pronta.

## Comportamento

- Círculo verde com o ícone do WhatsApp, fixo no canto inferior direito, acima do conteúdo.
- Abre `https://wa.me/5517997943349?text=Olá! Gostaria de saber mais sobre as soluções FLEXUS da XFTS.` em nova aba.
- Efeito de hover/pulse discreto e rótulo "Fale conosco" que aparece ao passar o mouse (desktop).
- Acessível: `aria-label` descritivo, `rel="noopener noreferrer"`.
- Registra o clique no tracking existente (`trackCTAClick`) para medir conversão.

## Onde aparece

- Botão flutuante global (todas as páginas), incluindo mobile.
- Botão adicional na seção "Informações de Contato" da página `/contato`, junto aos cards de telefone/e-mail.

## Detalhes técnicos

- Novo componente `src/components/WhatsAppButton.tsx` usando o ícone `MessageCircle` do lucide-react (o pacote não traz um ícone oficial do WhatsApp) ou um SVG inline da marca.
- Renderizado uma única vez em `src/routes/__root.tsx`, ao lado do Footer.
- Cores via tokens do design system (verde de CTA já existente), sem cores hardcoded.
- Nenhuma alteração de backend.
