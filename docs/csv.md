---
title: CSV Import & Export
description: Import and export assignment configurations as CSV files for backup, migration, and bulk editing
tags:
  - csv
  - import
  - export
  - assignments
---

# CSV Import & Export

The CSV feature lets you export existing assignments to a file and import assignment configurations from a file. This is useful for creating backups, cloning assignments across tenants, preparing bulk changes offline, and auditing assignment state.

## CSV Format

The CSV uses the following columns:

```csv
ItemType,ItemName,ItemId,TargetType,GroupName,GroupId,Intent,FilterName,FilterId,FilterMode
```

| Column | Description | Valid Values |
|--------|-------------|--------------|
| `ItemType` | Type of Intune item | `app`, `profile` |
| `ItemName` | Display name (informational, used for name-based resolution if `ItemId` is empty) | Any string |
| `ItemId` | Intune object GUID | UUID string |
| `TargetType` | Assignment target type | `group`, `allDevices`, `allUsers`, `exclusion` |
| `GroupName` | AAD group display name (informational, used for resolution if `GroupId` is empty) | Any string, empty for `allDevices`/`allUsers` |
| `GroupId` | AAD group GUID | UUID string, empty for `allDevices`/`allUsers` |
| `Intent` | Assignment intent | `required`, `available`, `uninstall`, `availableWithoutEnrollment` |
| `FilterName` | Assignment filter display name (informational) | Any string, or empty |
| `FilterId` | Assignment filter GUID | UUID string, or empty |
| `FilterMode` | How the filter is applied | `include`, `exclude`, or empty |

### Example

```csv
ItemType,ItemName,ItemId,TargetType,GroupName,GroupId,Intent,FilterName,FilterId,FilterMode
app,Microsoft Teams,00000000-0000-0000-0000-000000000001,group,All Employees,00000000-0000-0000-0000-000000000002,required,,,
app,Microsoft Teams,00000000-0000-0000-0000-000000000001,allDevices,,,,Windows Devices,00000000-0000-0000-0000-000000000003,include
profile,Windows Security Baseline,00000000-0000-0000-0000-000000000004,group,IT Department,00000000-0000-0000-0000-000000000005,required,,,
```

## Export

### Where to Export

CSV export is available in two places:

- **Review step (Step 4)** of the Bulk Assignment wizard -- exports the assignments you are about to apply
- **App and profile list pages** -- exports current assignments for the displayed items

### What Gets Exported

The export includes one row per assignment: each combination of item + target group + intent + filter. The `ItemName`, `GroupName`, and `FilterName` columns are populated with display names for readability.

!!! tip "Backup before bulk changes"
    Export your current assignments before running a bulk assignment. This gives you a CSV backup you can re-import if you need to revert.

## Import

### How to Import

1. Navigate to **Bulk Assign**
2. Click the **Import CSV** button at the top of the page
3. Select your CSV file in the dialog
4. The app validates each row and displays results

### Validation

Each row is validated against your tenant:

| Check | What Happens on Failure |
|-------|------------------------|
| Required headers present (`ItemType`, `ItemName`, `TargetType`) | Import aborted with header error |
| `ItemType` is `app` or `profile` | Row skipped with error |
| `TargetType` is valid (`group`, `exclusion`, `allDevices`, `allUsers`) | Row skipped with error |
| Group target has `GroupId` or `GroupName` | Row skipped with error |
| `ItemId` resolves to an existing app/profile (or `ItemName` matches by exact name) | Row skipped with error |
| `GroupId` resolves to an existing group (or `GroupName` matches by exact search) | Row skipped with error |
| `FilterId` exists in tenant (if provided) | Row skipped with error |
| `FilterName` matches an existing filter (if `FilterId` is empty) | Row skipped with error |

Rows with validation errors are displayed with their error messages. Valid rows proceed normally.

### After Import

On successful validation, the wizard is pre-populated and jumps directly to the **Review step (Step 4)**:

| Field | Value |
|---|---|
| **Items** | All apps and profiles from the CSV are selected |
| **Groups** | All target and exclusion groups from the CSV are selected |
| **Intent** | Set to the most common intent value across all rows |
| **Filter** | Set to the filter from the CSV if all rows use the same filter; otherwise left empty |

You can review the merged assignments and resolve any conflicts before applying.

### Name-Based Resolution

If a row has an `ItemName` but no `ItemId`, the app attempts to resolve the name:

- For apps: fetches all apps and matches by exact display name (case-insensitive)
- For profiles: fetches all policies and matches by exact name (case-insensitive)

The same applies to `GroupName` without `GroupId` -- the app searches AAD groups and uses the first exact match.

!!! warning "Prefer IDs over names"
    Name-based resolution depends on exact matches and can fail if names are duplicated or slightly different. Always include GUIDs in your CSV when possible.

## Common Workflows

### Clone Assignments

1. Export current assignments from the app/profile list page
2. The CSV contains all assignment data with IDs
3. Import the CSV on the Bulk Assign page
4. Review and apply

### Prepare Assignments Offline

1. Export a template CSV (or create one manually using the format above)
2. Edit the CSV in a spreadsheet application
3. Import the modified CSV
4. Review and apply

### Cross-Tenant Migration

1. Export assignments from the source tenant
2. Update the `ItemId`, `GroupId`, and `FilterId` columns to match the destination tenant's GUIDs
3. Import into the destination tenant
4. Review and apply

!!! note "IDs differ between tenants"
    App, group, and filter GUIDs are unique per tenant. You must update all ID columns when moving between tenants. Name-based resolution can help if display names match.
