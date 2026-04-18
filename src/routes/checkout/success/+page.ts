import type { PageLoad } from './$types';

export const load: PageLoad = ({ url }) => {
	const sessionId = url.searchParams.get('session_id');
	return { sessionId };
};

// Prerender is disabled — the URL carries a query param.
export const prerender = false;
