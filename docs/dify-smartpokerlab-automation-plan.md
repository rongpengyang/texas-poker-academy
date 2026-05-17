# Phase 2 Dify Automation Plan for Smart Poker Lab

This document defines how Dify should become the automation command center for Smart Poker Lab content and operations while preserving the production safety gates already used by Codex, GitHub, and Vercel.

Reference basis:

- [Dify Key Concepts](https://docs.dify.ai/en/use-dify/getting-started/key-concepts): Dify apps include Workflow, Chatflow, Agent, Chatbot, and Text Generator. Workflows can be started by user input or triggers.
- [Dify Workflow & Chatflow](https://docs.dify.ai/en/use-dify/build/workflow-chatflow): Workflow and Chatflow use a visual node system for structured, repeatable processes.
- [Dify Agent](https://docs.dify.ai/en/use-dify/build/agent): Agent apps are chat-style apps that can reason, use tools, and follow prompt constraints.

For Smart Poker Lab, use Dify Workflow for repeatable content operations first. Add an Agent-style router later only if it stays within the same safety gates.

## System Roles

- **Dify**: Command center and workflow router. It collects content ideas, applies prompt templates, checks guardrails, and produces drafts or Codex-ready task briefs. It must not directly write production code or deploy.
- **Codex**: Engineering executor. It creates a branch for every change, edits files, runs checks, summarizes implementation, and prepares the work for review.
- **GitHub**: Version control and review system. It stores branches, PRs, review comments, merge history, and release context.
- **Vercel**: Preview and production deployment platform. It should provide preview URLs for review, while production deployment happens only after approved merges.
- **Lovable**: UI prototype source. It provides visual direction for layout, hierarchy, and interaction ideas, but it is not the production source of truth.
- **ChatGPT**: Strategy, review, and prompt design partner. It helps refine editorial strategy, automation prompts, compliance wording, SEO plans, and review checklists.

## Safe Automation Rules

- Dify must not directly deploy production.
- Dify must not directly modify `main`.
- Dify should create tasks, drafts, review checklists, or Codex-ready PR instructions.
- Codex must create a branch for every change.
- Every change must run:
  - `npm run check`
  - `npm run build`
  - `npm run ui:audit`
- Every change must use Vercel Preview before merge.
- Dify output must clearly separate draft content from implementation instructions.
- Dify output must never include secrets, API keys, Vercel tokens, GitHub tokens, or direct deployment commands.
- Dify should mark all generated content as a draft until a human approves it.
- Dify should not create or suggest gambling-platform links, table-finding services, payment flows, or play arrangements.

## First Four Dify Workflows

### Workflow A: Weekly Poker Content Planner

Purpose: Turn one weekly theme into a safe content plan that can become Codex tasks.

Inputs:

- `week_theme`
- `target_reader`
- `content_type`
- `priority_goal`

Output:

- Weekly content theme.
- 3 to 5 article or tool-support ideas.
- Primary keyword intent for each idea.
- Internal-link targets.
- Guardrail notes.
- One recommended Codex task brief.

Safety behavior:

- Keep all ideas education-only.
- Avoid platform promotion and real-money claims.
- Prefer beginner-friendly progression and review routines.

### Workflow B: Poker Lesson Draft Generator

Purpose: Generate a structured lesson draft for beginner lessons, GTO explainers, or player type guides.

Inputs:

- Lesson topic.
- Reader level.
- Target search intent.
- Related Smart Poker Lab pages.
- Required examples or concepts.

Output:

- Draft title and meta description.
- Outline.
- Lesson body draft.
- FAQ ideas.
- Internal-link suggestions.
- Codex task brief for adding or revising content.

Safety behavior:

- Explain decisions, ranges, math, and review process.
- Avoid promising results or suggesting play services.
- Include a reminder that the content is offline education.

### Workflow C: Hand Review / Drill Pack Generator

Purpose: Convert a hand scenario or leak theme into a hand review draft or practice drill-pack idea.

Inputs:

- Hand setup or leak theme.
- Positions.
- Stack depth.
- Board/runout.
- Opponent type.
- Main decision point.

Output:

- Hand review narrative.
- Beginner thought vs professional thought.
- Baseline idea.
- Exploit adjustment.
- Practice drill candidates.
- Range Trainer expansion idea if relevant.
- Codex task brief.

Safety behavior:

- Treat the hand as offline review only.
- Do not mention private play arrangements, money flow, or platform referrals.
- Keep Range Trainer ideas educational and not real-time assistance.

### Workflow D: Compliance + SEO Review Checker

Purpose: Review a draft before Codex implements it or before a PR is approved.

Inputs:

- Draft content.
- Intended page type.
- Target keyword or search intent.
- Proposed internal links.

Output:

- Pass/fail compliance verdict.
- Prohibited-term scan result.
- SEO checklist result.
- Internal-link recommendations.
- Required rewrites.
- Codex-ready final instructions.

Safety behavior:

- Block content with gambling-service wording, platform promotion, or real-money promises.
- Require exact prohibited terms to be zero.
- Require education-only framing before implementation.

## Data Flow

`Dify input -> prompt template -> content draft -> Codex task -> GitHub branch -> Vercel Preview -> human approval -> merge`

Detailed flow:

1. User enters an idea or operation request in Dify.
2. Dify routes the request to the correct workflow.
3. The workflow applies Smart Poker Lab prompt instructions and knowledge retrieval.
4. Dify produces a content draft, review checklist, or Codex-ready task brief.
5. User sends the task brief to Codex.
6. Codex creates a branch and implements the change.
7. Codex runs `npm run check`, `npm run build`, and `npm run ui:audit`.
8. GitHub stores the branch and PR.
9. Vercel creates a Preview deployment.
10. Human reviewer approves or requests changes.
11. Only after approval, the PR may be merged through the normal GitHub/Vercel flow.

## Content Types

Dify may help draft, plan, or review:

- Beginner lessons.
- GTO explainers.
- Player type guides.
- Fish vs regular vs pro examples.
- Practice drills.
- Hand review articles.
- Range Trainer expansion ideas.
- Weekly update summaries.

Dify should not directly publish any of these content types. It only prepares drafts and implementation instructions.

## Required Guardrails

Every Dify workflow must enforce:

- Education-only positioning.
- No gambling-service wording.
- No platform promotion.
- No real-money promise.
- No instructions for arranging play, joining private tables, or handling payments.
- No claims of guaranteed improvement, guaranteed income, or risk-free outcomes.
- No targeting minors.
- No prohibited exact terms in public output:
  - `agent`
  - `rakeback`
  - `private game`
  - `deposit`
  - `withdrawal`
  - `guaranteed profit`

Recommended safe framing:

> Smart Poker Lab is an offline Texas Hold'em education site for rules, math, strategy, drills, and hand review. It is not a poker room, casino, payment service, gambling platform referral service, or real-time play assistant.

## Suggested Dify App Structure

- **App name**: `smartpokerlab-content-ops`
- **Primary type**: Workflow.
- **Optional later layer**: Agent wrapper for conversational routing into the workflows.
- **Knowledge base documents**:
  - `docs/lovable-ui-migration-workflow.md`
  - `docs/dify-smartpokerlab-automation-plan.md`
  - `README.md`
  - A human-written summary of `src/english-content.js`
- **Tools and checklists**:
  - GitHub PR task prompt.
  - Codex execution prompt.
  - SEO checklist.
  - Compliance checklist.

Recommended app-level instruction:

```text
You are the Smart Poker Lab content operations router. You create education-only poker content plans, drafts, and review instructions. You do not deploy, modify main, publish production, or claim that a draft is final. Output Codex-ready task briefs only after compliance and SEO checks pass.
```

## Step-by-Step Dify Setup

1. Open Dify Studio.
2. Click **Create App**.
3. Choose **Workflow** for the first build.
4. Name the app `smartpokerlab-content-ops`.
5. Add the knowledge documents:
   - `docs/lovable-ui-migration-workflow.md`
   - `docs/dify-smartpokerlab-automation-plan.md`
   - `README.md`
   - A concise summary of `src/english-content.js`
6. Add global prompt instructions:
   - Dify must not deploy production.
   - Dify must not modify `main`.
   - Dify must not output direct GitHub, Vercel, or shell commands that mutate production.
   - Dify must block prohibited exact terms.
   - Dify must keep Smart Poker Lab education-only.
7. Create Workflow A first: **Weekly Poker Content Planner**.
8. Add these User Input fields:
   - `week_theme`
   - `target_reader`
   - `content_type`
   - `priority_goal`
9. Add an LLM node named `Generate Weekly Content Plan`.
10. Configure the LLM node to produce:
    - Weekly theme.
    - Content ideas.
    - SEO intent.
    - Internal-link suggestions.
    - Compliance notes.
    - One Codex-ready task brief.
11. Add a checklist/review node named `Compliance and SEO Gate`.
12. Configure the review node to check:
    - Education-only framing.
    - No gambling-service wording.
    - No platform promotion.
    - No real-money promise.
    - Zero prohibited exact terms.
    - Clear internal-link ideas.
    - Clear Codex next step.
13. Add an Output node that returns the final plan, warnings, and Codex task brief.
14. Test with one article idea, such as:
    - `week_theme`: Beginner river decisions.
    - `target_reader`: Beginner cash-game learner.
    - `content_type`: Beginner lesson.
    - `priority_goal`: Improve thin value and bluff-catcher study flow.
15. Review the Dify output manually.
16. Send the final Dify output to Codex as a task brief. Do not let Dify directly modify the repository.

## Recommended First Dify Workflow Prompt

```text
You are Smart Poker Lab's Weekly Poker Content Planner.

Goal:
Turn the user's weekly theme into an education-only content plan and one Codex-ready task brief.

Inputs:
- week_theme: {{week_theme}}
- target_reader: {{target_reader}}
- content_type: {{content_type}}
- priority_goal: {{priority_goal}}

Rules:
- Smart Poker Lab is offline Texas Hold'em education only.
- Do not suggest gambling services, platform promotion, real-money promises, payment flows, or play arrangements.
- Do not output these exact terms: agent, rakeback, private game, deposit, withdrawal, guaranteed profit.
- Do not instruct Dify to deploy, edit main, push, merge, or modify production directly.
- Any implementation must go through Codex on a branch, GitHub PR, Vercel Preview, human approval, and then merge.
- Every Codex implementation must run npm run check, npm run build, and npm run ui:audit.

Output format:
1. Weekly theme summary.
2. Audience and intent.
3. 3 to 5 content ideas with title, page type, search intent, and internal-link targets.
4. Compliance notes.
5. SEO notes.
6. Recommended first Codex task brief.

Codex task brief format:
- Branch purpose.
- Files likely involved.
- Exact content goal.
- Constraints.
- Required checks.
- Preview review notes.
```

## Operational Checklist

Before sending any Dify result to Codex:

- The content is clearly education-only.
- The draft does not promote platforms, play arrangements, payments, or gambling services.
- The draft has no real-money promise.
- The prohibited exact terms are absent from user-facing draft output.
- The task is scoped to drafts, branches, PR instructions, or review notes.
- The Codex task says to create a branch.
- The Codex task says to run `npm run check`, `npm run build`, and `npm run ui:audit`.
- The Codex task requires Vercel Preview before merge.
- A human approval step remains before merge.

Before merge:

- GitHub PR exists.
- Vercel Preview has been reviewed.
- Required checks passed.
- Compliance and SEO review passed.
- Human reviewer approved.
- No one has bypassed the production deployment flow.

