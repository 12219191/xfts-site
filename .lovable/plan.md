# Prompt para colar no projeto FLEXUS | CRM

Copie o bloco abaixo inteiro e cole no chat do projeto **FLEXUS | CRM**. Ele descreve exatamente o que o hub (site XFTS) já envia e o que o CRM precisa expor.

```text
Preciso receber automaticamente os leads enviados pelo site XFTS (hub) neste projeto.

Crie uma função de backend pública chamada `flexus-lead`
(supabase/functions/flexus-lead/index.ts, com `verify_jwt = false` no supabase/config.toml),
acessível em POST https://<este-projeto>.supabase.co/functions/v1/flexus-lead

AUTENTICAÇÃO
- Header `x-flexus-signature` = HMAC-SHA256 (hex) do corpo BRUTO da requisição,
  usando o segredo `FLEXUS_APP_KEY_CRM` (mesma chave já usada no SSO/provisionamento).
- Recalcule a assinatura sobre o texto exato recebido (não sobre o JSON reserializado).
- Compare em tempo constante; se não bater, responda 401.
- Responda ao preflight OPTIONS com CORS liberado.

CORPO RECEBIDO (JSON)
{
  "reference_id": "XF-250212-ABCDE",
  "form_type": "contato" | "demo",
  "nome": "Maria Silva",
  "email": "maria@empresa.com",
  "telefone": "+55 17 99999-0000",
  "empresa": "Clínica Alfa",
  "segmento": "clinica",
  "assunto": "Planos",
  "mensagem": "Gostaria de uma demonstração",
  "tela": "/contato",
  "cta_id": "contato.form.enviar",
  "cta_label": "Enviar mensagem",
  "cta_page": "/contato",
  "cta_placement": "corpo",
  "utm_source": null, "utm_medium": null, "utm_campaign": null,
  "utm_term": null, "utm_content": null,
  "gclid": null, "fbclid": null,
  "referrer": null, "landing_page": null,
  "lt_utm_source": null, "lt_utm_medium": null, "lt_utm_campaign": null,
  "lt_utm_term": null, "lt_utm_content": null,
  "lt_gclid": null, "lt_fbclid": null,
  "lt_referrer": null, "lt_landing_page": null,
  "origem": "site-xfts",
  "timestamp": "2026-02-12T14:03:11.000Z"
}
Os campos `lt_*` são a origem de last-touch; os sem prefixo são first-touch.
Qualquer campo pode vir null. Ignore campos desconhecidos sem quebrar.

REGRAS DE DEDUPLICAÇÃO (upsert)
1. Procure um lead com o mesmo e-mail (case-insensitive).
2. Se não achar, procure pelo telefone normalizado (somente dígitos, comparando os últimos 11).
3. Achou: preencha apenas os campos vazios (não sobrescreva dados editados manualmente),
   registre uma nova interação/nota com a mensagem e a origem (UTMs + botão + página)
   e atualize a origem mais recente (last-touch). Responda action = "updated".
4. Não achou: crie o lead no estágio inicial de entrada, com origem "site-xfts"
   e todos os dados de atribuição. Responda action = "created".
5. Guarde `reference_id` no lead/interação para rastreio com o protocolo do site.

RESPOSTA ESPERADA (Content-Type: application/json, obrigatoriamente)
{ "lead_id": "uuid-do-lead", "action": "created" }
- Responder HTML é interpretado pelo hub como "endpoint ainda não implementado".
- 400/401/403 = erro permanente (o hub marca como falha e oferece reenvio manual).
- Outros erros/timeout = o hub reenvia sozinho depois.

BANCO
Se ainda não existir, crie/ajuste a tabela de leads com os campos de atribuição acima
(utm_*, lt_*, gclid, fbclid, referrer, landing_page, cta_id, cta_label, cta_page,
cta_placement, tela, origem, reference_id), com GRANTs e RLS por tenant.
A função usa a service role para gravar.

Ao terminar, me informe a URL final do endpoint.
```

## Depois que o CRM implementar

1. No hub, abra `/admin` → aba **Integração CRM**.
2. Confirme a URL (hoje já configurada como
   `https://awehexeiciruuqxqtdgk.supabase.co/functions/v1/flexus-lead`),
   o modo **Assinatura HMAC** e o header `x-flexus-signature`.
3. Clique em **Testar envio** — deve retornar `created`.
4. Os protocolos que ficaram como `pending` são reenviados automaticamente pelo retry.

Nenhuma alteração de código é necessária neste site.
