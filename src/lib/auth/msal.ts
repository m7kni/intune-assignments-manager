// SPDX-License-Identifier: AGPL-3.0-only

import {
	type IPublicClientApplication,
	type AccountInfo,
	type AuthenticationResult,
	createStandardPublicClientApplication,
	InteractionRequiredAuthError,
	BrowserAuthErrorCodes
} from '@azure/msal-browser';
import { msalConfig, loginRequest, graphScopes } from './config';

let msalInstance: IPublicClientApplication | null = null;
let initPromise: Promise<IPublicClientApplication> | null = null;

export async function getOrCreateMsalInstance(): Promise<IPublicClientApplication> {
	if (msalInstance) return msalInstance;

	if (!initPromise) {
		initPromise = createStandardPublicClientApplication(msalConfig).then((instance) => {
			msalInstance = instance;
			return instance;
		});
	}

	return initPromise;
}

// ─── Types ──────────────────────────────────────────────────────────

/** Result shape returned from sign-in and token acquisition */
export interface TokenResult {
	accessToken: string;
	scopes: string[];
	account: AccountInfo;
}

// ─── Sign In / Out ──────────────────────────────────────────────────

export async function signIn(): Promise<TokenResult | null> {
	const instance = await getOrCreateMsalInstance();
	try {
		const result: AuthenticationResult = await instance.loginPopup(loginRequest);
		if (result.account) {
			instance.setActiveAccount(result.account);
			return {
				accessToken: result.accessToken,
				scopes: result.scopes,
				account: result.account
			};
		}
		return null;
	} catch (error: unknown) {
		if (
			error instanceof Error &&
			'errorCode' in error &&
			(error as { errorCode: string }).errorCode === BrowserAuthErrorCodes.userCancelled
		) {
			return null;
		}
		throw error;
	}
}

export async function signOut(): Promise<void> {
	const instance = await getOrCreateMsalInstance();
	const account = instance.getActiveAccount();
	await instance.logoutPopup({
		account: account ?? undefined
	});
}

// ─── Token Acquisition ──────────────────────────────────────────────

/**
 * Acquire an access token for the default (Tier 1) scopes.
 * Returns just the token string for backward compatibility with the graph client factory.
 */
export async function getAccessToken(): Promise<string> {
	const result = await acquireToken([...graphScopes]);
	return result.accessToken;
}

/**
 * Acquire an access token with specific scopes, handling incremental
 * consent via popup if needed.
 */
export async function acquireToken(scopes: string[]): Promise<TokenResult> {
	const instance = await getOrCreateMsalInstance();
	const account = instance.getActiveAccount();

	if (!account) {
		throw new Error('No active account. User must sign in first.');
	}

	try {
		const result = await instance.acquireTokenSilent({
			scopes,
			account
		});
		return {
			accessToken: result.accessToken,
			scopes: result.scopes,
			account: result.account
		};
	} catch (error: unknown) {
		if (error instanceof InteractionRequiredAuthError) {
			const result = await instance.acquireTokenPopup({
				scopes,
				account
			});
			return {
				accessToken: result.accessToken,
				scopes: result.scopes,
				account: result.account
			};
		}
		throw error;
	}
}

export function getAccount(): AccountInfo | null {
	if (!msalInstance) return null;
	return msalInstance.getActiveAccount();
}
