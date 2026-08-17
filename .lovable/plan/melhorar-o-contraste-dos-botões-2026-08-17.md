# Melhorar o contraste dos botões

## Problema confirmado

- **"Acessar Sistema"** (hero de todas as 6 landings de produto): usa a variante `outline`, que aplica fundo branco (`bg-background`), enquanto a classe extra força texto branco (`text-primary-foreground`). Resultado: texto branco sobre fundo branco — ilegível.
- **"Fale conosco"** (botão flutuante do WhatsApp): o rótulo só aparece no hover em desktop e fica sobre um halo animado semitransparente, dificultando a leitura; no mobile o rótulo nunca aparece.

## O que será feito

1. **Nova variante de botão `heroOutline`** no design system (`button.tsx`): fundo translúcido escuro com desfoque, borda clara e texto claro — legível sobre qualquer imagem de hero, com hover sólido.
2. Trocar as 6 ocorrências de `variant="outline" className="border-primary-foreground/30 text-primary-foreground..."` por essa nova variante, removendo as classes de cor soltas.
3. **Botão do WhatsApp**: rótulo "Fale conosco" sempre visível (com peso e tamanho legíveis), halo de pulso posicionado atrás do conteúdo sem cobrir o texto, e contraste garantido usando os tokens `cta`/`cta-foreground`.
4. **Varredura rápida** dos demais botões sobre fundos escuros/imagens (heros, seções com gradiente, cards Enterprise) para aplicar a mesma variante quando o mesmo padrão de "outline sobre imagem" aparecer.

## Detalhes técnicos

- Variante adicionada em `src/components/ui/button.tsx` via `cva`, usando apenas tokens semânticos (`primary-foreground`, `cta`), sem cores hardcoded.
- Arquivos tocados: `button.tsx`, `WhatsAppButton.tsx` e as landings `produtos.gestao-clinica`, `produtos.gestao-barbearias`, `produtos.gestao-esteticas`, `produtos.flexus-aba`, `produtos.flexus-crm`, `produtos.flexus-casa360`.
- Nenhuma alteração de backend, rotas ou lógica de negócio.
