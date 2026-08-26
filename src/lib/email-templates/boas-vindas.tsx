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

interface BoasVindasProps {
  produto?: string
  plano?: string
  trial?: string
  url?: string
}

export function BoasVindas({
  produto = 'FLEXUS',
  plano = '',
  trial = '',
  url = 'https://xfts-flexus.com/minha-conta',
}: BoasVindasProps) {
  return (
    <Html>
      <Head />
      <Preview>Seu acesso ao {produto} está liberado</Preview>
      <Body style={{ backgroundColor: '#F7F8F5', fontFamily: 'Arial, Helvetica, sans-serif', margin: 0 }}>
        <Container style={{ maxWidth: '560px', margin: '32px auto', backgroundColor: '#ffffff', borderRadius: '12px', padding: '32px' }}>
          <Text style={{ color: '#006B63', fontWeight: 'bold', letterSpacing: '1px', margin: 0 }}>XFTS · {produto}</Text>
          <Heading style={{ color: '#004E42', fontSize: '22px', marginTop: '16px' }}>
            Tudo pronto para começar
          </Heading>
          <Text style={{ color: '#334155', fontSize: '15px', lineHeight: '24px' }}>
            Seu acesso ao {produto} está liberado{plano ? ` no plano ${plano}` : ''}.
            {trial ? ` Você está em período de teste até ${trial}.` : ''}
          </Text>

          <Section style={{ backgroundColor: '#F7F8F5', borderRadius: '8px', padding: '16px', marginTop: '8px' }}>
            <Text style={{ margin: '0 0 8px', color: '#334155', fontSize: '14px' }}>
              1. Entre em “Minha conta” e clique em <strong>Acessar sistema</strong>.
            </Text>
            <Text style={{ margin: '0 0 8px', color: '#334155', fontSize: '14px' }}>
              2. Convide sua equipe pelo painel de usuários — as vagas do seu plano já estão liberadas.
            </Text>
            <Text style={{ margin: 0, color: '#334155', fontSize: '14px' }}>
              3. Precisa de ajuda na configuração? Responda este e-mail que a gente te acompanha.
            </Text>
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
            Abrir minha conta
          </Button>

          <Hr style={{ borderColor: '#e2e8f0', margin: '28px 0 16px' }} />
          <Text style={{ color: '#64748b', fontSize: '12px', lineHeight: '18px' }}>
            Dúvidas? Fale com a gente pelo WhatsApp (17) 99794-3349.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: BoasVindas,
  displayName: 'Boas-vindas / ativação',
  subject: (data: Record<string, any>) =>
    `Seu acesso ao ${data?.produto ?? 'FLEXUS'} está liberado — XFTS`,
  previewData: {
    produto: 'FLEXUS | Casa360°',
    plano: 'Pro mensal',
    trial: '05/09/2026',
  },
} satisfies TemplateEntry
