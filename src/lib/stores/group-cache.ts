// SPDX-License-Identifier: AGPL-3.0-only

import type { GraphClient } from '$lib/graph/client';
import { groupSchema } from '$lib/types/schemas';

const cache = new Map<string, string>();

export async function resolveGroupNames(
	client: GraphClient,
	groupIds: string[]
): Promise<Map<string, string>> {
	const result = new Map<string, string>();
	const uncachedIds: string[] = [];

	for (const id of groupIds) {
		const cached = cache.get(id);
		if (cached !== undefined) {
			result.set(id, cached);
		} else {
			uncachedIds.push(id);
		}
	}

	if (uncachedIds.length > 0) {
		const batchRequests = uncachedIds.map((id, index) => ({
			id: String(index),
			method: 'GET' as const,
			url: `/groups/${id}?$select=displayName`
		}));

		const responses = await client.batch(batchRequests);

		for (const response of responses) {
			const requestIndex = parseInt(response.id, 10);
			const groupId = uncachedIds[requestIndex];
			if (response.status === 200 && response.body) {
				const parsed = groupSchema.parse(response.body);
				cache.set(groupId, parsed.displayName);
				result.set(groupId, parsed.displayName);
			} else {
				const fallback = `Unknown group (${groupId.slice(0, 8)}...)`;
				cache.set(groupId, fallback);
				result.set(groupId, fallback);
			}
		}
	}

	return result;
}

export function clearGroupCache(): void {
	cache.clear();
}
