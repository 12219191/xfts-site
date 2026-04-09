import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Share2 } from "lucide-react";

export const Route = createFileRoute("/blog/$articleId")({
  head: () => ({
    meta: [
      { title: "Artigo - Blog XFTS Inteligência Analítica" },
      { name: "description", content: "Leia artigos sobre gestão e tecnologia para clínicas, barbearias e salões." },
    ],
  }),
  component: ArticlePage,
});

const articlesData: Record<string, { title: string; date: string; author: string; category: string; content: string; image: string }> = {
  "1": {
    title: "5 Dicas para Otimizar a Gestão da Sua Clínica",
    date: "15 de Março de 2026",
    author: "Equipe XFTS",
    category: "Gestão",
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&h=600&fit=crop",
    content: `A gestão eficiente de uma clínica vai muito além do atendimento ao paciente. Envolve organização financeira, controle de agenda, gestão de equipe e análise de dados.\n\n## 1. Automatize o Agendamento\n\nO agendamento online reduz faltas em até 40% e libera sua recepção para tarefas mais estratégicas.\n\n## 2. Use Prontuário Eletrônico\n\nAlém de ser mais seguro, o prontuário digital permite acesso rápido ao histórico do paciente.\n\n## 3. Controle Financeiro Diário\n\nNão deixe para o fim do mês. Acompanhe receitas e despesas diariamente com dashboards em tempo real.\n\n## 4. Invista em CRM\n\nConheça seus pacientes, suas preferências e crie campanhas de fidelização personalizadas.\n\n## 5. Analise seus Dados\n\nUse inteligência analítica para identificar tendências, horários de pico e serviços mais rentáveis.`,
  },
  "2": {
    title: "Como a Inteligência Analítica Aumenta seu Faturamento",
    date: "10 de Março de 2026",
    author: "Equipe XFTS",
    category: "Tecnologia",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=600&fit=crop",
    content: `Dados são o novo petróleo. Mas apenas coletar dados não basta — é preciso transformá-los em insights acionáveis.\n\n## O que é Inteligência Analítica?\n\nÉ a capacidade de coletar, processar e interpretar dados do seu negócio para tomar decisões mais inteligentes.\n\n## Como aplicar no seu negócio\n\nIdentifique os KPIs mais importantes: ticket médio, taxa de retorno, serviços mais procurados e horários de maior movimento.\n\n## Resultados reais\n\nNossos clientes relatam aumento médio de 25% no faturamento após implementar dashboards analíticos.`,
  },
  "3": {
    title: "Tendências 2026 para Barbearias Modernas",
    date: "05 de Março de 2026",
    author: "Equipe XFTS",
    category: "Gestão",
    image: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1200&h=600&fit=crop",
    content: `O mercado de barbearias está em constante evolução. Confira as principais tendências para 2026.\n\n## Tecnologia Integrada\n\nBarbearias modernas usam sistemas de gestão para controlar agendamentos, estoque e finanças em um só lugar.\n\n## Experiência do Cliente\n\nA experiência vai além do corte. Ambiente, atendimento e personalização são diferenciais competitivos.\n\n## Gestão Baseada em Dados\n\nConhecer o perfil dos seus clientes e os serviços mais rentáveis é essencial para crescer de forma sustentável.`,
  },
  "4": {
    title: "CRM: Por que Fidelizar é Mais Barato que Conquistar",
    date: "28 de Fevereiro de 2026",
    author: "Equipe XFTS",
    category: "Tecnologia",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=600&fit=crop",
    content: `Conquistar um novo cliente custa de 5 a 7 vezes mais do que manter um existente. O CRM é a ferramenta ideal para fidelização.\n\n## Conheça seu cliente\n\nRegistre preferências, histórico de serviços e datas importantes para personalizar o atendimento.\n\n## Campanhas automatizadas\n\nEnvie lembretes, promoções de aniversário e ofertas exclusivas de forma automática.`,
  },
  "5": {
    title: "Gestão Financeira para Salões de Beleza",
    date: "20 de Fevereiro de 2026",
    author: "Equipe XFTS",
    category: "Gestão",
    image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&h=600&fit=crop",
    content: `Manter as finanças em dia é fundamental para a saúde do seu salão.\n\n## Controle de Caixa\n\nRegistre todas as entradas e saídas diariamente. Use um sistema que automatize esse processo.\n\n## Comissões\n\nDefina regras claras de comissão por profissional e serviço. Um bom sistema calcula automaticamente.\n\n## Relatórios\n\nAcompanhe DRE, fluxo de caixa e projeções financeiras com relatórios automáticos.`,
  },
  "6": {
    title: "Automatização de Agendamentos: Guia Completo",
    date: "15 de Fevereiro de 2026",
    author: "Equipe XFTS",
    category: "Tecnologia",
    image: "https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=1200&h=600&fit=crop",
    content: `O agendamento online é uma das funcionalidades mais impactantes de um sistema de gestão.\n\n## Benefícios\n\nRedução de faltas, otimização da agenda, menos ligações telefônicas e melhor experiência do cliente.\n\n## Como implementar\n\nEscolha um sistema que permita agendamento via link, WhatsApp ou site. Configure lembretes automáticos por SMS ou email.`,
  },
};

function ArticlePage() {
  const { articleId } = Route.useParams();
  const article = articlesData[articleId];

  if (!article) {
    return (
      <div className="section-padding text-center">
        <h1 className="text-2xl font-bold text-foreground">Artigo não encontrado</h1>
        <Link to="/blog" className="mt-4 inline-block text-primary hover:underline">Voltar ao Blog</Link>
      </div>
    );
  }

  const shareWhatsApp = `https://wa.me/?text=${encodeURIComponent(article.title + " - XFTS Blog")}`;
  const shareEmail = `mailto:?subject=${encodeURIComponent(article.title)}&body=${encodeURIComponent("Confira este artigo: " + article.title)}`;

  return (
    <>
      <div className="aspect-[3/1] w-full overflow-hidden">
        <img src={article.image} alt={article.title} width={1200} height={400} className="h-full w-full object-cover" />
      </div>
      <article className="section-padding">
        <div className="container-wide mx-auto max-w-3xl">
          <Link to="/blog" className="mb-6 inline-flex items-center text-sm text-primary hover:underline">
            <ArrowLeft className="mr-1 h-4 w-4" /> Voltar ao Blog
          </Link>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">{article.category}</span>
            <span>{article.date}</span>
            <span>• {article.author}</span>
          </div>
          <h1 className="mt-4 text-3xl font-extrabold text-foreground md:text-4xl">{article.title}</h1>
          <div className="prose mt-8 max-w-none text-foreground">
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
            <Link to="/contato">
              <Button className="mt-4 bg-cta text-cta-foreground hover:bg-cta/90">Solicitar Demo</Button>
            </Link>
          </div>
        </div>
      </article>
    </>
  );
}
