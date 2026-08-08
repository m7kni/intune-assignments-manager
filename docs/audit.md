---
title: Audit Log
description: Browse and filter Intune audit events to track assignment changes and administrative actions
tags:
  - audit
  - logging
  - compliance
---

# Audit Log

The Audit Log page displays Intune audit events from the Microsoft Graph API. Use it to verify assignment changes, investigate issues, or review administrative activity in your tenant.

Navigate to **Audit Log** in the sidebar or press ++ctrl+k++ and search for "audit".

## Filters

### Date Range Presets

Quick-select buttons at the top filter events by time period:

| Preset       | Effect                       |
| ------------ | ---------------------------- |
| **Today**    | Events from today only       |
| **7 days**   | Events from the last 7 days  |
| **30 days**  | Events from the last 30 days |
| **All time** | No date filter applied       |

You can also set custom **From** and **To** dates using the date pickers in the filter bar.

### Activity Type

| Option                | Description                                                                                                 |
| --------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Assignment events** | Shows only assignment-related audit events (default). Reduces noise when verifying bulk assignment changes. |
| **All events**        | Shows all Intune audit events regardless of type.                                                           |

### Search

The search field filters the currently loaded events by:

- Activity name
- Actor (user principal name)
- Resource name

This is a client-side filter applied to the events already fetched. To change the server-side filter, adjust the date range or activity type and click **Apply**.

## Event List

Each event row displays:

| Field     | Description                                                      |
| --------- | ---------------------------------------------------------------- |
| Activity  | The action that was performed (e.g., "Assign MobileApp")         |
| Actor     | The user principal name or application that performed the action |
| Resource  | The primary resource affected (app name, profile name, etc.)     |
| Result    | Success or Failure badge                                         |
| Timestamp | When the event occurred                                          |

## Expanded Details

Click any event row to expand it and view the full audit record:

| Field          | Description                                               |
| -------------- | --------------------------------------------------------- |
| Timestamp      | Full date and time of the event                           |
| Component      | The Intune component that generated the event             |
| User           | The user principal name of the actor                      |
| Category       | The audit category (e.g., "Application", "Configuration") |
| Correlation ID | A GUID linking related events from the same operation     |
| Operation      | The operation type (Create, Update, Delete, etc.)         |

### Resources and Modified Properties

Below the event details, each affected resource is shown with:

- Resource display name and type
- A **Modified Properties** table showing what changed:
  - **Property name** -- the field that was modified
  - **Old value** -- the previous value (if applicable)
  - **New value** -- the updated value

This is particularly useful for verifying that bulk assignment changes applied the correct intent, filters, and group targets.

## Pagination

The audit log loads 25 events at a time. If more events are available, a **Load more events** button appears at the bottom of the list. The button is hidden when a client-side search filter is active.

!!! note "Audit event delay"
Audit events may take a few minutes to appear after an assignment change is made. If you just ran a bulk assignment, wait briefly and then refresh the page.
