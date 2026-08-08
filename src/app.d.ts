// SPDX-License-Identifier: AGPL-3.0-only

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

// Environment variables (set in .env or Cloudflare Pages dashboard):
// PUBLIC_ENTRA_CLIENT_ID — Microsoft Entra ID application (client) ID

declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env?: Record<string, string>;
			context?: {
				waitUntil(promise: Promise<unknown>): void;
			};
			caches?: CacheStorage & { default: Cache };
		}
	}
}

export {};
