import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { prepareArticleMarkdown } from "@/lib/article-markdown";

/**
 * Renderiza o conteúdo do artigo (Markdown): parágrafos, **negrito**, *itálico*,
 * subtítulos, listas, citações, links e tabelas. HTML cru é ignorado por segurança.
 */
const components: Components = {
  // O H1 da página é o título do artigo; um "#" no texto vira H2.
  h1: ({ children }) => <h2 className="mb-3 mt-10 text-2xl font-bold text-foreground">{children}</h2>,
  h2: ({ children }) => <h2 className="mb-3 mt-10 text-2xl font-bold text-foreground">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-2 mt-8 text-xl font-semibold text-foreground">{children}</h3>,
  h4: ({ children }) => <h4 className="mb-2 mt-6 text-lg font-semibold text-foreground">{children}</h4>,
  p: ({ children }) => <p className="mb-4 leading-relaxed text-muted-foreground">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ href, children }) => {
    const external = !!href && /^https?:\/\//i.test(href) && !href.includes("xfts-flexus.com");
    return (
      <a
        href={href}
        className="font-medium text-primary underline underline-offset-4"
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {children}
      </a>
    );
  },
  ul: ({ children }) => <ul className="mb-4 ml-6 list-disc space-y-1.5 text-muted-foreground marker:text-primary">{children}</ul>,
  ol: ({ children }) => <ol className="mb-4 ml-6 list-decimal space-y-1.5 text-muted-foreground marker:text-primary">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed [&>p]:mb-1">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-6 border-l-4 border-primary bg-primary/5 px-5 py-3 [&>p]:mb-0 [&>p]:text-foreground">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-8 border-border" />,
  img: ({ src, alt }) =>
    typeof src === "string" ? (
      <img src={src} alt={alt ?? ""} loading="lazy" className="my-6 w-full rounded-lg" />
    ) : null,
  code: ({ children }) => <code className="rounded bg-muted px-1.5 py-0.5 text-sm text-foreground">{children}</code>,
  table: ({ children }) => (
    <div className="my-6 w-full overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[480px] border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-primary/10 text-foreground">{children}</thead>,
  tr: ({ children }) => <tr className="border-b border-border last:border-0 even:bg-muted/30">{children}</tr>,
  th: ({ children }) => <th className="px-4 py-3 font-semibold">{children}</th>,
  td: ({ children }) => <td className="px-4 py-3 align-top text-muted-foreground">{children}</td>,
};

export function ArticleContent({ content, title }: { content: string; title?: string }) {
  return (
    <div className="text-base">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={components}>
        {prepareArticleMarkdown(content, title)}
      </ReactMarkdown>
    </div>
  );
}
