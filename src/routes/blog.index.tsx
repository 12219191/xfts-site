import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Search } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/blog/")({
  component: BlogIndex,
});

interface Article {
  id: string;
  title: string;
  slug: string;
  summary: string;
  category: string;
  image_url: string;
  created_at: string;
}

function BlogIndex() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todas");
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const categories = ["Todas", "Gestão", "Tecnologia"];

  useEffect(() => {
    const fetchArticles = async () => {
      const { data, error } = await supabase
        .from("blog_articles")
        .select("id, title, slug, summary, category, image_url, created_at")
        .eq("published", true)
        .order("created_at", { ascending: false });
      if (!error && data) setArticles(data);
      setLoading(false);
    };
    fetchArticles();
  }, []);

  const filtered = articles.filter((a) => {
    const matchSearch = a.title.toLowerCase().includes(search.toLowerCase()) || a.summary.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "Todas" || a.category === category;
    return matchSearch && matchCat;
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <>
      <section className="gradient-primary section-padding text-center">
        <div className="container-wide">
          <h1 className="text-4xl font-extrabold text-primary-foreground md:text-5xl">Blog</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-primary-foreground/70">Artigos sobre gestão, tecnologia e inteligência analítica.</p>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-wide">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input type="text" placeholder="Buscar artigos..." className="w-full rounded-md border border-input bg-card py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-2">
              {categories.map((c) => (
                <button key={c} onClick={() => setCategory(c)} className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${category === c ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse border-border bg-card">
                  <div className="aspect-video bg-muted" />
                  <CardContent className="p-6"><div className="h-4 w-3/4 rounded bg-muted" /><div className="mt-3 h-3 w-full rounded bg-muted" /></CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((article) => (
                <Card key={article.id} className="group overflow-hidden border-border bg-card transition-shadow hover:shadow-lg">
                  <div className="aspect-video overflow-hidden">
                    <img src={article.image_url} alt={article.title} loading="lazy" width={600} height={400} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  </div>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">{article.category}</span>
                      <span>{formatDate(article.created_at)}</span>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-card-foreground">{article.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{article.summary}</p>
                    <Link to="/blog/$articleId" params={{ articleId: article.slug }} className="mt-4 inline-flex items-center text-sm font-medium text-primary hover:underline">
                      <BookOpen className="mr-1 h-4 w-4" /> Ler mais
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {!loading && filtered.length === 0 && <p className="mt-8 text-center text-muted-foreground">Nenhum artigo encontrado.</p>}
        </div>
      </section>
    </>
  );
}
