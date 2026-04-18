/**
 * Anonymous session cookie handling.
 *
 * v1 of ForgeSchool ships auth-free. Every commerce-adjacent table
 * keys off `session_id` — an opaque UUID stored in a cookie. This
 * module is the single source of truth for reading / creating that
 * cookie and for the cookie's security attributes.
 *
 * When auth lands in a future module, the cookie becomes one of
 * several signals that identify a user; the linking table maps
 * session_id values to user_id values so pre-auth state migrates
 * cleanly.
 */
import type { Cookies } from '@sveltejs/kit';

const COOKIE_NAME = 'forge_session';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year

/**
 * Read the current session cookie, or create one if absent.
 * Always returns a non-empty session id string after the call.
 */
export function ensureSessionCookie(cookies: Cookies): string {
	const existing = cookies.get(COOKIE_NAME);
	if (existing !== undefined && existing !== '') {
		return existing;
	}
	const fresh = crypto.randomUUID();
	cookies.set(COOKIE_NAME, fresh, {
		path: '/',
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		maxAge: COOKIE_MAX_AGE_SECONDS
	});
	return fresh;
}
