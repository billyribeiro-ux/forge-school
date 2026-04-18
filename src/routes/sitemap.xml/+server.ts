/**
 * Dynamic sitemap — enumerates every public route + every published
 * lesson slug. Content-Type: application/xml.
 *
 * Lesson slugs come from the filesystem-backed curriculum loader, so
 * the sitemap stays in sync as new lessons land.
 */
import { listLessons } from '$lib/curriculum';
import { PUBLIC_APP_URL } from '$env/static/public';
import type { RequestHandler } from './$types';

const STATIC_PATHS = [
	'/',
	'/lessons',
	'/products',
	'/pricing',
	'/about',
	'/support',
	'/contact',
	'/terms',
	'/privacy',
	'/refund-policy',
	'/cookie-notice'
];

export const GET: RequestHandler = () => {
	const origin = PUBLIC_APP_URL.replace(/\/$/, '');
	const lessons = listLessons();
	const now = new Date().toISOString();

	const urls = [
		...STATIC_PATHS.map((p) => ({ loc: `${origin}${p}`, lastmod: now, priority: p === '/' ? 1.0 : 0.8 })),
		...lessons.map((l) => ({
			loc: `${origin}/lessons/${l.slug}`,
			lastmod: now,
			priority: 0.6
		}))
	];

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
	.map(
		(u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <priority>${u.priority.toFixed(1)}</priority>
  </url>`
	)
	.join('\n')}
</urlset>`;

	return new Response(body, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'public, max-age=3600'
		}
	});
};
