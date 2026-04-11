import type { GraphClient } from './client';
import type {
	ConfigurationPolicy,
	ConfigurationPolicyAssignment,
	GraphPagedResponse
} from '$lib/types/graph';
import { configurationPolicySchema, configurationPolicyAssignmentSchema } from '$lib/types/schemas';

// ─── Types ──────────────────────────────────────────────────────────

export interface ListConfigPoliciesOptions {
	filter?: string;
	search?: string;
	top?: number;
	select?: string[];
}

// ─── API Functions ──────────────────────────────────────────────────

export async function listConfigPolicies(
	client: GraphClient,
	options?: ListConfigPoliciesOptions
): Promise<ConfigurationPolicy[]> {
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

	const items = await client.fetchAll<ConfigurationPolicy>(
		'/deviceManagement/configurationPolicies',
		{ params }
	);

	return items.map((item) => configurationPolicySchema.parse(item) as ConfigurationPolicy);
}

export async function getConfigPolicy(
	client: GraphClient,
	policyId: string
): Promise<ConfigurationPolicy> {
	const response = await client.request<ConfigurationPolicy>(
		`/deviceManagement/configurationPolicies/${policyId}`
	);
	return configurationPolicySchema.parse(response) as ConfigurationPolicy;
}

export async function getConfigAssignments(
	client: GraphClient,
	policyId: string
): Promise<ConfigurationPolicyAssignment[]> {
	const response = await client.request<GraphPagedResponse<ConfigurationPolicyAssignment>>(
		`/deviceManagement/configurationPolicies/${policyId}/assignments`
	);

	return response.value.map(
		(item) => configurationPolicyAssignmentSchema.parse(item) as ConfigurationPolicyAssignment
	);
}

export async function assignConfigPolicy(
	client: GraphClient,
	policyId: string,
	assignments: ConfigurationPolicyAssignment[]
): Promise<void> {
	await client.request(`/deviceManagement/configurationPolicies/${policyId}/assign`, {
		method: 'POST',
		body: { assignments }
	});
}

export async function getConfigPolicySettings(
	client: GraphClient,
	policyId: string
): Promise<unknown[]> {
	const response = await client.request<{ value: unknown[] }>(
		`/deviceManagement/configurationPolicies/${policyId}/settings`
	);
	return response.value;
}
