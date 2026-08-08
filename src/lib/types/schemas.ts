// SPDX-License-Identifier: AGPL-3.0-only

import { z } from 'zod';

// ─── Assignment Filter Fields (shared) ──────────────────────────────

const assignmentFilterFields = {
	deviceAndAppManagementAssignmentFilterId: z.string().nullable(),
	deviceAndAppManagementAssignmentFilterType: z.enum(['include', 'exclude', 'none'])
};

// ─── Assignment Target Schemas ──────────────────────────────────────

const groupAssignmentTargetSchema = z.looseObject({
	'@odata.type': z.literal('#microsoft.graph.groupAssignmentTarget'),
	groupId: z.string(),
	...assignmentFilterFields
});

const allDevicesAssignmentTargetSchema = z.looseObject({
	'@odata.type': z.literal('#microsoft.graph.allDevicesAssignmentTarget'),
	...assignmentFilterFields
});

const allLicensedUsersAssignmentTargetSchema = z.looseObject({
	'@odata.type': z.literal('#microsoft.graph.allLicensedUsersAssignmentTarget'),
	...assignmentFilterFields
});

const exclusionGroupAssignmentTargetSchema = z.looseObject({
	'@odata.type': z.literal('#microsoft.graph.exclusionGroupAssignmentTarget'),
	groupId: z.string(),
	...assignmentFilterFields
});

export const assignmentTargetSchema = z.discriminatedUnion('@odata.type', [
	groupAssignmentTargetSchema,
	allDevicesAssignmentTargetSchema,
	allLicensedUsersAssignmentTargetSchema,
	exclusionGroupAssignmentTargetSchema
]);

// ─── Mobile App Schemas ─────────────────────────────────────────────

export const mobileAppSchema = z.looseObject({
	id: z.string(),
	displayName: z.string(),
	description: z.string().nullable().optional(),
	publisher: z.string().nullable().optional(),
	'@odata.type': z.string(),
	largeIcon: z.looseObject({ type: z.string(), value: z.string() }).nullable().optional(),
	isAssigned: z.boolean().optional(),
	appAvailability: z.string().optional()
});

export const mobileAppAssignmentSchema = z.looseObject({
	id: z.string(),
	intent: z.enum(['required', 'available', 'uninstall', 'availableWithoutEnrollment']),
	target: assignmentTargetSchema,
	settings: z.record(z.string(), z.unknown()).nullable().optional()
});

// ─── Configuration Policy Schemas ───────────────────────────────────

export const configurationPolicySchema = z.looseObject({
	id: z.string(),
	name: z.string(),
	description: z.string().nullable().optional(),
	platforms: z.string().optional(),
	technologies: z.string().optional(),
	roleScopeTagIds: z.array(z.string()).optional(),
	settingCount: z.number().optional(),
	isAssigned: z.boolean().optional(),
	templateReference: z
		.object({
			templateFamily: z.string().nullable().optional(),
			templateId: z.string().nullable().optional(),
			templateDisplayName: z.string().nullable().optional(),
			templateDisplayVersion: z.string().nullable().optional()
		})
		.optional()
});

export const configurationPolicyAssignmentSchema = z.looseObject({
	id: z.string(),
	intent: z.string().nullable().optional(),
	target: assignmentTargetSchema
});

// ─── Group Schema ───────────────────────────────────────────────────

export const groupSchema = z.looseObject({
	id: z.string(),
	displayName: z.string(),
	description: z.string().nullable().optional(),
	groupTypes: z.array(z.string()).optional(),
	membershipRule: z.string().nullable().optional()
});

// ─── Assignment Filter Schema ───────────────────────────────────────

export const assignmentFilterSchema = z.looseObject({
	id: z.string(),
	displayName: z.string(),
	description: z.string().nullable().optional(),
	platform: z.string(),
	rule: z.string()
});

// ─── Graph Paged Response Schema Factory ────────────────────────────

export function graphPagedResponseSchema<T extends z.ZodType>(itemSchema: T) {
	return z.object({
		value: z.array(itemSchema),
		'@odata.nextLink': z.string().optional(),
		'@odata.count': z.number().optional()
	});
}

// ─── Batch Schemas ──────────────────────────────────────────────────

export const batchResponseItemSchema = z.looseObject({
	id: z.string(),
	status: z.number(),
	body: z.unknown(),
	headers: z.record(z.string(), z.string()).optional()
});

export const batchResponseSchema = z.object({
	responses: z.array(batchResponseItemSchema)
});

// ─── Audit Event Schemas ───────────────────────────────────────────

export const auditPropertySchema = z.looseObject({
	displayName: z.string(),
	oldValue: z.string().nullable().optional(),
	newValue: z.string().nullable().optional()
});

export const auditResourceSchema = z.looseObject({
	displayName: z.string().nullable().default(''),
	type: z.string().nullable().default(''),
	resourceId: z.string().nullable().optional(),
	auditResourceType: z.string().nullable().default(''),
	modifiedProperties: z.array(auditPropertySchema).optional().default([])
});

export const auditActorSchema = z.looseObject({
	type: z.string(),
	userPermissions: z.array(z.string()).optional().default([]),
	applicationId: z.string().nullable().optional(),
	applicationDisplayName: z.string().nullable().optional(),
	userPrincipalName: z.string().nullable().optional(),
	servicePrincipalName: z.string().nullable().optional(),
	ipAddress: z.string().nullable().optional(),
	userId: z.string().nullable().optional(),
	remoteTenantId: z.string().nullable().optional(),
	remoteUserId: z.string().nullable().optional()
});

export const auditEventSchema = z.looseObject({
	id: z.string(),
	displayName: z.string().nullable().default(''),
	componentName: z.string().nullable().default(''),
	activity: z.string().nullable().default(null),
	activityDateTime: z.string(),
	activityType: z.string(),
	activityOperationType: z.string(),
	activityResult: z.string(),
	correlationId: z.string(),
	actor: auditActorSchema,
	resources: z.array(auditResourceSchema).optional().default([]),
	category: z.string()
});
