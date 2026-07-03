---
title: Configuration Profiles
description: Browsing, filtering, and managing Intune Settings Catalog configuration policies.
tags:
  - profiles
  - configuration-policies
  - settings-catalog
  - intune
---

# Configuration Profiles

The Configuration Profiles section (`/profiles`) displays all **Settings Catalog** configuration policies in your Intune tenant. You can filter, search, and sort the list, and navigate to individual profile details.

!!! note "Settings Catalog vs legacy profiles"
    This section shows **Settings Catalog** policies (also known as `configurationPolicies` in the Graph API). These are the modern, recommended way to manage device configuration in Intune. Legacy **Device Configuration** profiles (the older `deviceConfigurations` resource) are not shown here.

    Settings Catalog policies are more flexible, support a wider range of settings, and are the direction Microsoft is moving for all new Intune features.

## Profile List

The profile list shows every Settings Catalog policy returned by the Microsoft Graph API. Each row displays:

| Field | Description |
|---|---|
| **Profile name** | The display name of the policy |
| **Platform** | The target platform (Windows, macOS, iOS/iPadOS, Android, Linux) |
| **Technologies** | The management technology (e.g. MDM, Config Manager) |
| **Assignment badge** | Indicates whether the profile has at least one assignment |

Profiles are sorted alphabetically by name (A--Z) by default.

## Filtering

The filter bar at the top of the page provides several ways to narrow the list:

### Platform

Filter profiles by target platform. Select one or more:

- **Windows**
- **macOS**
- **iOS**
- **Android**
- **Android Enterprise**
- **Linux**

### Technology

Filter by the management technology used:

- **MDM**
- **Config Manager**
- **Microsoft Defender**
- **Enrollment**

### Assignment Status

Toggle between three states:

| Status | Description |
|---|---|
| **All** | Show all profiles (default) |
| **Assigned** | Only profiles with at least one group assignment |
| **Unassigned** | Only profiles with no assignments |

## Search

The search input filters the profile list by name in real time. Matching is case-insensitive and happens client-side. The search works in combination with any active filters.

The list header updates to show how many profiles match your current criteria (e.g. "8 of 42 profiles matching "Firewall"").

## Sorting

Use the sort dropdown to change the list order:

| Sort | Description |
|---|---|
| **Name A--Z** | Alphabetical, ascending (default) |
| **Name Z--A** | Alphabetical, descending |
| **By Platform** | Grouped by target platform |

## Profile Detail Page

Click any profile row to navigate to the profile detail page (`/profiles/[id]`). This page shows:

- Profile name
- Description
- Platform
- Technologies
- Setting count
- Current assignments

A **Bulk Assign** button is available that navigates to the [Bulk Assignment](bulk-assignment.md) wizard with this profile pre-selected.

## Pagination

If your tenant has more than 100 Settings Catalog policies, the list loads in pages of 100. A **Load more profiles** button appears at the bottom of the list to fetch the next page.

## Empty States

If your Intune tenant has no Settings Catalog policies, the profile list shows an empty state message. If your filters or search return no results, a separate message suggests adjusting your criteria.
