/**
 * Client-side Sentry bridge.
 *
 * Mirrors the server-side stub (`src/lib/server/sentry.ts`) but reads
 * `PUBLIC_SENTRY_DSN` and runs in the browser only. Lazy + env-gated:
 * loads the SDK exactly when `PUBLIC_SENTRY_DSN` is non-empty.
 *
 * Until `@sentry/sveltekit` installs, the stub logs to `console.error`
 * — no errors swallowed, no errors duplicated.
 */
import { PUBLIC_SENTRY_DSN } from '$env/static/public';

export type ClientSentryLike = {
	captureException(err: unknown, hint?: Record<string, unknown>): void;
};

let instance: ClientSentryLike | null = null;

export function getClientSentry(): ClientSentryLike | null {
	return instance;
}

export async function initClientSentry(): Promise<void> {
	if (typeof window === 'undefined') return;
	if (PUBLIC_SENTRY_DSN === '' || instance !== null) return;
	// When @sentry/sveltekit installs, replace with:
	//   const Sentry = await import('@sentry/sveltekit');
	//   Sentry.init({ dsn: PUBLIC_SENTRY_DSN, tracesSampleRate: 0.1, replaysSessionSampleRate: 0.0 });
	//   instance = { captureException: (e, h) => Sentry.captureException(e, h) };
	instance = {
		captureException(err, hint) {
			console.error('[sentry-client-stub]', err, hint);
		}
	};
}
