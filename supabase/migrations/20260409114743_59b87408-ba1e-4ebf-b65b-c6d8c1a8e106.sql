
-- Create admin_users table FIRST
CREATE TABLE public.admin_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Create admin check function (now table exists)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = _user_id
  )
$$;

-- RLS for admin_users
CREATE POLICY "Admins can view admin list"
  ON public.admin_users FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Create blog_articles table
CREATE TABLE public.blog_articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  summary TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Gestão',
  image_url TEXT NOT NULL DEFAULT '',
  author TEXT NOT NULL DEFAULT 'Equipe XFTS',
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.blog_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published articles are public"
  ON public.blog_articles FOR SELECT
  USING (published = true OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can create articles"
  ON public.blog_articles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update articles"
  ON public.blog_articles FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete articles"
  ON public.blog_articles FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_blog_articles_updated_at
  BEFORE UPDATE ON public.blog_articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.blog_articles (title, slug, summary, content, category, image_url, author, published) VALUES
('5 Dicas para Otimizar a Gestão da Sua Clínica', '5-dicas-gestao-clinica', 'Descubra como a tecnologia pode transformar o dia a dia do seu consultório.', 'A gestão eficiente de uma clínica vai muito além do atendimento ao paciente.\n\n## 1. Automatize o Agendamento\n\nO agendamento online reduz faltas em até 40%.\n\n## 2. Use Prontuário Eletrônico\n\nO prontuário digital permite acesso rápido ao histórico do paciente.\n\n## 3. Controle Financeiro Diário\n\nAcompanhe receitas e despesas diariamente com dashboards.\n\n## 4. Invista em CRM\n\nCrie campanhas de fidelização personalizadas.\n\n## 5. Analise seus Dados\n\nIdentifique tendências e serviços mais rentáveis.', 'Gestão', 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&h=400&fit=crop', 'Equipe XFTS', true),
('Como a Inteligência Analítica Aumenta seu Faturamento', 'inteligencia-analitica-faturamento', 'Entenda como dados podem guiar decisões estratégicas.', 'Dados são o novo petróleo.\n\n## O que é Inteligência Analítica?\n\nCapacidade de interpretar dados para decisões inteligentes.\n\n## Resultados reais\n\nAumento médio de 25% no faturamento com dashboards analíticos.', 'Tecnologia', 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop', 'Equipe XFTS', true),
('Tendências 2026 para Barbearias Modernas', 'tendencias-2026-barbearias', 'Principais tendências em tecnologia para barbearias.', 'O mercado de barbearias está em evolução.\n\n## Tecnologia Integrada\n\nSistemas de gestão para controlar tudo em um só lugar.\n\n## Gestão Baseada em Dados\n\nConhecer perfil dos clientes é essencial para crescer.', 'Gestão', 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&h=400&fit=crop', 'Equipe XFTS', true),
('CRM: Por que Fidelizar é Mais Barato que Conquistar', 'crm-fidelizar-clientes', 'Estratégias de fidelização com CRM integrado.', 'Conquistar um novo cliente custa 5 a 7 vezes mais.\n\n## Conheça seu cliente\n\nRegistre preferências e histórico de serviços.\n\n## Campanhas automatizadas\n\nEnvie lembretes e promoções de forma automática.', 'Tecnologia', 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop', 'Equipe XFTS', true),
('Gestão Financeira para Salões de Beleza', 'gestao-financeira-saloes', 'Controle de caixa, comissões e relatórios financeiros.', 'Manter as finanças em dia é fundamental.\n\n## Controle de Caixa\n\nRegistre entradas e saídas diariamente.\n\n## Comissões\n\nDefina regras claras por profissional.\n\n## Relatórios\n\nAcompanhe DRE e fluxo de caixa.', 'Gestão', 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&h=400&fit=crop', 'Equipe XFTS', true),
('Automatização de Agendamentos: Guia Completo', 'automatizacao-agendamentos', 'Como reduzir faltas com agendamento online.', 'O agendamento online é uma funcionalidade impactante.\n\n## Benefícios\n\nRedução de faltas e melhor experiência do cliente.\n\n## Como implementar\n\nEscolha um sistema com agendamento via link ou WhatsApp.', 'Tecnologia', 'https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=600&h=400&fit=crop', 'Equipe XFTS', true);
