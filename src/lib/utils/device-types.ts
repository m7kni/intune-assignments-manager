import { Monitor, Smartphone, TabletSmartphone, Laptop } from 'lucide-svelte';
import type {
	ComplianceState,
	DeviceOwnerType,
	DevicePolicyComplianceState,
	DeviceActionInfo,
	ManagementAgent
} from '$lib/types/device';

export interface DeviceTypeInfo {
	label: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	icon: any;
}

// Map operatingSystem string to icon + label
export function getDeviceTypeInfo(os: string): DeviceTypeInfo {
	// Match case-insensitively
	const lower = os.toLowerCase();
	if (lower.includes('windows')) return { label: 'Windows', icon: Monitor };
	if (lower.includes('ipad')) return { label: 'iPadOS', icon: Smartphone };
	if (lower.includes('ios') || lower === 'iphone') return { label: 'iOS', icon: Smartphone };
	if (lower.includes('android')) return { label: 'Android', icon: TabletSmartphone };
	if (lower.includes('macos') || lower.includes('mac os')) return { label: 'macOS', icon: Laptop };
	if (lower.includes('linux')) return { label: 'Linux', icon: Monitor };
	return { label: os || 'Unknown', icon: Monitor };
}

// Badge variant type matching what Badge.svelte accepts
type BadgeVariant =
	| 'required'
	| 'available'
	| 'uninstall'
	| 'exclude'
	| 'neutral'
	| 'info'
	| 'outline';

export function getComplianceInfo(
	state: ComplianceState
): { label: string; variant: BadgeVariant } {
	switch (state) {
		case 'compliant':
			return { label: 'Compliant', variant: 'required' };
		case 'noncompliant':
			return { label: 'Noncompliant', variant: 'uninstall' };
		case 'inGracePeriod':
			return { label: 'Grace Period', variant: 'available' };
		case 'error':
			return { label: 'Error', variant: 'uninstall' };
		case 'conflict':
			return { label: 'Conflict', variant: 'available' };
		case 'configManager':
			return { label: 'Config Manager', variant: 'info' };
		case 'unknown':
		default:
			return { label: 'Unknown', variant: 'neutral' };
	}
}

export function getOwnershipLabel(type: DeviceOwnerType): string {
	switch (type) {
		case 'company':
			return 'Corporate';
		case 'personal':
			return 'Personal';
		case 'unknown':
		default:
			return 'Unknown';
	}
}

export function formatStorageSize(bytes: number): string {
	if (bytes <= 0) return 'Unknown';
	const gb = bytes / (1024 * 1024 * 1024);
	if (gb >= 1) return `${Math.round(gb)} GB`;
	const mb = bytes / (1024 * 1024);
	return `${Math.round(mb)} MB`;
}

export function formatRelativeTime(dateString: string | null): string {
	if (!dateString) return 'Never';
	const date = new Date(dateString);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffSec = Math.floor(diffMs / 1000);
	const diffMin = Math.floor(diffSec / 60);
	const diffHr = Math.floor(diffMin / 60);
	const diffDay = Math.floor(diffHr / 24);

	if (diffSec < 60) return 'Just now';
	if (diffMin < 60) return `${diffMin}m ago`;
	if (diffHr < 24) return `${diffHr}h ago`;
	if (diffDay < 7) return `${diffDay}d ago`;
	if (diffDay < 30) return `${Math.floor(diffDay / 7)}w ago`;
	if (diffDay < 365) return `${Math.floor(diffDay / 30)}mo ago`;
	return `${Math.floor(diffDay / 365)}y ago`;
}

// ─── Policy State Utilities ────────────────────────────────────────

export function getPolicyStateInfo(
	state: DevicePolicyComplianceState
): { label: string; variant: BadgeVariant } {
	switch (state) {
		case 'compliant':
			return { label: 'Compliant', variant: 'required' };
		case 'remediated':
			return { label: 'Remediated', variant: 'required' };
		case 'nonCompliant':
			return { label: 'Non-Compliant', variant: 'uninstall' };
		case 'error':
			return { label: 'Error', variant: 'uninstall' };
		case 'conflict':
			return { label: 'Conflict', variant: 'available' };
		case 'notApplicable':
			return { label: 'Not Applicable', variant: 'neutral' };
		case 'unknown':
		default:
			return { label: 'Unknown', variant: 'neutral' };
	}
}

export function getManagementAgentLabel(agent: ManagementAgent): string {
	switch (agent) {
		case 'mdm':
			return 'MDM';
		case 'eas':
			return 'EAS';
		case 'easMdm':
			return 'EAS + MDM';
		case 'intuneClient':
			return 'Intune Client';
		case 'easIntuneClient':
			return 'EAS + Intune Client';
		case 'configurationManagerClient':
			return 'Config Manager';
		case 'configurationManagerClientMdm':
			return 'Config Manager + MDM';
		case 'unknown':
		default:
			return 'Unknown';
	}
}

// ─── Device Action Metadata ────────────────────────────────────────

export const DEVICE_ACTIONS: DeviceActionInfo[] = [
	{
		action: 'syncDevice',
		label: 'Sync',
		description: 'Trigger a sync check-in',
		icon: 'RefreshCw',
		destructive: false,
		requiresConfirmation: true,
		requiresTypedConfirmation: false
	},
	{
		action: 'rebootNow',
		label: 'Restart',
		description: 'Restart the device',
		icon: 'RotateCcw',
		destructive: false,
		requiresConfirmation: true,
		requiresTypedConfirmation: false
	},
	{
		action: 'remoteLock',
		label: 'Lock',
		description: 'Lock the device remotely',
		icon: 'Lock',
		destructive: false,
		requiresConfirmation: true,
		requiresTypedConfirmation: false
	},
	{
		action: 'shutDown',
		label: 'Shut Down',
		description: 'Remotely shut down the device',
		icon: 'Power',
		destructive: false,
		requiresConfirmation: true,
		requiresTypedConfirmation: false
	},
	{
		action: 'resetPasscode',
		label: 'Reset Passcode',
		description: 'Reset the device passcode',
		icon: 'KeyRound',
		destructive: false,
		requiresConfirmation: true,
		requiresTypedConfirmation: false
	},
	{
		action: 'retire',
		label: 'Retire',
		description: 'Remove corporate data and unenroll',
		icon: 'UserMinus',
		destructive: true,
		requiresConfirmation: true,
		requiresTypedConfirmation: true
	},
	{
		action: 'wipe',
		label: 'Wipe',
		description: 'Factory reset — all data will be erased',
		icon: 'Trash2',
		destructive: true,
		requiresConfirmation: true,
		requiresTypedConfirmation: true
	}
];
