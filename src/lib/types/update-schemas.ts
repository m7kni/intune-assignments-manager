import { z } from 'zod';
import { assignmentTargetSchema } from './schemas';

// ─── Windows Update for Business Configuration Schema ──────────────

export const windowsUpdateForBusinessConfigurationSchema = z.looseObject({
	id: z.string(),
	displayName: z.string(),
	description: z.string().nullable().optional(),
	qualityUpdatesDeferralPeriodInDays: z.number().optional().default(0),
	featureUpdatesDeferralPeriodInDays: z.number().optional().default(0),
	qualityUpdatesPaused: z.boolean().optional().default(false),
	featureUpdatesPaused: z.boolean().optional().default(false),
	deliveryOptimizationMode: z.string().nullable().optional(),
	driversExcluded: z.boolean().optional().default(false),
	allowWindows11Upgrade: z.boolean().optional().default(false),
	deadlineForQualityUpdatesInDays: z.number().nullable().optional(),
	deadlineForFeatureUpdatesInDays: z.number().nullable().optional(),
	engagedRestartDeadlineInDays: z.number().nullable().optional(),
	updateNotificationLevel: z.string().nullable().optional(),
	userPauseAccess: z.string().nullable().optional(),
	businessReadyUpdatesOnly: z.string().nullable().optional(),
	createdDateTime: z.string().optional(),
	lastModifiedDateTime: z.string().optional(),
	'@odata.type': z.string().optional()
});

// ─── Windows Feature Update Profile Schema ─────────────────────────

export const windowsFeatureUpdateProfileSchema = z.looseObject({
	id: z.string(),
	displayName: z.string(),
	description: z.string().nullable().optional(),
	featureUpdateVersion: z.string().optional().default(''),
	rolloutSettings: z
		.object({
			offerStartDateTimeInUTC: z.string().nullable().optional(),
			offerEndDateTimeInUTC: z.string().nullable().optional(),
			offerIntervalInDays: z.number().nullable().optional()
		})
		.nullable()
		.optional(),
	endOfSupportDate: z.string().nullable().optional(),
	createdDateTime: z.string().optional(),
	lastModifiedDateTime: z.string().optional()
});

// ─── Windows Quality Update Profile Schema ─────────────────────────

export const windowsQualityUpdateProfileSchema = z.looseObject({
	id: z.string(),
	displayName: z.string(),
	description: z.string().nullable().optional(),
	expeditedUpdateSettings: z
		.object({
			qualityUpdateRelease: z.string().nullable().optional(),
			daysUntilForcedReboot: z.number().nullable().optional()
		})
		.nullable()
		.optional(),
	releaseDateDisplayName: z.string().nullable().optional(),
	createdDateTime: z.string().optional(),
	lastModifiedDateTime: z.string().optional()
});

// ─── Windows Driver Update Profile Schema ──────────────────────────

export const windowsDriverUpdateProfileSchema = z.looseObject({
	id: z.string(),
	displayName: z.string(),
	description: z.string().nullable().optional(),
	approvalType: z.enum(['manual', 'automatic']).optional().default('manual'),
	deviceReporting: z.number().optional().default(0),
	newUpdates: z.number().optional().default(0),
	deploymentDeferralInDays: z.number().optional().default(0),
	createdDateTime: z.string().optional(),
	lastModifiedDateTime: z.string().optional()
});

// ─── Update Assignment Schema ──────────────────────────────────────

export const updateAssignmentSchema = z.looseObject({
	id: z.string(),
	target: assignmentTargetSchema
});
