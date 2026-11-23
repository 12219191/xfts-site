/**
 * Normaliza o texto do artigo antes de renderizar:
 * - quebras de linha do Windows viram \n;
 * - remove o "# Título" inicial quando ele repete o título do artigo
 *   (a página já mostra o título como H1).
 */
export function prepareArticleMarkdown(content: string, title?: string): string {
  let text = (content ?? "").replace(/\r\n?/g, "\n").trim();
  const m = /^#\s+(.+?)\s*\n/.exec(text + "\n");
  if (m && m[1] !== undefined) {
    const heading = normalizeTitle(m[1]);
    if (!title || heading === normalizeTitle(title)) {
      text = text.slice(m[0].length).trimStart();
    }
  }
  return text;
}

function normalizeTitle(s: string) {
  return s
    .replace(/[*_`#]/g, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
