// SPDX-License-Identifier: AGPL-3.0-only

// ─── App Install Status Types ───────────────────────────────────────

export type AppInstallState =
	| 'installed'
	| 'failed'
	| 'notInstalled'
	| 'uninstallFailed'
	| 'pendingInstall'
	| 'unknown'
	| 'notApplicable';

export interface MobileAppInstallStatus {
	deviceName: string;
	deviceId: string;
	osVersion: string;
	osDescription: string;
	installState: AppInstallState;
	installStateDetail: string;
	errorCode: number;
	lastSyncDateTime: string;
	userName: string;
	userPrincipalName: string;
}

export interface MobileAppInstallSummary {
	installedDeviceCount: number;
	failedDeviceCount: number;
	notInstalledDeviceCount: number;
	notApplicableDeviceCount: number;
	pendingInstallDeviceCount: number;
	installedUserCount?: number;
	failedUserCount?: number;
	notInstalledUserCount?: number;
	notApplicableUserCount?: number;
}

// ─── Per-Device App Install Status (Reports API) ───────────────────

export interface AppDeviceInstallStatusRow {
	deviceName: string;
	deviceId: string;
	userName: string;
	userPrincipalName: string;
	platform: string;
	appVersion: string;
	installState: string;
	installStateDetail: string;
	appInstallState: string;
	appInstallStateDetails: string;
	errorCode: number;
	hexErrorCode: string;
	lastModifiedDateTime: string;
}

// ─── Intune Reports API Types ──────────────────────────────────────

export interface IntuneReportResponse {
	TotalRowCount: number;
	Schema: { Column: string; PropertyType: string }[];
	Values: unknown[][];
}

export interface AppInstallSummaryRow {
	applicationId: string;
	displayName: string;
	failedDeviceCount: number;
	installedDeviceCount: number;
	notInstalledDeviceCount: number;
	pendingInstallDeviceCount: number;
}

// ─── Device Configuration Status Types ──────────────────────────────

export type DeviceConfigStatus =
	| 'unknown'
	| 'notApplicable'
	| 'compliant'
	| 'remediated'
	| 'nonCompliant'
	| 'error'
	| 'conflict'
	| 'notAssigned';

export interface DeviceConfigurationDeviceStatus {
	id: string;
	deviceDisplayName: string;
	userName: string;
	status: DeviceConfigStatus;
	lastReportedDateTime: string;
	userPrincipalName: string;
}

export interface DeviceConfigurationDeviceOverview {
	pendingCount: number;
	notApplicableCount: number;
	successCount: number;
	errorCount: number;
	failedCount: number;
	lastUpdateDateTime: string;
	configurationVersion: number;
}

// ─── Compliance Policy Status Types ─────────────────────────────────

export interface DeviceComplianceDeviceStatus {
	id: string;
	deviceDisplayName: string;
	userName: string;
	deviceModel: string;
	platform: string;
	status: string;
	lastReportedDateTime: string;
	userPrincipalName: string;
	complianceGracePeriodExpirationDateTime: string;
}

export interface SettingStateDeviceSummary {
	id: string;
	settingName: string;
	instancePath: string;
	compliantDeviceCount: number;
	conflictDeviceCount: number;
	errorDeviceCount: number;
	nonCompliantDeviceCount: number;
	notApplicableDeviceCount: number;
	remediatedDeviceCount: number;
}

export interface DeviceComplianceSettingState {
	id: string;
	setting: string;
	settingName: string;
	deviceId: string;
	deviceName: string;
	userId: string;
	userPrincipalName: string;
	state: string;
	complianceGracePeriodExpirationDateTime: string;
}
