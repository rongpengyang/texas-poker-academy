# GROWTH_PLAN.md

## Current Production Context
- Repo: `rongpengyang/smartpokerlab-site`
- Lovable prototype repo: `rongpengyang/smartpokerlab-ui-prototype`
- Local path: `C:\Users\tim17\Documents\SmartPokerLab\smartpokerlab-site`
- Domain: `smartpokerlab.com`
- Expected sitemap route count: 144
- Lovable UI replacement has been merged.
- Dify Workflow A and Workflow B are active.

## 30-Day Goal
Make Smart Poker Lab feel like a polished English poker training product: clear learning paths, strong drill discovery, useful hand review, browser-local progress, and search-friendly education pages.

## Current Growth Focus
- Improve discovery across Study, Practice, Review, Progress, and Tools.
- Expand content around completed examples such as:
  - Button Open or Fold? practice drill
  - How to Stop Losing with Top Pair lesson
- Connect every lesson to a related drill or review action.
- Keep all growth work aligned with education-only positioning.
- Use Dify workflows for content operations, not direct production edits.

## Main KPI
- Organic impressions
- Article page views
- Practice drill starts
- Tool page visits
- Daily Workout completions
- Returning users
- Progress dashboard usage

## Content Priorities
1. More practical preflop decision drills.
2. More top-pair and one-pair mistake lessons.
3. More hand-review pages tied to player types.
4. Better internal links from articles to Practice and Tools.
5. Stronger snippets and FAQ blocks for SEO pages.

## Operating Rules
Every production change must run:

```bash
npm run check
npm run build
npm run ui:audit
```

Dify must not directly edit `main` or deploy production. Codex reviews and implements production changes.

## What Not To Do
- Do not rush paid products before trust and retention improve.
- Do not publish income-promise framing.
- Do not publish gambling-service-oriented copy.
- Do not add complex accounts or cloud sync until privacy, compliance, and product requirements are ready.
