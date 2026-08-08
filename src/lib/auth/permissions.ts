// SPDX-License-Identifier: AGPL-3.0-only

import { TIER_1_SCOPES, TIER_2_SCOPES, TIER_3_SCOPES, TIER_4_SCOPES } from './config';

// ─── Types ──────────────────────────────────────────────────────────

export interface PermissionTier {
	id: number;
	name: string;
	description: string;
	scopes: readonly string[];
	features: string[];
}

// ─── Permission Tiers ───────────────────────────────────────────────

export const PERMISSION_TIERS: PermissionTier[] = [
	{
		id: 1,
		name: 'Core',
		description: 'Sign in, manage apps and configuration profiles, browse groups',
		scopes: TIER_1_SCOPES,
		features: ['/', '/apps', '/profiles', '/assign', '/audit']
	},
	{
		id: 2,
		name: 'Device Management',
		description: 'View managed device inventory and compliance status',
		scopes: TIER_2_SCOPES,
		features: ['/devices']
	},
	{
		id: 3,
		name: 'Device Actions',
		description: 'Perform device actions such as sync, restart, and retire',
		scopes: TIER_3_SCOPES,
		features: ['/devices/actions']
	},
	{
		id: 4,
		name: 'Autopilot',
		description: 'View Windows Autopilot enrollment data and deployment profiles',
		scopes: TIER_4_SCOPES,
		features: ['/autopilot']
	}
];

// ─── Feature → Scopes Map ──────────────────────────────────────────

/**
 * Maps route prefixes to the additional scopes they require beyond Tier 1.
 * Routes not listed here only need Tier 1 scopes (granted at sign-in).
 */
const FEATURE_PERMISSIONS: Record<string, readonly string[]> = {
	'/devices/actions': [...TIER_3_SCOPES],
	'/devices': [...TIER_2_SCOPES],
	'/autopilot': [...TIER_4_SCOPES]
};

// Sorted entries by specificity (longest prefix first) for correct matching
const FEATURE_ENTRIES = Object.entries(FEATURE_PERMISSIONS).sort(
	(a, b) => b[0].length - a[0].length
);

// ─── Scope Descriptions ────────────────────────────────────────────

/** Human-readable descriptions for permission scopes */
export const SCOPE_DESCRIPTIONS: Record<string, string> = {
	'User.Read': 'Sign in and read your profile',
	'DeviceManagementApps.ReadWrite.All': 'Read and write Intune app configurations',
	'DeviceManagementConfiguration.ReadWrite.All':
		'Read and write Intune device configuration policies',
	'Group.Read.All': 'Read group memberships for assignment targets',
	'DeviceManagementManagedDevices.Read.All': 'Read managed device information',
	'DeviceManagementManagedDevices.ReadWrite.All': 'Perform device actions (sync, restart, retire)',
	'DeviceManagementServiceConfig.Read.All': 'View Autopilot device and deployment profile data'
};

// ─── Utility Functions ─────────────────────────────────────────────

/**
 * Returns the scopes required for a given feature route.
 * Returns an empty array for routes that only need Tier 1 (sign-in) scopes.
 */
export function getRequiredScopes(feature: string): string[] {
	for (const [prefix, scopes] of FEATURE_ENTRIES) {
		if (feature === prefix || feature.startsWith(prefix + '/') || feature.startsWith(prefix)) {
			return [...scopes];
		}
	}
	return [];
}

/**
 * Returns the PermissionTier that contains the given scope,
 * or undefined if the scope is not in any tier.
 */
export function getTierForScope(scope: string): PermissionTier | undefined {
	return PERMISSION_TIERS.find((tier) => tier.scopes.includes(scope));
}

/**
 * Returns the PermissionTier for a given tier ID.
 */
export function getTierById(id: number): PermissionTier | undefined {
	return PERMISSION_TIERS.find((tier) => tier.id === id);
}
