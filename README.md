# Smart Poker Lab

Smart Poker Lab is the canonical project for `smartpokerlab.com`.

Current repository:

- GitHub: `rongpengyang/texas-poker-academy`
- Production domain: `https://smartpokerlab.com`
- Vercel project: currently linked to the existing Smart Poker Lab deployment flow

## Canonical Naming

The product name is **Smart Poker Lab**. The domain is **smartpokerlab.com**.

This repository currently keeps the historical name `texas-poker-academy` because it is already connected to the working local project and deployment history. For long-term consistency, the recommended final GitHub repository name is:

```text
rongpengyang/smartpokerlab
```

After the repository is renamed in GitHub Settings, update any local remote if needed:

```powershell
git remote set-url origin https://github.com/rongpengyang/smartpokerlab.git
```

## Source of Truth

Use this repository as the source of truth for:

- static site generator
- English poker training content
- all public routes and sitemap generation
- Practice, Range Trainer, Analyze, Progress, and local browser training logic
- compliance strip and education-only guardrails
- visual assets and site styles

## Repositories That Should Not Be Used As Main

The following repositories were created during experimentation and should not be treated as the main production codebase:

- `rongpengyang/smart-poker-lab-evolution`
- `rongpengyang/rongpengyang-smartpokerlab-lovable-ui`

They can be deleted or kept only as archived prototypes/placeholders.

## Build

```bash
npm run check
npm run build
```

## Deploy

Production deploys should continue through Vercel. The generated static output is `dist/`.
