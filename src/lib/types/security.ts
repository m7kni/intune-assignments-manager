// SPDX-License-Identifier: AGPL-3.0-only

// ─── Endpoint Security Category Types ───────────────────────────────

export type EndpointSecurityCategory =
	| 'antivirus'
	| 'firewall'
	| 'diskEncryption'
	| 'endpointDetectionAndResponse'
	| 'attackSurfaceReduction'
	| 'accountProtection';

export interface SecurityCategoryInfo {
	category: EndpointSecurityCategory;
	templateFamily: string;
	label: string;
	description: string;
}

// ─── Policy Setting Types ──────────────────────────────────────────

export interface PolicySettingInstance {
	id: string;
	settingInstance: {
		'@odata.type': string;
		settingDefinitionId: string;
		settingInstanceTemplateReference?: {
			settingInstanceTemplateId?: string;
		};
		[key: string]: unknown;
	};
}
