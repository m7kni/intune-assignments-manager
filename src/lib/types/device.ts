// ─── Device Enum Types ──────────────────────────────────────────────

export type ComplianceState =
	| 'compliant'
	| 'noncompliant'
	| 'conflict'
	| 'unknown'
	| 'error'
	| 'inGracePeriod'
	| 'configManager';

export type DeviceOwnerType = 'company' | 'personal' | 'unknown';

export type ManagementAgent =
	| 'eas'
	| 'mdm'
	| 'easMdm'
	| 'intuneClient'
	| 'easIntuneClient'
	| 'configurationManagerClient'
	| 'configurationManagerClientMdm'
	| 'unknown';

export type DeviceType =
	| 'desktop'
	| 'windowsRT'
	| 'winMO6'
	| 'nokia'
	| 'windowsPhone'
	| 'mac'
	| 'winCE'
	| 'winEmbedded'
	| 'iPhone'
	| 'iPad'
	| 'iPod'
	| 'android'
	| 'iSocConsumer'
	| 'unix'
	| 'macMDM'
	| 'holoLens'
	| 'surfaceHub'
	| 'androidForWork'
	| 'androidEnterprise'
	| 'linux'
	| 'blackberry'
	| 'palm'
	| 'unknown'
	| 'cloudPC';

// ─── Managed Device Interface ───────────────────────────────────────

export interface ManagedDevice {
	id: string;
	deviceName: string;
	userDisplayName: string | null;
	userPrincipalName: string | null;
	managedDeviceOwnerType: DeviceOwnerType;
	operatingSystem: string;
	osVersion: string | null;
	deviceType: DeviceType;
	complianceState: ComplianceState;
	lastSyncDateTime: string | null;
	enrolledDateTime: string | null;
	model: string | null;
	manufacturer: string | null;
	serialNumber: string | null;
	totalStorageSpaceInBytes: number;
	freeStorageSpaceInBytes: number;
	managementAgent: ManagementAgent;
	isEncrypted: boolean;
	isSupervised: boolean;
	azureADDeviceId: string | null;
	azureADRegistered: boolean | null;
	emailAddress: string | null;
	deviceRegistrationState: string | null;
}

// ─── Device Policy State Types ─────────────────────────────────────

export type DevicePolicyComplianceState =
	| 'unknown'
	| 'notApplicable'
	| 'compliant'
	| 'remediated'
	| 'nonCompliant'
	| 'error'
	| 'conflict';

export interface DeviceSettingState {
	settingName: string | null;
	state: DevicePolicyComplianceState;
	currentValue: string | null;
	errorCode: number;
	errorDescription: string | null;
}

export interface DeviceCompliancePolicyState {
	id: string | null;
	displayName: string | null;
	state: DevicePolicyComplianceState;
	settingCount: number;
	settingStates: DeviceSettingState[];
}

export interface DeviceConfigurationState {
	id: string | null;
	displayName: string | null;
	state: DevicePolicyComplianceState;
	settingCount: number;
	platformType: string | null;
	settingStates: DeviceSettingState[];
}

export interface DetectedApp {
	displayName: string | null;
	version: string | null;
	sizeInByte: number;
}

// ─── Device Action Types ───────────────────────────────────────────

export type DeviceAction =
	| 'syncDevice'
	| 'rebootNow'
	| 'retire'
	| 'wipe'
	| 'remoteLock'
	| 'shutDown'
	| 'resetPasscode';

export interface DeviceActionInfo {
	action: DeviceAction;
	label: string;
	description: string;
	icon: string;
	destructive: boolean;
	requiresConfirmation: boolean;
	requiresTypedConfirmation: boolean;
}

// ─── Bulk Action Types ────────────────────────────────────────────

export interface ActionResult {
	deviceId: string;
	deviceName: string;
	action: DeviceAction;
	status: 'success' | 'error';
	error?: string;
}

export interface BulkActionProgress {
	total: number;
	completed: number;
	succeeded: number;
	failed: number;
	results: ActionResult[];
}

// ─── Device Detail Aggregate ───────────────────────────────────────

export interface DeviceDetail {
	device: ManagedDevice;
	compliancePolicyStates: DeviceCompliancePolicyState[];
	configurationStates: DeviceConfigurationState[];
	detectedApps: DetectedApp[];
}
