import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUp, ChevronRight } from "lucide-react";

export type LegalSection = {
  id: string;
  number: string;
  title: string;
  content: React.ReactNode;
};

type Props = {
  badge?: string;
  title: string;
  subtitle: string;
  updatedAt: string;
  intro: React.ReactNode;
  sections: LegalSection[];
  breadcrumbLabel: string;
  icon?: "shield" | "file";
};

export function LegalPageLayout({
  title,
  subtitle,
  updatedAt,
  intro,
  sections,
  breadcrumbLabel,
}: Props) {
  const [showTop, setShowTop] = useState(false);
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? "");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onScroll = () => {
      setShowTop(window.scrollY > 400);
      let current = sections[0]?.id ?? "";
      for (const s of sections) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= 120) current = s.id;
      }
      setActiveId(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [sections]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 90;
    window.scrollTo({ top: y, behavior: "smooth" });
  };

  return (
    <>
      {/* Header simples */}
      <section className="border-b border-border bg-muted/30 py-8 md:py-10">
        <div className="container-wide">
          <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Link to="/" className="transition-colors hover:text-foreground">
              Início
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground">{breadcrumbLabel}</span>
          </nav>

          <h1 className="text-2xl font-bold text-foreground md:text-3xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>
          <p className="mt-3 text-xs text-muted-foreground">Última atualização: {updatedAt}</p>
        </div>
      </section>

      {/* Conteúdo do documento */}
      <section className="py-10 md:py-12">
        <div className="container-wide">
          <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
            {/* Sidebar TOC */}
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Nesta página
              </p>
              <nav className="border-l border-border">
                {sections.map((s) => {
                  const active = activeId === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => scrollTo(s.id)}
                      className={`-ml-px flex w-full items-start gap-2 border-l-2 px-3 py-1.5 text-left text-xs transition-colors ${
                        active
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                      }`}
                    >
                      <span className="tabular-nums">{s.number}</span>
                      <span className="leading-snug">{s.title}</span>
                    </button>
                  );
                })}
              </nav>
            </aside>

            {/* Documento */}
            <article className="min-w-0 max-w-3xl">
              {/* Intro */}
              <div className="space-y-3 text-sm leading-relaxed text-foreground/80">
                {intro}
              </div>

              {/* Seções */}
              <div className="mt-10 space-y-8">
                {sections.map((s) => (
                  <section key={s.id} id={s.id} className="scroll-mt-24">
                    <h2 className="mb-3 text-base font-semibold text-foreground md:text-lg">
                      <span className="mr-2 text-primary tabular-nums">{s.number}.</span>
                      {s.title}
                    </h2>
                    <div className="space-y-3 text-sm leading-relaxed text-foreground/80 [&_ul]:space-y-1 [&_ul]:text-sm">
                      {s.content}
                    </div>
                  </section>
                ))}
              </div>

              {/* Rodapé do documento */}
              <div className="mt-12 border-t border-border pt-6 text-xs text-muted-foreground">
                <p>
                  <strong className="text-foreground">XFTS</strong> · CNPJ 23.102.588/0001-90 ·{" "}
                  <a href="mailto:xfts@xfts.com.br" className="text-primary hover:underline">
                    xfts@xfts.com.br
                  </a>{" "}
                  ·{" "}
                  <a href="https://xfts.com.br" className="text-primary hover:underline">
                    xfts.com.br
                  </a>
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Voltar ao topo */}
      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-foreground/80 text-background shadow-md transition-all hover:bg-foreground"
          aria-label="Voltar ao topo"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      )}
    </>
  );
}
