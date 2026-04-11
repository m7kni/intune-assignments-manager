import { z } from 'zod';
import { assignmentTargetSchema } from './schemas';

// ─── Remediation Script Schema ─────────────────────────────────────

export const deviceHealthScriptSchema = z.looseObject({
	id: z.string(),
	displayName: z.string(),
	description: z.string().nullable().optional(),
	publisher: z.string().nullable().optional(),
	detectionScriptContent: z.string().nullable().optional(),
	remediationScriptContent: z.string().nullable().optional(),
	runAsAccount: z.enum(['system', 'user']).optional(),
	enforceSignatureCheck: z.boolean().optional(),
	runAs32Bit: z.boolean().optional(),
	createdDateTime: z.string().optional(),
	lastModifiedDateTime: z.string().optional(),
	isGlobalScript: z.boolean().optional()
});

// ─── Run Schedule Schema ───────────────────────────────────────────

export const deviceHealthScriptRunScheduleSchema = z.looseObject({
	'@odata.type': z.string().optional(),
	interval: z.number().optional(),
	useUtc: z.boolean().optional(),
	time: z.string().optional()
});

// ─── Assignment Schema ─────────────────────────────────────────────

export const deviceHealthScriptAssignmentSchema = z.looseObject({
	id: z.string(),
	target: assignmentTargetSchema,
	runRemediationScript: z.boolean().optional(),
	runSchedule: deviceHealthScriptRunScheduleSchema.nullable().optional()
});

// ─── Device State Schema ───────────────────────────────────────────

const detectionStateEnum = z.enum([
	'unknown',
	'success',
	'fail',
	'scriptError',
	'pending',
	'notApplicable'
]);

export const deviceHealthScriptDeviceStateSchema = z.looseObject({
	id: z.string(),
	detectionState: detectionStateEnum.optional(),
	remediationState: detectionStateEnum.optional(),
	lastStateUpdateDateTime: z.string().nullable().optional(),
	preRemediationDetectionScriptOutput: z.string().nullable().optional(),
	remediationScriptError: z.string().nullable().optional(),
	managedDevice: z
		.looseObject({
			id: z.string(),
			deviceName: z.string()
		})
		.nullable()
		.optional()
});

// ─── Run Summary Schema ────────────────────────────────────────────

export const deviceHealthScriptRunSummarySchema = z.looseObject({
	noIssueDetectedDeviceCount: z.number().optional(),
	issueDetectedDeviceCount: z.number().optional(),
	issueRemediatedDeviceCount: z.number().optional(),
	issueReoccurredDeviceCount: z.number().optional(),
	scriptErrorDeviceCount: z.number().optional()
});
