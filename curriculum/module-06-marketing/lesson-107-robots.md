---
number: 107
slug: robots
title: Serve robots.txt with disallow rules
module: 6
moduleSlug: marketing
moduleTitle: Marketing
phase: 6
step: 16
previous: 106
next: null
estimatedMinutes: 5
filesTouched:
  - src/routes/robots.txt/+server.ts
---

## Context

Blocks crawlers from `/account`, `/admin`, `/cart`, `/checkout`, `/api`. Allows everything else. Points at the sitemap.

## The command

`src/routes/robots.txt/+server.ts`:

```ts
import { PUBLIC_APP_URL } from '$env/static/public';
export const GET: RequestHandler = () => {
  const origin = PUBLIC_APP_URL.replace(/\/$/, '');
  const body = `User-agent: *\nDisallow: /account\nDisallow: /admin\nDisallow: /cart\nDisallow: /checkout\nDisallow: /api\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } });
};
```

## Why we chose this — the PE7 judgment

**Alt 1: Static `static/robots.txt`.** Can't interpolate `PUBLIC_APP_URL`.
**Alt 2: Disallow everything, allow only root.** Breaks lessons from being crawled.

## Verify

`curl /robots.txt`.

## Mistake log

- Missed the `/api` disallow — webhook endpoints accidentally listed in Google.

## Commit

```bash
git add src/routes/robots.txt/ curriculum/module-06-marketing/lesson-107-robots.md
git commit -m "feat(routes): robots.txt + lesson 107"
```
