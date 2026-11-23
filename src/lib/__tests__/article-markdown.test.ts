import { describe, expect, it } from "vitest";
import { prepareArticleMarkdown } from "../article-markdown";

describe("prepareArticleMarkdown", () => {
  it("remove o # título inicial quando repete o título do artigo", () => {
    const out = prepareArticleMarkdown("# Como atrair clientes\n\nTexto", "Como atrair clientes");
    expect(out).toBe("Texto");
  });
  it("mantém o # inicial quando é outro título", () => {
    const out = prepareArticleMarkdown("# Introdução\n\nTexto", "Como atrair clientes");
    expect(out.startsWith("# Introdução")).toBe(true);
  });
  it("normaliza quebras de linha do Windows", () => {
    expect(prepareArticleMarkdown("A\r\n\r\nB")).toBe("A\n\nB");
  });
});
