import type {
	AssignmentIntent,
	AssignmentTarget,
	AllDevicesAssignmentTarget,
	AllLicensedUsersAssignmentTarget,
	ConfigurationPolicyAssignment,
	ExclusionGroupAssignmentTarget,
	GroupAssignmentTarget,
	MobileAppAssignment
} from '$lib/types/graph';
import type { ConflictChoice, FilterConfig, GroupTarget } from '$lib/types/wizard';
import type { DeviceCompliancePolicyAssignment } from '$lib/types/compliance';

// ─── Merge Parameter Types ─────────────────────────────────────────

export interface MergeAppParams {
	current: MobileAppAssignment[];
	groups: GroupTarget[];
	exclusionGroups: GroupTarget[];
	intent: AssignmentIntent;
	filter: FilterConfig | null;
	conflicts: ConflictChoice[];
	itemId: string;
	replaceMode?: boolean;
	replaceIntents?: AssignmentIntent[];
}

export interface MergeProfileParams {
	current: ConfigurationPolicyAssignment[];
	groups: GroupTarget[];
	exclusionGroups: GroupTarget[];
	filter: FilterConfig | null;
	conflicts: ConflictChoice[];
	itemId: string;
	replaceMode?: boolean;
	replaceInclusions?: boolean;
	replaceExclusions?: boolean;
}

export interface MergeComplianceParams {
	current: DeviceCompliancePolicyAssignment[];
	groups: GroupTarget[];
	exclusionGroups: GroupTarget[];
	filter: FilterConfig | null;
	conflicts: ConflictChoice[];
	itemId: string;
	replaceMode?: boolean;
	replaceInclusions?: boolean;
	replaceExclusions?: boolean;
}

// ─── Target Key ────────────────────────────────────────────────────

export function getTargetKey(target: AssignmentTarget): string {
	switch (target['@odata.type']) {
		case '#microsoft.graph.groupAssignmentTarget':
			return `group::${target.groupId}`;
		case '#microsoft.graph.exclusionGroupAssignmentTarget':
			return `exclusion::${target.groupId}`;
		case '#microsoft.graph.allDevicesAssignmentTarget':
			return 'allDevices';
		case '#microsoft.graph.allLicensedUsersAssignmentTarget':
			return 'allUsers';
	}
}

// ─── Target Builders ───────────────────────────────────────────────

function buildFilterFields(filter: FilterConfig | null) {
	if (filter) {
		return {
			deviceAndAppManagementAssignmentFilterId: filter.filterId,
			deviceAndAppManagementAssignmentFilterType: filter.filterType as 'include' | 'exclude'
		};
	}
	return {
		deviceAndAppManagementAssignmentFilterId: null,
		deviceAndAppManagementAssignmentFilterType: 'none' as const
	};
}

export function buildAssignmentTarget(
	group: GroupTarget,
	filter: FilterConfig | null
): AssignmentTarget {
	const filterFields = buildFilterFields(filter);

	switch (group.type) {
		case 'group':
			return {
				'@odata.type': '#microsoft.graph.groupAssignmentTarget',
				groupId: group.groupId!,
				...filterFields
			} satisfies GroupAssignmentTarget;
		case 'allDevices':
			return {
				'@odata.type': '#microsoft.graph.allDevicesAssignmentTarget',
				...filterFields
			} satisfies AllDevicesAssignmentTarget;
		case 'allUsers':
			return {
				'@odata.type': '#microsoft.graph.allLicensedUsersAssignmentTarget',
				...filterFields
			} satisfies AllLicensedUsersAssignmentTarget;
	}
}

export function buildExclusionTarget(
	group: GroupTarget,
	filter: FilterConfig | null
): ExclusionGroupAssignmentTarget {
	const filterFields = buildFilterFields(filter);
	return {
		'@odata.type': '#microsoft.graph.exclusionGroupAssignmentTarget',
		groupId: group.groupId!,
		...filterFields
	};
}

// ─── Conflict Lookup ───────────────────────────────────────────────

function findConflictResolution(
	conflicts: ConflictChoice[],
	itemId: string,
	targetKey: string
): 'update' | 'skip' | null {
	const match = conflicts.find((c) => c.itemId === itemId && c.targetKey === targetKey);
	return match?.resolution ?? null;
}

// ─── App Assignment Merge ──────────────────────────────────────────

export function mergeAppAssignments(params: MergeAppParams): MobileAppAssignment[] {
	const { current, groups, exclusionGroups, intent, filter, conflicts, itemId } = params;

	const existingByKey = new Map<string, MobileAppAssignment>();
	for (const assignment of current) {
		existingByKey.set(getTargetKey(assignment.target), assignment);
	}

	// Process inclusion groups
	for (const group of groups) {
		const target = buildAssignmentTarget(group, filter);
		const key = getTargetKey(target);
		const existing = existingByKey.get(key);

		if (existing) {
			const resolution = findConflictResolution(conflicts, itemId, key);
			if (resolution === 'skip') {
				continue;
			}
		}
		existingByKey.set(key, {
			id: '',
			intent,
			target,
			settings: null
		});
	}

	// Process exclusion groups
	for (const group of exclusionGroups) {
		const target = buildExclusionTarget(group, filter);
		const key = getTargetKey(target);
		const existing = existingByKey.get(key);

		if (existing) {
			const resolution = findConflictResolution(conflicts, itemId, key);
			if (resolution === 'skip') {
				continue;
			}
		}
		existingByKey.set(key, {
			id: '',
			intent,
			target,
			settings: null
		});
	}

	// ─── Replace mode: remove assignments in replaced intent categories ──
	if (params.replaceMode && params.replaceIntents && params.replaceIntents.length > 0) {
		const newTargetKeys = new Set<string>();
		for (const group of groups) {
			newTargetKeys.add(getTargetKey(buildAssignmentTarget(group, filter)));
		}
		for (const group of exclusionGroups) {
			newTargetKeys.add(getTargetKey(buildExclusionTarget(group, filter)));
		}

		for (const [key, assignment] of existingByKey) {
			if (params.replaceIntents.includes(assignment.intent) && !newTargetKeys.has(key)) {
				existingByKey.delete(key);
			}
		}
	}

	return Array.from(existingByKey.values());
}

// ─── Profile Assignment Merge ──────────────────────────────────────

export function mergeProfileAssignments(
	params: MergeProfileParams
): ConfigurationPolicyAssignment[] {
	const { current, groups, exclusionGroups, filter, conflicts, itemId } = params;

	const existingByKey = new Map<string, ConfigurationPolicyAssignment>();
	for (const assignment of current) {
		existingByKey.set(getTargetKey(assignment.target), assignment);
	}

	// Process inclusion groups
	for (const group of groups) {
		const target = buildAssignmentTarget(group, filter);
		const key = getTargetKey(target);
		const existing = existingByKey.get(key);

		if (existing) {
			const resolution = findConflictResolution(conflicts, itemId, key);
			if (resolution === 'skip') {
				continue;
			}
		}
		existingByKey.set(key, {
			id: '',
			intent: null,
			target
		});
	}

	// Process exclusion groups
	for (const group of exclusionGroups) {
		const target = buildExclusionTarget(group, filter);
		const key = getTargetKey(target);
		const existing = existingByKey.get(key);

		if (existing) {
			const resolution = findConflictResolution(conflicts, itemId, key);
			if (resolution === 'skip') {
				continue;
			}
		}
		existingByKey.set(key, {
			id: '',
			intent: null,
			target
		});
	}

	// ─── Replace mode: remove assignments in replaced categories ──
	if (params.replaceMode) {
		const newInclusionKeys = new Set<string>();
		const newExclusionKeys = new Set<string>();
		for (const group of groups) {
			newInclusionKeys.add(getTargetKey(buildAssignmentTarget(group, filter)));
		}
		for (const group of exclusionGroups) {
			newExclusionKeys.add(getTargetKey(buildExclusionTarget(group, filter)));
		}

		for (const [key, assignment] of existingByKey) {
			const isExclusion =
				assignment.target['@odata.type'] === '#microsoft.graph.exclusionGroupAssignmentTarget';
			if (params.replaceInclusions && !isExclusion && !newInclusionKeys.has(key)) {
				existingByKey.delete(key);
			}
			if (params.replaceExclusions && isExclusion && !newExclusionKeys.has(key)) {
				existingByKey.delete(key);
			}
		}
	}

	return Array.from(existingByKey.values());
}

// ─── Compliance Policy Assignment Merge ─────────────────────────────

export function mergeCompliancePolicyAssignments(
	params: MergeComplianceParams
): DeviceCompliancePolicyAssignment[] {
	const { current, groups, exclusionGroups, filter, conflicts, itemId } = params;

	const existingByKey = new Map<string, DeviceCompliancePolicyAssignment>();
	for (const assignment of current) {
		existingByKey.set(getTargetKey(assignment.target), assignment);
	}

	// Process inclusion groups
	for (const group of groups) {
		const target = buildAssignmentTarget(group, filter);
		const key = getTargetKey(target);
		const existing = existingByKey.get(key);

		if (existing) {
			const resolution = findConflictResolution(conflicts, itemId, key);
			if (resolution === 'skip') {
				continue;
			}
		}
		existingByKey.set(key, {
			id: '',
			target
		});
	}

	// Process exclusion groups
	for (const group of exclusionGroups) {
		const target = buildExclusionTarget(group, filter);
		const key = getTargetKey(target);
		const existing = existingByKey.get(key);

		if (existing) {
			const resolution = findConflictResolution(conflicts, itemId, key);
			if (resolution === 'skip') {
				continue;
			}
		}
		existingByKey.set(key, {
			id: '',
			target
		});
	}

	// ─── Replace mode: remove assignments in replaced categories ──
	if (params.replaceMode) {
		const newInclusionKeys = new Set<string>();
		const newExclusionKeys = new Set<string>();
		for (const group of groups) {
			newInclusionKeys.add(getTargetKey(buildAssignmentTarget(group, filter)));
		}
		for (const group of exclusionGroups) {
			newExclusionKeys.add(getTargetKey(buildExclusionTarget(group, filter)));
		}

		for (const [key, assignment] of existingByKey) {
			const isExclusion =
				assignment.target['@odata.type'] === '#microsoft.graph.exclusionGroupAssignmentTarget';
			if (params.replaceInclusions && !isExclusion && !newInclusionKeys.has(key)) {
				existingByKey.delete(key);
			}
			if (params.replaceExclusions && isExclusion && !newExclusionKeys.has(key)) {
				existingByKey.delete(key);
			}
		}
	}

	return Array.from(existingByKey.values());
}
