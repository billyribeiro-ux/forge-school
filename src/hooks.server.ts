/**
 * Server hooks — request logging + top-level error handler.
 *
 * `handle` wraps every server request. We time the response, then emit one
 * structured log line per request. 5xx logs at `error`, 4xx at `warn`,
 * everything else at `info`. This is the single source of truth for request
 * observability until lesson 132 wires Sentry.
 *
 * `handleError` catches uncaught errors thrown inside load functions,
 * form actions, `+server.ts` endpoints, etc. We log the full error (stack
 * included) server-side and return a sanitized shape to the client — never
 * the stack, never the original message. The generated `errorId` is the
 * correlation key a support request can quote back to us.
 */
import type { Handle, HandleServerError } from '@sveltejs/kit';
import { building } from '$app/environment';
import { db } from '$lib/server/db';
import { getSessionTier } from '$lib/server/entitlements/tier-queries';
import { logger } from '$lib/server/logger';
import { ensureSessionCookie } from '$lib/server/session';

export const handle: Handle = async ({ event, resolve }) => {
	const startedAt = performance.now();

	// Build-time prerender can't set cookies or reach Postgres. Static
	// pages (/, /lessons/*, /pricing) are tier-agnostic anyway, so
	// degrade to an empty locals shape during prerender.
	if (building) {
		event.locals.sessionId = '';
		event.locals.tier = 'free';
	} else {
		event.locals.sessionId = ensureSessionCookie(event.cookies);
		try {
			event.locals.tier = await getSessionTier(db, event.locals.sessionId);
		} catch (err) {
			// DB unreachable (e.g. local dev without `docker compose up`).
			// Treat as logged-out; routes that truly require a DB raise
			// their own errors downstream.
			logger.warn({ err }, 'tier lookup failed; defaulting to free');
			event.locals.tier = 'free';
		}
	}

	const response = await resolve(event);
	const durationMs = Math.round((performance.now() - startedAt) * 100) / 100;

	const logPayload = {
		method: event.request.method,
		path: event.url.pathname,
		status: response.status,
		duration_ms: durationMs
	};

	if (response.status >= 500) {
		logger.error(logPayload, 'request');
	} else if (response.status >= 400) {
		logger.warn(logPayload, 'request');
	} else {
		logger.info(logPayload, 'request');
	}

	return response;
};

export const handleError: HandleServerError = ({ error, event, status, message }) => {
	const errorId = crypto.randomUUID();

	logger.error(
		{
			errorId,
			status,
			message,
			method: event.request.method,
			path: event.url.pathname,
			err: error
		},
		'unhandled_server_error'
	);

	return {
		message: 'An unexpected error occurred',
		errorId
	};
};
