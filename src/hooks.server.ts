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
import { logger } from '$lib/server/logger';

export const handle: Handle = async ({ event, resolve }) => {
	const startedAt = performance.now();
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
