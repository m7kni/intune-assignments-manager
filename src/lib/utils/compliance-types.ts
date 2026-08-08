// SPDX-License-Identifier: AGPL-3.0-only

import { Monitor, Smartphone, TabletSmartphone, ShieldAlert } from 'lucide-svelte';

// ─── Types ──────────────────────────────────────────────────────────

export interface CompliancePlatformInfo {
	label: string;
	platform: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	icon: any;
}

// ─── Platform Mapping ───────────────────────────────────────────────

const COMPLIANCE_TYPE_MAP: Record<string, CompliancePlatformInfo> = {
	'#microsoft.graph.windows10CompliancePolicy': {
		label: 'Windows 10/11',
		platform: 'Windows',
		icon: Monitor
	},
	'#microsoft.graph.windows81CompliancePolicy': {
		label: 'Windows 8.1',
		platform: 'Windows',
		icon: Monitor
	},
	'#microsoft.graph.iosCompliancePolicy': {
		label: 'iOS/iPadOS',
		platform: 'iOS',
		icon: Smartphone
	},
	'#microsoft.graph.macOSCompliancePolicy': {
		label: 'macOS',
		platform: 'macOS',
		icon: Monitor
	},
	'#microsoft.graph.androidCompliancePolicy': {
		label: 'Android',
		platform: 'Android',
		icon: TabletSmartphone
	},
	'#microsoft.graph.androidWorkProfileCompliancePolicy': {
		label: 'Android Work Profile',
		platform: 'Android',
		icon: TabletSmartphone
	},
	'#microsoft.graph.androidDeviceOwnerCompliancePolicy': {
		label: 'Android Enterprise',
		platform: 'Android',
		icon: TabletSmartphone
	},
	'#microsoft.graph.aospDeviceOwnerCompliancePolicy': {
		label: 'AOSP',
		platform: 'Android',
		icon: TabletSmartphone
	}
};

const DEFAULT_INFO: CompliancePlatformInfo = {
	label: 'Compliance Policy',
	platform: 'Unknown',
	icon: ShieldAlert
};

// ─── Exports ────────────────────────────────────────────────────────

export function getCompliancePlatformInfo(odataType: string): CompliancePlatformInfo {
	return COMPLIANCE_TYPE_MAP[odataType] ?? DEFAULT_INFO;
}
