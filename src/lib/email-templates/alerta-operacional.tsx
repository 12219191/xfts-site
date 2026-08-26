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

interface AlertaOperacionalProps {
  data?: string
  webhooks?: number
  provisionamentos?: number
  sistemas?: string[]
  url?: string
}

export function AlertaOperacional({
  data = '',
  webhooks = 0,
  provisionamentos = 0,
  sistemas = [],
  url = 'https://xfts-flexus.com/admin/integracoes',
}: AlertaOperacionalProps) {
  return (
    <Html>
      <Head />
      <Preview>Alertas operacionais do Control Center</Preview>
      <Body style={{ backgroundColor: '#F7F8F5', fontFamily: 'Arial, Helvetica, sans-serif', margin: 0 }}>
        <Container
          style={{
            maxWidth: '560px',
            margin: '32px auto',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '32px',
          }}
        >
          <Heading style={{ fontSize: '20px', color: '#004E42', margin: '0 0 8px' }}>
            Alertas operacionais {data ? `— ${data}` : ''}
          </Heading>
          <Text style={{ fontSize: '14px', color: '#3f4a47', lineHeight: '22px' }}>
            Resumo das últimas 24 horas das integrações entre o hub e os sistemas FLEXUS.
          </Text>

          <Section style={{ margin: '20px 0' }}>
            <Text style={{ fontSize: '14px', color: '#1f2937', margin: '4px 0' }}>
              Webhooks de pagamento com falha: <strong>{webhooks}</strong>
            </Text>
            <Text style={{ fontSize: '14px', color: '#1f2937', margin: '4px 0' }}>
              Avisos de provisionamento esgotados: <strong>{provisionamentos}</strong>
            </Text>
            <Text style={{ fontSize: '14px', color: '#1f2937', margin: '4px 0' }}>
              Sistemas com problema:{' '}
              <strong>{sistemas.length > 0 ? sistemas.join(', ') : 'nenhum'}</strong>
            </Text>
          </Section>

          <Button
            href={url}
            style={{
              backgroundColor: '#006B63',
              color: '#ffffff',
              padding: '12px 20px',
              borderRadius: '8px',
              fontSize: '14px',
              textDecoration: 'none',
            }}
          >
            Abrir o Control Center
          </Button>

          <Hr style={{ borderColor: '#e5e7eb', margin: '28px 0 12px' }} />
          <Text style={{ fontSize: '12px', color: '#6b7280' }}>
            Mensagem automática do Control Center XFTS.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template: TemplateEntry = {
  component: AlertaOperacional,
  subject: 'Alertas operacionais — Control Center XFTS',
  displayName: 'Alerta operacional (interno)',
  previewData: {
    data: '26/08/2026',
    webhooks: 2,
    provisionamentos: 1,
    sistemas: ['FLEXUS | CRM'],
  },
}
