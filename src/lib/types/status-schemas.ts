// SPDX-License-Identifier: AGPL-3.0-only

import { z } from 'zod';

// ─── App Install Status Schemas ─────────────────────────────────────

export const mobileAppInstallStatusSchema = z.looseObject({
	deviceName: z.string(),
	deviceId: z.string(),
	osVersion: z.string().nullable().optional(),
	osDescription: z.string().nullable().optional(),
	installState: z.enum([
		'installed',
		'failed',
		'notInstalled',
		'uninstallFailed',
		'pendingInstall',
		'unknown',
		'notApplicable'
	]),
	installStateDetail: z.string().nullable().optional(),
	errorCode: z.number().optional(),
	lastSyncDateTime: z.string().nullable().optional(),
	userName: z.string().nullable().optional(),
	userPrincipalName: z.string().nullable().optional()
});

export const mobileAppInstallSummarySchema = z.looseObject({
	installedDeviceCount: z.number(),
	failedDeviceCount: z.number(),
	notInstalledDeviceCount: z.number(),
	notApplicableDeviceCount: z.number(),
	pendingInstallDeviceCount: z.number(),
	installedUserCount: z.number().optional(),
	failedUserCount: z.number().optional(),
	notInstalledUserCount: z.number().optional(),
	notApplicableUserCount: z.number().optional()
});

// ─── Intune Reports API Schemas ─────────────────────────────────────

export const intuneReportResponseSchema = z.object({
	TotalRowCount: z.number(),
	Schema: z.array(z.object({ Column: z.string(), PropertyType: z.string() })),
	Values: z.array(z.array(z.unknown()))
});

// ─── Device Configuration Status Schemas ────────────────────────────

export const deviceConfigurationDeviceStatusSchema = z.looseObject({
	id: z.string(),
	deviceDisplayName: z.string(),
	userName: z.string().nullable().optional(),
	status: z.enum([
		'unknown',
		'notApplicable',
		'compliant',
		'remediated',
		'nonCompliant',
		'error',
		'conflict',
		'notAssigned'
	]),
	lastReportedDateTime: z.string().nullable().optional(),
	userPrincipalName: z.string().nullable().optional()
});

export const deviceConfigurationDeviceOverviewSchema = z.looseObject({
	pendingCount: z.number(),
	notApplicableCount: z.number(),
	successCount: z.number(),
	errorCount: z.number(),
	failedCount: z.number(),
	lastUpdateDateTime: z.string().nullable().optional(),
	configurationVersion: z.number().optional()
});

// ─── Compliance Policy Status Schemas ───────────────────────────────

export const deviceComplianceDeviceStatusSchema = z.looseObject({
	id: z.string(),
	deviceDisplayName: z.string(),
	userName: z.string().nullable().optional(),
	deviceModel: z.string().nullable().optional(),
	platform: z.string().nullable().optional(),
	status: z.string(),
	lastReportedDateTime: z.string().nullable().optional(),
	userPrincipalName: z.string().nullable().optional(),
	complianceGracePeriodExpirationDateTime: z.string().nullable().optional()
});

export const settingStateDeviceSummarySchema = z.looseObject({
	id: z.string(),
	settingName: z.string(),
	instancePath: z.string().nullable().optional(),
	compliantDeviceCount: z.number(),
	conflictDeviceCount: z.number(),
	errorDeviceCount: z.number(),
	nonCompliantDeviceCount: z.number(),
	notApplicableDeviceCount: z.number(),
	remediatedDeviceCount: z.number()
});

export const deviceComplianceSettingStateSchema = z.looseObject({
	id: z.string(),
	setting: z.string().nullable().optional(),
	settingName: z.string(),
	deviceId: z.string().nullable().optional(),
	deviceName: z.string().nullable().optional(),
	userId: z.string().nullable().optional(),
	userPrincipalName: z.string().nullable().optional(),
	state: z.string(),
	complianceGracePeriodExpirationDateTime: z.string().nullable().optional()
});
