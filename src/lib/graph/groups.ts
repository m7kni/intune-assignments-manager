// SPDX-License-Identifier: AGPL-3.0-only

import type { GraphClient } from './client';
import type { Group, GraphPagedResponse } from '$lib/types/graph';
import { groupSchema } from '$lib/types/schemas';

// ─── Types ──────────────────────────────────────────────────────────

export interface ListGroupsOptions {
	top?: number;
	filter?: string;
}

// ─── API ────────────────────────────────────────────────────────────

export async function searchGroups(client: GraphClient, query: string): Promise<Group[]> {
	const params: Record<string, string> = {
		$search: `"displayName:${query}"`,
		$top: '25',
		$select: 'id,displayName,description,groupTypes,membershipRule',
		$orderby: 'displayName'
	};

	const response = await client.request<GraphPagedResponse<Group>>('/groups', { params });

	return response.value.map((item) => groupSchema.parse(item) as Group);
}

export async function listGroups(
	client: GraphClient,
	options?: ListGroupsOptions
): Promise<Group[]> {
	const params: Record<string, string> = {};

	if (options?.top !== undefined) {
		params.$top = String(options.top);
	}

	if (options?.filter !== undefined) {
		params.$filter = options.filter;
	}

	const items = await client.fetchAll<Group>('/groups', { params });

	return items.map((item) => groupSchema.parse(item) as Group);
}
