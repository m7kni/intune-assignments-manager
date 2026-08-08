// SPDX-License-Identifier: AGPL-3.0-only

import { z } from 'zod';
import { assignmentTargetSchema } from './schemas';

// ─── Compliance Policy Schema ───────────────────────────────────────

export const deviceCompliancePolicySchema = z.looseObject({
	id: z.string(),
	displayName: z.string(),
	description: z.string().nullable().optional(),
	createdDateTime: z.string().optional(),
	lastModifiedDateTime: z.string().optional(),
	version: z.number().optional(),
	roleScopeTagIds: z.array(z.string()).optional(),
	'@odata.type': z.string(),
	isAssigned: z.boolean().optional()
});

// ─── Compliance Policy Assignment Schema ────────────────────────────

export const deviceCompliancePolicyAssignmentSchema = z.looseObject({
	id: z.string(),
	target: assignmentTargetSchema
});
