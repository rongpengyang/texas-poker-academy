# Smart Poker Lab Deployment

Domain: `smartpokerlab.com`

This project is a static website. The source files live in this folder, and the deployable output is generated into `dist/`.

## Build

```bash
npm run build
```

The build command runs:

```bash
node src/generate-site.js
```

It generates:

- `dist/index.html`
- `dist/sitemap.xml`
- `dist/robots.txt`
- section, article, hand-review, glossary, tool, and policy pages
- copied `styles.css` and `script.js`

## Vercel

`vercel.json` is configured for Vercel:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
}
```

Preview deployment from this folder:

```bash
npx vercel@latest deploy --yes
```

Production deployment:

```bash
npx vercel@latest deploy --prod --yes
```

## Domain Binding

Current Vercel deployment:

```text
https://texas-poker-academy-alkj1iybq-tim1723249-3538s-projects.vercel.app
```

Current Vercel project:

```text
texas-poker-academy
```

Domains added to the project:

- `smartpokerlab.com`
- `www.smartpokerlab.com`

Vercel reported the current registrar nameservers as:

- `ns03.domaincontrol.com`
- `ns04.domaincontrol.com`

Add these DNS records at the domain registrar:

```text
A     smartpokerlab.com       76.76.21.21
A     www.smartpokerlab.com   76.76.21.21
```

Alternative: change the domain nameservers to Vercel DNS:

```text
ns1.vercel-dns.com
ns2.vercel-dns.com
```

After DNS is configured:

1. Open the Vercel project dashboard.
2. Confirm both domains show as valid.
3. Pick one canonical host:
   - recommended: `https://smartpokerlab.com`
   - redirect `www.smartpokerlab.com` to the root domain.
4. If the site asks visitors to log in with Vercel, disable Vercel Authentication / Deployment Protection for the production site.

## Post-Launch Checks

Open these after DNS finishes:

- `https://smartpokerlab.com/`
- `https://smartpokerlab.com/tools/`
- `https://smartpokerlab.com/sitemap.xml`
- `https://smartpokerlab.com/robots.txt`
- `https://smartpokerlab.com/disclaimer/`
- `https://smartpokerlab.com/responsible-play/`

Then submit the domain and sitemap in Google Search Console.
