/**
 * Server-side Sentry initialization.
 *
 * Lazy, env-gated: the SDK only loads if `SENTRY_DSN` is non-empty.
 * That keeps dev + CI bundles lean and avoids a hard dependency on
 * a live Sentry project during the course.
 *
 * Actual wire-up to `hooks.server.ts`'s `handleError` lands when the
 * SDK is installed (`pnpm add @sentry/sveltekit`). Until then this
 * module is a no-op stub + the canonical integration point.
 */
import { SENTRY_DSN } from '$env/static/private';

export type SentryLike = {
	captureException(err: unknown, hint?: Record<string, unknown>): void;
};

let instance: SentryLike | null = null;

export function getSentry(): SentryLike | null {
	return instance;
}

export async function initSentry(): Promise<void> {
	if (SENTRY_DSN === '' || instance !== null) return;
	// When @sentry/sveltekit is installed, replace the stub with:
	//   const Sentry = await import('@sentry/sveltekit');
	//   Sentry.init({ dsn: SENTRY_DSN, tracesSampleRate: 0.2 });
	//   instance = { captureException: (e, h) => Sentry.captureException(e, h) };
	instance = {
		captureException(err, hint) {
			console.error('[sentry-stub]', err, hint);
		}
	};
}
