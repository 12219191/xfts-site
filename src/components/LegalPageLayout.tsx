import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUp, Building2, Calendar, ChevronRight, FileText, Mail, Shield } from "lucide-react";

export type LegalSection = {
  id: string;
  number: string;
  title: string;
  content: React.ReactNode;
};

type Props = {
  badge: string;
  title: string;
  subtitle: string;
  updatedAt: string;
  intro: React.ReactNode;
  sections: LegalSection[];
  breadcrumbLabel: string;
  icon?: "shield" | "file";
};

export function LegalPageLayout({
  badge,
  title,
  subtitle,
  updatedAt,
  intro,
  sections,
  breadcrumbLabel,
  icon = "file",
}: Props) {
  const [showTop, setShowTop] = useState(false);
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? "");
  const Icon = icon === "shield" ? Shield : FileText;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onScroll = () => {
      setShowTop(window.scrollY > 400);
      // determine active section
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
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/80 py-20 md:py-28">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, hsl(var(--accent) / 0.4), transparent 40%), radial-gradient(circle at 80% 60%, hsl(var(--primary-foreground) / 0.15), transparent 50%)",
          }}
        />
        <div className="container-wide relative">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-sm text-primary-foreground/70">
            <Link to="/" className="transition-colors hover:text-primary-foreground">
              Início
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-primary-foreground">{breadcrumbLabel}</span>
          </nav>

          <div className="flex flex-col items-start gap-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary-foreground backdrop-blur">
              <Icon className="h-3.5 w-3.5" />
              {badge}
            </span>

            <h1 className="max-w-3xl text-4xl font-extrabold leading-tight text-primary-foreground md:text-6xl">
              {title}
            </h1>

            <p className="max-w-2xl text-lg md:text-xl text-primary-foreground/80">{subtitle}</p>

            <div className="flex items-center gap-2 text-sm text-primary-foreground/70">
              <Calendar className="h-4 w-4" />
              <span>Última atualização: {updatedAt}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="bg-muted/30 py-12 md:py-16">
        <div className="container-wide">
          <div className="grid gap-10 lg:grid-cols-[260px_1fr]">
            {/* Sidebar TOC */}
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <p className="mb-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Nesta página
                </p>
                <nav className="space-y-1">
                  {sections.map((s) => {
                    const active = activeId === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => scrollTo(s.id)}
                        className={`group flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-foreground/70 hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <span
                          className={`mt-0.5 text-xs font-bold tabular-nums ${
                            active ? "text-primary" : "text-muted-foreground"
                          }`}
                        >
                          {s.number}
                        </span>
                        <span className="leading-snug">{s.title}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </aside>

            {/* Main content */}
            <article className="min-w-0">
              {/* Intro card */}
              <div className="mb-10 rounded-2xl border border-primary/20 bg-card p-6 shadow-sm md:p-8">
                <div className="max-w-none space-y-4 text-base md:text-lg leading-relaxed text-foreground/80">
                  {intro}
                </div>
              </div>

              {/* Sections */}
              <div className="space-y-12">
                {sections.map((s) => (
                  <section
                    key={s.id}
                    id={s.id}
                    className="scroll-mt-24 rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md md:p-8"
                  >
                    <div className="mb-5 flex items-baseline gap-4">
                      <span className="text-4xl font-extrabold leading-none text-primary/30 tabular-nums">
                        {s.number}
                      </span>
                      <h2 className="text-2xl font-bold text-foreground md:text-3xl">{s.title}</h2>
                    </div>
                    <div className="space-y-4 text-base md:text-[17px] leading-relaxed text-foreground/80">{s.content}</div>
                  </section>
                ))}
              </div>

              {/* Contact card */}
              <div className="mt-12 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary to-primary/80 p-8 text-primary-foreground shadow-lg">
                <h3 className="mb-2 text-2xl font-bold">Ficou com alguma dúvida?</h3>
                <p className="mb-6 text-base text-primary-foreground/80">
                  Nossa equipe está à disposição para esclarecer questões sobre este documento.
                </p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="flex items-start gap-3 rounded-lg bg-primary-foreground/10 p-4 backdrop-blur">
                    <Building2 className="mt-0.5 h-5 w-5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-semibold">XFTS</p>
                      <p className="text-primary-foreground/70">CNPJ 23.102.588/0001-90</p>
                    </div>
                  </div>
                  <a
                    href="mailto:xfts@xfts.com.br"
                    className="flex items-start gap-3 rounded-lg bg-primary-foreground/10 p-4 backdrop-blur transition-colors hover:bg-primary-foreground/20"
                  >
                    <Mail className="mt-0.5 h-5 w-5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-semibold">E-mail</p>
                      <p className="text-primary-foreground/70">xfts@xfts.com.br</p>
                    </div>
                  </a>
                  <a
                    href="https://xfts.com.br"
                    className="flex items-start gap-3 rounded-lg bg-primary-foreground/10 p-4 backdrop-blur transition-colors hover:bg-primary-foreground/20"
                  >
                    <FileText className="mt-0.5 h-5 w-5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-semibold">Site</p>
                      <p className="text-primary-foreground/70">xfts.com.br</p>
                    </div>
                  </a>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Back to top */}
      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-110 hover:bg-primary/90"
          aria-label="Voltar ao topo"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
    </>
  );
}
