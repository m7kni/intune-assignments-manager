---
title: 'Step 3: Configure'
description: Set the assignment intent and optional assignment filters for the bulk assignment
tags:
  - assignments
  - wizard
  - intent
  - filters
---

# Step 3: Configure

The third step configures the assignment settings that will apply to all selected items and groups.

## Assignment Intent

Select one of the following intents:

| Intent                        | Description                                                                      |
| ----------------------------- | -------------------------------------------------------------------------------- |
| **Required**                  | The app must be installed on all targeted devices. Intune will force-install it. |
| **Available**                 | The app appears in the Company Portal for users to install on demand.            |
| **Available (No Enrollment)** | The app is available in the Company Portal without requiring MDM enrollment.     |
| **Uninstall**                 | The app will be removed from targeted devices.                                   |

!!! note "Intent applies to apps only"
Configuration profiles do not have an intent -- they are always applied to targeted groups. If your selection includes profiles, an info callout confirms this. The intent setting is still used for any apps in your selection.

The same intent applies to **all** selected items and **all** selected groups from this single configure step. If you need different intents for different items, run separate wizard sessions.

## Assignment Filters

Assignment filters let you narrow the scope of an assignment to a subset of devices within the targeted group. Filters are defined in the Intune portal based on device properties (OS version, device name, manufacturer, etc.).

To apply a filter:

1. Toggle the **Apply an assignment filter** switch
2. Select a filter from the dropdown (filters are loaded from your tenant)
3. Choose the filter mode:

| Mode        | Effect                                                                             |
| ----------- | ---------------------------------------------------------------------------------- |
| **Include** | Only devices matching the filter receive the assignment                            |
| **Exclude** | All devices in the group receive the assignment _except_ those matching the filter |

!!! tip "Filter definitions"
Filters themselves are created and managed in the Intune portal under **Devices > Filters**. This tool only lets you select existing filters to attach to assignments.

## Preview

At the bottom of the page, a summary line confirms what you are about to do:

> You are assigning **3 apps** and **1 profile** to **4 groups** as **Required**

This updates in real-time as you change the intent or filter settings.
