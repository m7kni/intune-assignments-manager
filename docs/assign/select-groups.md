---
title: 'Step 2: Select Groups'
description: Pick target AAD groups, All Devices, All Users, and exclusion groups for the assignment
tags:
  - assignments
  - wizard
  - groups
---

# Step 2: Select Groups

The second step is selecting which groups the assignments will target. You choose both inclusion groups (who gets the assignment) and optionally exclusion groups (who is explicitly excluded).

## Built-in Targets

Two special targets are pinned at the top of the page:

| Target          | Description                                                         |
| --------------- | ------------------------------------------------------------------- |
| **All Devices** | Targets every managed device in your tenant. No AAD group required. |
| **All Users**   | Targets every licensed user in your tenant. No AAD group required.  |

Click either checkbox to toggle it. These can be combined with specific group selections.

## Searching for Groups

Below the built-in targets is a search field. Type at least **2 characters** to search AAD security groups via the Microsoft Graph API in real-time.

Search results show:

- Group display name
- Group description (if set)
- A **(Dynamic)** label for dynamic membership groups

Click a group row or its checkbox to add it to your selection. Selected groups appear as chips above the search field.

!!! tip "Group cache"
Recently searched groups are cached locally in your browser. This makes repeat searches faster and reduces API calls.

## Exclusion Groups

Toggle the **Add exclusion groups** switch to reveal the exclusion group search. Exclusion groups work identically to inclusion groups but create exclusion assignments -- devices or users in these groups will be explicitly excluded from the assignment.

Key behaviors:

- A group cannot be both included and excluded. If you add a group as an exclusion that was already selected as an inclusion, it is automatically moved.
- Exclusion groups are shown with a red badge to distinguish them from inclusion groups.
- The exclusion group count is displayed next to the toggle.

## Selection Requirements

At least one group (inclusion or built-in target) must be selected to proceed to the next step. Exclusion groups alone are not sufficient.

## Removing Groups

Click the **X** on any group chip to remove it from the selection. For built-in targets (All Devices / All Users), you can also uncheck their checkbox.
