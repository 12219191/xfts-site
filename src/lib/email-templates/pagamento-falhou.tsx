import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'
import type { TemplateEntry } from './registry'

interface PagamentoFalhouProps {
  nome?: string
  produto?: string
  plano?: string
  valor?: string
  stage?: number
  acessoAte?: string
  url?: string
}

const stageCopy: Record<number, { title: string; intro: string }> = {
  1: {
    title: 'Não conseguimos processar seu pagamento',
    intro:
      'A cobrança da sua assinatura não foi aprovada pelo banco. Isso costuma ser cartão vencido ou limite indisponível — atualizar os dados resolve em menos de um minuto.',
  },
  3: {
    title: 'Sua assinatura segue com pagamento pendente',
    intro:
      'Continuamos sem conseguir concluir a cobrança. Seu acesso ainda está liberado, mas será suspenso em breve caso o pagamento não seja regularizado.',
  },
  5: {
    title: 'Último aviso antes da suspensão do acesso',
    intro:
      'Esta é a última tentativa antes de suspendermos o acesso ao sistema. Regularize agora para não perder o histórico e a continuidade do serviço.',
  },
}

export function PagamentoFalhou({
  nome = 'Olá',
  produto = 'FLEXUS',
  plano = '',
  valor = '',
  stage = 1,
  acessoAte = '',
  url = 'https://xfts-flexus.com/minha-conta',
}: PagamentoFalhouProps) {
  const copy = stageCopy[stage] ?? stageCopy[1]!

  return (
    <Html>
      <Head />
      <Preview>{copy.title}</Preview>
      <Body style={{ backgroundColor: '#F7F8F5', fontFamily: 'Arial, Helvetica, sans-serif', margin: 0 }}>
        <Container style={{ maxWidth: '560px', margin: '32px auto', backgroundColor: '#ffffff', borderRadius: '12px', padding: '32px' }}>
          <Text style={{ color: '#006B63', fontWeight: 'bold', letterSpacing: '1px', margin: 0 }}>XFTS · {produto}</Text>
          <Heading style={{ color: '#004E42', fontSize: '22px', marginTop: '16px' }}>{copy.title}</Heading>
          <Text style={{ color: '#334155', fontSize: '15px', lineHeight: '24px' }}>
            {nome}, {copy.intro}
          </Text>

          <Section style={{ backgroundColor: '#F7F8F5', borderRadius: '8px', padding: '16px', marginTop: '16px' }}>
            {plano ? (
              <Text style={{ margin: '0 0 6px', color: '#334155', fontSize: '14px' }}>Plano: {plano}</Text>
            ) : null}
            {valor ? (
              <Text style={{ margin: '0 0 6px', color: '#334155', fontSize: '14px' }}>Valor: {valor}</Text>
            ) : null}
            {acessoAte ? (
              <Text style={{ margin: 0, color: '#334155', fontSize: '14px' }}>Acesso garantido até: {acessoAte}</Text>
            ) : null}
          </Section>

          <Button
            href={url}
            style={{
              backgroundColor: '#006B63',
              color: '#ffffff',
              borderRadius: '8px',
              padding: '12px 22px',
              fontSize: '15px',
              fontWeight: 'bold',
              display: 'inline-block',
              marginTop: '24px',
            }}
          >
            Regularizar pagamento
          </Button>

          <Hr style={{ borderColor: '#e2e8f0', margin: '28px 0 16px' }} />
          <Text style={{ color: '#64748b', fontSize: '12px', lineHeight: '18px' }}>
            Se o pagamento já foi feito, ignore este aviso. Precisa de ajuda? Responda este e-mail ou fale com a
            gente pelo WhatsApp (17) 99794-3349.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: PagamentoFalhou,
  displayName: 'Pagamento falhou (régua de cobrança)',
  subject: (data: Record<string, any>) =>
    (stageCopy[data?.stage as number] ?? stageCopy[1]!).title + ' — XFTS FLEXUS',
  previewData: {
    nome: 'Lucas',
    produto: 'FLEXUS | Casa360°',
    plano: 'Pro mensal',
    valor: 'R$ 199,00',
    stage: 1,
    acessoAte: '25/08/2026',
  },
} satisfies TemplateEntry
