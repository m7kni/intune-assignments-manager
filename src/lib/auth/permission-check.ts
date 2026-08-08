// SPDX-License-Identifier: AGPL-3.0-only

import { browser } from '$app/environment';
import { auth, getTokenWithScopes } from '$lib/stores/auth.svelte';

/**
 * Check if a specific scope has been consented to.
 * Case-insensitive since Microsoft Graph scope names may vary in casing.
 */
export function hasConsented(scope: string): boolean {
	const lower = scope.toLowerCase();
	return auth.grantedScopes.some((s) => s.toLowerCase() === lower);
}

/**
 * Check if all provided scopes have been consented to.
 */
export function hasAllScopes(scopes: readonly string[]): boolean {
	return scopes.every((scope) => hasConsented(scope));
}

/**
 * Request consent for additional scopes. Uses acquireTokenSilent first,
 * falling back to acquireTokenPopup on InteractionRequiredAuthError.
 *
 * @returns true if consent was granted, false if user declined or an error occurred
 */
export async function requestConsent(scopes: string[]): Promise<boolean> {
	if (!browser) return false;
	if (scopes.length === 0) return true;
	if (hasAllScopes(scopes)) return true;

	try {
		await getTokenWithScopes(scopes);
		return hasAllScopes(scopes);
	} catch (err) {
		console.error('Consent request failed:', err);
		return false;
	}
}

/**
 * Get the current set of granted scopes.
 */
export function getGrantedScopes(): string[] {
	return [...auth.grantedScopes];
}
