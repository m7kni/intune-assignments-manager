// SPDX-License-Identifier: AGPL-3.0-only

import { z } from 'zod';

// ─── Managed Device Schema ──────────────────────────────────────────

export const managedDeviceSchema = z.looseObject({
	id: z.string(),
	deviceName: z.string(),
	userDisplayName: z.string().nullable().optional(),
	userPrincipalName: z.string().nullable().optional(),
	managedDeviceOwnerType: z.enum(['company', 'personal', 'unknown']).optional().default('unknown'),
	operatingSystem: z.string().optional().default('Unknown'),
	osVersion: z.string().nullable().optional(),
	deviceType: z.string().optional().default('unknown'),
	complianceState: z
		.enum([
			'compliant',
			'noncompliant',
			'conflict',
			'unknown',
			'error',
			'inGracePeriod',
			'configManager'
		])
		.optional()
		.default('unknown'),
	lastSyncDateTime: z.string().nullable().optional(),
	enrolledDateTime: z.string().nullable().optional(),
	model: z.string().nullable().optional(),
	manufacturer: z.string().nullable().optional(),
	serialNumber: z.string().nullable().optional(),
	totalStorageSpaceInBytes: z.number().optional().default(0),
	freeStorageSpaceInBytes: z.number().optional().default(0),
	managementAgent: z.string().optional().default('unknown'),
	isEncrypted: z.boolean().optional().default(false),
	isSupervised: z.boolean().optional().default(false),
	azureADDeviceId: z.string().nullable().optional(),
	azureADRegistered: z.boolean().nullable().optional(),
	emailAddress: z.string().nullable().optional(),
	deviceRegistrationState: z.string().nullable().optional()
});

// ─── Device Policy State Schemas ───────────────────────────────────

const devicePolicyComplianceStateEnum = z
	.enum([
		'unknown',
		'notApplicable',
		'compliant',
		'remediated',
		'nonCompliant',
		'error',
		'conflict'
	])
	.optional()
	.default('unknown');

export const deviceSettingStateSchema = z.looseObject({
	settingName: z.string().nullable().optional().default(null),
	state: devicePolicyComplianceStateEnum,
	currentValue: z.string().nullable().optional().default(null),
	errorCode: z.number().optional().default(0),
	errorDescription: z.string().nullable().optional().default(null)
});

export const deviceCompliancePolicyStateSchema = z.looseObject({
	id: z.string().nullable().optional().default(null),
	displayName: z.string().nullable().optional().default(null),
	state: devicePolicyComplianceStateEnum,
	settingCount: z.number().optional().default(0),
	settingStates: z.array(deviceSettingStateSchema).optional().default([])
});

export const deviceConfigurationStateSchema = z.looseObject({
	id: z.string().nullable().optional().default(null),
	displayName: z.string().nullable().optional().default(null),
	state: devicePolicyComplianceStateEnum,
	settingCount: z.number().optional().default(0),
	platformType: z.string().nullable().optional().default(null),
	settingStates: z.array(deviceSettingStateSchema).optional().default([])
});

export const detectedAppSchema = z.looseObject({
	displayName: z.string().nullable().optional().default(null),
	version: z.string().nullable().optional().default(null),
	sizeInByte: z.number().optional().default(0)
});
