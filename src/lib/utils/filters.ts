// SPDX-License-Identifier: AGPL-3.0-only

import { Monitor, Smartphone, TabletSmartphone, Globe } from 'lucide-svelte';
import type { MobileApp, ConfigurationPolicy } from '$lib/types/graph';
import type { DeviceCompliancePolicy } from '$lib/types/compliance';
import type { ManagedDevice } from '$lib/types/device';
import { getAppTypeInfo } from '$lib/utils/app-types';
import { getCompliancePlatformInfo } from '$lib/utils/compliance-types';
import { getDeviceTypeInfo } from '$lib/utils/device-types';
import { getPlatformLabel, getTechnologyLabel } from '$lib/utils/profile-types';

// ─── Types ──────────────────────────────────────────────────────────

export type AssignmentStatus = 'all' | 'assigned' | 'unassigned';

export interface FilterOption {
	id: string;
	label: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	icon?: any;
}

// ─── App Platform Filter Options ────────────────────────────────────

export const APP_PLATFORM_OPTIONS: FilterOption[] = [
	{ id: 'Windows', label: 'Windows', icon: Monitor },
	{ id: 'iOS', label: 'iOS', icon: Smartphone },
	{ id: 'Android', label: 'Android', icon: TabletSmartphone },
	{ id: 'macOS', label: 'macOS', icon: Monitor },
	{ id: 'Web', label: 'Web', icon: Globe }
];

// ─── Profile Platform Filter Options ────────────────────────────────

export const PROFILE_PLATFORM_OPTIONS: FilterOption[] = [
	{ id: 'Windows', label: 'Windows', icon: Monitor },
	{ id: 'macOS', label: 'macOS', icon: Monitor },
	{ id: 'iOS', label: 'iOS', icon: Smartphone },
	{ id: 'Android', label: 'Android', icon: TabletSmartphone },
	{ id: 'Android Enterprise', label: 'Android Enterprise', icon: TabletSmartphone },
	{ id: 'Linux', label: 'Linux', icon: Monitor }
];

// ─── Profile Technology Filter Options ──────────────────────────────

export const PROFILE_TECHNOLOGY_OPTIONS: FilterOption[] = [
	{ id: 'MDM', label: 'MDM' },
	{ id: 'Config Manager', label: 'Config Manager' },
	{ id: 'Microsoft Defender', label: 'Microsoft Defender' },
	{ id: 'Enrollment', label: 'Enrollment' }
];

// ─── Audit Category Filter Options ─────────────────────────────────

export const AUDIT_CATEGORY_OPTIONS: FilterOption[] = [
	{ id: 'Application', label: 'Application' },
	{ id: 'Compliance', label: 'Compliance' },
	{ id: 'Device', label: 'Device' },
	{ id: 'DeviceConfiguration', label: 'Device Configuration' },
	{ id: 'DeviceIntent', label: 'Device Intent' },
	{ id: 'Enrollment', label: 'Enrollment' },
	{ id: 'Role', label: 'Role' },
	{ id: 'SoftwareUpdates', label: 'Software Updates' },
	{ id: 'Other', label: 'Other' }
];

export const AUDIT_RESULT_OPTIONS: FilterOption[] = [
	{ id: 'Success', label: 'Success' },
	{ id: 'Failure', label: 'Failure' }
];

// ─── Dynamic App Type Options ───────────────────────────────────────

export function deriveAppTypeOptions(apps: MobileApp[]): FilterOption[] {
	const seen = new Map<string, FilterOption>();
	for (const app of apps) {
		const info = getAppTypeInfo(app['@odata.type']);
		if (!seen.has(info.label)) {
			seen.set(info.label, { id: info.label, label: info.label, icon: info.icon });
		}
	}
	return [...seen.values()].sort((a, b) => a.label.localeCompare(b.label));
}

// ─── Filter Predicates ──────────────────────────────────────────────

export function filterApps(
	apps: MobileApp[],
	options: {
		search?: string;
		platforms?: string[];
		appTypes?: string[];
		assignmentStatus?: AssignmentStatus;
	}
): MobileApp[] {
	let result = apps;

	const q = options.search?.trim().toLowerCase();
	if (q) {
		result = result.filter((app) => app.displayName.toLowerCase().includes(q));
	}

	if (options.platforms && options.platforms.length > 0) {
		const platforms = new Set(options.platforms);
		result = result.filter((app) => {
			const info = getAppTypeInfo(app['@odata.type']);
			return platforms.has(info.platform);
		});
	}

	if (options.appTypes && options.appTypes.length > 0) {
		const types = new Set(options.appTypes);
		result = result.filter((app) => {
			const info = getAppTypeInfo(app['@odata.type']);
			return types.has(info.label);
		});
	}

	if (options.assignmentStatus === 'assigned') {
		result = result.filter((app) => app.isAssigned);
	} else if (options.assignmentStatus === 'unassigned') {
		result = result.filter((app) => !app.isAssigned);
	}

	return result;
}

export function filterProfiles(
	profiles: ConfigurationPolicy[],
	options: {
		search?: string;
		platforms?: string[];
		technologies?: string[];
		assignmentStatus?: AssignmentStatus;
	}
): ConfigurationPolicy[] {
	let result = profiles;

	const q = options.search?.trim().toLowerCase();
	if (q) {
		result = result.filter((p) => p.name.toLowerCase().includes(q));
	}

	if (options.platforms && options.platforms.length > 0) {
		const platformSet = new Set(options.platforms);
		result = result.filter((p) => {
			const label = getPlatformLabel(p.platforms);
			return platformSet.has(label);
		});
	}

	if (options.technologies && options.technologies.length > 0) {
		const techSet = new Set(options.technologies);
		result = result.filter((p) => {
			const label = getTechnologyLabel(p.technologies);
			return techSet.has(label);
		});
	}

	if (options.assignmentStatus === 'assigned') {
		result = result.filter((p) => p.isAssigned);
	} else if (options.assignmentStatus === 'unassigned') {
		result = result.filter((p) => !p.isAssigned);
	}

	return result;
}

export function hasActiveAppFilters(
	platforms: string[],
	appTypes: string[],
	assignmentStatus: AssignmentStatus
): boolean {
	return platforms.length > 0 || appTypes.length > 0 || assignmentStatus !== 'all';
}

export function hasActiveProfileFilters(
	platforms: string[],
	technologies: string[],
	assignmentStatus: AssignmentStatus
): boolean {
	return platforms.length > 0 || technologies.length > 0 || assignmentStatus !== 'all';
}

// ─── Compliance Policy Platform Filter Options ──────────────────────

export const COMPLIANCE_PLATFORM_OPTIONS: FilterOption[] = [
	{ id: 'Windows', label: 'Windows', icon: Monitor },
	{ id: 'iOS', label: 'iOS', icon: Smartphone },
	{ id: 'Android', label: 'Android', icon: TabletSmartphone },
	{ id: 'macOS', label: 'macOS', icon: Monitor }
];

// ─── Compliance Policy Filter Predicate ─────────────────────────────

export function filterCompliancePolicies(
	policies: DeviceCompliancePolicy[],
	options: {
		search?: string;
		platforms?: string[];
		assignmentStatus?: AssignmentStatus;
	}
): DeviceCompliancePolicy[] {
	let result = policies;

	const q = options.search?.trim().toLowerCase();
	if (q) {
		result = result.filter((p) => p.displayName.toLowerCase().includes(q));
	}

	if (options.platforms && options.platforms.length > 0) {
		const platformSet = new Set(options.platforms);
		result = result.filter((p) => {
			const info = getCompliancePlatformInfo(p['@odata.type']);
			return platformSet.has(info.platform);
		});
	}

	if (options.assignmentStatus === 'assigned') {
		result = result.filter((p) => p.isAssigned);
	} else if (options.assignmentStatus === 'unassigned') {
		result = result.filter((p) => !p.isAssigned);
	}

	return result;
}

export function hasActiveComplianceFilters(
	platforms: string[],
	assignmentStatus: AssignmentStatus
): boolean {
	return platforms.length > 0 || assignmentStatus !== 'all';
}

// ─── Device Platform Filter Options ─────────────────────────────────

export const DEVICE_PLATFORM_OPTIONS: FilterOption[] = [
	{ id: 'Windows', label: 'Windows', icon: Monitor },
	{ id: 'iOS', label: 'iOS', icon: Smartphone },
	{ id: 'Android', label: 'Android', icon: TabletSmartphone },
	{ id: 'macOS', label: 'macOS', icon: Monitor },
	{ id: 'Linux', label: 'Linux', icon: Monitor }
];

// ─── Device Compliance Filter Options ───────────────────────────────

export const DEVICE_COMPLIANCE_OPTIONS: FilterOption[] = [
	{ id: 'compliant', label: 'Compliant' },
	{ id: 'noncompliant', label: 'Noncompliant' },
	{ id: 'unknown', label: 'Unknown' },
	{ id: 'inGracePeriod', label: 'In Grace Period' },
	{ id: 'error', label: 'Error' }
];

// ─── Device Ownership Filter Options ────────────────────────────────

export const DEVICE_OWNERSHIP_OPTIONS: FilterOption[] = [
	{ id: 'company', label: 'Corporate' },
	{ id: 'personal', label: 'Personal' }
];

// ─── Device Filter Predicate ────────────────────────────────────────

export function filterDevices(
	devices: ManagedDevice[],
	options: {
		search?: string;
		platforms?: string[];
		complianceStates?: string[];
		ownershipTypes?: string[];
	}
): ManagedDevice[] {
	let result = devices;

	const q = options.search?.trim().toLowerCase();
	if (q) {
		result = result.filter(
			(d) =>
				d.deviceName.toLowerCase().includes(q) ||
				(d.userDisplayName?.toLowerCase().includes(q) ?? false) ||
				(d.serialNumber?.toLowerCase().includes(q) ?? false) ||
				(d.userPrincipalName?.toLowerCase().includes(q) ?? false)
		);
	}

	if (options.platforms && options.platforms.length > 0) {
		const platforms = new Set(options.platforms);
		result = result.filter((d) => {
			const info = getDeviceTypeInfo(d.operatingSystem);
			return platforms.has(info.label);
		});
	}

	if (options.complianceStates && options.complianceStates.length > 0) {
		const states = new Set(options.complianceStates);
		result = result.filter((d) => states.has(d.complianceState));
	}

	if (options.ownershipTypes && options.ownershipTypes.length > 0) {
		const types = new Set(options.ownershipTypes);
		result = result.filter((d) => types.has(d.managedDeviceOwnerType));
	}

	return result;
}

export function hasActiveDeviceFilters(
	platforms: string[],
	complianceStates: string[],
	ownershipTypes: string[]
): boolean {
	return platforms.length > 0 || complianceStates.length > 0 || ownershipTypes.length > 0;
}

// ─── Security Policy Category Filter Options ────────────────────────

export const SECURITY_CATEGORY_OPTIONS: FilterOption[] = [
	{ id: 'antivirus', label: 'Antivirus' },
	{ id: 'firewall', label: 'Firewall' },
	{ id: 'diskEncryption', label: 'Disk Encryption' },
	{ id: 'endpointDetectionAndResponse', label: 'EDR' },
	{ id: 'attackSurfaceReduction', label: 'Attack Surface Reduction' },
	{ id: 'accountProtection', label: 'Account Protection' }
];

const SECURITY_CATEGORY_TO_TEMPLATE_FAMILY: Record<string, string> = {
	antivirus: 'endpointSecurityAntivirus',
	firewall: 'endpointSecurityFirewall',
	diskEncryption: 'endpointSecurityDiskEncryption',
	endpointDetectionAndResponse: 'endpointSecurityEndpointDetectionAndResponse',
	attackSurfaceReduction: 'endpointSecurityAttackSurfaceReduction',
	accountProtection: 'endpointSecurityAccountProtection'
};

// ─── Security Policy Filter Predicate ───────────────────────────────

export function filterSecurityPolicies(
	policies: ConfigurationPolicy[],
	options: {
		search?: string;
		categories?: string[];
		assignmentStatus?: AssignmentStatus;
	}
): ConfigurationPolicy[] {
	let result = policies;

	const q = options.search?.trim().toLowerCase();
	if (q) {
		result = result.filter((p) => p.name.toLowerCase().includes(q));
	}

	if (options.categories && options.categories.length > 0) {
		const familySet = new Set(
			options.categories.map((c) => SECURITY_CATEGORY_TO_TEMPLATE_FAMILY[c]).filter(Boolean)
		);
		result = result.filter((p) => {
			const family = p.templateReference?.templateFamily;
			return family ? familySet.has(family) : false;
		});
	}

	if (options.assignmentStatus === 'assigned') {
		result = result.filter((p) => p.isAssigned);
	} else if (options.assignmentStatus === 'unassigned') {
		result = result.filter((p) => !p.isAssigned);
	}

	return result;
}

export function hasActiveSecurityFilters(
	categories: string[],
	assignmentStatus: AssignmentStatus
): boolean {
	return categories.length > 0 || assignmentStatus !== 'all';
}
