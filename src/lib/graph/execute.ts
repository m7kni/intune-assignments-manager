import type { GraphClient } from '$lib/graph/client';
import type {
	AssignmentIntent,
	BatchRequestItem,
	ConfigurationPolicyAssignment,
	GraphPagedResponse,
	MobileAppAssignment
} from '$lib/types/graph';
import type { DeviceCompliancePolicyAssignment } from '$lib/types/compliance';
import type {
	AssignableItem,
	AssignmentResult,
	ConflictChoice,
	FilterConfig,
	GroupTarget,
	ProgressCallback,
	ReplaceConfig
} from '$lib/types/wizard';
import {
	mergeAppAssignments,
	mergeProfileAssignments,
	mergeCompliancePolicyAssignments
} from '$lib/graph/merge';
import { getAppAssignments } from '$lib/graph/apps';
import { getConfigAssignments } from '$lib/graph/configurations';
import { getCompliancePolicyAssignments } from '$lib/graph/compliance';

// ─── Constants ─────────────────────────────────────────────────────

const MAX_APPLY_RETRIES = 2;
const RETRY_BACKOFF_MS = 2000;

// ─── Types ─────────────────────────────────────────────────────────

export interface BulkAssignmentParams {
	client: GraphClient;
	items: AssignableItem[];
	groups: GroupTarget[];
	exclusionGroups: GroupTarget[];
	intent: AssignmentIntent;
	filter: FilterConfig | null;
	conflicts: ConflictChoice[];
	onProgress?: ProgressCallback;
	replaceMode: boolean;
	replaceConfig: ReplaceConfig;
}

export interface BulkAssignmentResult {
	results: AssignmentResult[];
	totalSuccess: number;
	totalError: number;
}

interface FetchedItem {
	item: AssignableItem;
	assignments:
		| MobileAppAssignment[]
		| ConfigurationPolicyAssignment[]
		| DeviceCompliancePolicyAssignment[];
}

interface ErrorBody {
	error?: {
		code?: string;
		message?: string;
	};
}

// ─── Helpers ───────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractErrorMessage(body: unknown): string {
	const parsed = body as ErrorBody;
	return parsed?.error?.message ?? 'Unknown error';
}

function getAssignmentUrl(item: AssignableItem): string {
	if (item.kind === 'app') {
		return `/deviceAppManagement/mobileApps/${item.id}/assignments`;
	}
	if (item.kind === 'compliance') {
		return `/deviceManagement/deviceCompliancePolicies/${item.id}/assignments`;
	}
	if (item.kind === 'security') {
		return `/deviceManagement/configurationPolicies/${item.id}/assignments`;
	}
	return `/deviceManagement/configurationPolicies/${item.id}/assignments`;
}

function getAssignUrl(item: AssignableItem): string {
	if (item.kind === 'app') {
		return `/deviceAppManagement/mobileApps/${item.id}/assign`;
	}
	if (item.kind === 'compliance') {
		return `/deviceManagement/deviceCompliancePolicies/${item.id}/assign`;
	}
	if (item.kind === 'security') {
		return `/deviceManagement/configurationPolicies/${item.id}/assign`;
	}
	return `/deviceManagement/configurationPolicies/${item.id}/assign`;
}

// ─── Phase A: Batch Fetch ──────────────────────────────────────────

async function fetchCurrentAssignments(
	client: GraphClient,
	items: AssignableItem[],
	onProgress?: ProgressCallback
): Promise<{ fetched: FetchedItem[]; errors: AssignmentResult[] }> {
	const fetched: FetchedItem[] = [];
	const errors: AssignmentResult[] = [];

	// Build batch GET requests
	const batchRequests: BatchRequestItem[] = items.map((item) => ({
		id: item.id,
		method: 'GET' as const,
		url: getAssignmentUrl(item)
	}));

	onProgress?.({
		phase: 'fetching',
		completed: 0,
		total: items.length
	});

	const responses = await client.batch(batchRequests);

	// Index items by id for lookup
	const itemById = new Map<string, AssignableItem>();
	for (const item of items) {
		itemById.set(item.id, item);
	}

	let completed = 0;

	for (const response of responses) {
		const item = itemById.get(response.id);
		if (!item) continue;

		completed++;

		if (response.status < 200 || response.status >= 300) {
			// Fetch failed — record error and never attempt POST
			errors.push({
				itemId: item.id,
				itemName: item.displayName,
				itemKind: item.kind,
				status: 'error',
				error: `Fetch failed (${response.status}): ${extractErrorMessage(response.body)}`
			});
			onProgress?.({
				phase: 'fetching',
				completed,
				total: items.length,
				currentItem: item.displayName
			});
			continue;
		}

		// Parse response body
		const body = response.body as GraphPagedResponse<
			MobileAppAssignment | ConfigurationPolicyAssignment
		>;

		// If paginated, fall back to individual fetch
		if (body['@odata.nextLink']) {
			try {
				let fullAssignments;
				if (item.kind === 'app') {
					fullAssignments = await getAppAssignments(client, item.id);
				} else if (item.kind === 'compliance') {
					fullAssignments = await getCompliancePolicyAssignments(client, item.id);
				} else if (item.kind === 'security') {
					fullAssignments = await getConfigAssignments(client, item.id);
				} else {
					fullAssignments = await getConfigAssignments(client, item.id);
				}
				fetched.push({ item, assignments: fullAssignments });
			} catch (err) {
				errors.push({
					itemId: item.id,
					itemName: item.displayName,
					itemKind: item.kind,
					status: 'error',
					error: `Paginated fetch failed: ${err instanceof Error ? err.message : String(err)}`
				});
			}
		} else {
			fetched.push({ item, assignments: body.value ?? [] });
		}

		onProgress?.({
			phase: 'fetching',
			completed,
			total: items.length,
			currentItem: item.displayName
		});
	}

	// Handle items that had no response (shouldn't happen, but defensive)
	for (const item of items) {
		const hasResponse = responses.some((r) => r.id === item.id);
		if (!hasResponse) {
			errors.push({
				itemId: item.id,
				itemName: item.displayName,
				itemKind: item.kind,
				status: 'error',
				error: 'No response received from batch request'
			});
		}
	}

	return { fetched, errors };
}

// ─── Phase B: Merge ────────────────────────────────────────────────

interface MergedItem {
	item: AssignableItem;
	body: unknown;
}

function mergeAssignments(fetched: FetchedItem[], params: BulkAssignmentParams): MergedItem[] {
	const { groups, exclusionGroups, intent, filter, conflicts, replaceMode, replaceConfig } = params;
	const merged: MergedItem[] = [];

	params.onProgress?.({
		phase: 'merging',
		completed: 0,
		total: fetched.length
	});

	for (let i = 0; i < fetched.length; i++) {
		const { item, assignments } = fetched[i];

		if (item.kind === 'app') {
			const mergedList = mergeAppAssignments({
				current: assignments as MobileAppAssignment[],
				groups,
				exclusionGroups,
				intent,
				filter,
				conflicts,
				itemId: item.id,
				replaceMode,
				replaceIntents: replaceConfig.appIntents
			});
			merged.push({
				item,
				body: { mobileAppAssignments: mergedList }
			});
		} else if (item.kind === 'compliance') {
			const mergedList = mergeCompliancePolicyAssignments({
				current: assignments as DeviceCompliancePolicyAssignment[],
				groups,
				exclusionGroups,
				filter,
				conflicts,
				itemId: item.id,
				replaceMode,
				replaceInclusions: replaceConfig.policyInclusions,
				replaceExclusions: replaceConfig.policyExclusions
			});
			merged.push({
				item,
				body: { assignments: mergedList }
			});
		} else if (item.kind === 'security') {
			const mergedList = mergeProfileAssignments({
				current: assignments as ConfigurationPolicyAssignment[],
				groups,
				exclusionGroups,
				filter,
				conflicts,
				itemId: item.id,
				replaceMode,
				replaceInclusions: replaceConfig.policyInclusions,
				replaceExclusions: replaceConfig.policyExclusions
			});
			merged.push({
				item,
				body: { assignments: mergedList }
			});
		} else {
			const mergedList = mergeProfileAssignments({
				current: assignments as ConfigurationPolicyAssignment[],
				groups,
				exclusionGroups,
				filter,
				conflicts,
				itemId: item.id,
				replaceMode,
				replaceInclusions: replaceConfig.policyInclusions,
				replaceExclusions: replaceConfig.policyExclusions
			});
			merged.push({
				item,
				body: { assignments: mergedList }
			});
		}

		params.onProgress?.({
			phase: 'merging',
			completed: i + 1,
			total: fetched.length,
			currentItem: item.displayName
		});
	}

	return merged;
}

// ─── Phase C: Batch Apply ──────────────────────────────────────────

async function applyAssignments(
	client: GraphClient,
	merged: MergedItem[],
	onProgress?: ProgressCallback
): Promise<AssignmentResult[]> {
	const results: AssignmentResult[] = [];

	// Build POST requests
	let pending = merged.map((m) => ({
		request: {
			id: m.item.id,
			method: 'POST' as const,
			url: getAssignUrl(m.item),
			body: m.body,
			headers: { 'Content-Type': 'application/json' }
		},
		item: m.item
	}));

	onProgress?.({
		phase: 'applying',
		completed: 0,
		total: merged.length
	});

	let completed = 0;

	for (let attempt = 0; attempt <= MAX_APPLY_RETRIES; attempt++) {
		const batchRequests = pending.map((p) => p.request);
		const responses = await client.batch(batchRequests);

		// Index pending items by id
		const pendingById = new Map(pending.map((p) => [p.item.id, p]));

		const retryItems: typeof pending = [];

		for (const response of responses) {
			const entry = pendingById.get(response.id);
			if (!entry) continue;

			if (response.status >= 200 && response.status < 300) {
				// Success
				completed++;
				results.push({
					itemId: entry.item.id,
					itemName: entry.item.displayName,
					itemKind: entry.item.kind,
					status: 'success'
				});
				onProgress?.({
					phase: 'applying',
					completed,
					total: merged.length,
					currentItem: entry.item.displayName
				});
			} else if (response.status >= 500 && response.status < 600 && attempt < MAX_APPLY_RETRIES) {
				// Server error — queue for retry
				retryItems.push(entry);
			} else {
				// Permanent failure (4xx or exhausted retries for 5xx)
				completed++;
				results.push({
					itemId: entry.item.id,
					itemName: entry.item.displayName,
					itemKind: entry.item.kind,
					status: 'error',
					error: `Apply failed (${response.status}): ${extractErrorMessage(response.body)}`
				});
				onProgress?.({
					phase: 'applying',
					completed,
					total: merged.length,
					currentItem: entry.item.displayName
				});
			}
		}

		if (retryItems.length === 0) break;

		// Exponential backoff before retry
		await sleep(RETRY_BACKOFF_MS * Math.pow(2, attempt));
		pending = retryItems;
	}

	return results;
}

// ─── Main Export ───────────────────────────────────────────────────

export async function executeBulkAssignment(
	params: BulkAssignmentParams
): Promise<BulkAssignmentResult> {
	const { client, items, onProgress } = params;

	// Phase A: Fetch current assignments
	const { fetched, errors: fetchErrors } = await fetchCurrentAssignments(client, items, onProgress);

	// Phase B: Merge new assignments with existing
	const merged = mergeAssignments(fetched, params);

	// Phase C: Apply merged assignments
	const applyResults = await applyAssignments(client, merged, onProgress);

	// Combine results
	const results = [...fetchErrors, ...applyResults];

	return {
		results,
		totalSuccess: results.filter((r) => r.status === 'success').length,
		totalError: results.filter((r) => r.status === 'error').length
	};
}
