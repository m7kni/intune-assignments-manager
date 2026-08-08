// SPDX-License-Identifier: AGPL-3.0-only

import type { GraphClient } from './client';
import type { GraphPagedResponse } from '$lib/types/graph';
import type {
	DeviceCompliancePolicy,
	DeviceCompliancePolicyAssignment
} from '$lib/types/compliance';
import {
	deviceCompliancePolicySchema,
	deviceCompliancePolicyAssignmentSchema
} from '$lib/types/compliance-schemas';

// ─── Types ──────────────────────────────────────────────────────────

export interface ListCompliancePoliciesOptions {
	filter?: string;
	search?: string;
	top?: number;
	select?: string[];
}

// ─── API Functions ──────────────────────────────────────────────────

export async function listCompliancePolicies(
	client: GraphClient,
	options?: ListCompliancePoliciesOptions
): Promise<DeviceCompliancePolicy[]> {
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

	const items = await client.fetchAll<DeviceCompliancePolicy>(
		'/deviceManagement/deviceCompliancePolicies',
		{ params }
	);

	return items.map(
		(item) => deviceCompliancePolicySchema.parse(item) as DeviceCompliancePolicy
	);
}

export async function getCompliancePolicy(
	client: GraphClient,
	policyId: string
): Promise<DeviceCompliancePolicy> {
	const response = await client.request<DeviceCompliancePolicy>(
		`/deviceManagement/deviceCompliancePolicies/${policyId}`
	);
	return deviceCompliancePolicySchema.parse(response) as DeviceCompliancePolicy;
}

export async function getCompliancePolicyAssignments(
	client: GraphClient,
	policyId: string
): Promise<DeviceCompliancePolicyAssignment[]> {
	const response = await client.request<
		GraphPagedResponse<DeviceCompliancePolicyAssignment>
	>(`/deviceManagement/deviceCompliancePolicies/${policyId}/assignments`);

	return response.value.map(
		(item) =>
			deviceCompliancePolicyAssignmentSchema.parse(
				item
			) as DeviceCompliancePolicyAssignment
	);
}

export async function assignCompliancePolicy(
	client: GraphClient,
	policyId: string,
	assignments: DeviceCompliancePolicyAssignment[]
): Promise<void> {
	await client.request(
		`/deviceManagement/deviceCompliancePolicies/${policyId}/assign`,
		{
			method: 'POST',
			body: { assignments }
		}
	);
}
