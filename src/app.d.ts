// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { Tier } from '$lib/entitlements/tier';

declare global {
	namespace App {
		interface Error {
			message: string;
			errorId: string;
		}
		interface Locals {
			sessionId: string;
			tier: Tier;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
