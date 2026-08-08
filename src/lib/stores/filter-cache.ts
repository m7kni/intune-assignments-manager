// SPDX-License-Identifier: AGPL-3.0-only

import type { GraphClient } from '$lib/graph/client';
import type { AssignmentFilter } from '$lib/types/graph';
import { listAssignmentFilters } from '$lib/graph/filters';

let filters: AssignmentFilter[] | null = null;
let filterMap: Map<string, AssignmentFilter> | null = null;

export async function ensureFiltersLoaded(client: GraphClient): Promise<AssignmentFilter[]> {
	if (filters !== null) return filters;

	filters = await listAssignmentFilters(client);
	filterMap = new Map(filters.map((f) => [f.id, f]));
	return filters;
}

export function getFilterById(filterId: string): AssignmentFilter | null {
	return filterMap?.get(filterId) ?? null;
}

export function clearFilterCache(): void {
	filters = null;
	filterMap = null;
}
