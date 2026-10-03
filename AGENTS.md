
- capability-check: chave do app autentica só o SaaS; user_id = titular de cobrança; acting_as (TENANT|TENANT_ADMIN) é teto declarado pelo RBAC do SaaS, nunca elevado; internos 403, resto 400 — por quê: hub não tem prova do ator em v1.
- sso-atende: só owner (support recusado na emissão e na troca); SSO, entitlements e capability-check usam resolveAtendeLive (só environment live, nunca do navegador, assinatura ativa única; ambíguo nega) — por quê: sem contrato de suporte verificável e sandbox não pode liberar acesso real.
