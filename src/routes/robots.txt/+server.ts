/**
 * robots.txt — allow everything except private/admin surfaces.
 */
import { PUBLIC_APP_URL } from '$env/static/public';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
	const origin = PUBLIC_APP_URL.replace(/\/$/, '');
	const body = `User-agent: *
Disallow: /account
Disallow: /admin
Disallow: /cart
Disallow: /checkout
Disallow: /api
Allow: /

Sitemap: ${origin}/sitemap.xml
`;
	return new Response(body, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'public, max-age=86400'
		}
	});
};
