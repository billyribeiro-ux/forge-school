/**
 * Structured server logger (pino).
 *
 * Contract:
 * - Production: default JSON output to stdout so log aggregators (Datadog,
 *   Sentry, CloudWatch, etc.) can index every field without a parser.
 * - Development: pino-pretty transport for a human-readable stream during
 *   `pnpm dev`. pino-pretty is a devDependency and is only referenced when
 *   `import.meta.env.DEV` is true.
 * - Level: read from `LOG_LEVEL` (see `.env.example` / `.env.local`). If the
 *   variable is empty or unset we default to `info` so a missing env var never
 *   silences logging or spams trace output in production.
 * - Redaction: `req.headers.authorization` and `req.headers.cookie` are
 *   censored unconditionally. New secret-bearing fields must be added to the
 *   `paths` array when introduced — never log raw credentials.
 *
 * This module is server-only. Importing it from client code would cause a
 * SvelteKit build error because `$env/static/private` is not reachable from
 * the browser bundle. That is intentional.
 */

import type { LoggerOptions } from 'pino';
import pino from 'pino';
import { LOG_LEVEL } from '$env/static/private';

const level: string = LOG_LEVEL !== '' ? LOG_LEVEL : 'info';

const baseOptions: LoggerOptions = {
	level,
	redact: {
		paths: ['req.headers.authorization', 'req.headers.cookie'],
		censor: '[REDACTED]'
	}
};

const options: LoggerOptions = import.meta.env.DEV
	? {
			...baseOptions,
			transport: {
				target: 'pino-pretty',
				options: {
					colorize: true,
					translateTime: 'SYS:HH:MM:ss.l',
					ignore: 'pid,hostname'
				}
			}
		}
	: baseOptions;

export const logger = pino(options);

export type Logger = typeof logger;
