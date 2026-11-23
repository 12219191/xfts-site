/**
 * Converte HTML colado (Word, Google Docs, ChatGPT, páginas web) em Markdown,
 * preservando negrito, itálico, subtítulos, listas, links e tabelas.
 * Só roda no navegador (chamado no evento de colar).
 */
export async function htmlToMarkdown(html: string): Promise<string> {
  const [{ default: TurndownService }, gfm] = await Promise.all([
    import("turndown"),
    import("turndown-plugin-gfm"),
  ]);
  const td = new TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
    emDelimiter: "*",
    strongDelimiter: "**",
    codeBlockStyle: "fenced",
  });
  td.use(gfm.gfm);
  td.remove(["style", "script", "meta", "title"]);
  // Google Docs envolve tudo em <b style="font-weight:normal">: não é negrito de verdade.
  td.addRule("gdocsFakeBold", {
    filter: (node) =>
      node.nodeName === "B" && /font-weight:\s*normal/i.test(node.getAttribute("style") ?? ""),
    replacement: (content) => content,
  });
  // Negrito/itálico por estilo (Word e Docs usam <span style="font-weight:700">).
  td.addRule("styledSpan", {
    filter: (node) => node.nodeName === "SPAN" && !!node.getAttribute("style"),
    replacement: (content, node) => {
      const style = (node as HTMLElement).getAttribute("style") ?? "";
      const text = content.trim();
      if (!text) return content;
      const bold = /font-weight:\s*(bold|[6-9]00)/i.test(style);
      const italic = /font-style:\s*italic/i.test(style);
      let out = text;
      if (bold) out = `**${out}**`;
      if (italic) out = `*${out}*`;
      const lead = content.startsWith(" ") ? " " : "";
      const trail = content.endsWith(" ") ? " " : "";
      return lead + out + trail;
    },
  });
  return td
    .turndown(normalizeTables(html))
    .replace(/\u00a0/g, " ")
    .replace(/^(\s*)([-*]|\d+\.)\s{2,}/gm, "$1$2 ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Tabelas coladas de planilhas/Word costumam vir sem linha de cabeçalho (<th>);
 * sem ela o conversor mantém HTML cru, que o site não exibe. A primeira linha vira cabeçalho.
 */
function normalizeTables(html: string): string {
  if (typeof DOMParser === "undefined" || !/<table/i.test(html)) return html;
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("table").forEach((table) => {
    const first = table.querySelector("tr");
    if (!first || first.querySelector("th")) return;
    first.querySelectorAll("td").forEach((td) => {
      const th = doc.createElement("th");
      th.innerHTML = td.innerHTML;
      td.replaceWith(th);
    });
    // Células com parágrafos internos quebram a tabela em Markdown.
  });
  doc.querySelectorAll("td p, th p").forEach((p) => {
    p.replaceWith(doc.createTextNode(`${p.textContent ?? ""} `));
  });
  return doc.body.innerHTML;
}
