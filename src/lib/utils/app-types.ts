// SPDX-License-Identifier: AGPL-3.0-only

import {
	Monitor,
	Smartphone,
	TabletSmartphone,
	Globe,
	Package,
	Store,
	Shield,
	AppWindow
} from 'lucide-svelte';

export interface AppTypeInfo {
	label: string;
	platform: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	icon: any;
}

const DEFAULT_APP_TYPE: AppTypeInfo = {
	label: 'App',
	platform: 'Unknown',
	icon: AppWindow
};

const APP_TYPE_MAP: Record<string, AppTypeInfo> = {
	// Windows
	win32LobApp: { label: 'Win32', platform: 'Windows', icon: Monitor },
	officeSuiteApp: { label: 'Microsoft 365', platform: 'Windows', icon: Monitor },
	windowsUniversalAppX: { label: 'UWP', platform: 'Windows', icon: Monitor },
	windowsMobileMSI: { label: 'MSI', platform: 'Windows', icon: Monitor },
	winGetApp: { label: 'WinGet', platform: 'Windows', icon: Package },
	windowsStoreApp: { label: 'Windows Store', platform: 'Windows', icon: Store },
	microsoftStoreForBusinessApp: { label: 'Store for Business', platform: 'Windows', icon: Store },

	// Web / Edge
	webApp: { label: 'Web Link', platform: 'Web', icon: Globe },
	windowsWebApp: { label: 'Web Link', platform: 'Windows', icon: Globe },
	windowsMicrosoftEdgeApp: { label: 'Edge', platform: 'Windows', icon: Globe },
	macOSMicrosoftEdgeApp: { label: 'Edge', platform: 'macOS', icon: Globe },

	// iOS
	iosVppApp: { label: 'iOS VPP', platform: 'iOS', icon: Smartphone },
	iosStoreApp: { label: 'iOS Store', platform: 'iOS', icon: Smartphone },
	iosLobApp: { label: 'iOS LOB', platform: 'iOS', icon: Smartphone },
	managedIOSStoreApp: { label: 'iOS Managed', platform: 'iOS', icon: Smartphone },
	managedIOSLobApp: { label: 'iOS Managed LOB', platform: 'iOS', icon: Smartphone },

	// Android
	androidStoreApp: { label: 'Android Store', platform: 'Android', icon: TabletSmartphone },
	androidLobApp: { label: 'Android LOB', platform: 'Android', icon: TabletSmartphone },
	androidManagedStoreApp: { label: 'Managed Android', platform: 'Android', icon: TabletSmartphone },
	androidForWorkApp: { label: 'Android Enterprise', platform: 'Android', icon: TabletSmartphone },
	managedAndroidStoreApp: { label: 'Android Managed', platform: 'Android', icon: TabletSmartphone },
	managedAndroidLobApp: {
		label: 'Android Managed LOB',
		platform: 'Android',
		icon: TabletSmartphone
	},

	// macOS
	macOSLobApp: { label: 'macOS LOB', platform: 'macOS', icon: Monitor },
	macOSDmgApp: { label: 'macOS DMG', platform: 'macOS', icon: Monitor },
	macOSPkgApp: { label: 'macOS PKG', platform: 'macOS', icon: Monitor },
	macOSMicrosoftDefenderApp: { label: 'Defender', platform: 'macOS', icon: Shield }
};

export function getAppTypeInfo(odataType: string): AppTypeInfo {
	const suffix = odataType.replace('#microsoft.graph.', '');
	return APP_TYPE_MAP[suffix] ?? DEFAULT_APP_TYPE;
}

export function getAppTypeLabel(odataType: string): string {
	return getAppTypeInfo(odataType).label;
}
