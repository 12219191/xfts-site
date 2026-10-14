import { createFileRoute } from "@tanstack/react-router";
import { LegalPageLayout, type LegalSection } from "@/components/LegalPageLayout";

export const Route = createFileRoute("/politica-de-privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade - XFTS Inteligência Analítica" },
      { name: "description", content: "Política de Privacidade do site xfts.com.br conforme a LGPD: coleta, uso, compartilhamento, segurança e direitos dos titulares." },
      { property: "og:title", content: "Política de Privacidade - XFTS Inteligência Analítica" },
      { property: "og:description", content: "Como a XFTS coleta, usa e protege dados pessoais conforme a LGPD." },
      { property: "og:url", content: "/politica-de-privacidade" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/politica-de-privacidade" }],
  }),
  component: PoliticaDePrivacidadePage,
});

const sections: LegalSection[] = [
  {
    id: "quem-somos",
    number: "01",
    title: "Quem somos",
    content: (
      <>
        <p>
          A XFTS CONSULTORIA EM SISTEMAS DE INFORMAÇÃO LTDA - ME atua no desenvolvimento, consultoria e fornecimento
          de soluções tecnológicas, sistemas de informação, plataformas SaaS, ferramentas de gestão, automação, CRM,
          controle financeiro, agendamentos, relacionamento com clientes, indicadores e demais funcionalidades
          voltadas à melhoria da operação empresarial.
        </p>
        <p>
          Para fins da Lei Geral de Proteção de Dados Pessoais — LGPD, a empresa poderá atuar como controladora dos
          dados pessoais coletados diretamente em seus canais próprios e, em alguns casos, como operadora de dados
          tratados em nome de seus clientes contratantes.
        </p>
      </>
    ),
  },
  {
    id: "dados-coletados",
    number: "02",
    title: "Quais dados podemos coletar",
    content: (
      <>
        <p>Podemos coletar os seguintes dados pessoais, conforme a forma de interação do usuário com nossos canais:</p>
        <ul className="list-disc space-y-2 pl-6 marker:text-primary">
          <li><strong>Dados de identificação:</strong> nome, CPF, CNPJ, razão social, e-mail, telefone, cargo, empresa e cidade.</li>
          <li><strong>Dados de contato:</strong> endereço de e-mail, número de telefone, WhatsApp e demais canais informados pelo usuário.</li>
          <li><strong>Dados comerciais:</strong> informações relacionadas a propostas, contratos, planos contratados, histórico de atendimento, solicitações, interesses, mensagens e interações comerciais.</li>
          <li><strong>Dados de acesso e navegação:</strong> endereço IP, data e hora de acesso, tipo de dispositivo, navegador utilizado, páginas acessadas, origem do acesso, cookies e identificadores digitais.</li>
          <li><strong>Dados de pagamento e cobrança:</strong> informações necessárias para emissão de cobranças, notas fiscais, controle financeiro e gestão contratual, quando aplicável.</li>
          <li><strong>Dados inseridos na plataforma:</strong> informações cadastradas pelo próprio usuário ou cliente dentro dos sistemas fornecidos pela empresa, conforme o tipo de serviço contratado.</li>
        </ul>
      </>
    ),
  },
  {
    id: "finalidades",
    number: "03",
    title: "Para quais finalidades usamos os dados",
    content: (
      <>
        <p>Os dados pessoais poderão ser utilizados para:</p>
        <ul className="list-disc space-y-2 pl-6 marker:text-primary">
          <li>permitir o acesso ao site, sistema ou plataforma;</li>
          <li>responder solicitações enviadas por formulários, WhatsApp, e-mail ou outros canais;</li>
          <li>realizar contato comercial;</li>
          <li>enviar propostas, apresentações, demonstrações e informações sobre nossos serviços;</li>
          <li>criar e administrar contas de usuários;</li>
          <li>prestar suporte técnico e atendimento ao cliente;</li>
          <li>executar contratos e obrigações assumidas com clientes;</li>
          <li>emitir cobranças, recibos, notas fiscais e documentos financeiros;</li>
          <li>melhorar nossos produtos, serviços, segurança e experiência do usuário;</li>
          <li>enviar comunicações institucionais, comerciais ou promocionais, quando permitido;</li>
          <li>cumprir obrigações legais, fiscais, regulatórias e contratuais;</li>
          <li>prevenir fraudes, acessos não autorizados e incidentes de segurança.</li>
        </ul>
      </>
    ),
  },
  {
    id: "bases-legais",
    number: "04",
    title: "Bases legais para tratamento dos dados",
    content: (
      <>
        <p>O tratamento dos dados pessoais poderá ocorrer com base nas hipóteses previstas na LGPD, incluindo, quando aplicável:</p>
        <ul className="list-disc space-y-2 pl-6 marker:text-primary">
          <li>consentimento do titular;</li>
          <li>execução de contrato ou procedimentos preliminares relacionados a contrato;</li>
          <li>cumprimento de obrigação legal ou regulatória;</li>
          <li>legítimo interesse da empresa;</li>
          <li>exercício regular de direitos;</li>
          <li>proteção do crédito;</li>
          <li>prevenção à fraude e segurança do titular.</li>
        </ul>
      </>
    ),
  },
  {
    id: "compartilhamento",
    number: "05",
    title: "Compartilhamento de dados",
    content: (
      <>
        <p>A XFTS poderá compartilhar dados pessoais somente quando necessário e de forma compatível com as finalidades descritas nesta Política, incluindo:</p>
        <ul className="list-disc space-y-2 pl-6 marker:text-primary">
          <li><strong>Google (Google Analytics 4 e Google Tag Manager):</strong> medição de audiência e desempenho do site, somente com seu consentimento;</li>
          <li><strong>Meta (Meta Pixel e WhatsApp):</strong> mensuração de campanhas, somente com seu consentimento, e atendimento por WhatsApp;</li>
          <li><strong>Supabase:</strong> banco de dados e login das contas;</li>
          <li><strong>Lovable e Hostinger:</strong> hospedagem do site, infraestrutura e domínios;</li>
          <li><strong>Stripe:</strong> processamento de pagamentos e cobranças recorrentes;</li>
          <li>prestadores de serviço necessários à execução do contrato;</li>
          <li>autoridades públicas, órgãos reguladores ou entidades governamentais, quando houver obrigação legal.</li>
        </ul>
        <p><strong>A XFTS não vende dados pessoais dos usuários.</strong></p>
      </>
    ),
  },
  {
    id: "transferencia-internacional",
    number: "05.1",
    title: "Transferência internacional de dados",
    content: (
      <>
        <p>Alguns fornecedores citados acima, como Google, Meta, Stripe e Supabase, armazenam ou processam dados em servidores localizados fora do Brasil, principalmente nos Estados Unidos e na União Europeia.</p>
        <p>Essas transferências ocorrem conforme o art. 33 da LGPD, com base em cláusulas contratuais e nas garantias de proteção oferecidas por esses fornecedores.</p>
      </>
    ),
  },
  {
    id: "seguranca",
    number: "06",
    title: "Armazenamento e segurança dos dados",
    content: (
      <>
        <p>Adotamos medidas técnicas, administrativas e organizacionais para proteger os dados pessoais contra acessos não autorizados, perda, destruição, alteração, divulgação indevida ou qualquer forma de tratamento inadequado.</p>
        <p>Entre as medidas de segurança, podem ser utilizadas:</p>
        <ul className="list-disc space-y-2 pl-6 marker:text-primary">
          <li>controle de acesso;</li>
          <li>autenticação de usuários;</li>
          <li>senhas e permissões por perfil;</li>
          <li>backups;</li>
          <li>criptografia, quando aplicável;</li>
          <li>monitoramento de sistemas;</li>
          <li>restrição de acesso interno;</li>
          <li>boas práticas de segurança da informação.</li>
        </ul>
        <p>Apesar dos esforços de segurança, nenhum sistema é totalmente imune a riscos. Caso ocorra incidente de segurança relevante, serão adotadas as providências cabíveis conforme a legislação aplicável.</p>
      </>
    ),
  },
  {
    id: "retencao",
    number: "07",
    title: "Retenção dos dados",
    content: (
      <>
        <p>Os dados pessoais serão armazenados pelo tempo necessário para cumprir as finalidades para as quais foram coletados. Exemplos de prazos:</p>
        <ul className="list-disc space-y-2 pl-6 marker:text-primary">
          <li><strong>Dados fiscais e de cobrança:</strong> 5 anos, conforme a legislação tributária;</li>
          <li><strong>Registros de acesso ao site (IP, data e hora):</strong> 6 meses, conforme o art. 15 do Marco Civil da Internet;</li>
          <li><strong>Dados de conta e contrato:</strong> durante a vigência do contrato e pelo prazo legal posterior para exercício de direitos;</li>
          <li><strong>Contatos e leads comerciais:</strong> até 2 anos sem interação ou até a revogação do consentimento.</li>
        </ul>
        <p>Após esse período, os dados poderão ser excluídos, anonimizados ou mantidos conforme autorizado pela legislação.</p>
      </>
    ),
  },
  {
    id: "cookies",
    number: "08",
    title: "Cookies e tecnologias de rastreamento",
    content: (
      <>
        <p>Usamos cookies em três categorias. Cookies de desempenho e de marketing só são ativados depois do seu consentimento.</p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 pr-4 font-semibold">Cookie</th>
                <th className="py-2 pr-4 font-semibold">Categoria</th>
                <th className="py-2 pr-4 font-semibold">Finalidade</th>
                <th className="py-2 font-semibold">Prazo</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/60"><td className="py-2 pr-4 font-mono text-xs">xfts_cookie_consent</td><td className="py-2 pr-4">Essencial</td><td className="py-2 pr-4">Guardar sua escolha de cookies e a data</td><td className="py-2">12 meses</td></tr>
              <tr className="border-b border-border/60"><td className="py-2 pr-4 font-mono text-xs">sb-*-auth-token</td><td className="py-2 pr-4">Essencial</td><td className="py-2 pr-4">Manter o login na área do cliente</td><td className="py-2">Sessão / até sair</td></tr>
              <tr className="border-b border-border/60"><td className="py-2 pr-4 font-mono text-xs">_ga, _ga_*</td><td className="py-2 pr-4">Desempenho</td><td className="py-2 pr-4">Google Analytics: medir visitas e uso do site</td><td className="py-2">Até 2 anos</td></tr>
              <tr className="border-b border-border/60"><td className="py-2 pr-4 font-mono text-xs">Google Tag Manager</td><td className="py-2 pr-4">Desempenho / Marketing</td><td className="py-2 pr-4">Carregar as ferramentas de medição autorizadas</td><td className="py-2">Sessão</td></tr>
              <tr><td className="py-2 pr-4 font-mono text-xs">_fbp</td><td className="py-2 pr-4">Marketing</td><td className="py-2 pr-4">Meta Pixel: medir resultados de campanhas</td><td className="py-2">3 meses</td></tr>
            </tbody>
          </table>
        </div>
        <p><strong>Como retirar o consentimento:</strong> clique em "Preferências de cookies", no rodapé de qualquer página, e desative as categorias que quiser. Você também pode apagar os cookies pelo seu navegador.</p>
      </>
    ),
  },
  {
    id: "direitos",
    number: "09",
    title: "Direitos dos titulares",
    content: (
      <>
        <p>Nos termos da LGPD, o titular dos dados pessoais pode solicitar:</p>
        <ul className="list-disc space-y-2 pl-6 marker:text-primary">
          <li>confirmação da existência de tratamento;</li>
          <li>acesso aos dados;</li>
          <li>correção de dados incompletos, inexatos ou desatualizados;</li>
          <li>anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade;</li>
          <li>portabilidade dos dados, quando aplicável;</li>
          <li>informação sobre compartilhamento de dados;</li>
          <li>revogação do consentimento;</li>
          <li>eliminação de dados tratados com base no consentimento;</li>
          <li>revisão de decisões automatizadas, quando aplicável.</li>
        </ul>
        <p>As solicitações podem ser enviadas para <a href="mailto:xfts@xfts.com.br" className="text-primary underline-offset-4 hover:underline">xfts@xfts.com.br</a>. Pedidos de exclusão também podem ser feitos pela página <a href="/exclusao-de-dados" className="text-primary underline-offset-4 hover:underline">Exclusão de Dados</a>.</p>
        <p>Se entender que seus direitos não foram atendidos, você também pode apresentar reclamação à <strong>Autoridade Nacional de Proteção de Dados (ANPD)</strong>, pelo site <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-4 hover:underline">gov.br/anpd</a>.</p>
      </>
    ),
  },
  {
    id: "menores",
    number: "10",
    title: "Dados de menores de idade",
    content: (
      <>
        <p>Nossos serviços não são direcionados intencionalmente a menores de idade sem autorização dos responsáveis legais.</p>
        <p>Caso sejam tratados dados de menores no contexto de utilização da plataforma por clientes contratantes, tal tratamento deverá ocorrer conforme a legislação aplicável e sob responsabilidade do contratante que realizou o cadastro ou determinou o tratamento.</p>
      </>
    ),
  },
  {
    id: "comunicacoes",
    number: "11",
    title: "Comunicações comerciais",
    content: (
      <>
        <p>Poderemos enviar comunicações sobre produtos, serviços, conteúdos, novidades, propostas e campanhas.</p>
        <p>O usuário poderá solicitar o cancelamento do recebimento dessas comunicações a qualquer momento, por meio dos canais disponibilizados ou opção de descadastro, quando existente.</p>
      </>
    ),
  },
  {
    id: "alteracoes",
    number: "12",
    title: "Alterações nesta Política",
    content: (
      <>
        <p>Esta Política de Privacidade poderá ser atualizada periodicamente para refletir alterações legais, regulatórias, técnicas ou operacionais.</p>
        <p>A versão mais recente estará sempre disponível nos sites xfts-flexus.com e xfts.com.br. Última atualização: 14 de outubro de 2026.</p>
      </>
    ),
  },
  {
    id: "contato",
    number: "13",
    title: "Encarregado de dados e contato",
    content: (
      <>
        <p><strong>Encarregado pelo tratamento de dados pessoais (DPO):</strong> canal dedicado de privacidade da XFTS.</p>
        <p>E-mail: <a href="mailto:xfts@xfts.com.br" className="text-primary underline-offset-4 hover:underline">xfts@xfts.com.br</a> (assunto "Privacidade / LGPD").</p>
        <p>Para pedir a exclusão dos seus dados, use a página <a href="/exclusao-de-dados" className="text-primary underline-offset-4 hover:underline">Exclusão de Dados</a>.</p>
      </>
    ),
  },
];

function PoliticaDePrivacidadePage() {
  return (
    <LegalPageLayout
      badge="LGPD · Privacidade"
      breadcrumbLabel="Política de Privacidade"
      title="Política de Privacidade"
      subtitle="Como a XFTS coleta, utiliza, armazena e protege os dados pessoais dos usuários do site e das plataformas, em conformidade com a LGPD."
      updatedAt="14 de outubro de 2026"
      icon="shield"
      sections={sections}
      intro={
        <>
          <p>
            A presente Política de Privacidade tem como objetivo informar de forma clara e transparente como a{" "}
            <strong>XFTS CONSULTORIA EM SISTEMAS DE INFORMAÇÃO LTDA - ME</strong>, inscrita no CNPJ sob nº 23.102.588/0001-90,
            responsável pelos sites xfts-flexus.com e xfts.com.br, realiza a coleta, uso, armazenamento, compartilhamento e proteção dos
            dados pessoais dos usuários que acessam nosso site, utilizam nossos produtos, serviços, plataformas,
            sistemas ou canais de atendimento.
          </p>
          <p className="mt-3">
            Ao acessar nosso site, preencher formulários, contratar nossos serviços ou utilizar nossas soluções, você
            declara estar ciente dos termos desta Política de Privacidade.
          </p>
        </>
      }
    />
  );
}
