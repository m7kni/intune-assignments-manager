// SPDX-License-Identifier: AGPL-3.0-only

import type { GraphClient } from './client';
import type { AssignmentFilter } from '$lib/types/graph';
import { assignmentFilterSchema } from '$lib/types/schemas';

// ─── API ────────────────────────────────────────────────────────────

export async function listAssignmentFilters(client: GraphClient): Promise<AssignmentFilter[]> {
	const items = await client.fetchAll<AssignmentFilter>('/deviceManagement/assignmentFilters');

	return items.map((item) => assignmentFilterSchema.parse(item) as AssignmentFilter);
}
