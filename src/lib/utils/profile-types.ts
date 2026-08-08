// SPDX-License-Identifier: AGPL-3.0-only

import { Monitor, Smartphone, TabletSmartphone, Settings } from 'lucide-svelte';

export interface ProfileTypeInfo {
	label: string;
	technology: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	icon: any;
}

const DEFAULT_PROFILE_TYPE: ProfileTypeInfo = {
	label: 'Unknown',
	technology: 'Unknown',
	icon: Settings
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PLATFORM_MAP: Record<string, { label: string; icon: any }> = {
	windows10: { label: 'Windows', icon: Monitor },
	windows10AndLater: { label: 'Windows', icon: Monitor },
	macOS: { label: 'macOS', icon: Monitor },
	iOS: { label: 'iOS', icon: Smartphone },
	android: { label: 'Android', icon: TabletSmartphone },
	androidEnterprise: { label: 'Android Enterprise', icon: TabletSmartphone },
	linux: { label: 'Linux', icon: Monitor }
};

const TECHNOLOGY_MAP: Record<string, string> = {
	mdm: 'MDM',
	configManager: 'Config Manager',
	microsoftSense: 'Microsoft Defender',
	enrollment: 'Enrollment'
};

export function getProfileTypeInfo(platforms: string, technologies: string): ProfileTypeInfo {
	const platformInfo = PLATFORM_MAP[platforms];
	const technologyLabel = getTechnologyLabel(technologies);

	if (platformInfo) {
		return {
			label: platformInfo.label,
			technology: technologyLabel,
			icon: platformInfo.icon
		};
	}

	return {
		...DEFAULT_PROFILE_TYPE,
		technology: technologyLabel
	};
}

export function getPlatformLabel(platforms: string): string {
	return PLATFORM_MAP[platforms]?.label ?? platforms;
}

export function getTechnologyLabel(technologies: string): string {
	if (TECHNOLOGY_MAP[technologies]) {
		return TECHNOLOGY_MAP[technologies];
	}
	if (technologies) {
		return technologies.charAt(0).toUpperCase() + technologies.slice(1);
	}
	return 'Unknown';
}
