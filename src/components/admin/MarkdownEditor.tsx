import { useRef, useState, type ClipboardEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArticleContent } from "@/components/blog/ArticleContent";
import {
  Bold, Italic, Heading2, Heading3, List, ListOrdered, Quote, Link2, Table, Minus,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  id: string;
  value: string;
  onChange: (value: string) => void;
  title?: string;
}

type Action =
  | { kind: "wrap"; before: string; after: string; placeholder: string }
  | { kind: "line"; prefix: string; placeholder: string }
  | { kind: "block"; text: string };

const TABLE_TEMPLATE =
  "| Coluna 1 | Coluna 2 |\n|---|---|\n| Valor | Valor |\n| Valor | Valor |";

const TOOLS: Array<{ label: string; icon: typeof Bold; action: Action }> = [
  { label: "Negrito", icon: Bold, action: { kind: "wrap", before: "**", after: "**", placeholder: "texto em negrito" } },
  { label: "Itálico", icon: Italic, action: { kind: "wrap", before: "*", after: "*", placeholder: "texto em itálico" } },
  { label: "Subtítulo", icon: Heading2, action: { kind: "line", prefix: "## ", placeholder: "Subtítulo" } },
  { label: "Subtítulo menor", icon: Heading3, action: { kind: "line", prefix: "### ", placeholder: "Subtítulo menor" } },
  { label: "Lista", icon: List, action: { kind: "line", prefix: "- ", placeholder: "Item" } },
  { label: "Lista numerada", icon: ListOrdered, action: { kind: "line", prefix: "1. ", placeholder: "Item" } },
  { label: "Destaque (citação)", icon: Quote, action: { kind: "line", prefix: "> ", placeholder: "Frase em destaque" } },
  { label: "Link", icon: Link2, action: { kind: "wrap", before: "[", after: "](https://)", placeholder: "texto do link" } },
  { label: "Tabela", icon: Table, action: { kind: "block", text: TABLE_TEMPLATE } },
  { label: "Linha divisória", icon: Minus, action: { kind: "block", text: "---" } },
];

/** Editor do conteúdo do artigo: barra de formatação, prévia fiel ao site e colagem com formatação. */
export function MarkdownEditor({ id, value, onChange, title }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [tab, setTab] = useState<"write" | "preview">("write");

  function apply(action: Action) {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end);
    let insert = "";
    let selStart = start;
    let selEnd = start;

    if (action.kind === "wrap") {
      const inner = selected || action.placeholder;
      insert = action.before + inner + action.after;
      selStart = start + action.before.length;
      selEnd = selStart + inner.length;
    } else if (action.kind === "line") {
      const lines = (selected || action.placeholder).split("\n");
      insert = lines
        .map((l, i) => (action.prefix === "1. " ? `${i + 1}. ` : action.prefix) + l.replace(/^(#{1,6}\s|[-*]\s|\d+\.\s|>\s)/, ""))
        .join("\n");
      const atLineStart = start === 0 || value[start - 1] === "\n";
      if (!atLineStart) insert = "\n" + insert;
      selStart = start + (atLineStart ? 0 : 1);
      selEnd = start + insert.length;
    } else {
      const pre = start === 0 ? "" : value[start - 1] === "\n" ? (value[start - 2] === "\n" ? "" : "\n") : "\n\n";
      insert = pre + action.text + "\n\n";
      selStart = start + insert.length;
      selEnd = selStart;
    }

    const next = value.slice(0, start) + insert + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(selStart, selEnd);
    });
  }

  async function handlePaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const html = e.clipboardData.getData("text/html");
    // Só converte quando há formatação real; texto simples cola normalmente.
    if (!html || !/<(b|strong|em|i|h[1-6]|ul|ol|li|table|a|p)[\s>]|font-weight|font-style/i.test(html)) return;
    e.preventDefault();
    const el = e.currentTarget;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    try {
      const { htmlToMarkdown } = await import("@/lib/html-to-markdown");
      const md = await htmlToMarkdown(html);
      const next = value.slice(0, start) + md + value.slice(end);
      onChange(next);
      requestAnimationFrame(() => {
        el.focus();
        const pos = start + md.length;
        el.setSelectionRange(pos, pos);
      });
      toast.success("Texto colado com a formatação preservada");
    } catch {
      const plain = e.clipboardData.getData("text/plain");
      onChange(value.slice(0, start) + plain + value.slice(end));
    }
  }

  return (
    <div className="overflow-hidden rounded-md border border-input">
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/30 px-2 py-1.5">
        <div className="flex flex-wrap items-center gap-0.5">
          {TOOLS.map((t) => (
            <Button
              key={t.label}
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title={t.label}
              aria-label={t.label}
              disabled={tab === "preview"}
              onClick={() => apply(t.action)}
            >
              <t.icon className="h-4 w-4" />
            </Button>
          ))}
        </div>
        <div className="ml-auto flex rounded-md border border-border bg-background p-0.5 text-xs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "write"}
            className={`rounded px-3 py-1 ${tab === "write" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            onClick={() => setTab("write")}
          >
            Escrever
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "preview"}
            className={`rounded px-3 py-1 ${tab === "preview" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            onClick={() => setTab("preview")}
          >
            Prévia
          </button>
        </div>
      </div>

      {tab === "write" ? (
        <Textarea
          ref={ref}
          id={id}
          rows={18}
          className="rounded-none border-0 font-mono text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
          placeholder={"Cole aqui o texto do Word, Google Docs ou ChatGPT — negrito, listas e tabelas são mantidos.\n\nOu escreva: ## Subtítulo, **negrito**, - item de lista, e deixe uma linha em branco entre parágrafos."}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPaste={handlePaste}
        />
      ) : (
        <div className="max-h-[60vh] min-h-[300px] overflow-y-auto bg-background px-5 py-4" data-testid="article-preview">
          {value.trim() ? (
            <ArticleContent content={value} {...(title ? { title } : {})} />
          ) : (
            <p className="text-sm text-muted-foreground">Nada para mostrar ainda.</p>
          )}
        </div>
      )}
    </div>
  );
}
