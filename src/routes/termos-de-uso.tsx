import { createFileRoute } from "@tanstack/react-router";
import { LegalPageLayout, type LegalSection } from "@/components/LegalPageLayout";

export const Route = createFileRoute("/termos-de-uso")({
  head: () => ({
    meta: [
      { title: "Termos de Uso - XFTS Inteligência Analítica" },
      { name: "description", content: "Termos de Uso do site xfts.com.br e dos sistemas FLEXUS da XFTS Consultoria em Sistemas de Informação Ltda - ME." },
      { property: "og:title", content: "Termos de Uso - XFTS Inteligência Analítica" },
      { property: "og:description", content: "Termos de Uso do site xfts.com.br e dos sistemas FLEXUS da XFTS Consultoria em Sistemas de Informação." },
      { property: "og:url", content: "/termos-de-uso" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/termos-de-uso" }],
  }),
  component: TermosDeUsoPage,
});

const sections: LegalSection[] = [
  {
    id: "objeto",
    number: "01",
    title: "Objeto",
    content: (
      <>
        <p>
          A XFTS CONSULTORIA EM SISTEMAS DE INFORMAÇÃO LTDA - ME oferece soluções tecnológicas voltadas à consultoria
          em sistemas de informação, gestão empresarial, automação de processos, CRM, agendamentos, relacionamento
          com clientes, controle financeiro, indicadores, relatórios e demais funcionalidades disponibilizadas
          conforme o produto, plano ou serviço contratado.
        </p>
        <p>
          As funcionalidades podem variar de acordo com o sistema, plano, configuração, contrato ou proposta
          comercial vigente.
        </p>
      </>
    ),
  },
  {
    id: "cadastro",
    number: "02",
    title: "Cadastro e acesso à plataforma",
    content: (
      <>
        <p>Para utilizar determinadas funcionalidades, o usuário poderá precisar realizar cadastro e criar credenciais de acesso.</p>
        <p>O usuário se compromete a fornecer informações verdadeiras, completas e atualizadas.</p>
        <p>O acesso à plataforma é pessoal e intransferível. O usuário é responsável por manter a confidencialidade de seu login, senha e demais credenciais.</p>
        <p>A XFTS não se responsabiliza por acessos realizados por terceiros em razão de uso indevido, compartilhamento de senha ou falha de segurança causada pelo próprio usuário.</p>
      </>
    ),
  },
  {
    id: "resp-usuario",
    number: "03",
    title: "Responsabilidades do usuário",
    content: (
      <>
        <p>O usuário se compromete a:</p>
        <ul className="list-disc space-y-2 pl-6 marker:text-primary">
          <li>utilizar o site e a plataforma de forma lícita, ética e adequada;</li>
          <li>não inserir informações falsas, ilegais, ofensivas ou que violem direitos de terceiros;</li>
          <li>não tentar acessar áreas restritas sem autorização;</li>
          <li>não praticar engenharia reversa, cópia, exploração indevida ou tentativa de violação do sistema;</li>
          <li>manter seus dados cadastrais atualizados;</li>
          <li>respeitar as regras do plano contratado;</li>
          <li>utilizar a plataforma conforme a legislação aplicável.</li>
        </ul>
      </>
    ),
  },
  {
    id: "resp-empresa",
    number: "04",
    title: "Responsabilidades da empresa",
    content: (
      <>
        <p>A XFTS se compromete a empregar esforços razoáveis para manter o funcionamento adequado do site e da plataforma, observadas eventuais interrupções por manutenção, falhas técnicas, caso fortuito, força maior ou indisponibilidade de serviços de terceiros.</p>
        <p>A empresa poderá realizar atualizações, melhorias, correções, alterações de layout, recursos e funcionalidades, visando aprimorar a experiência, segurança e desempenho da solução.</p>
      </>
    ),
  },
  {
    id: "planos",
    number: "05",
    title: "Planos, pagamentos e cancelamento",
    content: (
      <>
        <p>Os serviços poderão ser oferecidos mediante planos gratuitos, testes, assinaturas mensais, anuais ou condições comerciais específicas.</p>
        <p>As regras de preço, cobrança, renovação, inadimplência, suspensão, cancelamento e reembolso serão informadas na proposta comercial, contrato, página de contratação ou documento equivalente.</p>
        <p>Em caso de inadimplência, a XFTS poderá suspender ou limitar o acesso aos serviços, mediante aviso prévio quando aplicável.</p>
      </>
    ),
  },
  {
    id: "teste",
    number: "06",
    title: "Período de teste",
    content: (
      <>
        <p>Quando disponibilizado período de teste gratuito, o usuário poderá utilizar a plataforma pelo prazo informado na oferta ou proposta comercial.</p>
        <p>Ao final do período de teste, o acesso poderá ser encerrado, limitado ou convertido em plano pago, conforme as condições previamente informadas.</p>
      </>
    ),
  },
  {
    id: "propriedade",
    number: "07",
    title: "Propriedade intelectual",
    content: (
      <>
        <p>Todos os direitos relacionados ao site, sistema, plataforma, marca, layout, identidade visual, códigos, telas, fluxos, funcionalidades, conteúdos, textos, imagens, bancos de dados, relatórios e materiais pertencem à XFTS ou a seus licenciantes.</p>
        <p>O uso da plataforma não transfere ao usuário qualquer direito de propriedade intelectual.</p>
        <p>É proibida a cópia, reprodução, distribuição, modificação, venda, sublicenciamento ou exploração comercial não autorizada de qualquer parte do site ou sistema.</p>
      </>
    ),
  },
  {
    id: "dados-usuario",
    number: "08",
    title: "Dados inseridos pelo usuário",
    content: (
      <>
        <p>Os dados inseridos pelo usuário ou cliente na plataforma permanecem sob responsabilidade de quem os cadastrou, especialmente quanto à veracidade, legalidade, autorização de uso e conformidade com a legislação aplicável.</p>
        <p>A XFTS poderá tratar esses dados apenas na medida necessária para prestação dos serviços, suporte, segurança, cumprimento contratual ou obrigações legais.</p>
      </>
    ),
  },
  {
    id: "limitacao",
    number: "09",
    title: "Limitação de responsabilidade",
    content: (
      <>
        <p>A XFTS não se responsabiliza por:</p>
        <ul className="list-disc space-y-2 pl-6 marker:text-primary">
          <li>uso inadequado da plataforma pelo usuário;</li>
          <li>informações incorretas inseridas pelos usuários;</li>
          <li>decisões tomadas exclusivamente com base nos dados apresentados no sistema;</li>
          <li>falhas decorrentes de internet, dispositivos, navegadores, servidores de terceiros ou integrações externas;</li>
          <li>indisponibilidades temporárias causadas por manutenção, atualizações ou eventos fora de seu controle;</li>
          <li>danos decorrentes do compartilhamento indevido de credenciais pelo usuário.</li>
        </ul>
      </>
    ),
  },
  {
    id: "integracoes",
    number: "10",
    title: "Integrações com terceiros",
    content: (
      <>
        <p>A plataforma poderá possuir integrações com serviços externos, como meios de pagamento, ferramentas de comunicação, WhatsApp, APIs, sistemas fiscais, bancos, gateways, serviços de nuvem e outras plataformas.</p>
        <p>O funcionamento dessas integrações pode depender de disponibilidade, regras, permissões e políticas dos respectivos terceiros.</p>
        <p>A XFTS não se responsabiliza por falhas, alterações, indisponibilidades ou limitações decorrentes exclusivamente desses serviços externos.</p>
      </>
    ),
  },
  {
    id: "suspensao",
    number: "11",
    title: "Suspensão ou encerramento de acesso",
    content: (
      <>
        <p>A empresa poderá suspender ou encerrar o acesso do usuário em caso de:</p>
        <ul className="list-disc space-y-2 pl-6 marker:text-primary">
          <li>violação destes Termos;</li>
          <li>uso indevido ou abusivo da plataforma;</li>
          <li>tentativa de fraude;</li>
          <li>inadimplência;</li>
          <li>risco à segurança do sistema;</li>
          <li>determinação legal, judicial ou regulatória.</li>
        </ul>
      </>
    ),
  },
  {
    id: "privacidade",
    number: "12",
    title: "Privacidade e proteção de dados",
    content: (
      <p>
        O tratamento de dados pessoais será realizado conforme a{" "}
        <a href="/politica-de-privacidade" className="text-primary underline-offset-4 hover:underline">
          Política de Privacidade
        </a>{" "}
        disponível no site xfts.com.br e de acordo com a legislação aplicável, incluindo a Lei Geral de Proteção de Dados Pessoais.
      </p>
    ),
  },
  {
    id: "alteracoes",
    number: "13",
    title: "Alterações nos Termos",
    content: (
      <>
        <p>A XFTS poderá atualizar estes Termos de Uso a qualquer momento para refletir alterações nos serviços, funcionalidades, legislação ou regras comerciais.</p>
        <p>A versão mais recente estará sempre disponível no site xfts.com.br.</p>
      </>
    ),
  },
  {
    id: "foro",
    number: "14",
    title: "Lei aplicável e foro",
    content: (
      <>
        <p>Estes Termos serão regidos pelas leis da República Federativa do Brasil.</p>
        <p>Fica eleito o foro da comarca de São José do Rio Preto/SP, salvo disposição legal em sentido contrário, para dirimir eventuais controvérsias relacionadas a estes Termos.</p>
      </>
    ),
  },
  {
    id: "contato",
    number: "15",
    title: "Contato",
    content: (
      <p>Em caso de dúvidas sobre estes Termos de Uso, utilize os canais de contato no final desta página.</p>
    ),
  },
];

function TermosDeUsoPage() {
  return (
    <LegalPageLayout
      badge="Documento legal"
      breadcrumbLabel="Termos de Uso"
      title="Termos de Uso"
      subtitle="Regras que regem o acesso e a utilização do site xfts.com.br e dos produtos, serviços e plataformas oferecidos pela XFTS."
      updatedAt="27 de maio de 2026"
      icon="file"
      sections={sections}
      intro={
        <>
          <p>
            Estes Termos de Uso regulam o acesso e a utilização do site xfts.com.br, bem como dos produtos, serviços,
            sistemas, plataformas e soluções oferecidos pela <strong>XFTS CONSULTORIA EM SISTEMAS DE INFORMAÇÃO LTDA - ME</strong>,
            inscrita no CNPJ sob nº 23.102.588/0001-90.
          </p>
          <p className="mt-3">
            Ao acessar o site, contratar ou utilizar nossos serviços, o usuário declara que leu, compreendeu e concorda com estes Termos de Uso.
          </p>
        </>
      }
    />
  );
}
