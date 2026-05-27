import { createFileRoute } from "@tanstack/react-router";

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

function PoliticaDePrivacidadePage() {
  return (
    <>
      <section className="gradient-primary section-padding text-center">
        <div className="container-wide">
          <h1 className="text-4xl font-extrabold text-primary-foreground md:text-5xl">Política de Privacidade</h1>
          <p className="mt-4 text-primary-foreground/70">Última atualização: 27 de maio de 2026</p>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-wide max-w-4xl">
          <div className="space-y-6 text-foreground/90 leading-relaxed">
            <p>
              A presente Política de Privacidade tem como objetivo informar de forma clara e transparente como a{" "}
              <strong>XFTS CONSULTORIA EM SISTEMAS DE INFORMAÇÃO LTDA - ME</strong>, inscrita no CNPJ sob nº 23.102.588/0001-90,
              responsável pelo site xfts.com.br, realiza a coleta, uso, armazenamento, compartilhamento e proteção dos
              dados pessoais dos usuários que acessam nosso site, utilizam nossos produtos, serviços, plataformas,
              sistemas ou canais de atendimento.
            </p>
            <p>
              Ao acessar nosso site, preencher formulários, contratar nossos serviços ou utilizar nossas soluções,
              você declara estar ciente dos termos desta Política de Privacidade.
            </p>

            <div>
              <h2 className="mt-8 mb-3 text-2xl font-bold text-foreground">1. Quem somos</h2>
              <p>
                A XFTS CONSULTORIA EM SISTEMAS DE INFORMAÇÃO LTDA - ME atua no desenvolvimento, consultoria e fornecimento
                de soluções tecnológicas, sistemas de informação, plataformas SaaS, ferramentas de gestão, automação, CRM,
                controle financeiro, agendamentos, relacionamento com clientes, indicadores e demais funcionalidades
                voltadas à melhoria da operação empresarial.
              </p>
              <p className="mt-3">
                Para fins da Lei Geral de Proteção de Dados Pessoais — LGPD, a empresa poderá atuar como controladora
                dos dados pessoais coletados diretamente em seus canais próprios e, em alguns casos, como operadora de
                dados tratados em nome de seus clientes contratantes.
              </p>
            </div>

            <div>
              <h2 className="mt-8 mb-3 text-2xl font-bold text-foreground">2. Quais dados podemos coletar</h2>
              <p>Podemos coletar os seguintes dados pessoais, conforme a forma de interação do usuário com nossos canais:</p>
              <ul className="mt-3 list-disc space-y-2 pl-6">
                <li><strong>Dados de identificação:</strong> nome, CPF, CNPJ, razão social, e-mail, telefone, cargo, empresa e cidade.</li>
                <li><strong>Dados de contato:</strong> endereço de e-mail, número de telefone, WhatsApp e demais canais informados pelo usuário.</li>
                <li><strong>Dados comerciais:</strong> informações relacionadas a propostas, contratos, planos contratados, histórico de atendimento, solicitações, interesses, mensagens e interações comerciais.</li>
                <li><strong>Dados de acesso e navegação:</strong> endereço IP, data e hora de acesso, tipo de dispositivo, navegador utilizado, páginas acessadas, origem do acesso, cookies e identificadores digitais.</li>
                <li><strong>Dados de pagamento e cobrança:</strong> informações necessárias para emissão de cobranças, notas fiscais, controle financeiro e gestão contratual, quando aplicável.</li>
                <li><strong>Dados inseridos na plataforma:</strong> informações cadastradas pelo próprio usuário ou cliente dentro dos sistemas fornecidos pela empresa, conforme o tipo de serviço contratado.</li>
              </ul>
            </div>

            <div>
              <h2 className="mt-8 mb-3 text-2xl font-bold text-foreground">3. Para quais finalidades usamos os dados</h2>
              <p>Os dados pessoais poderão ser utilizados para:</p>
              <ul className="mt-3 list-disc space-y-2 pl-6">
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
            </div>

            <div>
              <h2 className="mt-8 mb-3 text-2xl font-bold text-foreground">4. Bases legais para tratamento dos dados</h2>
              <p>
                O tratamento dos dados pessoais poderá ocorrer com base nas hipóteses previstas na LGPD, incluindo, quando aplicável:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-6">
                <li>consentimento do titular;</li>
                <li>execução de contrato ou procedimentos preliminares relacionados a contrato;</li>
                <li>cumprimento de obrigação legal ou regulatória;</li>
                <li>legítimo interesse da empresa;</li>
                <li>exercício regular de direitos;</li>
                <li>proteção do crédito;</li>
                <li>prevenção à fraude e segurança do titular.</li>
              </ul>
            </div>

            <div>
              <h2 className="mt-8 mb-3 text-2xl font-bold text-foreground">5. Compartilhamento de dados</h2>
              <p>
                A XFTS CONSULTORIA EM SISTEMAS DE INFORMAÇÃO LTDA - ME poderá compartilhar dados pessoais somente quando
                necessário e de forma compatível com as finalidades descritas nesta Política, incluindo:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-6">
                <li>fornecedores de tecnologia, hospedagem, armazenamento em nuvem e segurança;</li>
                <li>plataformas de pagamento, cobrança e emissão fiscal;</li>
                <li>ferramentas de atendimento, CRM, comunicação e automação;</li>
                <li>prestadores de serviço necessários à execução do contrato;</li>
                <li>autoridades públicas, órgãos reguladores ou entidades governamentais, quando houver obrigação legal;</li>
                <li>parceiros comerciais, quando necessário para a prestação do serviço contratado.</li>
              </ul>
              <p className="mt-3">A XFTS CONSULTORIA EM SISTEMAS DE INFORMAÇÃO LTDA - ME não vende dados pessoais dos usuários.</p>
            </div>

            <div>
              <h2 className="mt-8 mb-3 text-2xl font-bold text-foreground">6. Armazenamento e segurança dos dados</h2>
              <p>
                Adotamos medidas técnicas, administrativas e organizacionais para proteger os dados pessoais contra
                acessos não autorizados, perda, destruição, alteração, divulgação indevida ou qualquer forma de
                tratamento inadequado.
              </p>
              <p className="mt-3">Entre as medidas de segurança, podem ser utilizadas:</p>
              <ul className="mt-3 list-disc space-y-2 pl-6">
                <li>controle de acesso;</li>
                <li>autenticação de usuários;</li>
                <li>senhas e permissões por perfil;</li>
                <li>backups;</li>
                <li>criptografia, quando aplicável;</li>
                <li>monitoramento de sistemas;</li>
                <li>restrição de acesso interno;</li>
                <li>boas práticas de segurança da informação.</li>
              </ul>
              <p className="mt-3">
                Apesar dos esforços de segurança, nenhum sistema é totalmente imune a riscos. Caso ocorra incidente de
                segurança relevante, serão adotadas as providências cabíveis conforme a legislação aplicável.
              </p>
            </div>

            <div>
              <h2 className="mt-8 mb-3 text-2xl font-bold text-foreground">7. Retenção dos dados</h2>
              <p>
                Os dados pessoais serão armazenados pelo tempo necessário para cumprir as finalidades para as quais foram
                coletados, incluindo obrigações legais, fiscais, regulatórias, contratuais, exercício regular de direitos
                e preservação da segurança da operação.
              </p>
              <p className="mt-3">
                Após esse período, os dados poderão ser excluídos, anonimizados ou mantidos conforme autorizado pela legislação.
              </p>
            </div>

            <div>
              <h2 className="mt-8 mb-3 text-2xl font-bold text-foreground">8. Cookies e tecnologias de rastreamento</h2>
              <p>
                Nosso site poderá utilizar cookies e tecnologias semelhantes para melhorar a experiência de navegação,
                analisar desempenho, compreender o comportamento dos visitantes e personalizar conteúdos ou campanhas.
              </p>
              <p className="mt-3">Os cookies podem ser:</p>
              <ul className="mt-3 list-disc space-y-2 pl-6">
                <li><strong>Cookies essenciais:</strong> necessários para o funcionamento básico do site.</li>
                <li><strong>Cookies de desempenho:</strong> utilizados para entender como os visitantes interagem com o site.</li>
                <li><strong>Cookies de marketing:</strong> utilizados para mensurar campanhas e apresentar comunicações mais relevantes.</li>
              </ul>
              <p className="mt-3">
                O usuário pode configurar seu navegador para bloquear ou excluir cookies. No entanto, algumas
                funcionalidades do site poderão ser afetadas.
              </p>
            </div>

            <div>
              <h2 className="mt-8 mb-3 text-2xl font-bold text-foreground">9. Direitos dos titulares</h2>
              <p>Nos termos da LGPD, o titular dos dados pessoais pode solicitar:</p>
              <ul className="mt-3 list-disc space-y-2 pl-6">
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
              <p className="mt-3">As solicitações poderão ser enviadas pelo canal de contato indicado nesta Política.</p>
            </div>

            <div>
              <h2 className="mt-8 mb-3 text-2xl font-bold text-foreground">10. Dados de menores de idade</h2>
              <p>Nossos serviços não são direcionados intencionalmente a menores de idade sem autorização dos responsáveis legais.</p>
              <p className="mt-3">
                Caso sejam tratados dados de menores no contexto de utilização da plataforma por clientes contratantes,
                tal tratamento deverá ocorrer conforme a legislação aplicável e sob responsabilidade do contratante que
                realizou o cadastro ou determinou o tratamento.
              </p>
            </div>

            <div>
              <h2 className="mt-8 mb-3 text-2xl font-bold text-foreground">11. Comunicações comerciais</h2>
              <p>Poderemos enviar comunicações sobre produtos, serviços, conteúdos, novidades, propostas e campanhas.</p>
              <p className="mt-3">
                O usuário poderá solicitar o cancelamento do recebimento dessas comunicações a qualquer momento, por meio
                dos canais disponibilizados ou opção de descadastro, quando existente.
              </p>
            </div>

            <div>
              <h2 className="mt-8 mb-3 text-2xl font-bold text-foreground">12. Alterações nesta Política</h2>
              <p>
                Esta Política de Privacidade poderá ser atualizada periodicamente para refletir alterações legais,
                regulatórias, técnicas ou operacionais.
              </p>
              <p className="mt-3">A versão mais recente estará sempre disponível no site xfts.com.br.</p>
            </div>

            <div>
              <h2 className="mt-8 mb-3 text-2xl font-bold text-foreground">13. Canal de contato</h2>
              <p>Para dúvidas, solicitações ou exercício de direitos relacionados a dados pessoais, entre em contato:</p>
              <div className="mt-4 rounded-lg border border-border bg-card p-4 text-sm">
                <p><strong>XFTS CONSULTORIA EM SISTEMAS DE INFORMAÇÃO LTDA - ME</strong></p>
                <p>CNPJ: 23.102.588/0001-90</p>
                <p>Site: xfts.com.br</p>
                <p>E-mail: xfts@xfts.com.br</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
