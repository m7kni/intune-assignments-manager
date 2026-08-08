// SPDX-License-Identifier: AGPL-3.0-only

import type { GraphClient } from './client';
import type { MobileApp, MobileAppAssignment, GraphPagedResponse } from '$lib/types/graph';
import { mobileAppSchema, mobileAppAssignmentSchema } from '$lib/types/schemas';

// ─── Types ──────────────────────────────────────────────────────────

export interface ListAppsOptions {
	filter?: string;
	search?: string;
	top?: number;
	select?: string[];
	orderBy?: string;
}

// ─── API Functions ──────────────────────────────────────────────────

export async function listApps(
	client: GraphClient,
	options?: ListAppsOptions
): Promise<MobileApp[]> {
	const params: Record<string, string> = {};

	if (options?.filter) {
		params['$filter'] = options.filter;
	}
	if (options?.search) {
		params['$search'] = options.search;
	}
	if (options?.top !== undefined) {
		params['$top'] = String(options.top);
	}
	if (options?.select?.length) {
		params['$select'] = options.select.join(',');
	}
	if (options?.orderBy) {
		params['$orderby'] = options.orderBy;
	}

	const items = await client.fetchAll<MobileApp>('/deviceAppManagement/mobileApps', { params });

	return items.map((item) => mobileAppSchema.parse(item) as MobileApp);
}

export async function getApp(client: GraphClient, appId: string): Promise<MobileApp> {
	const response = await client.request<MobileApp>(`/deviceAppManagement/mobileApps/${appId}`);
	return mobileAppSchema.parse(response) as MobileApp;
}

export async function getAppAssignments(
	client: GraphClient,
	appId: string
): Promise<MobileAppAssignment[]> {
	const response = await client.request<GraphPagedResponse<MobileAppAssignment>>(
		`/deviceAppManagement/mobileApps/${appId}/assignments`
	);

	return response.value.map((item) => mobileAppAssignmentSchema.parse(item) as MobileAppAssignment);
}

export async function assignApp(
	client: GraphClient,
	appId: string,
	assignments: MobileAppAssignment[]
): Promise<void> {
	await client.request(`/deviceAppManagement/mobileApps/${appId}/assign`, {
		method: 'POST',
		body: { mobileAppAssignments: assignments }
	});
}
