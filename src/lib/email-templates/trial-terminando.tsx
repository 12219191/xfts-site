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

interface TrialTerminandoProps {
  produto?: string
  plano?: string
  fim?: string
  dias?: number
  url?: string
}

export function TrialTerminando({
  produto = 'FLEXUS',
  plano = '',
  fim = '',
  dias = 3,
  url = 'https://xfts-flexus.com/minha-conta',
}: TrialTerminandoProps) {
  return (
    <Html>
      <Head />
      <Preview>Seu teste do {produto} termina em breve</Preview>
      <Body style={{ backgroundColor: '#F7F8F5', fontFamily: 'Arial, Helvetica, sans-serif', margin: 0 }}>
        <Container style={{ maxWidth: '560px', margin: '32px auto', backgroundColor: '#ffffff', borderRadius: '12px', padding: '32px' }}>
          <Text style={{ color: '#006B63', fontWeight: 'bold', letterSpacing: '1px', margin: 0 }}>XFTS · {produto}</Text>
          <Heading style={{ color: '#004E42', fontSize: '22px', marginTop: '16px' }}>
            Seu período de teste termina em {dias} dia{dias === 1 ? '' : 's'}
          </Heading>
          <Text style={{ color: '#334155', fontSize: '15px', lineHeight: '24px' }}>
            {plano ? `O teste do plano ${plano} ` : 'Seu teste '}
            {fim ? `vai até ${fim}. ` : 'termina em breve. '}
            Depois disso a cobrança começa automaticamente e você segue com tudo funcionando —
            sem precisar fazer nada.
          </Text>
          <Text style={{ color: '#334155', fontSize: '15px', lineHeight: '24px' }}>
            Quer trocar de plano ou cancelar antes da cobrança? Dá para resolver em um clique em
            “Minha conta”.
          </Text>

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
            Gerenciar assinatura
          </Button>

          <Hr style={{ borderColor: '#e2e8f0', margin: '28px 0 16px' }} />
          <Text style={{ color: '#64748b', fontSize: '12px', lineHeight: '18px' }}>
            Precisa de ajuda para aproveitar melhor o teste? Responda este e-mail.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: TrialTerminando,
  displayName: 'Teste terminando',
  subject: (data: Record<string, any>) =>
    `Seu teste do ${data?.produto ?? 'FLEXUS'} termina em breve — XFTS`,
  previewData: {
    produto: 'FLEXUS | Casa360°',
    plano: 'Pro mensal',
    fim: '05/09/2026',
    dias: 3,
  },
} satisfies TemplateEntry
