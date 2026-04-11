import type {
	AssignmentTarget,
	MobileAppAssignment,
	ConfigurationPolicyAssignment
} from '$lib/types/graph';
import type { GroupTarget, FilterConfig } from '$lib/types/wizard';
import type { AssignmentDiffResult, ItemDiff, DiffEntry, DiffStatus } from '$lib/types/diff';
import { getTargetKey, buildAssignmentTarget, buildExclusionTarget } from '$lib/graph/merge';

export interface DiffItemParams {
	itemId: string;
	itemName: string;
	itemType: 'app' | 'profile' | 'compliance' | 'security';
	currentAssignments: (MobileAppAssignment | ConfigurationPolicyAssignment)[];
	newGroups: GroupTarget[];
	newExclusionGroups: GroupTarget[];
	newIntent: string | null;
	newFilter: FilterConfig | null;
	groupNames: Map<string, string>;
	filterNames: Map<string, string>;
	replaceMode?: boolean;
	replaceIntents?: string[];
	replaceInclusions?: boolean;
	replaceExclusions?: boolean;
}

function resolveDisplayName(target: AssignmentTarget, groupNames: Map<string, string>): string {
	switch (target['@odata.type']) {
		case '#microsoft.graph.allDevicesAssignmentTarget':
			return 'All Devices';
		case '#microsoft.graph.allLicensedUsersAssignmentTarget':
			return 'All Users';
		case '#microsoft.graph.groupAssignmentTarget':
		case '#microsoft.graph.exclusionGroupAssignmentTarget':
			return groupNames.get(target.groupId) ?? `Unknown (${target.groupId})`;
		default:
			return 'Unknown';
	}
}

function getFilterInfo(
	target: AssignmentTarget,
	filterNames: Map<string, string>
): { name: string | null; mode: string | null } {
	if (
		'deviceAndAppManagementAssignmentFilterId' in target &&
		target.deviceAndAppManagementAssignmentFilterId
	) {
		return {
			name:
				filterNames.get(target.deviceAndAppManagementAssignmentFilterId) ??
				target.deviceAndAppManagementAssignmentFilterId,
			mode:
				'deviceAndAppManagementAssignmentFilterType' in target &&
				target.deviceAndAppManagementAssignmentFilterType !== 'none'
					? (target.deviceAndAppManagementAssignmentFilterType as string)
					: null
		};
	}
	return { name: null, mode: null };
}

export function computeItemDiff(params: DiffItemParams): ItemDiff {
	const currentMap = new Map<
		string,
		{
			intent: string | null;
			filterName: string | null;
			filterMode: string | null;
			displayName: string;
			isExclusion: boolean;
		}
	>();

	for (const assignment of params.currentAssignments) {
		const key = getTargetKey(assignment.target);
		const filterInfo = getFilterInfo(assignment.target, params.filterNames);
		const isExclusion =
			assignment.target['@odata.type'] === '#microsoft.graph.exclusionGroupAssignmentTarget';
		currentMap.set(key, {
			intent: assignment.intent,
			filterName: filterInfo.name,
			filterMode: filterInfo.mode,
			displayName: resolveDisplayName(assignment.target, params.groupNames),
			isExclusion
		});
	}

	const newMap = new Map<
		string,
		{
			intent: string | null;
			filterName: string | null;
			filterMode: string | null;
			displayName: string;
			isExclusion: boolean;
		}
	>();

	for (const group of params.newGroups) {
		const target = buildAssignmentTarget(group, params.newFilter);
		const key = getTargetKey(target);
		newMap.set(key, {
			intent: params.newIntent,
			filterName: params.newFilter?.filterName ?? null,
			filterMode: params.newFilter?.filterType ?? null,
			displayName: group.displayName,
			isExclusion: false
		});
	}

	for (const group of params.newExclusionGroups) {
		const target = buildExclusionTarget(group, params.newFilter);
		const key = getTargetKey(target);
		newMap.set(key, {
			intent: params.newIntent,
			filterName: params.newFilter?.filterName ?? null,
			filterMode: params.newFilter?.filterType ?? null,
			displayName: group.displayName,
			isExclusion: true
		});
	}

	const entries: DiffEntry[] = [];
	const allKeys = new Set([...currentMap.keys(), ...newMap.keys()]);

	for (const key of allKeys) {
		const current = currentMap.get(key);
		const next = newMap.get(key);

		if (current && !next) {
			let status: DiffStatus = 'unchanged';

			if (params.replaceMode) {
				if (params.itemType === 'app' && params.replaceIntents?.includes(current.intent ?? '')) {
					status = 'removed';
				} else if (params.itemType !== 'app') {
					if (params.replaceInclusions && !current.isExclusion) {
						status = 'removed';
					}
					if (params.replaceExclusions && current.isExclusion) {
						status = 'removed';
					}
				}
			}

			entries.push({
				status,
				targetKey: key,
				targetDisplayName: current.displayName,
				isExclusion: current.isExclusion,
				currentIntent: current.intent,
				currentFilterName: current.filterName,
				currentFilterMode: current.filterMode,
				newIntent: status === 'removed' ? null : current.intent,
				newFilterName: status === 'removed' ? null : current.filterName,
				newFilterMode: status === 'removed' ? null : current.filterMode
			});
		} else if (!current && next) {
			entries.push({
				status: 'added',
				targetKey: key,
				targetDisplayName: next.displayName,
				isExclusion: next.isExclusion,
				currentIntent: null,
				currentFilterName: null,
				currentFilterMode: null,
				newIntent: next.intent,
				newFilterName: next.filterName,
				newFilterMode: next.filterMode
			});
		} else if (current && next) {
			const intentChanged = current.intent !== next.intent;
			const filterChanged =
				current.filterName !== next.filterName || current.filterMode !== next.filterMode;

			entries.push({
				status: intentChanged || filterChanged ? 'changed' : 'unchanged',
				targetKey: key,
				targetDisplayName: current.displayName,
				isExclusion: current.isExclusion || next.isExclusion,
				currentIntent: current.intent,
				currentFilterName: current.filterName,
				currentFilterMode: current.filterMode,
				newIntent: next.intent,
				newFilterName: next.filterName,
				newFilterMode: next.filterMode
			});
		}
	}

	const order: Record<DiffStatus, number> = { added: 0, changed: 1, removed: 2, unchanged: 3 };
	entries.sort((a, b) => order[a.status] - order[b.status]);

	return {
		itemId: params.itemId,
		itemName: params.itemName,
		itemType: params.itemType,
		entries
	};
}

export function computeFullDiff(items: DiffItemParams[]): AssignmentDiffResult {
	const diffs = items.map(computeItemDiff);

	const summary = { added: 0, removed: 0, changed: 0, unchanged: 0 };
	for (const item of diffs) {
		for (const entry of item.entries) {
			summary[entry.status]++;
		}
	}

	return { items: diffs, summary };
}
