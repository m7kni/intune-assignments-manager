// SPDX-License-Identifier: AGPL-3.0-only

import { Shield, Flame, Lock, Radar, ShieldOff, UserCheck } from 'lucide-svelte';
import type { ConfigurationPolicy } from '$lib/types/graph';
import type { EndpointSecurityCategory } from '$lib/types/security';

// ─── Types ──────────────────────────────────────────────────────────

export interface SecurityCategoryInfo {
	category: EndpointSecurityCategory;
	templateFamily: string;
	label: string;
	description: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	icon: any;
}

// ─── Category Mapping ──────────────────────────────────────────────

export const SECURITY_CATEGORIES: SecurityCategoryInfo[] = [
	{
		category: 'antivirus',
		templateFamily: 'endpointSecurityAntivirus',
		label: 'Antivirus',
		description: 'Manage antivirus settings including real-time protection and scan schedules',
		icon: Shield
	},
	{
		category: 'firewall',
		templateFamily: 'endpointSecurityFirewall',
		label: 'Firewall',
		description: 'Configure firewall rules and network protection settings',
		icon: Flame
	},
	{
		category: 'diskEncryption',
		templateFamily: 'endpointSecurityDiskEncryption',
		label: 'Disk Encryption',
		description: 'Manage BitLocker and FileVault disk encryption policies',
		icon: Lock
	},
	{
		category: 'endpointDetectionAndResponse',
		templateFamily: 'endpointSecurityEndpointDetectionAndResponse',
		label: 'Endpoint Detection & Response',
		description: 'Configure EDR settings for advanced threat detection',
		icon: Radar
	},
	{
		category: 'attackSurfaceReduction',
		templateFamily: 'endpointSecurityAttackSurfaceReduction',
		label: 'Attack Surface Reduction',
		description: 'Reduce attack surfaces with exploit protection and application control',
		icon: ShieldOff
	},
	{
		category: 'accountProtection',
		templateFamily: 'endpointSecurityAccountProtection',
		label: 'Account Protection',
		description: 'Protect user accounts with credential guard and sign-in security',
		icon: UserCheck
	}
];

export const SECURITY_TEMPLATE_FAMILIES = SECURITY_CATEGORIES.map((c) => c.templateFamily);

// ─── Helpers ───────────────────────────────────────────────────────

const categoryByFamily = new Map(SECURITY_CATEGORIES.map((c) => [c.templateFamily, c]));

export function getSecurityCategoryInfo(templateFamily: string): SecurityCategoryInfo | undefined {
	return categoryByFamily.get(templateFamily);
}

export function getSecurityCategoryLabel(templateFamily: string): string {
	return categoryByFamily.get(templateFamily)?.label ?? templateFamily;
}

export function isEndpointSecurityPolicy(policy: ConfigurationPolicy): boolean {
	return (
		policy.templateReference?.templateFamily != null &&
		categoryByFamily.has(policy.templateReference.templateFamily)
	);
}
