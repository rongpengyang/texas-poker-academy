# Dify to Codex Content Update SOP

This SOP describes the repeatable content-update process for Smart Poker Lab. Dify plans and packages the work, a human selects one small item, Codex implements it on a branch, GitHub/Vercel provide review gates, and production changes happen only after preview approval.

## 1. Dify Workflow A: Weekly Poker Content Planner

Use Dify Workflow A as the first planning step for weekly content operations.

Input fields:

- Weekly goal.
- Target audience.
- Content focus.
- Keyword theme.
- Extra notes.

Expected Dify output:

- Weekly theme.
- SEO article ideas.
- Practice drill idea.
- Hand review idea.
- Range Trainer idea.
- Compliance review.
- Codex execution prompt.

Dify should produce planning output and task briefs only. It should not write production files, deploy, merge, or bypass review.

## 2. Human Selection Step

Do not execute the full weekly plan at once.

Pick one small task first. Prefer one article, one drill, or one hand review per PR. This keeps review simple, protects route count, and makes it easier to confirm that the changed page or feature still behaves correctly.

Good first-task shapes:

- One beginner lesson.
- One Practice Mode drill.
- One hand review.
- One small Range Trainer data update.

## 3. Codex Execution Step

Codex must always create a new branch and must never edit `main` directly.

Keep task scope small:

- Do not combine unrelated article, drill, UI, and tool changes.
- Do not change production UI unless the task is explicitly a UI task.
- Do not change tool logic unless the task is explicitly a tool behavior task.
- Do not add multiple SEO articles from one Dify plan in a single PR.

Example branch names:

- `content-button-open-or-fold`
- `content-top-pair-lesson`
- `content-cbet-beginner-guide`

## 4. Required Checks

Every content change must run:

```bash
npm run check
npm run build
npm run ui:audit
```

If any command fails, stop and fix the issue before pushing the branch or opening a PR.

## 5. Required Verification

Confirm these items before the PR is marked ready:

- Sitemap remains `143` unless a new route is intentionally added.
- Prohibited public HTML scan remains `0`.
- Practice feedback gating remains intact if Practice data is changed.
- Range Trainer still works if range data is touched.
- No production deploy happens before preview approval.

For Practice data changes, verify that feedback is hidden before the learner chooses an action and visible after the learner chooses an action.

For Range Trainer data changes, verify that the guardrail copy remains intact and the trainer still loads the updated spot.

## 6. GitHub PR Step

After checks pass:

1. Push the branch.
2. Create a GitHub PR.
3. Keep the PR focused on the selected small task.

The PR description must include:

- Summary.
- Files changed.
- Checks run.
- Route count.
- Prohibited scan result.
- Preview status.

Recommended PR description template:

```markdown
## Summary
- Added/updated one small Smart Poker Lab content item.

## Files Changed
- src/english-content.js

## Checks Run
- npm run check
- npm run build
- npm run ui:audit

## Route Count
- 143

## Prohibited Scan Result
- 0 public HTML hits

## Preview Status
- Vercel Preview opened and manually checked.
```

## 7. Vercel Preview Step

Open the Vercel Preview URL before merge.

Preview checklist:

- Check the affected page or feature.
- Confirm mobile layout.
- Confirm no console errors.
- Confirm changed content appears as intended.
- Confirm unchanged tools still behave normally when nearby data was touched.

Only merge after manual approval.

## 8. Merge and Production Step

After preview approval:

1. Merge the PR.
2. Wait for the Vercel production deploy to finish.
3. Pull `main` locally.
4. Run `npm run ui:audit` again.

If the post-merge audit fails, pause new work until the issue is fixed.

## 9. First Completed Example

First completed example: `Button Open or Fold?`

- Dify generated a content plan.
- Human selected one small task instead of the full weekly plan.
- Selected task: `Button Open or Fold?`
- Codex added 6 Practice Mode spots.
- Branch: `content-button-open-or-fold`
- File changed: `src/english-content.js`
- Route count: `143`
- `ui:audit`: `PASS`
- Preview: normal
- PR merged.

Why this example is the model:

- It did not implement all weekly SEO ideas.
- It did not add Range Trainer feature changes.
- It kept the change inside existing Practice Mode data.
- It preserved route count.
- It preserved the Practice feedback gate.
- It passed the required audit before merge.

## 10. Next Recommended Content Tasks

Suggested next small tasks:

- Beginner lesson: `How to Stop Losing with Top Pair`
- Article: `Texas Hold'em Positions Explained`
- Practice drill: `C-Bet or Check Back?`
- Hand review: `Top Pair vs Calling Station`
- Range Trainer idea: `Button open range quick check`

Recommended next task shape:

1. Ask Dify Workflow A for a focused brief.
2. Select only one item.
3. Send Codex a small implementation prompt.
4. Create a branch.
5. Run checks.
6. Open a preview.
7. Merge only after manual approval.
