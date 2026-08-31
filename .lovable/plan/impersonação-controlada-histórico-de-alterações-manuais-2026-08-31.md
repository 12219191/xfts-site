# Impersonação controlada + histórico de alterações manuais

Boa parte do que você descreveu já existe no Control Center: em `/admin/clientes` cada produto do cliente tem "Gerar acesso de suporte" (token de 5 minutos, uso único, marcado como suporte e vinculado ao admin), o ajuste de limite de usuários exige motivo, e `/admin/auditoria` registra quem/quando/o quê/antes/depois/motivo. O que falta é fechar as lacunas: alguns tipos de alteração manual ainda não geram histórico, a tela de suporte é pouco clara, e a auditoria mostra JSON cru em vez de "users: 5 → 10".

## 1. Tela do cliente mais clara (`/admin/clientes`)

Cada produto passa a ter dois blocos separados, hoje eles dividem o mesmo campo de motivo:

```text
FLEXUS | Barbearia          [PRO] [ativo]
Usuários: 5 / 10 (limite manual)
Renova em 26/09/2026

Limite de usuários
[ 10 ]  Motivo: [__________]  [Salvar]

Acesso de suporte
Motivo: [__________]        [ Abrir sistema como suporte ]
Última entrada: 26/08 15:32 por Luciano (atendimento técnico)
```

- Botão de suporte abre o sistema em nova aba direto (além de copiar o link), com aviso de expiração em 5 minutos e uso único.
- Cada bloco tem seu próprio campo de motivo, obrigatório, com mínimo de 5 caracteres.
- Abaixo de cada produto, as três últimas ações auditadas daquele cliente/produto, para o atendente ver o histórico sem sair da tela.

## 2. Registrar tudo que hoje escapa

Estas ações manuais passam a gravar em auditoria, com antes/depois e motivo obrigatório onde faz sentido:

- Cortesia concedida e cortesia revogada (hoje sem registro).
- Alteração das configurações de integração com o CRM (chave, URL, ativação).
- Mudança da janela de atribuição de marketing.
- Cancelamento de convite de equipe do cliente.

Já registradas e mantidas como estão: acesso de suporte, limite de usuários, papéis da equipe interna, catálogo (produto/plano), promoções, reembolsos, notas de atendimento, reenvio de e-mail/provisionamento, reprocessamento de webhook.

## 3. Auditoria legível (`/admin/auditoria`)

- Antes/depois vira lista de campos alterados em português: `usuários: 5 → 10`, `status: ativo → cancelado`, em vez do JSON atual. O JSON completo fica atrás de "ver detalhes".
- Novo filtro por cliente (e-mail do alvo) e por tipo de ação em lista suspensa, no lugar do campo de texto livre.
- Destaque visual para acessos de suporte (ícone e cor próprios), por serem os eventos mais sensíveis.
- Exportação CSV do período filtrado.

## 4. Sessões de suporte visíveis

Novo bloco no topo de `/admin/auditoria`: "Acessos de suporte", listando os tokens emitidos com cliente, sistema, admin, motivo, se foi usado e quando expirou. Token não usado que expirou aparece como "não utilizado" — evidência de que ninguém entrou.

## Detalhes técnicos

- Sem migração nova: `admin_audit_log` e `sso_tokens` (`purpose`, `created_by_admin`, `used_at`) já suportam tudo isso.
- `recordAudit` ganha helper `diffFields(before, after, labels)` para renderização legível; a normalização acontece na leitura, em `admin-audit.functions.ts`, preservando os registros já gravados.
- `courtesy.functions.ts`, `crm-settings.functions.ts`, `attribution-settings.functions.ts` e `invites.functions.ts` passam a chamar `recordAudit` depois da checagem de papel, no mesmo padrão de `admin-customers.functions.ts` (validação de motivo no `inputValidator`).
- `listAdminAudit` recebe filtros `targetId`/`action` opcionais e um novo `listSupportSessions` lê `sso_tokens` com `purpose = 'support'` via cliente admin, juntando e-mail do cliente pelo diretório de usuários.
- `admin.clientes.tsx`: `ProductCard` separa os dois estados de motivo e consome um novo `listCustomerAudit` limitado a 3 registros.
