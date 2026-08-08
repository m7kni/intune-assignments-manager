// SPDX-License-Identifier: AGPL-3.0-only

import type { AccountInfo } from '@azure/msal-browser';
import { browser } from '$app/environment';

// ─── Constants ──────────────────────────────────────────────────────

const SCOPES_STORAGE_KEY = 'intune-granted-scopes';

// ─── State ──────────────────────────────────────────────────────────

let account = $state<AccountInfo | null>(null);
let isInitializing = $state(true);
let error = $state<string | null>(null);
let grantedScopes = $state<string[]>([]);

const isAuthenticated = $derived(account !== null);

// ─── Read-only Export ───────────────────────────────────────────────

export const auth = {
	get account() {
		return account;
	},
	get isAuthenticated() {
		return isAuthenticated;
	},
	get isInitializing() {
		return isInitializing;
	},
	get error() {
		return error;
	},
	get grantedScopes() {
		return grantedScopes;
	}
};

// ─── Scope Tracking Helpers ─────────────────────────────────────────

/**
 * Merge newly granted scopes into the accumulated set.
 * MSAL returns only the scopes for the specific resource requested,
 * so we union across acquisitions, never replace.
 */
function mergeScopes(newScopes: string[]): void {
	const normalized = newScopes.map((s) => s.trim()).filter(Boolean);
	const additions = normalized.filter((scope) => !grantedScopes.includes(scope));

	if (additions.length > 0) {
		grantedScopes = [...grantedScopes, ...additions];
		persistScopes();
	}
}

function persistScopes(): void {
	if (!browser) return;
	try {
		localStorage.setItem(SCOPES_STORAGE_KEY, JSON.stringify(grantedScopes));
	} catch {
		// localStorage may be full or restricted; non-critical
	}
}

function loadPersistedScopes(): void {
	if (!browser) return;
	try {
		const stored = localStorage.getItem(SCOPES_STORAGE_KEY);
		if (stored) {
			const parsed = JSON.parse(stored);
			if (Array.isArray(parsed)) {
				grantedScopes = parsed.filter((s): s is string => typeof s === 'string');
			}
		}
	} catch {
		// Corrupt data; ignore
	}
}

function clearScopes(): void {
	grantedScopes = [];
	if (browser) {
		localStorage.removeItem(SCOPES_STORAGE_KEY);
	}
}

// ─── Actions ────────────────────────────────────────────────────────

export async function initAuth(): Promise<void> {
	if (!browser) {
		isInitializing = false;
		return;
	}

	try {
		const { getOrCreateMsalInstance } = await import('$lib/auth/msal');
		const instance = await getOrCreateMsalInstance();

		const activeAccount = instance.getActiveAccount();
		if (activeAccount) {
			account = activeAccount;
			loadPersistedScopes();
		} else {
			const allAccounts = instance.getAllAccounts();
			if (allAccounts.length > 0) {
				instance.setActiveAccount(allAccounts[0]);
				account = allAccounts[0];
				loadPersistedScopes();
			}
		}
	} catch (err) {
		console.error('Auth initialization failed:', err);
		error = err instanceof Error ? err.message : 'Authentication initialization failed';
	} finally {
		isInitializing = false;
	}
}

export async function login(): Promise<void> {
	if (!browser) return;

	error = null;
	try {
		const { signIn } = await import('$lib/auth/msal');
		const result = await signIn();
		if (result) {
			account = result.account;
			mergeScopes(result.scopes);
		}
	} catch (err) {
		console.error('Login failed:', err);
		error = err instanceof Error ? err.message : 'Sign-in failed';
	}
}

export async function logout(): Promise<void> {
	if (!browser) return;

	error = null;
	try {
		const { signOut } = await import('$lib/auth/msal');
		await signOut();
		account = null;
		clearScopes();
	} catch (err) {
		console.error('Logout failed:', err);
		error = err instanceof Error ? err.message : 'Sign-out failed';
	}
}

/**
 * Get an access token for the default Tier 1 scopes.
 * Used by the graph client factory.
 */
export async function getToken(): Promise<string> {
	if (!browser) throw new Error('Cannot acquire tokens during SSR');

	const { getAccessToken } = await import('$lib/auth/msal');
	return getAccessToken();
}

/**
 * Get an access token with specific scopes, handling incremental
 * consent. Updates the granted scopes set.
 */
export async function getTokenWithScopes(scopes: string[]): Promise<string> {
	if (!browser) throw new Error('Cannot acquire tokens during SSR');

	const { acquireToken } = await import('$lib/auth/msal');
	const result = await acquireToken(scopes);
	mergeScopes(result.scopes);
	return result.accessToken;
}
