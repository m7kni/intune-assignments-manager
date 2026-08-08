// SPDX-License-Identifier: AGPL-3.0-only

import type { GraphClient } from './client';
import type { ConfigurationPolicy } from '$lib/types/graph';
import type { EndpointSecurityCategory } from '$lib/types/security';
import type { PolicySettingInstance } from '$lib/types/security';
import { configurationPolicySchema } from '$lib/types/schemas';
import { SECURITY_CATEGORIES, SECURITY_TEMPLATE_FAMILIES } from '$lib/utils/security-types';

// Re-export existing functions that work for security policies too
export { getConfigPolicy, getConfigAssignments, assignConfigPolicy } from './configurations';

// ─── API Functions ──────────────────────────────────────────────────

export async function listSecurityPolicies(
	client: GraphClient,
	category?: EndpointSecurityCategory
): Promise<ConfigurationPolicy[]> {
	let filter: string;

	if (category) {
		const info = SECURITY_CATEGORIES.find((c) => c.category === category);
		if (!info) {
			return [];
		}
		filter = `templateReference/templateFamily eq '${info.templateFamily}'`;
	} else {
		filter = SECURITY_TEMPLATE_FAMILIES.map(
			(f) => `templateReference/templateFamily eq '${f}'`
		).join(' or ');
	}

	const items = await client.fetchAll<ConfigurationPolicy>(
		'/deviceManagement/configurationPolicies',
		{
			params: {
				$filter: filter,
				$select:
					'id,name,description,platforms,technologies,roleScopeTagIds,settingCount,isAssigned,templateReference'
			}
		}
	);

	return items.map((item) => configurationPolicySchema.parse(item) as ConfigurationPolicy);
}

export async function getSecurityPolicySettings(
	client: GraphClient,
	policyId: string
): Promise<PolicySettingInstance[]> {
	const response = await client.request<{ value: PolicySettingInstance[] }>(
		`/deviceManagement/configurationPolicies/${policyId}/settings`
	);
	return response.value;
}
