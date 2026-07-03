---
title: Apps
description: Browsing, filtering, and managing Intune mobile applications in the Assignments Manager.
tags:
  - apps
  - mobile-apps
  - intune
  - filtering
---

# Apps

The Apps section (`/apps`) displays all mobile applications configured in your Intune tenant. You can filter, search, and sort the list, and navigate to individual app details.

## App List

The app list shows every mobile app returned by the Microsoft Graph API. Each row displays:

| Field | Description |
|---|---|
| **App icon** | Fetched from the Graph API and cached |
| **App name** | The display name of the app |
| **App type** | Derived from the Graph `@odata.type` property (e.g. Store App, LOB App, Win32 App, Web App) |
| **Assignment badge** | Indicates whether the app has at least one assignment |

Apps are sorted alphabetically by name (A--Z) by default.

## Filtering

The filter bar at the top of the page provides several ways to narrow the list:

### Platform

Filter apps by their target platform. Select one or more platforms:

- **Windows**
- **iOS**
- **Android**
- **macOS**
- **Web**

Platform is derived from the app's Graph API type (e.g. `#microsoft.graph.iosStoreApp` maps to iOS).

### App Type

Filter by the type of application. The available types are derived dynamically from the apps in your tenant, so you only see types that actually exist. Common types include:

- Store App (iOS, Android, Microsoft Store)
- Line-of-Business (LOB)
- Win32 App
- Web App / Web Link
- Microsoft 365 Apps
- Built-in App

### Assignment Status

Toggle between three states:

| Status | Description |
|---|---|
| **All** | Show all apps (default) |
| **Assigned** | Only apps with at least one group assignment |
| **Unassigned** | Only apps with no assignments |

## Search

The search input filters the app list by name in real time. Matching is case-insensitive and happens client-side, so results appear instantly. The search works in combination with any active filters.

The list header updates to show how many apps match your current filters (e.g. "12 of 156 applications matching "Teams"").

## Sorting

Use the sort dropdown to change the list order:

| Sort | Description |
|---|---|
| **Name A--Z** | Alphabetical, ascending (default) |
| **Name Z--A** | Alphabetical, descending |
| **By Type** | Grouped by app type |

## App Detail Page

Click any app row to navigate to the app detail page (`/apps/[id]`). This page shows:

- App icon (full size)
- Display name
- Publisher
- Description
- Current assignments

A **Bulk Assign** button is available that navigates to the [Bulk Assignment](bulk-assignment.md) wizard with this app pre-selected.

## Empty States

If your Intune tenant has no mobile apps configured, the app list shows an empty state message. If your filters or search return no results, a separate message suggests adjusting your criteria.

!!! note "App icons"
    App icons are fetched from the Graph API. Some apps (particularly LOB apps and Win32 apps) may not have icons, in which case a placeholder is shown.
