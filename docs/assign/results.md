---
title: "Step 5: Results"
description: Track execution progress and handle successes and failures after applying assignments
tags:
  - assignments
  - wizard
  - results
  - execution
---

# Step 5: Results

The final step shows real-time progress as assignments are applied, followed by a summary of results.

## Execution Phases

The wizard processes assignments in three sequential phases:

### Phase 1: Fetch

Downloads the current assignments for all selected items from the Graph API using batch requests. This ensures the merge step has the latest data.

- Progress bar shows completion per item
- The current item being fetched is displayed below the progress bar

### Phase 2: Merge

Combines your new assignments with the existing ones, applying conflict resolutions. This phase is computed locally -- no API calls are made -- so it completes instantly.

### Phase 3: Apply

Posts the merged assignment lists back to Intune using batch POST requests to the Graph API `assign` endpoint.

- Progress bar shows completion per item
- Each item receives its full merged assignment list (existing + new)
- Server errors (5xx) are automatically retried up to 2 times with exponential backoff

## Result Summary

After execution completes, a summary banner shows the outcome:

| Outcome | Banner |
|---------|--------|
| All succeeded | Green banner: "All N assignments applied successfully" |
| Partial failure | Yellow banner: "X succeeded, Y failed" |
| All failed | Red banner: "All assignments failed" |

## Per-Item Results

Below the summary, each item is listed with its status:

| Status | Shown as |
|---|---|
| **Success** | Green check icon, item name and type |
| **Error** | Red X icon, item name, type, and the error message from the Graph API |

## Handling Failures

!!! note "Failures are isolated"
    Each item is processed independently. If one app's assignment fails, other items are unaffected.

When failures occur:

- **Retry Failed** -- re-runs the entire wizard execution. All items (including previously successful ones) are re-processed, since the `assign` endpoint replaces the full assignment list.
- **Start New Assignment** -- resets the wizard to Step 1 with a clean state.

## After Success

On full success, you can:

- Click **Start New Assignment** to begin another bulk assignment
- Navigate to the [Audit Log](../audit.md) to verify the changes were recorded

!!! tip "Verify in the Audit Log"
    Assignment changes may take a few minutes to appear in the Intune audit log. Navigate to **Audit Log** and filter for assignment events to confirm your changes.
