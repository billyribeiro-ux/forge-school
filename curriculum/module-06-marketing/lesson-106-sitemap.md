---
number: 106
commit: 7eee9a3d5a4aed8c5ba35a72f92cb69f03cf349f
slug: sitemap
title: Serve sitemap.xml dynamically
module: 6
moduleSlug: marketing
moduleTitle: Marketing
phase: 6
step: 15
previous: 105
next: null
estimatedMinutes: 10
filesTouched:
  - src/routes/sitemap.xml/+server.ts
---

## Context

Dynamic sitemap — enumerates static paths + every lesson slug from the filesystem loader. Search engines discover new lessons as soon as they land on the branch; no manual regeneration.

## The command

`src/routes/sitemap.xml/+server.ts`:

```ts
import { listLessons } from '$lib/curriculum';
import { PUBLIC_APP_URL } from '$env/static/public';

const STATIC_PATHS = ['/', '/lessons', '/products', '/pricing', '/about', '/support', '/contact', '/terms', '/privacy', '/refund-policy', '/cookie-notice'];

export const GET: RequestHandler = () => {
  const origin = PUBLIC_APP_URL.replace(/\/$/, '');
  const urls = [
    ...STATIC_PATHS.map((p) => ({ loc: `${origin}${p}`, priority: p === '/' ? 1.0 : 0.8 })),
    ...listLessons().map((l) => ({ loc: `${origin}/lessons/${l.slug}`, priority: 0.6 }))
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>...`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
};
```

`curl http://localhost:5173/sitemap.xml` → valid XML.

## Why we chose this — the PE7 judgment

**Alt 1: Static `static/sitemap.xml`.** Must be manually regenerated every time a lesson lands.
**Alt 2: `sveltekit-sitemap` plugin.** Adds a dependency for ~40 lines of code.
**Alt 3: `Cache-Control: no-cache`.** Sitemap changes ~hourly at most; 1-hour public cache is a reasonable balance.

## Verify

`pnpm check`. `curl /sitemap.xml | head`.

## Mistake log

- Used `changefreq` — deprecated. Modern sitemaps don't need it.
- Set priority to 1.0 for every URL — defeats the purpose. Varied by surface.

## Commit

```bash
git add src/routes/sitemap.xml/ curriculum/module-06-marketing/lesson-106-sitemap.md
git commit -m "feat(routes): dynamic sitemap.xml + lesson 106"
```
