/**
 * Database client — single shared postgres.js + Drizzle instance for the
 * app's server runtime. Importing this file multiple times across the
 * codebase reuses the same connection pool (postgres.js is pool-aware
 * out of the box).
 *
 * Server-only. Importing from client code throws at build time because
 * `$env/static/private` is not reachable from the browser bundle.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { DATABASE_URL } from '$env/static/private';
import * as schema from './schema.ts';

if (DATABASE_URL === '') {
	throw new Error('DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.');
}

// Single shared client. postgres.js pools internally — we configure a
// conservative ceiling so a dev server doesn't saturate the local DB.
const client = postgres(DATABASE_URL, {
	max: 10,
	idle_timeout: 30,
	connect_timeout: 10,
	prepare: false
});

export const db = drizzle(client, { schema, logger: false });

export type Db = typeof db;
