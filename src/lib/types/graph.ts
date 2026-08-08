// SPDX-License-Identifier: AGPL-3.0-only

// ─── Assignment Target Types ────────────────────────────────────────

export interface AssignmentFilterTarget {
	deviceAndAppManagementAssignmentFilterId: string | null;
	deviceAndAppManagementAssignmentFilterType: 'include' | 'exclude' | 'none';
}

export interface GroupAssignmentTarget extends AssignmentFilterTarget {
	'@odata.type': '#microsoft.graph.groupAssignmentTarget';
	groupId: string;
}

export interface AllDevicesAssignmentTarget extends AssignmentFilterTarget {
	'@odata.type': '#microsoft.graph.allDevicesAssignmentTarget';
}

export interface AllLicensedUsersAssignmentTarget extends AssignmentFilterTarget {
	'@odata.type': '#microsoft.graph.allLicensedUsersAssignmentTarget';
}

export interface ExclusionGroupAssignmentTarget extends AssignmentFilterTarget {
	'@odata.type': '#microsoft.graph.exclusionGroupAssignmentTarget';
	groupId: string;
}

export type AssignmentTarget =
	| GroupAssignmentTarget
	| AllDevicesAssignmentTarget
	| AllLicensedUsersAssignmentTarget
	| ExclusionGroupAssignmentTarget;

// ─── Mobile App Types ───────────────────────────────────────────────

export type AssignmentIntent =
	| 'required'
	| 'available'
	| 'uninstall'
	| 'availableWithoutEnrollment';

export interface MobileApp {
	id: string;
	displayName: string;
	description: string | null;
	publisher: string | null;
	'@odata.type': string;
	largeIcon: { type: string; value: string } | null;
	isAssigned: boolean;
	appAvailability: string;
}

export interface MobileAppAssignment {
	id: string;
	intent: AssignmentIntent;
	target: AssignmentTarget;
	settings: Record<string, unknown> | null;
}

// ─── Configuration Policy Types ─────────────────────────────────────

export interface ConfigurationPolicy {
	id: string;
	name: string;
	description: string | null;
	platforms: string;
	technologies: string;
	roleScopeTagIds: string[];
	settingCount: number;
	isAssigned: boolean;
	templateReference?: {
		templateFamily?: string | null;
		templateId?: string | null;
		templateDisplayName?: string | null;
		templateDisplayVersion?: string | null;
	};
}

export interface ConfigurationPolicyAssignment {
	id: string;
	intent: string | null;
	target: AssignmentTarget;
}

// ─── Group Types ────────────────────────────────────────────────────

export interface Group {
	id: string;
	displayName: string;
	description: string | null;
	groupTypes: string[];
	membershipRule: string | null;
}

// ─── Assignment Filter Types ────────────────────────────────────────

export interface AssignmentFilter {
	id: string;
	displayName: string;
	description: string | null;
	platform: string;
	rule: string;
}

// ─── Graph API Response Types ───────────────────────────────────────

export interface GraphPagedResponse<T> {
	value: T[];
	'@odata.nextLink'?: string;
	'@odata.count'?: number;
}

// ─── Batch API Types ────────────────────────────────────────────────

export interface BatchRequestItem {
	id: string;
	method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
	url: string;
	body?: unknown;
	headers?: Record<string, string>;
}

export interface BatchResponseItem {
	id: string;
	status: number;
	body: unknown;
	headers?: Record<string, string>;
}

export interface BatchRequest {
	requests: BatchRequestItem[];
}

export interface BatchResponse {
	responses: BatchResponseItem[];
}

// ─── Audit Event Types ──────────────────────────────────────────────

export interface AuditActor {
	type: string;
	userPermissions: string[];
	applicationId: string | null;
	applicationDisplayName: string | null;
	userPrincipalName: string | null;
	servicePrincipalName: string | null;
	ipAddress: string | null;
	userId: string | null;
	remoteTenantId: string | null;
	remoteUserId: string | null;
}

export interface AuditResource {
	displayName: string | null;
	type: string | null;
	resourceId: string | null;
	auditResourceType: string | null;
	modifiedProperties: AuditProperty[];
}

export interface AuditProperty {
	displayName: string;
	oldValue: string | null;
	newValue: string | null;
}

export interface AuditEvent {
	id: string;
	displayName: string | null;
	componentName: string | null;
	activity: string | null;
	activityDateTime: string;
	activityType: string;
	activityOperationType: string;
	activityResult: string;
	correlationId: string;
	actor: AuditActor;
	resources: AuditResource[];
	category: string;
}
