---
title: 'Step 1: Select Items'
description: Choose which apps and configuration profiles to include in the bulk assignment
tags:
  - assignments
  - wizard
  - apps
  - profiles
---

# Step 1: Select Items

The first step of the Bulk Assignment wizard is selecting which apps and configuration profiles you want to assign. You can select any combination of apps and profiles in a single run.

## Browsing Apps and Profiles

The step has two tabs: **Apps** and **Config Profiles**. Switch between them to browse and select from each category.

### Apps Tab

Lists all mobile apps from your Intune tenant. Each row shows:

- App name and publisher
- App type icon (Win32, MSI, iOS, Android, etc.)

**Filters available:**

| Filter            | Options                                                                      |
| ----------------- | ---------------------------------------------------------------------------- |
| Search            | Free-text search by app name                                                 |
| Platform          | Windows, iOS/iPadOS, Android, macOS                                          |
| App Type          | Win32, MSI, Store app, LOB, Web link, etc. (derived from your tenant's apps) |
| Assignment Status | All, Assigned, Unassigned                                                    |

### Config Profiles Tab

Lists all Settings Catalog configuration policies. Each row shows:

- Profile name
- Platform and technology type
- Number of settings configured

**Filters available:**

| Filter            | Options                             |
| ----------------- | ----------------------------------- |
| Search            | Free-text search by profile name    |
| Platform          | Windows, iOS/iPadOS, Android, macOS |
| Technology        | MDM, Group Policy, etc.             |
| Assignment Status | All, Assigned, Unassigned           |

## Selecting Items

Click any row (or its checkbox) to toggle selection. Selected items appear as chips above the item list. Click the **X** on a chip to deselect it.

You can select items from both tabs -- your selections persist when switching between Apps and Config Profiles.

The **Next** button is disabled until at least one item is selected.

## Pre-Selection via URL

If you navigate to the wizard from an app or profile detail page, that item is automatically pre-selected. The URL parameters used are:

| Parameter           | Effect                                    |
| ------------------- | ----------------------------------------- |
| `?appId=<guid>`     | Pre-selects the app with the given ID     |
| `?profileId=<guid>` | Pre-selects the profile with the given ID |

You can combine both parameters to pre-select one app and one profile simultaneously.

!!! tip "Quick assign from detail pages"
On any app or profile detail page, look for the **Assign** button. It links directly to the wizard with that item pre-selected.

## Data Loading

Apps and profiles are fetched from the Microsoft Graph API when you first enter this step. The data is cached in memory for the duration of the wizard session, so navigating back to this step from later steps does not trigger a re-fetch.
