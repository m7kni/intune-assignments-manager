import { z } from 'zod';
import { assignmentTargetSchema } from './schemas';

// ─── Device Management Script Schema ───────────────────────────────

export const deviceManagementScriptSchema = z.looseObject({
	id: z.string(),
	displayName: z.string(),
	description: z.string().nullable().optional(),
	scriptContent: z.string().nullable().optional(),
	createdDateTime: z.string().optional(),
	lastModifiedDateTime: z.string().optional(),
	runAsAccount: z.enum(['system', 'user']).optional(),
	enforceSignatureCheck: z.boolean().optional(),
	fileName: z.string().optional(),
	runAs32Bit: z.boolean().optional(),
	roleScopeTagIds: z.array(z.string()).optional()
});

// ─── Device Management Script Assignment Schema ────────────────────

export const deviceManagementScriptAssignmentSchema = z.looseObject({
	id: z.string(),
	target: assignmentTargetSchema
});

// ─── Device Management Script Device State Schema ──────────────────

export const deviceManagementScriptDeviceStateSchema = z.looseObject({
	id: z.string(),
	runState: z
		.enum(['unknown', 'success', 'fail', 'scriptError', 'pending', 'notApplicable'])
		.optional(),
	resultMessage: z.string().nullable().optional(),
	errorCode: z.number().optional(),
	lastStateUpdateDateTime: z.string().optional(),
	managedDevice: z
		.looseObject({
			id: z.string(),
			deviceName: z.string().optional()
		})
		.optional()
});

// ─── Device Management Script Run Summary Schema ───────────────────

export const deviceManagementScriptRunSummarySchema = z.looseObject({
	successDeviceCount: z.number().optional(),
	errorDeviceCount: z.number().optional()
});
