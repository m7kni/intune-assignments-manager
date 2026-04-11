import type {
	SettingDiff,
	AssignmentDiff,
	ComparisonSummary,
	ComparisonStatus
} from '$lib/types/compare';

// ─── Helpers ──────────────────────────────────────────────────────────

/**
 * Flatten nested Graph API setting objects into key-value pairs for comparison.
 * Handles Settings Catalog format with nested settingInstance structures.
 */
export function flattenSettingValue(
	setting: unknown,
	prefix = ''
): Record<string, unknown> {
	const result: Record<string, unknown> = {};

	if (setting === null || setting === undefined) {
		result[prefix || 'value'] = setting;
		return result;
	}

	if (typeof setting !== 'object' || Array.isArray(setting)) {
		result[prefix || 'value'] = setting;
		return result;
	}

	const obj = setting as Record<string, unknown>;
	for (const [key, value] of Object.entries(obj)) {
		// Skip OData metadata and IDs that aren't meaningful for comparison
		if (key === 'id' || key === 'settingInstanceTemplateReference') continue;

		const fullKey = prefix ? `${prefix}.${key}` : key;

		if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
			const nested = flattenSettingValue(value, fullKey);
			Object.assign(result, nested);
		} else if (Array.isArray(value)) {
			if (value.length === 0) {
				result[fullKey] = '[]';
			} else {
				for (let i = 0; i < value.length; i++) {
					const nested = flattenSettingValue(value[i], `${fullKey}[${i}]`);
					Object.assign(result, nested);
				}
			}
		} else {
			result[fullKey] = value;
		}
	}

	return result;
}

/**
 * Deep equality check for two values, handling objects and arrays.
 */
function deepEqual(a: unknown, b: unknown): boolean {
	if (a === b) return true;
	if (a === null || b === null) return false;
	if (a === undefined || b === undefined) return false;
	if (typeof a !== typeof b) return false;

	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length !== b.length) return false;
		return a.every((val, i) => deepEqual(val, b[i]));
	}

	if (typeof a === 'object' && typeof b === 'object') {
		const aObj = a as Record<string, unknown>;
		const bObj = b as Record<string, unknown>;
		const aKeys = Object.keys(aObj).sort();
		const bKeys = Object.keys(bObj).sort();
		if (aKeys.length !== bKeys.length) return false;
		return aKeys.every((key, i) => key === bKeys[i] && deepEqual(aObj[key], bObj[key]));
	}

	return false;
}

/**
 * Extract a human-readable setting name from a Graph API setting object.
 */
function extractSettingName(setting: unknown): string {
	if (setting === null || setting === undefined || typeof setting !== 'object') {
		return 'Unknown Setting';
	}

	const obj = setting as Record<string, unknown>;

	// Settings Catalog format
	if (obj.settingInstance && typeof obj.settingInstance === 'object') {
		const inst = obj.settingInstance as Record<string, unknown>;
		const defId = inst.settingDefinitionId;
		if (typeof defId === 'string') {
			// Extract readable name from definition ID
			// e.g., "device_vendor_msft_policy_config_defender_allowrealtimemonitoring"
			const parts = defId.split('_');
			return parts.length > 1 ? parts.slice(-1)[0] : defId;
		}
	}

	// Compliance policy format — direct properties
	if (typeof obj.displayName === 'string') return obj.displayName;

	// Fallback to settingDefinitionId at top level
	if (typeof obj.settingDefinitionId === 'string') return obj.settingDefinitionId;

	return 'Unknown Setting';
}

/**
 * Extract the setting definition ID for matching purposes.
 */
function extractSettingDefinitionId(setting: unknown): string | undefined {
	if (setting === null || setting === undefined || typeof setting !== 'object') {
		return undefined;
	}

	const obj = setting as Record<string, unknown>;

	if (obj.settingInstance && typeof obj.settingInstance === 'object') {
		const inst = obj.settingInstance as Record<string, unknown>;
		if (typeof inst.settingDefinitionId === 'string') {
			return inst.settingDefinitionId;
		}
	}

	if (typeof obj.settingDefinitionId === 'string') {
		return obj.settingDefinitionId;
	}

	return undefined;
}

// ─── Settings Comparison ──────────────────────────────────────────────

/**
 * Compare policy settings from two policies side by side.
 * Matches settings by settingDefinitionId or name, then deep-compares values.
 */
export function comparePolicySettings(
	leftSettings: unknown[],
	rightSettings: unknown[]
): SettingDiff[] {
	const diffs: SettingDiff[] = [];

	// Build maps keyed by definition ID for matching
	const leftMap = new Map<string, { setting: unknown; index: number }>();
	const rightMap = new Map<string, { setting: unknown; index: number }>();

	for (let i = 0; i < leftSettings.length; i++) {
		const defId = extractSettingDefinitionId(leftSettings[i]);
		const key = defId ?? `__index_${i}`;
		leftMap.set(key, { setting: leftSettings[i], index: i });
	}

	for (let i = 0; i < rightSettings.length; i++) {
		const defId = extractSettingDefinitionId(rightSettings[i]);
		const key = defId ?? `__index_${i}`;
		rightMap.set(key, { setting: rightSettings[i], index: i });
	}

	const allKeys = new Set([...leftMap.keys(), ...rightMap.keys()]);

	for (const key of allKeys) {
		const left = leftMap.get(key);
		const right = rightMap.get(key);

		const leftFlat = left ? flattenSettingValue(left.setting) : null;
		const rightFlat = right ? flattenSettingValue(right.setting) : null;

		const settingName = extractSettingName(left?.setting ?? right?.setting);
		const defId = key.startsWith('__index_') ? undefined : key;

		let status: ComparisonStatus;
		if (left && right) {
			status = deepEqual(leftFlat, rightFlat) ? 'identical' : 'changed';
		} else if (left && !right) {
			status = 'removed';
		} else {
			status = 'added';
		}

		diffs.push({
			settingName,
			settingDefinitionId: defId,
			leftValue: leftFlat,
			rightValue: rightFlat,
			status
		});
	}

	// Sort: changed first, then added, removed, identical
	const order: Record<ComparisonStatus, number> = {
		changed: 0,
		added: 1,
		removed: 2,
		identical: 3
	};
	diffs.sort((a, b) => order[a.status] - order[b.status]);

	return diffs;
}

// ─── Assignment Comparison ────────────────────────────────────────────

/**
 * Build a unique key for an assignment target.
 */
function getAssignmentKey(assignment: Record<string, unknown>): string {
	const target = assignment.target as Record<string, unknown> | undefined;
	if (!target) return JSON.stringify(assignment);

	const odataType = (target['@odata.type'] as string) ?? '';

	if (
		odataType === '#microsoft.graph.groupAssignmentTarget' ||
		odataType === '#microsoft.graph.exclusionGroupAssignmentTarget'
	) {
		return `${odataType}:${target.groupId as string}`;
	}

	return odataType;
}

/**
 * Get a human-readable display name for an assignment target.
 */
function getTargetDisplayName(assignment: Record<string, unknown>): string {
	const target = assignment.target as Record<string, unknown> | undefined;
	if (!target) return 'Unknown Target';

	const odataType = (target['@odata.type'] as string) ?? '';

	switch (odataType) {
		case '#microsoft.graph.allDevicesAssignmentTarget':
			return 'All Devices';
		case '#microsoft.graph.allLicensedUsersAssignmentTarget':
			return 'All Users';
		case '#microsoft.graph.groupAssignmentTarget':
			return `Group: ${(target.groupId as string) ?? 'Unknown'}`;
		case '#microsoft.graph.exclusionGroupAssignmentTarget':
			return `Exclude Group: ${(target.groupId as string) ?? 'Unknown'}`;
		default:
			return odataType || 'Unknown Target';
	}
}

/**
 * Compare assignments from two policies.
 * Matches by target type + groupId, classifies each as identical/changed/added/removed.
 */
export function comparePolicyAssignments(
	leftAssignments: Record<string, unknown>[],
	rightAssignments: Record<string, unknown>[]
): AssignmentDiff[] {
	const diffs: AssignmentDiff[] = [];

	const leftMap = new Map<string, Record<string, unknown>>();
	const rightMap = new Map<string, Record<string, unknown>>();

	for (const a of leftAssignments) {
		leftMap.set(getAssignmentKey(a), a);
	}
	for (const a of rightAssignments) {
		rightMap.set(getAssignmentKey(a), a);
	}

	const allKeys = new Set([...leftMap.keys(), ...rightMap.keys()]);

	for (const key of allKeys) {
		const left = leftMap.get(key) ?? null;
		const right = rightMap.get(key) ?? null;

		const displayName = getTargetDisplayName(left ?? right ?? {});

		let status: ComparisonStatus;
		if (left && right) {
			// Compare intent and filter settings (exclude 'id' which differs)
			const leftCompare = { ...left };
			const rightCompare = { ...right };
			delete leftCompare.id;
			delete rightCompare.id;
			status = deepEqual(leftCompare, rightCompare) ? 'identical' : 'changed';
		} else if (left && !right) {
			status = 'removed';
		} else {
			status = 'added';
		}

		diffs.push({
			targetDisplayName: displayName,
			leftAssignment: left,
			rightAssignment: right,
			status
		});
	}

	const order: Record<ComparisonStatus, number> = {
		changed: 0,
		added: 1,
		removed: 2,
		identical: 3
	};
	diffs.sort((a, b) => order[a.status] - order[b.status]);

	return diffs;
}

// ─── Summary ──────────────────────────────────────────────────────────

/**
 * Generate a summary of comparison results by counting each status.
 */
export function generateComparisonSummary(
	settingDiffs: SettingDiff[],
	assignmentDiffs: AssignmentDiff[]
): ComparisonSummary {
	const summary: ComparisonSummary = { identical: 0, changed: 0, added: 0, removed: 0 };

	for (const diff of settingDiffs) {
		summary[diff.status]++;
	}
	for (const diff of assignmentDiffs) {
		summary[diff.status]++;
	}

	return summary;
}
