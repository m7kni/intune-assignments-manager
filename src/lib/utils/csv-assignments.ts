import type { AssignmentTarget } from '$lib/types/graph';
import type { CsvParseResult } from './csv';
import type { GraphClient } from '$lib/graph/client';
import { listApps } from '$lib/graph/apps';
import { listConfigPolicies } from '$lib/graph/configurations';
import { searchGroups } from '$lib/graph/groups';
import { ensureFiltersLoaded } from '$lib/stores/filter-cache';
import { serializeCsv } from './csv';

// ─── Constants ──────────────────────────────────────────────────────

export const CSV_HEADERS = [
	'ItemType',
	'ItemName',
	'ItemId',
	'TargetType',
	'GroupName',
	'GroupId',
	'Intent',
	'FilterName',
	'FilterId',
	'FilterMode'
] as const;

// ─── Export Types ───────────────────────────────────────────────────

export interface ExportableAssignment {
	itemType: 'app' | 'profile' | 'compliance' | 'security' | 'script';
	itemName: string;
	itemId: string;
	target: AssignmentTarget;
	intent: string | null;
}

// ─── Target Resolution ──────────────────────────────────────────────

export function resolveTargetType(target: AssignmentTarget): string {
	switch (target['@odata.type']) {
		case '#microsoft.graph.groupAssignmentTarget':
			return 'group';
		case '#microsoft.graph.exclusionGroupAssignmentTarget':
			return 'exclusion';
		case '#microsoft.graph.allDevicesAssignmentTarget':
			return 'allDevices';
		case '#microsoft.graph.allLicensedUsersAssignmentTarget':
			return 'allUsers';
		default:
			return 'unknown';
	}
}

export function resolveTargetGroupName(
	target: AssignmentTarget,
	groupNames: Map<string, string>
): string {
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

function resolveTargetGroupId(target: AssignmentTarget): string {
	if ('groupId' in target && target.groupId) {
		return target.groupId;
	}
	return '';
}

function resolveFilterName(target: AssignmentTarget, filterNames: Map<string, string>): string {
	if (
		'deviceAndAppManagementAssignmentFilterId' in target &&
		target.deviceAndAppManagementAssignmentFilterId
	) {
		return (
			filterNames.get(target.deviceAndAppManagementAssignmentFilterId) ??
			target.deviceAndAppManagementAssignmentFilterId
		);
	}
	return '';
}

function resolveFilterId(target: AssignmentTarget): string {
	if (
		'deviceAndAppManagementAssignmentFilterId' in target &&
		target.deviceAndAppManagementAssignmentFilterId
	) {
		return target.deviceAndAppManagementAssignmentFilterId;
	}
	return '';
}

function resolveFilterMode(target: AssignmentTarget): string {
	if (
		'deviceAndAppManagementAssignmentFilterType' in target &&
		target.deviceAndAppManagementAssignmentFilterType &&
		target.deviceAndAppManagementAssignmentFilterType !== 'none'
	) {
		return target.deviceAndAppManagementAssignmentFilterType;
	}
	return '';
}

// ─── Export Functions ────────────────────────────────────────────────

function buildExportRow(
	assignment: ExportableAssignment,
	groupNames: Map<string, string>,
	filterNames: Map<string, string>
): string[] {
	return [
		assignment.itemType,
		assignment.itemName,
		assignment.itemId,
		resolveTargetType(assignment.target),
		resolveTargetGroupName(assignment.target, groupNames),
		resolveTargetGroupId(assignment.target),
		assignment.intent ?? 'applicable',
		resolveFilterName(assignment.target, filterNames),
		resolveFilterId(assignment.target),
		resolveFilterMode(assignment.target)
	];
}

export function exportAssignmentsCsv(
	assignments: ExportableAssignment[],
	groupNames: Map<string, string>,
	filterNames: Map<string, string>
): string {
	const rows = assignments.map((a) => buildExportRow(a, groupNames, filterNames));
	return serializeCsv([...CSV_HEADERS], rows);
}

// ─── Import Types ───────────────────────────────────────────────────

export interface CsvAssignmentRow {
	itemType: 'app' | 'profile' | 'compliance' | 'security' | 'script';
	itemName: string;
	itemId: string;
	targetType: 'group' | 'exclusion' | 'allDevices' | 'allUsers';
	groupName: string;
	groupId: string;
	intent: string;
	filterName: string;
	filterId: string;
	filterMode: string;
}

export interface ImportRowError {
	rowIndex: number;
	field: string;
	value: string;
	message: string;
}

export interface ValidatedImportRow extends CsvAssignmentRow {
	resolvedItemId: string;
	resolvedGroupId: string;
	resolvedFilterId: string | null;
}

export interface ImportValidationResult {
	valid: ValidatedImportRow[];
	errors: ImportRowError[];
}

// ─── Import Parsing ─────────────────────────────────────────────────

const VALID_ITEM_TYPES = new Set(['app', 'profile', 'compliance', 'security', 'script']);
const VALID_TARGET_TYPES = new Set(['group', 'exclusion', 'allDevices', 'allUsers']);

export function parseAssignmentRows(parsed: CsvParseResult): {
	rows: CsvAssignmentRow[];
	errors: ImportRowError[];
} {
	const rows: CsvAssignmentRow[] = [];
	const errors: ImportRowError[] = [];

	const requiredHeaders = ['ItemType', 'ItemName', 'TargetType'];
	for (const header of requiredHeaders) {
		if (!parsed.headers.includes(header)) {
			errors.push({
				rowIndex: 0,
				field: header,
				value: '',
				message: `Missing required header: ${header}`
			});
		}
	}
	if (errors.length > 0) return { rows, errors };

	for (let i = 0; i < parsed.rows.length; i++) {
		const raw = parsed.rows[i];
		const rowIndex = i + 2; // 1-based + header row

		const itemType = (raw['ItemType'] ?? '').toLowerCase();
		if (!VALID_ITEM_TYPES.has(itemType)) {
			errors.push({
				rowIndex,
				field: 'ItemType',
				value: raw['ItemType'] ?? '',
				message: `ItemType must be "app", "profile", "compliance", "security", or "script"`
			});
			continue;
		}

		const targetType = (raw['TargetType'] ?? '').toLowerCase();
		if (!VALID_TARGET_TYPES.has(targetType)) {
			errors.push({
				rowIndex,
				field: 'TargetType',
				value: raw['TargetType'] ?? '',
				message: `TargetType must be one of: group, exclusion, allDevices, allUsers`
			});
			continue;
		}

		if (
			(targetType === 'group' || targetType === 'exclusion') &&
			!raw['GroupId'] &&
			!raw['GroupName']
		) {
			errors.push({
				rowIndex,
				field: 'GroupId',
				value: '',
				message: `Group or exclusion targets require GroupId or GroupName`
			});
			continue;
		}

		rows.push({
			itemType: itemType as CsvAssignmentRow['itemType'],
			itemName: raw['ItemName'] ?? '',
			itemId: raw['ItemId'] ?? '',
			targetType: targetType as CsvAssignmentRow['targetType'],
			groupName: raw['GroupName'] ?? '',
			groupId: raw['GroupId'] ?? '',
			intent: raw['Intent'] ?? 'required',
			filterName: raw['FilterName'] ?? '',
			filterId: raw['FilterId'] ?? '',
			filterMode: raw['FilterMode'] ?? ''
		});
	}

	return { rows, errors };
}

// ─── Import Validation ──────────────────────────────────────────────

export async function validateImportRows(
	client: GraphClient,
	rows: CsvAssignmentRow[]
): Promise<ImportValidationResult> {
	const valid: ValidatedImportRow[] = [];
	const errors: ImportRowError[] = [];

	// Phase 1: Resolve item names to IDs
	const unresolvedApps = rows.filter((r) => r.itemType === 'app' && !r.itemId);
	const unresolvedProfiles = rows.filter((r) => r.itemType === 'profile' && !r.itemId);

	const appNameMap = new Map<string, string>();
	const profileNameMap = new Map<string, string>();

	if (unresolvedApps.length > 0) {
		const apps = await listApps(client);
		for (const app of apps) {
			appNameMap.set(app.displayName.toLowerCase(), app.id);
		}
	}

	if (unresolvedProfiles.length > 0) {
		const profiles = await listConfigPolicies(client);
		for (const profile of profiles) {
			profileNameMap.set(profile.name.toLowerCase(), profile.id);
		}
	}

	// Phase 2: Resolve group names to IDs
	const groupNamesToResolve = new Set(
		rows
			.filter(
				(r) =>
					(r.targetType === 'group' || r.targetType === 'exclusion') && !r.groupId && r.groupName
			)
			.map((r) => r.groupName)
	);

	const groupNameMap = new Map<string, string>();
	for (const name of groupNamesToResolve) {
		const results = await searchGroups(client, name);
		const exact = results.find((g) => g.displayName.toLowerCase() === name.toLowerCase());
		if (exact) {
			groupNameMap.set(name.toLowerCase(), exact.id);
		}
	}

	// Phase 3: Resolve filters
	const hasFilters = rows.some((r) => r.filterName || r.filterId);
	let filterNameMap: Map<string, string> | null = null;
	let filterIdSet: Set<string> | null = null;

	if (hasFilters) {
		const filters = await ensureFiltersLoaded(client);
		filterNameMap = new Map(filters.map((f) => [f.displayName.toLowerCase(), f.id]));
		filterIdSet = new Set(filters.map((f) => f.id));
	}

	// Validate each row
	for (let i = 0; i < rows.length; i++) {
		const row = rows[i];
		const rowIndex = i + 2;

		// Resolve item ID
		let resolvedItemId = row.itemId;
		if (!resolvedItemId) {
			if (row.itemType === 'app') {
				resolvedItemId = appNameMap.get(row.itemName.toLowerCase()) ?? '';
			} else {
				resolvedItemId = profileNameMap.get(row.itemName.toLowerCase()) ?? '';
			}
			if (!resolvedItemId) {
				errors.push({
					rowIndex,
					field: 'ItemName',
					value: row.itemName,
					message: `Could not resolve ${row.itemType} "${row.itemName}" to an ID`
				});
				continue;
			}
		}

		// Resolve group ID
		let resolvedGroupId = '';
		if (row.targetType === 'group' || row.targetType === 'exclusion') {
			resolvedGroupId = row.groupId;
			if (!resolvedGroupId && row.groupName) {
				resolvedGroupId = groupNameMap.get(row.groupName.toLowerCase()) ?? '';
				if (!resolvedGroupId) {
					errors.push({
						rowIndex,
						field: 'GroupName',
						value: row.groupName,
						message: `Could not resolve group "${row.groupName}" to an ID`
					});
					continue;
				}
			}
		}

		// Resolve filter ID
		let resolvedFilterId: string | null = null;
		if (row.filterId) {
			if (filterIdSet && !filterIdSet.has(row.filterId)) {
				errors.push({
					rowIndex,
					field: 'FilterId',
					value: row.filterId,
					message: `Filter ID "${row.filterId}" not found`
				});
				continue;
			}
			resolvedFilterId = row.filterId;
		} else if (row.filterName) {
			resolvedFilterId = filterNameMap?.get(row.filterName.toLowerCase()) ?? null;
			if (!resolvedFilterId) {
				errors.push({
					rowIndex,
					field: 'FilterName',
					value: row.filterName,
					message: `Could not resolve filter "${row.filterName}" to an ID`
				});
				continue;
			}
		}

		valid.push({
			...row,
			resolvedItemId,
			resolvedGroupId,
			resolvedFilterId
		});
	}

	return { valid, errors };
}
