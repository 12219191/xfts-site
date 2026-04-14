import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Share2, Calendar, User } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Article {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  category: string;
  image_url: string;
  author: string;
  created_at: string;
}

const fetchArticleMeta = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => input as string)
  .handler(async ({ data: slug }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data } = await supabaseAdmin
      .from("blog_articles")
      .select("title, summary, image_url, author, category, created_at")
      .eq("slug", slug)
      .eq("published", true)
      .single();
    return data;
  });

export const Route = createFileRoute("/blog/$articleId")({
  loader: async ({ params }) => {
    const meta = await fetchArticleMeta({ data: params.articleId });
    return { meta };
  },
  head: ({ loaderData }) => {
    const meta = loaderData?.meta;
    const title = meta
      ? `${meta.title} - Blog XFTS`
      : "Artigo - Blog XFTS Inteligência Analítica";
    const description = meta?.summary || "Leia artigos sobre gestão e tecnologia para clínicas, barbearias e salões.";
    const image = meta?.image_url || "";

    const headMeta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
    ];

    if (image) {
      headMeta.push(
        { property: "og:image", content: image },
        { name: "twitter:image", content: image },
      );
    }

    if (meta) {
      headMeta.push(
        { property: "article:author", content: meta.author },
        { property: "article:section", content: meta.category },
        { property: "article:published_time", content: meta.created_at },
      );
    }

    const scripts: Array<Record<string, string>> = [];
    if (meta) {
      scripts.push({
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: meta.title,
          description: meta.summary,
          image: meta.image_url,
          author: { "@type": "Person", name: meta.author },
          publisher: {
            "@type": "Organization",
            name: "XFTS Inteligência Analítica",
          },
          datePublished: meta.created_at,
          articleSection: meta.category,
        }),
      });
    }

    return { meta: headMeta, scripts };
  },
  component: ArticlePage,
});

function ArticlePage() {
  const { articleId } = Route.useParams();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticle = async () => {
      const { data } = await supabase
        .from("blog_articles")
        .select("*")
        .eq("slug", articleId)
        .eq("published", true)
        .single();
      setArticle(data);
      setLoading(false);
    };
    fetchArticle();
  }, [articleId]);

  if (loading) {
    return (
      <div className="section-padding text-center">
        <div className="animate-pulse">
          <div className="mx-auto h-8 w-1/2 rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="section-padding text-center">
        <h1 className="text-2xl font-bold text-foreground">
          Artigo não encontrado
        </h1>
        <Link
          to="/blog"
          className="mt-4 inline-block text-primary hover:underline"
        >
          Voltar ao Blog
        </Link>
      </div>
    );
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  const currentUrl =
    typeof window !== "undefined" ? window.location.href : "";
  const shareWhatsApp = `https://wa.me/?text=${encodeURIComponent(article.title + " " + currentUrl)}`;
  const shareEmail = `mailto:?subject=${encodeURIComponent(article.title)}&body=${encodeURIComponent("Confira este artigo: " + currentUrl)}`;

  return (
    <>
      <div className="aspect-[3/1] w-full overflow-hidden">
        <img
          src={article.image_url}
          alt={article.title}
          width={1200}
          height={400}
          className="h-full w-full object-cover"
        />
      </div>
      <article className="section-padding">
        <div className="container-wide mx-auto max-w-3xl">
          <Link
            to="/blog"
            className="mb-6 inline-flex items-center text-sm text-primary hover:underline"
          >
            <ArrowLeft className="mr-1 h-4 w-4" /> Voltar ao Blog
          </Link>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
              {article.category}
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(article.created_at)}
            </span>
            <span className="inline-flex items-center gap-1">
              <User className="h-3 w-3" />
              {article.author}
            </span>
          </div>
          <h1 className="mt-4 text-3xl font-extrabold text-foreground md:text-4xl">
            {article.title}
          </h1>
          <div className="mt-8">
            {article.content.split("\n\n").map((block, i) => {
              if (block.startsWith("## ")) {
                return (
                  <h2
                    key={i}
                    className="mb-3 mt-8 text-xl font-bold text-foreground"
                  >
                    {block.replace("## ", "")}
                  </h2>
                );
              }
              return (
                <p
                  key={i}
                  className="mb-4 leading-relaxed text-muted-foreground"
                >
                  {block}
                </p>
              );
            })}
          </div>
          <div className="mt-8 flex items-center gap-4 border-t border-border pt-6">
            <Share2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Compartilhar:
            </span>
            <a
              href={shareWhatsApp}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              WhatsApp
            </a>
            <a
              href={shareEmail}
              className="text-sm text-primary hover:underline"
            >
              Email
            </a>
          </div>
          <div className="mt-12 rounded-xl bg-primary p-8 text-center">
            <h3 className="text-xl font-bold text-primary-foreground">
              Experimente nossos sistemas SaaS
            </h3>
            <p className="mt-2 text-primary-foreground/70">
              Solicite uma demonstração gratuita e transforme a gestão do seu
              negócio.
            </p>
            <Link to="/contato">
              <Button className="mt-4 bg-cta text-cta-foreground hover:bg-cta/90">
                Solicitar Demo
              </Button>
            </Link>
          </div>
        </div>
      </article>
    </>
  );
}
