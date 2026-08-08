---
title: Bulk Assignment Wizard
description: Assign apps and configuration profiles to multiple groups in a single operation using the 5-step wizard
tags:
  - assignments
  - wizard
  - bulk
---

# Bulk Assignment Wizard

The Bulk Assignment wizard lets you apply the same group assignments to multiple apps and configuration profiles in one operation. Instead of editing assignments one item at a time in the Intune portal, you select everything up front and apply it all at once.

Navigate to **Bulk Assign** in the sidebar or press ++ctrl+k++ and search for "assign".

!!! danger "The Graph API replaces all assignments"
The Microsoft Graph `assign` endpoint **replaces the entire assignment list** for each item. This tool always fetches current assignments first and merges your changes with them, so existing assignments are preserved. However, you should always review carefully on the **Review** step before applying.

## The 5-Step Process

<div class="grid cards" markdown>

- :material-checkbox-multiple-outline:{ .lg .middle } **Step 1 -- Select Items**

  ***

  Choose which apps and/or configuration profiles to assign. Browse, search, and filter by platform or type. You can mix apps and profiles in a single run.

  [:octicons-arrow-right-24: Select Items](select-items.md)

- :material-account-group:{ .lg .middle } **Step 2 -- Select Groups**

  ***

  Pick the target AAD security groups, plus the built-in All Devices and All Users targets. Optionally add exclusion groups.

  [:octicons-arrow-right-24: Select Groups](select-groups.md)

- :material-cog:{ .lg .middle } **Step 3 -- Configure**

  ***

  Set the assignment intent (required, available, uninstall) and optionally scope with an assignment filter.

  [:octicons-arrow-right-24: Configure](configure.md)

- :material-file-compare:{ .lg .middle } **Step 4 -- Review**

  ***

  See a full diff of what will change. Resolve any conflicts where an existing assignment targets the same group with different settings.

  [:octicons-arrow-right-24: Review](review.md)

- :material-check-circle:{ .lg .middle } **Step 5 -- Results**

  ***

  Track execution progress across fetch, merge, and apply phases. Retry individual failures or start a new assignment.

  [:octicons-arrow-right-24: Results](results.md)

</div>

## When to Use Bulk Assignment

**Good use cases:**

- Rolling out an app to many groups at once (e.g., deploying Microsoft Teams to all regional groups)
- Applying the same configuration profile to multiple device groups
- Standardizing assignment intent across a set of apps
- Migrating assignments from one set of groups to another (export CSV, modify, re-import)

**Not ideal for:**

- Making one-off per-group changes to a single app (faster to do directly in the Intune portal)
- Setting different intents per group in the same operation (the wizard applies one intent to all selections)
- Removing assignments (the wizard adds or updates assignments; it does not remove existing ones)

## CSV Import Shortcut

You can skip the manual selection steps entirely by importing a CSV file. Click **Import CSV** at the top of the wizard page to upload a prepared assignment file. The wizard will validate the data and jump directly to the Review step.

See [CSV Import/Export](../csv.md) for the full CSV format reference.
