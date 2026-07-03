---
title: "Step 4: Review"
description: Review the assignment changes, resolve conflicts, and confirm before applying
tags:
  - assignments
  - wizard
  - review
  - conflicts
---

# Step 4: Review

The Review step shows exactly what will change before you apply. It fetches the current assignments for every selected item and compares them against your new selections.

## Loading

When you enter this step, the wizard:

1. Batch-fetches current assignments for all selected items from the Graph API
2. Resolves group names for display
3. Detects conflicts between existing and new assignments
4. Computes a full diff of changes

This may take a few seconds depending on the number of selected items.

## View Modes

Two tabs let you view the changes differently:

### Assignment List

A table showing every assignment that will be processed:

| Column | Description |
|--------|-------------|
| Item | App or profile name with its type |
| Target | Group name (or "All Devices" / "All Users") |
| Intent | The assignment intent (Required, Available, etc.) |
| Filter | Assignment filter name and mode, or "None" |

Summary counters at the top show:

| Counter | Meaning |
|---|---|
| **New** | Assignments that do not exist today (shown with a blue dot) |
| **Updates** | Existing assignments that will be changed (shown with a yellow dot) |
| **Skipped** | Conflicts you chose to skip (shown with a gray dot) |

### Change Preview

A diff-style view showing per-item changes: what will be added, what will be modified, and what existing assignments are preserved unchanged.

## Conflict Detection

A **conflict** occurs when an existing assignment targets the same group as one of your new assignments but has different settings (different intent or different filter).

!!! warning "Conflict resolution is required"
    Conflicts are highlighted with a yellow border and warning icon. For each conflict, you must choose one of two resolutions:

| Resolution | Effect |
|------------|--------|
| **Update** | Replace the existing assignment's intent and filter with your new settings |
| **Skip** | Keep the existing assignment unchanged; do not apply your new settings for this item/group pair |

The default resolution is **Update** for all conflicts.

### What Triggers a Conflict

- Same app + same group, but different intent (e.g., existing is "Available", new is "Required")
- Same app + same group, but different assignment filter
- Same profile + same group, but different filter settings

### What Does Not Trigger a Conflict

- A completely new assignment to a group that has no existing assignment for that item
- An existing assignment that matches your new settings exactly (same intent, same filter) -- this is a no-op

## Non-Conflicting Assignments

Existing assignments that are not part of your new selections are **preserved untouched**. The wizard never removes assignments -- it only adds new ones or updates conflicting ones.

## Navigation

You can go back to any previous step to change your selections. When you return to the Review step, the conflict detection runs again with your updated choices.

## Applying

Click **Apply Assignments** to proceed. A confirmation dialog appears:

> *This will apply the configured assignments to all selected items and groups. This action cannot be easily undone.*

Confirm to begin execution and advance to the Results step.
