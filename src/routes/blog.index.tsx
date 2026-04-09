import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Search } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/blog/")({
  component: BlogIndex,
});

const articles = [
  { id: "1", title: "5 Dicas para Otimizar a Gestão da Sua Clínica", summary: "Descubra como a tecnologia pode transformar o dia a dia do seu consultório e aumentar a produtividade.", category: "Gestão", date: "15 Mar 2026", image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&h=400&fit=crop" },
  { id: "2", title: "Como a Inteligência Analítica Aumenta seu Faturamento", summary: "Entenda como dados e métricas podem guiar decisões estratégicas no seu negócio de beleza.", category: "Tecnologia", date: "10 Mar 2026", image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop" },
  { id: "3", title: "Tendências 2026 para Barbearias Modernas", summary: "As principais tendências em tecnologia e gestão que estão transformando o mercado de barbearias.", category: "Gestão", date: "05 Mar 2026", image: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&h=400&fit=crop" },
  { id: "4", title: "CRM: Por que Fidelizar é Mais Barato que Conquistar", summary: "Aprenda estratégias de fidelização de clientes usando CRM integrado ao seu sistema de gestão.", category: "Tecnologia", date: "28 Fev 2026", image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop" },
  { id: "5", title: "Gestão Financeira para Salões de Beleza", summary: "Controle de caixa, comissões e relatórios: tudo que você precisa saber para manter as finanças em dia.", category: "Gestão", date: "20 Fev 2026", image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&h=400&fit=crop" },
  { id: "6", title: "Automatização de Agendamentos: Guia Completo", summary: "Como reduzir faltas e otimizar a agenda da sua clínica ou salão com agendamento online.", category: "Tecnologia", date: "15 Fev 2026", image: "https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=600&h=400&fit=crop" },
];

function BlogIndex() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todas");
  const categories = ["Todas", "Gestão", "Tecnologia"];

  const filtered = articles.filter((a) => {
    const matchSearch = a.title.toLowerCase().includes(search.toLowerCase()) || a.summary.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "Todas" || a.category === category;
    return matchSearch && matchCat;
  });

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

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((article) => (
              <Card key={article.id} className="group overflow-hidden border-border bg-card transition-shadow hover:shadow-lg">
                <div className="aspect-video overflow-hidden">
                  <img src={article.image} alt={article.title} loading="lazy" width={600} height={400} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                </div>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">{article.category}</span>
                    <span>{article.date}</span>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-card-foreground">{article.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{article.summary}</p>
                  <Link to="/blog/$articleId" params={{ articleId: article.id }} className="mt-4 inline-flex items-center text-sm font-medium text-primary hover:underline">
                    <BookOpen className="mr-1 h-4 w-4" /> Ler mais
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
          {filtered.length === 0 && <p className="mt-8 text-center text-muted-foreground">Nenhum artigo encontrado.</p>}
        </div>
      </section>
    </>
  );
}
