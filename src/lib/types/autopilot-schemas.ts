import { z } from 'zod';
import { assignmentTargetSchema } from './schemas';

// ─── Autopilot Device Schema ──────────────────────────────────────

export const autopilotDeviceSchema = z.looseObject({
	id: z.string(),
	groupTag: z.string().nullable().optional(),
	serialNumber: z.string(),
	manufacturer: z.string().nullable().optional(),
	model: z.string().nullable().optional(),
	enrollmentState: z
		.enum(['unknown', 'enrolled', 'pendingReset', 'failed', 'notContacted', 'blocked'])
		.optional()
		.default('unknown'),
	lastContactedDateTime: z.string().nullable().optional(),
	deploymentProfileAssignmentStatus: z
		.enum([
			'unknown',
			'assignedInSync',
			'assignedOutOfSync',
			'assignedUnkownSyncState',
			'notAssigned',
			'pending',
			'failed'
		])
		.optional()
		.default('unknown'),
	deploymentProfileAssignmentDetailedStatus: z.string().nullable().optional(),
	purchaseOrderIdentifier: z.string().nullable().optional(),
	addressableUserName: z.string().nullable().optional()
});

// ─── Out of Box Experience Settings Schema ────────────────────────

export const outOfBoxExperienceSettingsSchema = z.looseObject({
	hidePrivacySettings: z.boolean().optional().default(false),
	hideEULA: z.boolean().optional().default(false),
	userType: z.string().optional().default(''),
	hideEscapeLink: z.boolean().optional().default(false),
	deviceUsageType: z.string().optional().default(''),
	skipKeyboardSelectionPage: z.boolean().optional().default(false),
	hideChangeAccountOption: z.boolean().optional().default(false)
});

// ─── Autopilot Deployment Profile Schema ──────────────────────────

export const autopilotDeploymentProfileSchema = z.looseObject({
	id: z.string(),
	displayName: z.string(),
	description: z.string().nullable().optional(),
	deviceNameTemplate: z.string().nullable().optional(),
	language: z.string().nullable().optional(),
	preprovisioningAllowed: z.boolean().optional().default(false),
	outOfBoxExperienceSettings: outOfBoxExperienceSettingsSchema.nullable().optional(),
	createdDateTime: z.string().optional(),
	lastModifiedDateTime: z.string().optional()
});

// ─── Autopilot Deployment Profile Assignment Schema ───────────────

export const autopilotDeploymentProfileAssignmentSchema = z.looseObject({
	id: z.string(),
	target: assignmentTargetSchema
});
