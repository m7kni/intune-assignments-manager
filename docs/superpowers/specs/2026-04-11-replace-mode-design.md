# Replace Mode for Bulk Assignments

## Summary

Add a "Replace Mode" to the bulk assignment wizard that lets users replace existing assignments by category instead of merging new ones on top. For apps, users choose which intent categories (Required, Available, Available No Enrollment, Uninstall) to replace. For policies (profiles, compliance, security), users choose whether to replace inclusion assignments, exclusion assignments, or both.

## Motivation

The current wizard always merges — new assignments are added alongside existing ones. There's no way to say "these should be the *only* required assignments" without manually removing extras. Replace mode fills this gap: the user defines the complete set for their chosen categories, and anything existing in those categories that isn't in the new set gets removed.

## Design Decisions

- **Replace is a toggle in the Configure step**, not a separate wizard mode. The rest of the flow (Items, Groups, Review, Results) stays the same.
- **Category-based replacement**: Apps use intent categories, policies use inclusion/exclusion categories. This maps directly to how Intune structures assignments.
- **The review step shows removals prominently**: A warning banner with removal counts appears at the top, and the diff view gains red "removed" entries.
- **The confirmation dialog surfaces removal counts** to prevent accidental data loss.

## State Changes

### `WizardState` (src/lib/types/wizard.ts)

Add two new fields:

```typescript
export interface ReplaceConfig {
  /** Which app intent categories to replace (empty = merge mode) */
  appIntents: AssignmentIntent[];
  /** Whether to replace inclusion assignments for policies */
  policyInclusions: boolean;
  /** Whether to replace exclusion assignments for policies */
  policyExclusions: boolean;
}

export interface WizardState {
  // ... existing fields ...
  replaceMode: boolean;
  replaceConfig: ReplaceConfig;
}
```

`createDefaultWizardState()` sets `replaceMode: false` and `replaceConfig` with empty arrays / false booleans.

### `BulkAssignmentParams` (src/lib/graph/execute.ts)

Add the replace config to the execution params:

```typescript
export interface BulkAssignmentParams {
  // ... existing fields ...
  replaceMode: boolean;
  replaceConfig: ReplaceConfig;
}
```

## Merge Logic Changes

### Current behavior (merge mode)

In `merge.ts`, each merge function:
1. Builds a map of existing assignments keyed by target
2. Overlays new assignments onto the map (respecting conflict resolutions)
3. Returns all map values

Existing assignments not targeted by the wizard are always preserved.

### New behavior (replace mode)

When replace mode is active, after step 2 above, add step 2.5:

**For apps (`mergeAppAssignments`):**
- Iterate the existing map entries
- Remove any entry whose intent matches one of the selected `appIntents` AND whose target key is NOT in the new assignment set

**For profiles/compliance/security (`mergeProfileAssignments`, `mergeCompliancePolicyAssignments`):**
- If `policyInclusions` is true: remove existing inclusion assignments (non-exclusion targets) not in the new set
- If `policyExclusions` is true: remove existing exclusion assignments not in the new exclusion set

This approach is safe because the Graph API `assign` endpoint replaces all assignments atomically — the merge functions already produce the complete final assignment list.

### Merge function signature changes

Each merge param interface gains optional replace fields:

```typescript
export interface MergeAppParams {
  // ... existing fields ...
  replaceMode?: boolean;
  replaceIntents?: AssignmentIntent[];
}

export interface MergeProfileParams {
  // ... existing fields ...
  replaceMode?: boolean;
  replaceInclusions?: boolean;
  replaceExclusions?: boolean;
}

export interface MergeComplianceParams {
  // ... existing fields ...
  replaceMode?: boolean;
  replaceInclusions?: boolean;
  replaceExclusions?: boolean;
}
```

When `replaceMode` is falsy, behavior is unchanged (backwards compatible).

## Diff Logic Changes

### `computeItemDiff` (src/lib/utils/diff.ts)

Currently, existing assignments not in the new set are marked `'unchanged'`. When replace mode is active, these need to be marked `'removed'` if they fall within a replaced category.

`DiffItemParams` gains optional replace fields:

```typescript
export interface DiffItemParams {
  // ... existing fields ...
  replaceMode?: boolean;
  replaceIntents?: AssignmentIntent[];
  replaceInclusions?: boolean;
  replaceExclusions?: boolean;
}
```

In `computeItemDiff`, when processing a key that exists in `currentMap` but not in `newMap`:
- If replace mode is off: `'unchanged'` (current behavior)
- If replace mode is on: check if the existing assignment falls in a replaced category. If yes: `'removed'`. If no: `'unchanged'`.

The `AssignmentDiff.svelte` component already renders `'removed'` entries with red styling — no component changes needed there.

## UI Changes

### StepConfigure.svelte

Add a "Replace Mode" section at the top of the Configure step (above intent selector):

```
[Toggle] Replace existing assignments

When enabled, existing assignments in the selected categories will be
removed and replaced with the assignments configured below.
```

When the toggle is on, show category checkboxes:

**If apps are selected:**
```
Replace app assignments by intent:
[x] Required
[ ] Available
[ ] Available (No Enrollment)
[ ] Uninstall
```

When replace mode is first enabled, the checkbox matching the currently selected wizard intent is pre-checked. The checkboxes are independent after that — changing the wizard intent does not auto-check/uncheck anything. Users can check additional categories to also wipe those.

**If policies are selected (profiles, compliance, or security):**
```
Replace policy assignments:
[x] Inclusion assignments
[ ] Exclusion assignments
```

Both sections only appear when relevant items are selected. If only apps are selected, only the intent checkboxes show. If only policies, only the inclusion/exclusion checkboxes show.

### StepReview.svelte

When replace mode is active:

1. **Warning banner** at the top (above view toggle):
   ```
   [!] Replace mode is active. X existing assignment(s) will be removed
       across Y item(s).
   ```
   Styled with `border-ember bg-ember-light` (same red treatment as errors).

2. The diff data passed to `computeFullDiff` includes the replace config, so `'removed'` entries appear naturally in the Change Preview tab.

3. The Assignment List tab shows removed assignments with strikethrough styling and a red "Removed" badge.

4. **Conflict handling in replace mode**: When replace mode is on for a category, there are no "conflicts" for targets in that category — they're simply being replaced. The conflict detection logic should skip conflict creation for targets that fall within a replaced category.

### ConfirmDialog (in +page.svelte)

When replace mode is active, the confirmation message changes:

```
This will apply the configured assignments and remove X existing
assignment(s) in the replaced categories. This action cannot be easily undone.
```

The confirm button label stays "Apply Assignments".

## Execution Flow

The three-phase flow in `execute.ts` stays the same:

1. **Fetch** — unchanged, always fetches current assignments
2. **Merge** — the merge functions now receive replace config and produce the correct final list (with removals applied)
3. **Apply** — unchanged, POSTs the merged list (which now may be shorter than the original)

The `mergeAssignments` function in `execute.ts` passes the replace config through to each merge function:

```typescript
if (item.kind === 'app') {
  const mergedList = mergeAppAssignments({
    // ... existing params ...
    replaceMode: params.replaceMode,
    replaceIntents: params.replaceConfig.appIntents
  });
}
```

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/types/wizard.ts` | Add `ReplaceConfig`, add fields to `WizardState`, update default |
| `src/lib/graph/merge.ts` | Add replace logic to all three merge functions, update param interfaces |
| `src/lib/graph/execute.ts` | Pass replace config through `BulkAssignmentParams` → merge functions |
| `src/lib/utils/diff.ts` | Update `DiffItemParams` and `computeItemDiff` to produce `'removed'` entries |
| `src/lib/components/assignments/StepConfigure.svelte` | Add replace mode toggle and category checkboxes |
| `src/lib/components/assignments/StepReview.svelte` | Add removal warning banner, skip conflicts in replaced categories |
| `src/routes/assign/+page.svelte` | Wire replace state, update confirm dialog message, pass config to execution |

## Files Unchanged

- `src/lib/types/diff.ts` — already has `'removed'` in `DiffStatus`
- `src/lib/components/assignments/AssignmentDiff.svelte` — already renders removed entries
- `src/lib/components/assignments/StepSelectItems.svelte` — no changes needed
- `src/lib/components/assignments/StepSelectGroups.svelte` — no changes needed
- `src/lib/components/assignments/StepResults.svelte` — no changes needed

## Edge Cases

1. **Replace mode with no items in a category**: If the user enables replace for "Required" but doesn't select any groups, all existing required assignments would be removed. The review step's warning banner makes this visible. This is valid — the user may want to clear all required assignments.

2. **Mixed item types**: When both apps and policies are selected, the app categories and policy categories are independent. Replacing "Required" app intent doesn't affect policy inclusion assignments.

3. **CSV import**: The CSV import handler sets wizard state directly. It does not set replace mode — imported assignments always merge. This is correct since CSV imports define per-row assignments rather than categorical replacement.

4. **All assignments removed**: If replace mode results in an empty assignment list for an item, the POST to the assign endpoint sends an empty array, which removes all assignments. The review step should make this clearly visible.
