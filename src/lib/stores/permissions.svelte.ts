// SPDX-License-Identifier: AGPL-3.0-only

import { browser } from '$app/environment';
import { auth } from '$lib/stores/auth.svelte';
import { hasConsented, hasAllScopes, requestConsent } from '$lib/auth/permission-check';

// ─── State ──────────────────────────────────────────────────────────

let pendingConsent = $state<string[] | null>(null);
let consentError = $state<string | null>(null);

// ─── Read-only Export ───────────────────────────────────────────────

export const permissions = {
	/** Scopes currently being requested (consent popup is open) */
	get pendingConsent() {
		return pendingConsent;
	},
	/** Error message from the last failed consent attempt */
	get consentError() {
		return consentError;
	}
};

// ─── Derived Checks ─────────────────────────────────────────────────

/**
 * Check if a specific scope has been granted.
 * Reads from auth.grantedScopes reactively.
 */
export function hasPermission(scope: string): boolean {
	return hasConsented(scope);
}

/**
 * Check if all provided scopes have been granted.
 */
export function hasAllPermissions(scopes: readonly string[]): boolean {
	return hasAllScopes(scopes);
}

// ─── Actions ────────────────────────────────────────────────────────

/**
 * Ensure the user has consented to the given scopes.
 * If not, triggers the incremental consent flow (popup).
 *
 * @returns true if all scopes are now granted, false otherwise
 */
export async function ensurePermissions(scopes: string[]): Promise<boolean> {
	if (!browser) return false;
	if (!auth.isAuthenticated) return false;
	if (scopes.length === 0) return true;
	if (hasAllScopes(scopes)) return true;

	// Prevent concurrent consent requests
	if (pendingConsent !== null) return false;

	pendingConsent = scopes;
	consentError = null;

	try {
		const granted = await requestConsent(scopes);
		if (!granted) {
			consentError =
				'Permission request was declined or failed. You can try again or contact your administrator.';
		}
		return granted;
	} catch (err) {
		consentError =
			err instanceof Error
				? err.message
				: 'An unexpected error occurred during permission request.';
		return false;
	} finally {
		pendingConsent = null;
	}
}

/**
 * Clear any previous consent error.
 */
export function clearConsentError(): void {
	consentError = null;
}
