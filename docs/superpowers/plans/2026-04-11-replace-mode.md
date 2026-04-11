# Replace Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Replace Mode" toggle to the bulk assignment wizard that lets users replace existing assignments by intent category (apps) or inclusion/exclusion category (policies), instead of always merging.

**Architecture:** New `ReplaceConfig` type flows from wizard state through the Configure UI, into the merge functions (which gain a post-merge removal pass), and into the diff computation (which marks removed entries). The review step and confirmation dialog surface removal counts prominently.

**Tech Stack:** SvelteKit 2, Svelte 5 (runes), TypeScript strict mode. No test framework — verify with `pnpm check` and `pnpm build`.

**Spec:** `docs/superpowers/specs/2026-04-11-replace-mode-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/lib/types/wizard.ts` | Modify | Add `ReplaceConfig` interface, extend `WizardState`, update default factory |
| `src/lib/graph/merge.ts` | Modify | Add replace fields to param interfaces, add removal pass to all 3 merge functions |
| `src/lib/graph/execute.ts` | Modify | Add replace fields to `BulkAssignmentParams`, pass through to merge calls |
| `src/lib/utils/diff.ts` | Modify | Add replace fields to `DiffItemParams`, produce `'removed'` entries in `computeItemDiff` |
| `src/lib/components/assignments/StepConfigure.svelte` | Modify | Add replace mode toggle, intent checkboxes for apps, inclusion/exclusion checkboxes for policies |
| `src/lib/components/assignments/StepReview.svelte` | Modify | Add removal warning banner, show removed assignments in list view, skip conflicts in replaced categories |
| `src/routes/assign/+page.svelte` | Modify | Wire replace state callbacks, update confirm dialog message, pass config to execution |

---

### Task 1: Add ReplaceConfig type and extend WizardState

**Files:**
- Modify: `src/lib/types/wizard.ts`

- [ ] **Step 1: Add `ReplaceConfig` interface**

In `src/lib/types/wizard.ts`, after the `FilterConfig` interface (line 20), add:

```typescript
// ─── Replace Configuration ───────────────────────────────────────

export interface ReplaceConfig {
	/** Which app intent categories to replace (empty = no app replacement) */
	appIntents: AssignmentIntent[];
	/** Whether to replace inclusion assignments for policies */
	policyInclusions: boolean;
	/** Whether to replace exclusion assignments for policies */
	policyExclusions: boolean;
}
```

- [ ] **Step 2: Add fields to `WizardState`**

In the `WizardState` interface (currently lines 24-33), add two new fields at the end:

```typescript
export interface WizardState {
	selectedApps: MobileApp[];
	selectedProfiles: ConfigurationPolicy[];
	selectedCompliancePolicies: DeviceCompliancePolicy[];
	selectedSecurityPolicies: ConfigurationPolicy[];
	selectedGroups: GroupTarget[];
	intent: AssignmentIntent;
	filterConfig: FilterConfig | null;
	exclusionGroups: GroupTarget[];
	replaceMode: boolean;
	replaceConfig: ReplaceConfig;
}
```

- [ ] **Step 3: Update `createDefaultWizardState`**

Update the factory function (currently lines 35-46) to include the new fields:

```typescript
export function createDefaultWizardState(): WizardState {
	return {
		selectedApps: [],
		selectedProfiles: [],
		selectedCompliancePolicies: [],
		selectedSecurityPolicies: [],
		selectedGroups: [],
		intent: 'required',
		filterConfig: null,
		exclusionGroups: [],
		replaceMode: false,
		replaceConfig: {
			appIntents: [],
			policyInclusions: false,
			policyExclusions: false
		}
	};
}
```

- [ ] **Step 4: Verify types compile**

Run: `pnpm check`
Expected: 0 errors (the new fields aren't consumed yet, so nothing breaks)

- [ ] **Step 5: Commit**

```bash
git add src/lib/types/wizard.ts
git commit -m "feat(types): add ReplaceConfig and extend WizardState for replace mode"
```

---

### Task 2: Add replace logic to merge functions

**Files:**
- Modify: `src/lib/graph/merge.ts`

- [ ] **Step 1: Update `MergeAppParams` interface**

In `src/lib/graph/merge.ts`, update the `MergeAppParams` interface (lines 16-24) to add two optional fields:

```typescript
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
```

- [ ] **Step 2: Update `MergeProfileParams` interface**

Update `MergeProfileParams` (lines 26-33):

```typescript
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
```

- [ ] **Step 3: Update `MergeComplianceParams` interface**

Update `MergeComplianceParams` (lines 35-42):

```typescript
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
```

- [ ] **Step 4: Add replace removal pass to `mergeAppAssignments`**

In `mergeAppAssignments` (line 125), after the exclusion groups loop (line 173) and before the `return` on line 174, insert the replace removal pass. The function currently ends:

```typescript
	// (end of exclusion groups loop)

	return Array.from(existingByKey.values());
}
```

Replace that return section with:

```typescript
	// (end of exclusion groups loop)

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
```

This iterates the merged map and deletes entries whose intent matches a replaced category but whose target key wasn't in the new wizard selections.

- [ ] **Step 5: Add replace removal pass to `mergeProfileAssignments`**

In `mergeProfileAssignments` (line 178), after the exclusion groups loop and before the return on line 227, insert:

```typescript
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
```

- [ ] **Step 6: Add replace removal pass to `mergeCompliancePolicyAssignments`**

In `mergeCompliancePolicyAssignments` (line 231), after the exclusion groups loop and before the return on line 278, insert the same pattern as Step 5 but typed for `DeviceCompliancePolicyAssignment`:

```typescript
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
```

- [ ] **Step 7: Verify types compile**

Run: `pnpm check`
Expected: 0 errors

- [ ] **Step 8: Commit**

```bash
git add src/lib/graph/merge.ts
git commit -m "feat(merge): add replace mode removal pass to all merge functions"
```

---

### Task 3: Pass replace config through execute.ts

**Files:**
- Modify: `src/lib/graph/execute.ts`

- [ ] **Step 1: Add import for ReplaceConfig**

At the top of `src/lib/graph/execute.ts`, add `ReplaceConfig` to the wizard type imports (line 17):

```typescript
import type {
	AssignableItem,
	AssignmentResult,
	ConflictChoice,
	FilterConfig,
	GroupTarget,
	ProgressCallback,
	ReplaceConfig
} from '$lib/types/wizard';
```

- [ ] **Step 2: Add replace fields to `BulkAssignmentParams`**

Update the interface (lines 34-43) to include replace config:

```typescript
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
```

- [ ] **Step 3: Update `mergeAssignments` to pass replace config**

In the `mergeAssignments` function (line 224), update the destructuring on line 225 to include the new fields:

```typescript
function mergeAssignments(fetched: FetchedItem[], params: BulkAssignmentParams): MergedItem[] {
	const { groups, exclusionGroups, intent, filter, conflicts, replaceMode, replaceConfig } = params;
```

Then update each merge call in the for loop (lines 238-300). Replace the app branch:

```typescript
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
```

Replace the compliance branch:

```typescript
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
```

Replace the security branch:

```typescript
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
```

Replace the default (profile) branch:

```typescript
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
```

- [ ] **Step 4: Verify types compile**

Run: `pnpm check`
Expected: Errors in `+page.svelte` because `executeBulkAssignment` now requires `replaceMode` and `replaceConfig` fields. That's expected — we'll fix it in Task 7.

- [ ] **Step 5: Commit**

```bash
git add src/lib/graph/execute.ts
git commit -m "feat(execute): pass replace config through to merge functions"
```

---

### Task 4: Update diff computation to produce 'removed' entries

**Files:**
- Modify: `src/lib/utils/diff.ts`

- [ ] **Step 1: Add replace fields to `DiffItemParams`**

In `src/lib/utils/diff.ts`, update the `DiffItemParams` interface (lines 10-21):

```typescript
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
```

- [ ] **Step 2: Update `computeItemDiff` to mark removals**

In the `computeItemDiff` function (line 59), find the block that handles keys existing in `currentMap` but not in `newMap` (lines 127-139):

```typescript
		if (current && !next) {
			entries.push({
				status: 'unchanged',
				targetKey: key,
				targetDisplayName: current.displayName,
				isExclusion: current.isExclusion,
				currentIntent: current.intent,
				currentFilterName: current.filterName,
				currentFilterMode: current.filterMode,
				newIntent: current.intent,
				newFilterName: current.filterName,
				newFilterMode: current.filterMode
			});
```

Replace it with:

```typescript
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
```

- [ ] **Step 3: Verify types compile**

Run: `pnpm check`
Expected: 0 errors (the new fields are optional so callers don't break)

- [ ] **Step 4: Commit**

```bash
git add src/lib/utils/diff.ts
git commit -m "feat(diff): produce 'removed' entries when replace mode is active"
```

---

### Task 5: Add replace mode UI to StepConfigure

**Files:**
- Modify: `src/lib/components/assignments/StepConfigure.svelte`

- [ ] **Step 1: Add new props**

In the `Props` interface in `StepConfigure.svelte` (lines 30-40), add the replace mode props:

```typescript
	interface Props {
		intent: AssignmentIntent;
		filterConfig: FilterConfig | null;
		selectedApps: MobileApp[];
		selectedProfiles: ConfigurationPolicy[];
		selectedCompliancePolicies: DeviceCompliancePolicy[];
		selectedSecurityPolicies: ConfigurationPolicy[];
		selectedGroups: GroupTarget[];
		onUpdateIntent: (intent: AssignmentIntent) => void;
		onUpdateFilter: (config: FilterConfig | null) => void;
		replaceMode: boolean;
		replaceConfig: ReplaceConfig;
		onUpdateReplaceMode: (enabled: boolean) => void;
		onUpdateReplaceConfig: (config: ReplaceConfig) => void;
	}
```

Update the destructuring (lines 42-52) to include the new props:

```typescript
	const {
		intent,
		filterConfig,
		selectedApps,
		selectedProfiles,
		selectedCompliancePolicies,
		selectedSecurityPolicies,
		selectedGroups,
		onUpdateIntent,
		onUpdateFilter,
		replaceMode,
		replaceConfig,
		onUpdateReplaceMode,
		onUpdateReplaceConfig
	}: Props = $props();
```

- [ ] **Step 2: Add import for ReplaceConfig**

Add to the existing type imports at the top of the script block (around line 9):

```typescript
	import type {
		AssignmentIntent,
		AssignmentFilter,
		MobileApp,
		ConfigurationPolicy
	} from '$lib/types/graph';
	import type { ReplaceConfig } from '$lib/types/wizard';
```

- [ ] **Step 3: Add derived values for conditional display**

After the existing filter state section (around line 98), add:

```typescript
	// ─── Replace mode ──────────────────────────────────────────────────

	const hasApps = $derived(selectedApps.length > 0);
	const hasPolicies = $derived(
		selectedProfiles.length > 0 ||
			selectedCompliancePolicies.length > 0 ||
			selectedSecurityPolicies.length > 0
	);

	const allAppIntents: { value: AssignmentIntent; label: string }[] = [
		{ value: 'required', label: 'Required' },
		{ value: 'available', label: 'Available' },
		{ value: 'availableWithoutEnrollment', label: 'Available (No Enrollment)' },
		{ value: 'uninstall', label: 'Uninstall' }
	];

	function handleReplaceModeToggle(): void {
		const newEnabled = !replaceMode;
		onUpdateReplaceMode(newEnabled);
		if (newEnabled) {
			// Pre-check the current wizard intent for apps, and inclusions for policies
			onUpdateReplaceConfig({
				appIntents: hasApps ? [intent] : [],
				policyInclusions: hasPolicies,
				policyExclusions: false
			});
		} else {
			onUpdateReplaceConfig({
				appIntents: [],
				policyInclusions: false,
				policyExclusions: false
			});
		}
	}

	function toggleReplaceIntent(intentValue: AssignmentIntent): void {
		const current = replaceConfig.appIntents;
		const updated = current.includes(intentValue)
			? current.filter((i) => i !== intentValue)
			: [...current, intentValue];
		onUpdateReplaceConfig({ ...replaceConfig, appIntents: updated });
	}

	function toggleReplaceInclusions(): void {
		onUpdateReplaceConfig({
			...replaceConfig,
			policyInclusions: !replaceConfig.policyInclusions
		});
	}

	function toggleReplaceExclusions(): void {
		onUpdateReplaceConfig({
			...replaceConfig,
			policyExclusions: !replaceConfig.policyExclusions
		});
	}
```

- [ ] **Step 4: Add replace mode UI to template**

In the template, add the replace mode section at the very top of the `<div class="space-y-6">` block (line 181), before the intent selector `<div>`:

```svelte
	<!-- Replace mode toggle -->
	<div>
		<h3 class="text-ink mb-3 text-sm font-semibold">Assignment Mode</h3>

		<div class="flex items-center gap-3">
			<Toggle
				checked={replaceMode}
				onchange={() => handleReplaceModeToggle()}
				label="Replace existing assignments"
			/>
			<span class="text-ink text-sm">Replace existing assignments</span>
		</div>

		{#if replaceMode}
			<p class="text-muted mt-2 text-xs">
				Existing assignments in the selected categories will be removed and replaced with the
				assignments configured below.
			</p>

			<div class="mt-3 space-y-4">
				{#if hasApps}
					<div>
						<p class="text-ink mb-2 text-xs font-medium">Replace app assignments by intent:</p>
						<div class="flex flex-wrap gap-3">
							{#each allAppIntents as opt (opt.value)}
								<label class="flex cursor-pointer items-center gap-1.5">
									<input
										type="checkbox"
										checked={replaceConfig.appIntents.includes(opt.value)}
										onchange={() => toggleReplaceIntent(opt.value)}
										class="accent-accent h-3.5 w-3.5"
									/>
									<span class="text-ink text-sm">{opt.label}</span>
								</label>
							{/each}
						</div>
					</div>
				{/if}

				{#if hasPolicies}
					<div>
						<p class="text-ink mb-2 text-xs font-medium">Replace policy assignments:</p>
						<div class="flex flex-wrap gap-3">
							<label class="flex cursor-pointer items-center gap-1.5">
								<input
									type="checkbox"
									checked={replaceConfig.policyInclusions}
									onchange={() => toggleReplaceInclusions()}
									class="accent-accent h-3.5 w-3.5"
								/>
								<span class="text-ink text-sm">Inclusion assignments</span>
							</label>
							<label class="flex cursor-pointer items-center gap-1.5">
								<input
									type="checkbox"
									checked={replaceConfig.policyExclusions}
									onchange={() => toggleReplaceExclusions()}
									class="accent-accent h-3.5 w-3.5"
								/>
								<span class="text-ink text-sm">Exclusion assignments</span>
							</label>
						</div>
					</div>
				{/if}
			</div>

			<div class="divider mt-4"></div>
		{/if}
	</div>
```

- [ ] **Step 5: Verify types compile**

Run: `pnpm check`
Expected: Errors in `+page.svelte` because StepConfigure now expects new props. Expected — we fix this in Task 7.

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/assignments/StepConfigure.svelte
git commit -m "feat(ui): add replace mode toggle and category checkboxes to StepConfigure"
```

---

### Task 6: Update StepReview for replace mode

**Files:**
- Modify: `src/lib/components/assignments/StepReview.svelte`

- [ ] **Step 1: Add replace mode props**

Update the `Props` interface (lines 24-28):

```typescript
	interface Props {
		wizard: WizardState;
		conflicts: AssignmentConflict[];
		onUpdateConflicts: (conflicts: AssignmentConflict[]) => void;
	}
```

No change needed here — `wizard` already contains `replaceMode` and `replaceConfig` since we extended `WizardState` in Task 1. The component already receives the full wizard state.

- [ ] **Step 2: Add import for ReplaceConfig type**

Add `ReplaceConfig` to the wizard type import (line 20):

```typescript
	import type { WizardState, AssignmentConflict, GroupTarget, ReplaceConfig } from '$lib/types/wizard';
```

- [ ] **Step 3: Add removal tracking derived values**

After the existing `skipCount` and `newCount` derived values (around line 64), add:

```typescript
	// ─── Replace mode removal tracking ─────────────────────────────
	const removalCount = $derived.by(() => {
		if (!diffResult || !wizard.replaceMode) return 0;
		return diffResult.summary.removed;
	});

	const itemsWithRemovals = $derived.by(() => {
		if (!diffResult || !wizard.replaceMode) return 0;
		return diffResult.items.filter((item) => item.entries.some((e) => e.status === 'removed'))
			.length;
	});
```

- [ ] **Step 4: Pass replace config to diff computation**

In the `detectConflicts` function, find the `diffItems` map (around line 179-190):

```typescript
			const diffItems: DiffItemParams[] = allItems.map((item) => ({
				itemId: item.id,
				itemName: item.name,
				itemType: item.type,
				currentAssignments: currentAssignmentsMap.get(item.id) ?? [],
				newGroups: wizard.selectedGroups,
				newExclusionGroups: wizard.exclusionGroups,
				newIntent: item.type !== 'app' ? null : wizard.intent,
				newFilter: wizard.filterConfig,
				groupNames,
				filterNames
			}));
```

Replace with:

```typescript
			const diffItems: DiffItemParams[] = allItems.map((item) => ({
				itemId: item.id,
				itemName: item.name,
				itemType: item.type,
				currentAssignments: currentAssignmentsMap.get(item.id) ?? [],
				newGroups: wizard.selectedGroups,
				newExclusionGroups: wizard.exclusionGroups,
				newIntent: item.type !== 'app' ? null : wizard.intent,
				newFilter: wizard.filterConfig,
				groupNames,
				filterNames,
				replaceMode: wizard.replaceMode,
				replaceIntents: wizard.replaceConfig.appIntents,
				replaceInclusions: wizard.replaceConfig.policyInclusions,
				replaceExclusions: wizard.replaceConfig.policyExclusions
			}));
```

- [ ] **Step 5: Skip conflict detection for replaced categories**

In the conflict detection loop (around lines 136-167), find where conflicts are pushed:

```typescript
					if (wizardTarget) {
						// Conflict: existing assignment targets the same group
						detected.push({
```

Wrap the push in a condition that skips replaced categories. Replace the `if (wizardTarget)` block with:

```typescript
					if (wizardTarget) {
						// In replace mode, targets in replaced categories aren't conflicts — they're replacements
						if (wizard.replaceMode) {
							const existingIntent = assignment.intent ?? null;
							const isExclusion =
								assignment.target['@odata.type'] ===
								'#microsoft.graph.exclusionGroupAssignmentTarget';

							if (item.type === 'app' && wizard.replaceConfig.appIntents.includes(existingIntent as AssignmentIntent)) {
								continue;
							}
							if (item.type !== 'app') {
								if (!isExclusion && wizard.replaceConfig.policyInclusions) continue;
								if (isExclusion && wizard.replaceConfig.policyExclusions) continue;
							}
						}

						// Conflict: existing assignment targets the same group
						detected.push({
							itemId: item.id,
							itemName: item.name,
							itemType: item.type,
							targetDisplayName: resolveTargetDisplayName(assignment.target, groupNames),
							targetKey: key,
							existingIntent: assignment.intent ?? null,
							existingFilterId: assignment.target.deviceAndAppManagementAssignmentFilterId,
							newIntent: wizard.intent,
							newFilterConfig: wizard.filterConfig,
							resolution: 'update'
						});
					}
```

Note: This uses `continue` inside a `for...of` loop iterating `body.value`. Check the surrounding code — the loop is `for (const assignment of body.value ?? [])` on line 147. The `continue` will skip to the next assignment. Import `AssignmentIntent` from `$lib/types/graph`:

```typescript
	import type {
		MobileAppAssignment,
		ConfigurationPolicyAssignment,
		AssignmentIntent,
		AssignmentTarget,
		BatchRequestItem,
		GraphPagedResponse
	} from '$lib/types/graph';
```

- [ ] **Step 6: Add removal warning banner to template**

In the template, after the `{:else}` that starts the loaded state (line 278), before the view toggle `<div class="mb-3">`, add:

```svelte
	{#if wizard.replaceMode && removalCount > 0}
		<div class="panel-inset border-ember bg-ember-light mb-4 flex items-start gap-2 border-l-2">
			<AlertTriangle size={16} class="text-ember mt-0.5 shrink-0" />
			<p class="text-ink text-sm">
				<strong>Replace mode is active.</strong>
				{removalCount} existing assignment{removalCount !== 1 ? 's' : ''} will be removed
				across {itemsWithRemovals} item{itemsWithRemovals !== 1 ? 's' : ''}.
			</p>
		</div>
	{/if}
```

- [ ] **Step 7: Show removed assignments in list view**

In the Assignment List tab, after the exclusion groups `{#each}` block (ending around line 461), and before the closing `{/each}` for `allItems` (line 462), add a section to show assignments that will be removed. This requires access to the diff data in list view:

```svelte
					<!-- Removed assignments (replace mode) -->
					{#if wizard.replaceMode && diffResult}
						{@const itemDiff = diffResult.items.find((d) => d.itemId === item.id)}
						{#if itemDiff}
							{#each itemDiff.entries.filter((e) => e.status === 'removed') as entry (entry.targetKey)}
								<div
									class="border-border border-l-ember bg-ember-light/50 grid grid-cols-12 items-center gap-2 border-b border-l-2 px-4 py-2.5 last:border-b-0"
								>
									<div class="col-span-4 min-w-0">
										<p class="text-ink truncate text-sm font-medium line-through opacity-60">
											{item.name}
										</p>
										<p class="text-muted text-xs">
											{item.type === 'app' ? 'App' : item.type === 'compliance' ? 'Compliance' : item.type === 'security' ? 'Security' : 'Profile'}
										</p>
									</div>
									<div class="col-span-3 min-w-0">
										<p class="text-ink truncate text-sm line-through opacity-60">
											{entry.targetDisplayName}
											{#if entry.isExclusion}
												<span class="text-xs">(Exclusion)</span>
											{/if}
										</p>
									</div>
									<div class="col-span-2">
										<Badge variant="neutral">
											<span class="text-ember">Removed</span>
										</Badge>
									</div>
									<div class="col-span-3 min-w-0">
										{#if entry.currentFilterName}
											<p class="text-muted truncate text-xs line-through opacity-60">
												{entry.currentFilterName} ({entry.currentFilterMode})
											</p>
										{:else}
											<p class="text-muted text-xs">—</p>
										{/if}
									</div>
								</div>
							{/each}
						{/if}
					{/if}
```

- [ ] **Step 8: Update total summary text**

Find the total summary at the bottom of the list view (around line 467):

```svelte
		<!-- Total summary -->
		<div class="text-muted mt-4 text-sm">
			{totalAssignments} total assignment{totalAssignments !== 1 ? 's' : ''} will be processed.
		</div>
```

Replace with:

```svelte
		<!-- Total summary -->
		<div class="text-muted mt-4 text-sm">
			{totalAssignments} total assignment{totalAssignments !== 1 ? 's' : ''} will be processed.
			{#if wizard.replaceMode && removalCount > 0}
				<span class="text-ember font-medium">
					{removalCount} will be removed.
				</span>
			{/if}
		</div>
```

- [ ] **Step 9: Verify types compile**

Run: `pnpm check`
Expected: Errors may still exist in `+page.svelte` (Task 7). StepReview itself should have no new errors.

- [ ] **Step 10: Commit**

```bash
git add src/lib/components/assignments/StepReview.svelte
git commit -m "feat(ui): add replace mode warning banner and removal display to StepReview"
```

---

### Task 7: Wire replace state in the wizard page

**Files:**
- Modify: `src/routes/assign/+page.svelte`

- [ ] **Step 1: Add state update callbacks**

After the existing `updateFilter` function (line 174), add:

```typescript
	function updateReplaceMode(enabled: boolean): void {
		wizard.replaceMode = enabled;
	}

	function updateReplaceConfig(config: ReplaceConfig): void {
		wizard.replaceConfig = config;
	}
```

Add the import for `ReplaceConfig` to the existing wizard type imports (line 28):

```typescript
	import {
		WIZARD_STEPS,
		createDefaultWizardState,
		type WizardState,
		type GroupTarget,
		type FilterConfig,
		type ReplaceConfig,
		type AssignmentConflict,
		type AssignmentResult,
		type BulkProgress,
		type ConflictChoice
	} from '$lib/types/wizard';
```

- [ ] **Step 2: Pass replace props to StepConfigure**

Find the `StepConfigure` usage in the template (around lines 433-441):

```svelte
					<StepConfigure
						intent={wizard.intent}
						filterConfig={wizard.filterConfig}
						selectedApps={wizard.selectedApps}
						selectedProfiles={wizard.selectedProfiles}
						selectedCompliancePolicies={wizard.selectedCompliancePolicies}
						selectedSecurityPolicies={wizard.selectedSecurityPolicies}
						selectedGroups={wizard.selectedGroups}
						onUpdateIntent={updateIntent}
						onUpdateFilter={updateFilter}
					/>
```

Replace with:

```svelte
					<StepConfigure
						intent={wizard.intent}
						filterConfig={wizard.filterConfig}
						selectedApps={wizard.selectedApps}
						selectedProfiles={wizard.selectedProfiles}
						selectedCompliancePolicies={wizard.selectedCompliancePolicies}
						selectedSecurityPolicies={wizard.selectedSecurityPolicies}
						selectedGroups={wizard.selectedGroups}
						onUpdateIntent={updateIntent}
						onUpdateFilter={updateFilter}
						replaceMode={wizard.replaceMode}
						replaceConfig={wizard.replaceConfig}
						onUpdateReplaceMode={updateReplaceMode}
						onUpdateReplaceConfig={updateReplaceConfig}
					/>
```

- [ ] **Step 3: Pass replace config to executeBulkAssignment**

Find the `executeBulkAssignment` call (around lines 218-229):

```typescript
			const result = await executeBulkAssignment({
				client: getGraphClient(),
				items,
				groups: wizard.selectedGroups,
				exclusionGroups: wizard.exclusionGroups,
				intent: wizard.intent,
				filter: wizard.filterConfig,
				conflicts: conflictChoices,
				onProgress: (p) => {
					executionProgress = p;
				}
			});
```

Replace with:

```typescript
			const result = await executeBulkAssignment({
				client: getGraphClient(),
				items,
				groups: wizard.selectedGroups,
				exclusionGroups: wizard.exclusionGroups,
				intent: wizard.intent,
				filter: wizard.filterConfig,
				conflicts: conflictChoices,
				onProgress: (p) => {
					executionProgress = p;
				},
				replaceMode: wizard.replaceMode,
				replaceConfig: wizard.replaceConfig
			});
```

- [ ] **Step 4: Update confirmation dialog message**

Find the `ConfirmDialog` in the template (around lines 385-392):

```svelte
		<ConfirmDialog
			open={confirmDialogOpen}
			title="Apply Assignments"
			message="This will apply the configured assignments to all selected items and groups. This action cannot be easily undone."
			confirmLabel="Apply Assignments"
			onConfirm={handleConfirmApply}
			onCancel={() => (confirmDialogOpen = false)}
		/>
```

Replace with a dynamic message. First, add a derived value in the script section, after the existing `totalSelected` derived (around line 97):

```typescript
	const confirmMessage = $derived.by(() => {
		if (!wizard.replaceMode) {
			return 'This will apply the configured assignments to all selected items and groups. This action cannot be easily undone.';
		}
		return 'This will apply the configured assignments and remove existing assignments in the replaced categories. This action cannot be easily undone.';
	});
```

Then update the ConfirmDialog:

```svelte
		<ConfirmDialog
			open={confirmDialogOpen}
			title="Apply Assignments"
			message={confirmMessage}
			confirmLabel="Apply Assignments"
			onConfirm={handleConfirmApply}
			onCancel={() => (confirmDialogOpen = false)}
		/>
```

- [ ] **Step 5: Verify full build passes**

Run: `pnpm check && pnpm build`
Expected: 0 type errors, build succeeds

- [ ] **Step 6: Run linter**

Run: `pnpm lint`
Expected: Only the 31 pre-existing lint errors. No new errors.

- [ ] **Step 7: Commit**

```bash
git add src/routes/assign/+page.svelte
git commit -m "feat: wire replace mode state through wizard page to execution"
```

---

### Task 8: Manual verification

- [ ] **Step 1: Start dev server**

Run: `pnpm dev`

- [ ] **Step 2: Navigate to the assign wizard**

Open the browser to the dev server URL and navigate to `/assign`.

- [ ] **Step 3: Verify Configure step**

1. Select at least one app and one profile in step 1
2. Select a group in step 2
3. On the Configure step, verify:
   - The "Replace existing assignments" toggle appears at the top
   - Toggling it on shows intent checkboxes (since an app is selected) and policy checkboxes (since a profile is selected)
   - The current wizard intent is pre-checked in the app intent checkboxes
   - "Inclusion assignments" is pre-checked for policies
   - Toggling replace mode off clears all checkboxes
   - No console errors

- [ ] **Step 4: Verify Review step**

1. Proceed to the Review step
2. If the selected items have existing assignments:
   - The removal warning banner should appear showing count
   - The Change Preview tab should show red "removed" entries
   - The Assignment List should show removed rows with strikethrough
3. If no existing assignments, verify no errors occur and replace mode is indicated

- [ ] **Step 5: Verify confirmation dialog**

Click "Apply Assignments" and verify the confirmation dialog shows the replace-aware message when replace mode is active, and the standard message when it's off.

- [ ] **Step 6: Commit any fixes**

If any issues were found and fixed during verification, commit them:

```bash
git add -A
git commit -m "fix: address issues found during replace mode manual verification"
```
