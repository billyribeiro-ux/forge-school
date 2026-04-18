/**
 * Client-side hooks — mirror of `hooks.server.ts`'s error-capture path.
 *
 * `handleError` is the SvelteKit hook that catches any uncaught error
 * thrown in the browser (load functions, `+page.svelte` mount errors,
 * etc.). We forward to the lazy Sentry stub; until `@sentry/sveltekit`
 * installs, the stub logs to console.error so nothing is swallowed.
 */
import type { HandleClientError } from '@sveltejs/kit';
import { getClientSentry, initClientSentry } from '$lib/sentry-client';

void initClientSentry();

export const handleError: HandleClientError = ({ error, event, status, message }) => {
	const errorId = crypto.randomUUID();

	getClientSentry()?.captureException(error, {
		tags: { errorId, path: event.url.pathname, status: String(status) }
	});

	return {
		message: 'An unexpected error occurred',
		errorId
	};
};
