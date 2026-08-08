// SPDX-License-Identifier: AGPL-3.0-only

import type { Configuration } from '@azure/msal-browser';
import { PUBLIC_ENTRA_CLIENT_ID } from '$env/static/public';

// ─── Tiered Scope Definitions ───────────────────────────────────────

/** Tier 1: Core scopes requested at sign-in */
export const TIER_1_SCOPES = [
	'User.Read',
	'DeviceManagementApps.ReadWrite.All',
	'DeviceManagementConfiguration.ReadWrite.All',
	'Group.Read.All'
] as const;

/** Tier 2: Device management (read) */
export const TIER_2_SCOPES = ['DeviceManagementManagedDevices.Read.All'] as const;

/** Tier 3: Device management (read/write, actions) */
export const TIER_3_SCOPES = ['DeviceManagementManagedDevices.ReadWrite.All'] as const;

/** Tier 4: Enrollment/Autopilot */
export const TIER_4_SCOPES = ['DeviceManagementServiceConfig.Read.All'] as const;

/** All known scopes across all tiers */
export const ALL_SCOPES = [
	...TIER_1_SCOPES,
	...TIER_2_SCOPES,
	...TIER_3_SCOPES,
	...TIER_4_SCOPES
] as const;

// ─── Login Configuration ────────────────────────────────────────────

/** Backward-compatible alias — default scopes for graph client token requests */
export const graphScopes = [...TIER_1_SCOPES];

/** Default login request — only Tier 1 scopes */
export const loginRequest = {
	scopes: [...TIER_1_SCOPES]
};

// ─── MSAL Configuration ────────────────────────────────────────────

export const msalConfig: Configuration = {
	auth: {
		clientId: PUBLIC_ENTRA_CLIENT_ID,
		authority: 'https://login.microsoftonline.com/common',
		redirectUri: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
		postLogoutRedirectUri:
			typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'
	},
	cache: {
		cacheLocation: 'localStorage'
	}
};
