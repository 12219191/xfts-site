import { createFileRoute } from "@tanstack/react-router";

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

function TermosDeUsoPage() {
  return (
    <>
      <section className="gradient-primary section-padding text-center">
        <div className="container-wide">
          <h1 className="text-4xl font-extrabold text-primary-foreground md:text-5xl">Termos de Uso</h1>
          <p className="mt-4 text-primary-foreground/70">Última atualização: 27 de maio de 2026</p>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-wide max-w-4xl">
          <div className="space-y-6 text-foreground/90 leading-relaxed">
            <p>
              Estes Termos de Uso regulam o acesso e a utilização do site xfts.com.br, bem como dos produtos, serviços,
              sistemas, plataformas e soluções oferecidos pela <strong>XFTS CONSULTORIA EM SISTEMAS DE INFORMAÇÃO LTDA - ME</strong>,
              inscrita no CNPJ sob nº 23.102.588/0001-90.
            </p>
            <p>
              Ao acessar o site, contratar ou utilizar nossos serviços, o usuário declara que leu, compreendeu e concorda
              com estes Termos de Uso.
            </p>

            <div>
              <h2 className="mt-8 mb-3 text-2xl font-bold text-foreground">1. Objeto</h2>
              <p>
                A XFTS CONSULTORIA EM SISTEMAS DE INFORMAÇÃO LTDA - ME oferece soluções tecnológicas voltadas à consultoria
                em sistemas de informação, gestão empresarial, automação de processos, CRM, agendamentos, relacionamento
                com clientes, controle financeiro, indicadores, relatórios e demais funcionalidades disponibilizadas
                conforme o produto, plano ou serviço contratado.
              </p>
              <p className="mt-3">
                As funcionalidades podem variar de acordo com o sistema, plano, configuração, contrato ou proposta
                comercial vigente.
              </p>
            </div>

            <div>
              <h2 className="mt-8 mb-3 text-2xl font-bold text-foreground">2. Cadastro e acesso à plataforma</h2>
              <p>Para utilizar determinadas funcionalidades, o usuário poderá precisar realizar cadastro e criar credenciais de acesso.</p>
              <p className="mt-3">O usuário se compromete a fornecer informações verdadeiras, completas e atualizadas.</p>
              <p className="mt-3">
                O acesso à plataforma é pessoal e intransferível. O usuário é responsável por manter a confidencialidade
                de seu login, senha e demais credenciais.
              </p>
              <p className="mt-3">
                A XFTS CONSULTORIA EM SISTEMAS DE INFORMAÇÃO LTDA - ME não se responsabiliza por acessos realizados por
                terceiros em razão de uso indevido, compartilhamento de senha ou falha de segurança causada pelo próprio usuário.
              </p>
            </div>

            <div>
              <h2 className="mt-8 mb-3 text-2xl font-bold text-foreground">3. Responsabilidades do usuário</h2>
              <p>O usuário se compromete a:</p>
              <ul className="mt-3 list-disc space-y-2 pl-6">
                <li>utilizar o site e a plataforma de forma lícita, ética e adequada;</li>
                <li>não inserir informações falsas, ilegais, ofensivas ou que violem direitos de terceiros;</li>
                <li>não tentar acessar áreas restritas sem autorização;</li>
                <li>não praticar engenharia reversa, cópia, exploração indevida ou tentativa de violação do sistema;</li>
                <li>manter seus dados cadastrais atualizados;</li>
                <li>respeitar as regras do plano contratado;</li>
                <li>utilizar a plataforma conforme a legislação aplicável.</li>
              </ul>
            </div>

            <div>
              <h2 className="mt-8 mb-3 text-2xl font-bold text-foreground">4. Responsabilidades da empresa</h2>
              <p>
                A XFTS CONSULTORIA EM SISTEMAS DE INFORMAÇÃO LTDA - ME se compromete a empregar esforços razoáveis para
                manter o funcionamento adequado do site e da plataforma, observadas eventuais interrupções por manutenção,
                falhas técnicas, caso fortuito, força maior ou indisponibilidade de serviços de terceiros.
              </p>
              <p className="mt-3">
                A empresa poderá realizar atualizações, melhorias, correções, alterações de layout, recursos e
                funcionalidades, visando aprimorar a experiência, segurança e desempenho da solução.
              </p>
            </div>

            <div>
              <h2 className="mt-8 mb-3 text-2xl font-bold text-foreground">5. Planos, pagamentos e cancelamento</h2>
              <p>
                Os serviços poderão ser oferecidos mediante planos gratuitos, testes, assinaturas mensais, anuais ou
                condições comerciais específicas.
              </p>
              <p className="mt-3">
                As regras de preço, cobrança, renovação, inadimplência, suspensão, cancelamento e reembolso serão
                informadas na proposta comercial, contrato, página de contratação ou documento equivalente.
              </p>
              <p className="mt-3">
                Em caso de inadimplência, a XFTS CONSULTORIA EM SISTEMAS DE INFORMAÇÃO LTDA - ME poderá suspender ou
                limitar o acesso aos serviços, mediante aviso prévio quando aplicável.
              </p>
            </div>

            <div>
              <h2 className="mt-8 mb-3 text-2xl font-bold text-foreground">6. Período de teste</h2>
              <p>
                Quando disponibilizado período de teste gratuito, o usuário poderá utilizar a plataforma pelo prazo
                informado na oferta ou proposta comercial.
              </p>
              <p className="mt-3">
                Ao final do período de teste, o acesso poderá ser encerrado, limitado ou convertido em plano pago,
                conforme as condições previamente informadas.
              </p>
            </div>

            <div>
              <h2 className="mt-8 mb-3 text-2xl font-bold text-foreground">7. Propriedade intelectual</h2>
              <p>
                Todos os direitos relacionados ao site, sistema, plataforma, marca, layout, identidade visual, códigos,
                telas, fluxos, funcionalidades, conteúdos, textos, imagens, bancos de dados, relatórios e materiais
                pertencem à XFTS CONSULTORIA EM SISTEMAS DE INFORMAÇÃO LTDA - ME ou a seus licenciantes.
              </p>
              <p className="mt-3">O uso da plataforma não transfere ao usuário qualquer direito de propriedade intelectual.</p>
              <p className="mt-3">
                É proibida a cópia, reprodução, distribuição, modificação, venda, sublicenciamento ou exploração comercial
                não autorizada de qualquer parte do site ou sistema.
              </p>
            </div>

            <div>
              <h2 className="mt-8 mb-3 text-2xl font-bold text-foreground">8. Dados inseridos pelo usuário</h2>
              <p>
                Os dados inseridos pelo usuário ou cliente na plataforma permanecem sob responsabilidade de quem os
                cadastrou, especialmente quanto à veracidade, legalidade, autorização de uso e conformidade com a
                legislação aplicável.
              </p>
              <p className="mt-3">
                A XFTS CONSULTORIA EM SISTEMAS DE INFORMAÇÃO LTDA - ME poderá tratar esses dados apenas na medida
                necessária para prestação dos serviços, suporte, segurança, cumprimento contratual ou obrigações legais.
              </p>
            </div>

            <div>
              <h2 className="mt-8 mb-3 text-2xl font-bold text-foreground">9. Limitação de responsabilidade</h2>
              <p>A XFTS CONSULTORIA EM SISTEMAS DE INFORMAÇÃO LTDA - ME não se responsabiliza por:</p>
              <ul className="mt-3 list-disc space-y-2 pl-6">
                <li>uso inadequado da plataforma pelo usuário;</li>
                <li>informações incorretas inseridas pelos usuários;</li>
                <li>decisões tomadas exclusivamente com base nos dados apresentados no sistema;</li>
                <li>falhas decorrentes de internet, dispositivos, navegadores, servidores de terceiros ou integrações externas;</li>
                <li>indisponibilidades temporárias causadas por manutenção, atualizações ou eventos fora de seu controle;</li>
                <li>danos decorrentes do compartilhamento indevido de credenciais pelo usuário.</li>
              </ul>
            </div>

            <div>
              <h2 className="mt-8 mb-3 text-2xl font-bold text-foreground">10. Integrações com terceiros</h2>
              <p>
                A plataforma poderá possuir integrações com serviços externos, como meios de pagamento, ferramentas de
                comunicação, WhatsApp, APIs, sistemas fiscais, bancos, gateways, serviços de nuvem e outras plataformas.
              </p>
              <p className="mt-3">
                O funcionamento dessas integrações pode depender de disponibilidade, regras, permissões e políticas dos
                respectivos terceiros.
              </p>
              <p className="mt-3">
                A XFTS CONSULTORIA EM SISTEMAS DE INFORMAÇÃO LTDA - ME não se responsabiliza por falhas, alterações,
                indisponibilidades ou limitações decorrentes exclusivamente desses serviços externos.
              </p>
            </div>

            <div>
              <h2 className="mt-8 mb-3 text-2xl font-bold text-foreground">11. Suspensão ou encerramento de acesso</h2>
              <p>A empresa poderá suspender ou encerrar o acesso do usuário em caso de:</p>
              <ul className="mt-3 list-disc space-y-2 pl-6">
                <li>violação destes Termos;</li>
                <li>uso indevido ou abusivo da plataforma;</li>
                <li>tentativa de fraude;</li>
                <li>inadimplência;</li>
                <li>risco à segurança do sistema;</li>
                <li>determinação legal, judicial ou regulatória.</li>
              </ul>
            </div>

            <div>
              <h2 className="mt-8 mb-3 text-2xl font-bold text-foreground">12. Privacidade e proteção de dados</h2>
              <p>
                O tratamento de dados pessoais será realizado conforme a Política de Privacidade disponível no site
                xfts.com.br e de acordo com a legislação aplicável, incluindo a Lei Geral de Proteção de Dados Pessoais.
              </p>
            </div>

            <div>
              <h2 className="mt-8 mb-3 text-2xl font-bold text-foreground">13. Alterações nos Termos</h2>
              <p>
                A XFTS CONSULTORIA EM SISTEMAS DE INFORMAÇÃO LTDA - ME poderá atualizar estes Termos de Uso a qualquer
                momento para refletir alterações nos serviços, funcionalidades, legislação ou regras comerciais.
              </p>
              <p className="mt-3">A versão mais recente estará sempre disponível no site xfts.com.br.</p>
            </div>

            <div>
              <h2 className="mt-8 mb-3 text-2xl font-bold text-foreground">14. Lei aplicável e foro</h2>
              <p>Estes Termos serão regidos pelas leis da República Federativa do Brasil.</p>
              <p className="mt-3">
                Fica eleito o foro da comarca de São José do Rio Preto/SP, salvo disposição legal em sentido contrário,
                para dirimir eventuais controvérsias relacionadas a estes Termos.
              </p>
            </div>

            <div>
              <h2 className="mt-8 mb-3 text-2xl font-bold text-foreground">15. Contato</h2>
              <p>Em caso de dúvidas sobre estes Termos de Uso, entre em contato:</p>
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
