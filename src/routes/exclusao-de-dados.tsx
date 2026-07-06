import { createFileRoute } from "@tanstack/react-router";
import { LegalPageLayout, type LegalSection } from "@/components/LegalPageLayout";

export const Route = createFileRoute("/exclusao-de-dados")({
  head: () => ({
    meta: [
      { title: "Exclusão de Dados do Usuário - XFTS Inteligência Analítica" },
      { name: "description", content: "Instruções para solicitar a exclusão de dados pessoais nos sistemas da XFTS, incluindo o FLEXUS CRM." },
      { property: "og:title", content: "Exclusão de Dados do Usuário - XFTS Inteligência Analítica" },
      { property: "og:description", content: "Como solicitar a exclusão de seus dados pessoais armazenados nos sistemas da XFTS." },
      { property: "og:url", content: "https://xfts-site.lovable.app/exclusao-de-dados" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://xfts-site.lovable.app/exclusao-de-dados" }],
  }),
  component: ExclusaoDeDadosPage,
});

const sections: LegalSection[] = [
  {
    id: "como-solicitar",
    number: "01",
    title: "Como solicitar a exclusão",
    content: (
      <>
        <p>O titular dos dados poderá solicitar a exclusão de suas informações por qualquer um dos seguintes meios:</p>
        <ul className="list-disc space-y-2 pl-6 marker:text-primary">
          <li>
            E-mail:{" "}
            <a href="mailto:xfts@xfts.com.br" className="text-primary underline-offset-4 hover:underline">
              xfts@xfts.com.br
            </a>
          </li>
          <li>
            Formulário de contato disponível em:{" "}
            <a href="https://xfts.com.br" className="text-primary underline-offset-4 hover:underline">
              xfts.com.br
            </a>
          </li>
          <li>Pelo próprio sistema, quando essa funcionalidade estiver disponível.</li>
        </ul>
        <p>No pedido, informe:</p>
        <ul className="list-disc space-y-2 pl-6 marker:text-primary">
          <li>Nome completo;</li>
          <li>Endereço de e-mail utilizado no cadastro;</li>
          <li>Empresa (quando aplicável);</li>
          <li>Motivo da solicitação (opcional).</li>
        </ul>
      </>
    ),
  },
  {
    id: "prazo",
    number: "02",
    title: "Prazo de atendimento",
    content: (
      <p>
        Após a confirmação da identidade do solicitante, a solicitação será processada em até{" "}
        <strong>15 dias úteis</strong>, respeitando a legislação aplicável.
      </p>
    ),
  },
  {
    id: "dados-mantidos",
    number: "03",
    title: "Dados que poderão ser mantidos",
    content: (
      <>
        <p>
          Algumas informações poderão ser mantidas quando sua retenção for exigida por obrigação legal, regulatória,
          contratual ou para defesa em processos judiciais e administrativos.
        </p>
        <p>Nesses casos, os dados permanecerão armazenados apenas pelo período legalmente exigido.</p>
      </>
    ),
  },
  {
    id: "dados-excluidos",
    number: "04",
    title: "Dados excluídos",
    content: (
      <>
        <p>Quando não houver impedimento legal, poderão ser excluídos:</p>
        <ul className="list-disc space-y-2 pl-6 marker:text-primary">
          <li>Dados cadastrais;</li>
          <li>Informações de contato;</li>
          <li>Histórico de utilização do sistema;</li>
          <li>Conversas e registros vinculados ao usuário;</li>
          <li>Demais informações pessoais armazenadas pelo sistema.</li>
        </ul>
      </>
    ),
  },
  {
    id: "contato",
    number: "05",
    title: "Contato",
    content: (
      <p>
        Em caso de dúvidas sobre privacidade ou proteção de dados, entre em contato pelos canais indicados no
        rodapé desta página.
      </p>
    ),
  },
];

function ExclusaoDeDadosPage() {
  return (
    <LegalPageLayout
      breadcrumbLabel="Exclusão de Dados"
      title="Exclusão de Dados do Usuário"
      subtitle="Como solicitar a exclusão de seus dados pessoais armazenados nos sistemas da XFTS, incluindo o FLEXUS CRM e demais aplicações."
      updatedAt="27 de maio de 2026"
      sections={sections}
      intro={
        <>
          <p>
            A <strong>XFTS Inteligência Analítica</strong> respeita a privacidade de seus usuários e oferece um
            processo simples para solicitar a exclusão dos dados pessoais armazenados em nossos sistemas, incluindo o
            FLEXUS CRM e demais aplicações desenvolvidas pela empresa.
          </p>
        </>
      }
    />
  );
}
