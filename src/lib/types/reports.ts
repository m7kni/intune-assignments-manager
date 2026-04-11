// ─── Report Type Definitions ────────────────────────────────────────

export type ReportType =
	| 'appDeployment'
	| 'complianceSummary'
	| 'unassignedItems'
	| 'staleDevices'
	| 'failedDeployments'
	| 'assignmentCoverage';

export interface ReportConfig {
	type: ReportType;
	title: string;
	description: string;
	icon: string;
}

export interface AppDeploymentReportItem {
	applicationId: string;
	displayName: string;
	platform?: string;
	installedDeviceCount: number;
	failedDeviceCount: number;
	pendingInstallDeviceCount: number;
	notApplicableDeviceCount: number;
	notInstalledDeviceCount: number;
}

export interface UnassignedItem {
	id: string;
	displayName: string;
	itemType: 'app' | 'profile' | 'compliance' | 'security';
	lastModified?: string;
}

export interface StaleDevice {
	id: string;
	deviceName: string;
	userDisplayName?: string;
	operatingSystem: string;
	osVersion: string;
	lastSyncDateTime: string;
	daysSinceSync: number;
	complianceState: string;
}

export interface FailedDeploymentItem {
	applicationId: string;
	displayName: string;
	platform?: string;
	failedDeviceCount: number;
}

export interface AssignmentCoverageItem {
	id: string;
	displayName: string;
	itemType: string;
	assignmentCount: number;
	hasAllDevices: boolean;
	hasAllUsers: boolean;
}
