---
title: Dashboard
description: Overview of the Intune Assignments Manager dashboard, including stats, recent activity, and quick actions.
tags:
  - dashboard
  - overview
  - stats
---

# Dashboard

The dashboard is the landing page of the app. It provides a high-level overview of your Intune tenant's apps, configuration profiles, and recent assignment activity.

## Greeting

The dashboard displays a time-based greeting (Good morning / Good afternoon / Good evening) personalised with your first name from your Microsoft Entra ID profile.

## Stat Cards

Four stat cards are displayed across the top of the dashboard:

| Card | Description |
|---|---|
| **Total Apps** | Count of all mobile apps in your Intune tenant |
| **Config Profiles** | Count of all Settings Catalog configuration policies |
| **Assigned Items** | Combined count of apps and profiles that have at least one assignment |
| **Recent Changes** | Number of assignment-related audit events returned (up to the last 5) |

These counts are fetched from the Microsoft Graph API when you first load the dashboard.

## Recent Activity

The **Recent Activity** feed shows the last 5 Intune audit events related to assignments. Each entry displays:

| Field | Description |
|---|---|
| **Activity** | The operation that was performed (e.g. "Patch mobileAppAssignment") |
| **Actor** | The user principal name or application that performed the action |
| **Time** | Relative timestamp (e.g. "5m ago", "2h ago", "3d ago") |

The activity feed pulls from the Intune audit log, filtered to assignment-related operations.

## Quick Actions

Three quick-action buttons are available in the sidebar:

| Button | Destination |
|---|---|
| **Bulk Assign** | The [Bulk Assignment](bulk-assignment.md) wizard at `/assign` |
| **Browse Apps** | The [Apps](apps.md) list at `/apps` |
| **Browse Profiles** | The [Configuration Profiles](profiles.md) list at `/profiles` |

## Caching and Refresh

Dashboard data is **cached in localStorage** to avoid redundant API calls on every page load. The cache has a **15-minute TTL** -- after 15 minutes, the next dashboard load fetches fresh data automatically.

To force a refresh before the cache expires, click the **Refresh** button in the page header. This clears the cache and re-fetches all dashboard data from the Graph API.

!!! tip "Stale counts"
    If the stat cards show `---` instead of numbers, you are either not signed in or the data is still loading. If counts look outdated after making changes elsewhere, click **Refresh** to update them.

## Unauthenticated State

If you are not signed in, the dashboard displays a prompt to sign in with your Microsoft account. The stat cards, activity feed, and quick actions are hidden until you authenticate.
