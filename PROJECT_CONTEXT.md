# PROJECT_CONTEXT.md

## Project Name
Smart Poker Lab

## Current Production Repository
`rongpengyang/smartpokerlab-site`

## Current Lovable Prototype Repository
`rongpengyang/smartpokerlab-ui-prototype`

## Current Local Production Path
`C:\Users\tim17\Documents\SmartPokerLab\smartpokerlab-site`

## Production Domain
`https://smartpokerlab.com`

## Current Site State
- Production repo: `rongpengyang/smartpokerlab-site`
- Domain: `smartpokerlab.com`
- Static output directory: `dist`
- Expected sitemap route count: 144
- Lovable UI replacement has been merged into the production site.
- Dify Workflow A and Dify Workflow B are active.
- Recent completed content examples:
  - Button Open or Fold? practice drill
  - How to Stop Losing with Top Pair lesson

## Business Goal
Build an English Texas Hold'em education and training site focused on rules, math, strategy, hand review, practice drills, and entertainment education. The site is a training product, not a gambling or commercial access service.

## Target Users
- Beginners learning Texas Hold'em rules and position
- Players training preflop ranges, pot odds, board texture, and decision quality
- Students who want structured hand review and browser-local progress tracking

## Positioning
Education, strategy, practice, review, and browser-local progress only.

## Production Guardrails
- Dify must not directly edit `main`.
- Dify must not deploy production.
- Dify may prepare structured briefs, content drafts, audit notes, and workflow outputs for Codex review.
- Codex is responsible for production code changes, checks, build verification, and deployment preparation.

## Required Checks For Every Change
Run all three before considering any change ready:

```bash
npm run check
npm run build
npm run ui:audit
```

## Do Not Break
- All generated public routes and sitemap generation
- `src/english-content.js` content data
- `src/generate-site.js` SEO, canonical, schema, and route logic
- ComplianceStrip safe production copy
- Mobile dock labels: Study / Practice / Review / Progress / Tools
- Practice feedback gating
- Range Trainer guardrails, including "Not real-time play assistance."
- Analyze and Progress browser-local behavior
- Vercel build: `npm run build`, output `dist`
