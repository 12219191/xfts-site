# Entregar o kit do capability gate para colar nos outros sistemas

Os quatro arquivos do kit já existem neste projeto, na pasta `docs/integracao-hub/capability-gate/`:

- `xfts-hub-client.ts` — cliente que fala com o Control Center (vai em `src/lib/xfts-hub.ts` no sistema)
- `CapabilityGate.tsx` — bloqueio de tela + tela "Recurso indisponível no seu plano"
- `gate-endpoint.ts` — rota `GET /api/xfts/gate` e o guarda que devolve 403 real
- `INSTALL.md` — passo a passo, variáveis, mapa de telas por sistema e checklist

Como eles estão dentro do código deste site, você não consegue baixá-los pelo chat hoje.

## O que será feito

1. Gerar um único arquivo para download com o conteúdo completo dos quatro arquivos,
   cada um em sua seção e identificado com o caminho de destino no sistema.
2. Incluir no topo um prompt curto para colar no chat de cada sistema FLEXUS,
   pedindo a instalação exatamente como está no documento (sem inventar endpoints).
3. Incluir a lista do que precisa ser configurado em cada sistema:
   `XFTS_HUB_URL`, `XFTS_APP` e `XFTS_APP_KEY`.
4. Salvar como `capability-gate-flexus.md` na área de arquivos, para download direto.

## Detalhes técnicos

- Nenhuma alteração em código do site; os arquivos em `docs/integracao-hub/capability-gate/`
  permanecem como estão.
- A saída vai para a área de documentos (download pelo chat), não para o repositório.
- Lembrete: Clínica, Estética e ABA ainda não têm chave de sistema cadastrada — sem ela
  o gate responde 401 nesses três.
