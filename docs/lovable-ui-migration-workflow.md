# Lovable UI Migration Workflow

This workflow keeps the Lovable prototype useful without making it the production source of truth. Production remains the static Smart Poker Lab site in this repository.

## Repositories

- Production: `C:\Users\tim17\Documents\SmartPokerLab\smartpokerlab-site`
- Lovable prototype: `C:\Users\tim17\Documents\SmartPokerLab\smartpokerlab-ui-prototype`

The prototype is a visual reference. Do not copy route logic, SEO logic, content data, localStorage behavior, or tool behavior from it into production.

## Guardrails

- Do not merge `main` as part of a UI migration pass.
- Do not deploy production from a migration pass.
- Do not push unless the branch has already passed review.
- Preserve all public routes, sitemap count, canonical URLs, schema output, and SEO metadata.
- Preserve `src/english-content.js` as the content source of truth.
- Preserve `script.js` behavior unless a harmless visual state hook is absolutely required.
- Preserve Practice feedback gating and Smart Score behavior.
- Preserve Range Trainer logic and the guardrail copy: `Not real-time play assistance.`
- Preserve Analyze logic and Progress localStorage behavior.
- Preserve ComplianceStrip production copy and footer placement.
- Preserve mobile dock labels exactly: `Study / Practice / Review / Progress / Tools`.
- Keep prohibited terms at zero in generated public HTML.

## Recommended Branch Flow

1. Start from the current migration branch, usually `lovable-ui-replacement`.
2. Confirm the worktree status before editing.
3. Inspect the Lovable prototype for visual direction only:
   - `src/styles.css`
   - `src/components/PageShell.tsx`
   - `src/components/SiteHeader.tsx`
   - `src/components/MobileTabBar.tsx`
   - `src/routes/*.tsx`
4. Map visual ideas into production:
   - Use `styles.css` for palette, spacing, card hierarchy, panel styling, and mobile rhythm.
   - Use `src/generate-site.js` only for safe class hooks or layout wrappers.
   - Use `service-worker.js` only when a cache version bump is needed.
5. Do not edit production content data or tool logic.
6. Run the audit script before asking for preview review.

## Visual Translation Checklist

- Warm paper background is present without making the page monochrome.
- Cards have clear hierarchy: primary dashboard panels, secondary cards, and compact helper blocks.
- Core pages feel like training dashboards rather than long static blog pages.
- Mobile spacing is compact enough for repeated training use.
- CTAs remain clear and accessible.
- Article and hand review pages have improved reading flow without changing text.
- Compliance copy remains visible near the footer.

## Automation Command

Run:

```powershell
npm run ui:audit
```

The audit script checks repository shape, prototype availability, production source files, generated route count, prohibited public HTML terms, and the existing production build/check commands.

For a manual equivalent:

```powershell
npm run check
npm run build
node scripts/ui-sync-audit.mjs
```

## Expected Audit Gates

- Production `package.json` name is `smart-poker-lab`.
- Lovable prototype exists at `../smartpokerlab-ui-prototype`.
- Lovable prototype includes useful source folders/files.
- Production includes required source files.
- `npm run check` passes.
- `npm run build` passes.
- `dist/sitemap.xml` contains exactly 143 URLs.
- Generated public HTML contains zero hits for:
  - `agent`
  - `rakeback`
  - `private game`
  - `deposit`
  - `withdrawal`
  - `guaranteed profit`

## Review Notes

The audit script is a gate, not a visual reviewer. After it passes, still use a Vercel preview or local browser check for:

- Practice hidden feedback before answer and visible feedback after answer.
- Range Trainer answer flow and matrix layout.
- Analyze report generation.
- Progress localStorage dashboard states.
- No horizontal overflow at 390px width.
- Mobile dock labels and tap targets.

