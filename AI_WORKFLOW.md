# AI_WORKFLOW.md

## Active Production Repo
`rongpengyang/smartpokerlab-site`

## Active Prototype Repo
`rongpengyang/smartpokerlab-ui-prototype`

## Local Production Path
`C:\Users\tim17\Documents\SmartPokerLab\smartpokerlab-site`

## Domain
`https://smartpokerlab.com`

## Tool Roles

### Codex
Codex owns production implementation in `rongpengyang/smartpokerlab-site`. Codex may edit files, run checks, build the static site, prepare commits, and coordinate deployment steps after verification.

### Lovable
Lovable is a UI prototype source only. The Lovable UI replacement has been merged into the production site, but future Lovable work must remain a visual reference or prototype unless Codex migrates it safely.

### ChatGPT
ChatGPT supports strategy, content structure, compliance wording, learning-path planning, and growth planning.

### Dify Workflow A
Active. Use Workflow A for structured content intake, lesson briefs, drill briefs, and hand-review preparation. Workflow A must not directly edit `main` and must not deploy production.

### Dify Workflow B
Active. Use Workflow B for audit preparation, QA summaries, growth workflows, and content operations. Workflow B must not directly edit `main` and must not deploy production.

## Required Change Flow
1. Prepare the task brief.
2. Codex edits production files when needed.
3. Run:

```bash
npm run check
npm run build
npm run ui:audit
```

4. Review route count, compliance output, and UI audit output.
5. Commit only after checks pass.
6. Deploy only after explicit approval or an approved deployment step.

## Production Rules
Smart Poker Lab must remain education-first. Preserve ComplianceStrip, Practice feedback gating, Range Trainer guardrails, browser-local progress behavior, SEO metadata, and the 144-route sitemap baseline.
