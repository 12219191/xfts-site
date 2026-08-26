import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from '@react-email/components'
import * as React from 'react'
import type { TemplateEntry } from './registry'

interface ConviteEquipeProps {
  produto?: string
  titular?: string
  nota?: string
  url?: string
  validade?: string
}

export function ConviteEquipe({
  produto = 'FLEXUS',
  titular = '',
  nota = '',
  url = 'https://xfts-flexus.com',
  validade = '7 dias',
}: ConviteEquipeProps) {
  return (
    <Html>
      <Head />
      <Preview>Você foi convidado para usar o {produto}</Preview>
      <Body style={{ backgroundColor: '#F7F8F5', fontFamily: 'Arial, Helvetica, sans-serif', margin: 0 }}>
        <Container style={{ maxWidth: '560px', margin: '32px auto', backgroundColor: '#ffffff', borderRadius: '12px', padding: '32px' }}>
          <Text style={{ color: '#006B63', fontWeight: 'bold', letterSpacing: '1px', margin: 0 }}>XFTS · {produto}</Text>
          <Heading style={{ color: '#004E42', fontSize: '22px', marginTop: '16px' }}>
            Você foi convidado para a equipe
          </Heading>
          <Text style={{ color: '#334155', fontSize: '15px', lineHeight: '24px' }}>
            {titular ? `${titular} convidou você` : 'Você foi convidado'} para usar o {produto}. É só
            aceitar o convite e criar (ou entrar com) sua conta XFTS.
          </Text>
          {nota ? (
            <Text style={{ color: '#334155', fontSize: '14px', backgroundColor: '#F7F8F5', borderRadius: '8px', padding: '14px' }}>
              “{nota}”
            </Text>
          ) : null}

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
              marginTop: '20px',
            }}
          >
            Aceitar convite
          </Button>

          <Hr style={{ borderColor: '#e2e8f0', margin: '28px 0 16px' }} />
          <Text style={{ color: '#64748b', fontSize: '12px', lineHeight: '18px' }}>
            O convite expira em {validade}. Se você não esperava este e-mail, pode ignorá-lo.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ConviteEquipe,
  displayName: 'Convite de equipe',
  subject: (data: Record<string, any>) =>
    `Convite para usar o ${data?.produto ?? 'FLEXUS'} — XFTS`,
  previewData: {
    produto: 'FLEXUS | Casa360°',
    titular: 'lucas@empresa.com',
    nota: 'Você vai cuidar dos agendamentos.',
    url: 'https://xfts-flexus.com/convite/abc123',
    validade: '7 dias',
  },
} satisfies TemplateEntry
