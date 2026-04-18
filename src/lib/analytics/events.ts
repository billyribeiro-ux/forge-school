/**
 * Plausible custom-event tracking — typed wrapper around `window.plausible`.
 *
 * Zero-cost when Plausible isn't loaded (dev, or when
 * PUBLIC_PLAUSIBLE_DOMAIN is empty).
 */

export type ForgeEvent =
	| 'checkout_started'
	| 'checkout_completed'
	| 'subscription_started'
	| 'lifetime_purchased'
	| 'coupon_applied'
	| 'add_to_cart'
	| 'contact_submitted';

type PlausibleGlobal = ((event: string, opts?: { props?: Record<string, string> }) => void) & {
	q?: unknown[];
};

declare global {
	interface Window {
		plausible?: PlausibleGlobal;
	}
}

export function track(event: ForgeEvent, props?: Record<string, string>): void {
	if (typeof window === 'undefined') return;
	const fn = window.plausible;
	if (typeof fn !== 'function') return;
	if (props === undefined) {
		fn(event);
	} else {
		fn(event, { props });
	}
}
