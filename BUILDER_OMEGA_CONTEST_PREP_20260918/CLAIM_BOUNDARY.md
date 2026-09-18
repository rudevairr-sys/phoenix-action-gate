# Claim Boundary — Phoenix Action Gate Hackathon

Fecha: 2026-09-18  
Modo: `CLAIM_CALIBRATION`

## Claim público principal permitido

Phoenix Action Gate demonstrates a governed pre-execution layer for AI coding agents: Nemotron proposes actions or compact plans through Nebius Token Factory, while a deterministic gate checks contract, risk, state, evidence lineage and reversibility before anything can advance.

## Claims permitidos con evidencia local existente

Estos claims pueden usarse si se acompañan de límites:

1. `Nemotron proposes; Phoenix decides.`
   - Permitido porque el diseño separa propuesta del modelo y decisión determinista.
   - No implica producción ni ejecución.

2. `No automatic dispatch in the MVP.`
   - Permitido si el código y la demo mantienen `dispatch_attempted=false`.

3. `The demo shows a bounded evidence-lineage invalidation scenario.`
   - Permitido si se presenta como caso acotado.

4. `A prior local run observed Nebius Token Factory with nvidia/Nemotron-3_5-Lightning.`
   - Permitido solo si la evidencia se conserva sanitizada y se repite o se declara como evidencia previa.

5. `The product helps reviewers see why an agent action should be denied or reviewed.`
   - Permitido como valor de producto demostrado por UI, no como garantía general de seguridad.

## Claims prohibidos

No usar:

- `production-ready`;
- `secure AI agent execution` sin cualificador;
- `Phoenix Neuron integration`;
- `powered by Phoenix Neuron`;
- `canonical Phoenix DomainPack`;
- `formally verified`;
- `prevents all dangerous actions`;
- `best guardrail`;
- `superior to all baselines`;
- `receipt/tamper lineage is a Phoenix moat`;
- `autonomous execution`;
- `deploys or patches code automatically`.

## Resultado adverso que debe preservarse

El resultado B1 local existente indica:

`NOT_DIFFERENTIATING_VS_B1 / USEFUL_G7_CAPABILITY`

Interpretación obligatoria:

One-hop causal evidence lineage is useful, but it is not demonstrated as a Phoenix-only differentiator versus a small competent lineage-aware baseline.

## Narrativa corregida

La diferenciación pública no debe apoyarse en "Phoenix gana a todos los baselines".

Debe apoyarse en:

- experiencia de producto clara;
- integración real con Nemotron/Nebius;
- separación modelo/gate;
- evidencia visual;
- no-dispatch;
- honestidad experimental;
- utilidad práctica para agentes de código.

## Frase recomendada para jurado

Phoenix Action Gate does not try to make the model the authority. It lets the model propose, then makes the justification visible and checks whether that justification is still valid before anything can move forward.

## Frase corta

A justification firewall for AI coding agents.
