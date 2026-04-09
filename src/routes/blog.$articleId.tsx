import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Share2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/blog/$articleId")({
  head: () => ({
    meta: [
      { title: "Artigo - Blog XFTS Inteligência Analítica" },
      { name: "description", content: "Leia artigos sobre gestão e tecnologia para clínicas, barbearias e salões." },
    ],
  }),
  component: ArticlePage,
});

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

function ArticlePage() {
  const { articleId } = Route.useParams();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("blog_articles")
        .select("*")
        .eq("slug", articleId)
        .eq("published", true)
        .single();
      setArticle(data);
      setLoading(false);
    };
    fetch();
  }, [articleId]);

  if (loading) {
    return <div className="section-padding text-center"><div className="animate-pulse"><div className="mx-auto h-8 w-1/2 rounded bg-muted" /></div></div>;
  }

  if (!article) {
    return (
      <div className="section-padding text-center">
        <h1 className="text-2xl font-bold text-foreground">Artigo não encontrado</h1>
        <Link to="/blog" className="mt-4 inline-block text-primary hover:underline">Voltar ao Blog</Link>
      </div>
    );
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const shareWhatsApp = `https://wa.me/?text=${encodeURIComponent(article.title + " - XFTS Blog")}`;
  const shareEmail = `mailto:?subject=${encodeURIComponent(article.title)}&body=${encodeURIComponent("Confira este artigo: " + article.title)}`;

  return (
    <>
      <div className="aspect-[3/1] w-full overflow-hidden">
        <img src={article.image_url} alt={article.title} width={1200} height={400} className="h-full w-full object-cover" />
      </div>
      <article className="section-padding">
        <div className="container-wide mx-auto max-w-3xl">
          <Link to="/blog" className="mb-6 inline-flex items-center text-sm text-primary hover:underline">
            <ArrowLeft className="mr-1 h-4 w-4" /> Voltar ao Blog
          </Link>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">{article.category}</span>
            <span>{formatDate(article.created_at)}</span>
            <span>• {article.author}</span>
          </div>
          <h1 className="mt-4 text-3xl font-extrabold text-foreground md:text-4xl">{article.title}</h1>
          <div className="mt-8">
            {article.content.split("\n\n").map((block, i) => {
              if (block.startsWith("## ")) {
                return <h2 key={i} className="mb-3 mt-8 text-xl font-bold text-foreground">{block.replace("## ", "")}</h2>;
              }
              return <p key={i} className="mb-4 leading-relaxed text-muted-foreground">{block}</p>;
            })}
          </div>
          <div className="mt-8 flex items-center gap-4 border-t border-border pt-6">
            <Share2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Compartilhar:</span>
            <a href={shareWhatsApp} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">WhatsApp</a>
            <a href={shareEmail} className="text-sm text-primary hover:underline">Email</a>
          </div>
          <div className="mt-12 rounded-xl bg-primary p-8 text-center">
            <h3 className="text-xl font-bold text-primary-foreground">Experimente nossos sistemas SaaS</h3>
            <p className="mt-2 text-primary-foreground/70">Solicite uma demonstração gratuita e transforme a gestão do seu negócio.</p>
            <Link to="/contato"><Button className="mt-4 bg-cta text-cta-foreground hover:bg-cta/90">Solicitar Demo</Button></Link>
          </div>
        </div>
      </article>
    </>
  );
}
