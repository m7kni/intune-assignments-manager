---
title: Permissions
description: Microsoft Graph permission scopes and tiers used by Intune Assignments Manager.
tags:
  - permissions
  - scopes
  - microsoft-graph
  - security
---

# Permissions

Intune Assignments Manager uses a **tiered permission model**. Only the core permissions (Tier 1) are requested at sign-in. Additional tiers are requested via incremental consent when you access features that need them.

!!! warning "Broad permissions"
The Graph API scopes required for Intune management are broad by necessity -- `ReadWrite.All` scopes grant access to all apps, profiles, and devices in your tenant, not just specific ones. Evaluate these permissions carefully. Consider using a **dedicated service account** or a **test tenant** when evaluating the app for the first time.

## Permission Tiers

### Tier 1 -- Core (Required)

Granted on first sign-in. Enables all primary features.

| Scope                                         | Description                                                         |
| --------------------------------------------- | ------------------------------------------------------------------- |
| `User.Read`                                   | Sign in and read your profile (name, email)                         |
| `DeviceManagementApps.ReadWrite.All`          | Read and write Intune app configurations and assignments            |
| `DeviceManagementConfiguration.ReadWrite.All` | Read and write Intune device configuration policies and assignments |
| `Group.Read.All`                              | Read Azure AD group memberships for assignment targets              |

**Enables**: Dashboard, Apps, Configuration Profiles, Bulk Assignment, Audit Log

### Tier 2 -- Device Management (Optional)

| Scope                                     | Description                                         |
| ----------------------------------------- | --------------------------------------------------- |
| `DeviceManagementManagedDevices.Read.All` | Read managed device inventory and compliance status |

**Enables**: Device browsing (future feature)

### Tier 3 -- Device Actions (Optional)

| Scope                                          | Description                                               |
| ---------------------------------------------- | --------------------------------------------------------- |
| `DeviceManagementManagedDevices.ReadWrite.All` | Perform device management actions (sync, restart, retire) |

**Enables**: Device sync, restart, and retire actions (future feature)

### Tier 4 -- Autopilot (Optional)

| Scope                                    | Description                                                    |
| ---------------------------------------- | -------------------------------------------------------------- |
| `DeviceManagementServiceConfig.Read.All` | Read Windows Autopilot enrollment data and deployment profiles |

**Enables**: Windows Autopilot management (future feature)

## Granting Additional Permissions

1. Navigate to **Settings** from the top navigation bar
2. Under **Permission Tiers**, you will see each tier with its current status (granted or not granted)
3. Click **Grant** next to the tier you want to enable
4. A consent popup appears -- review the requested scopes and click **Accept**
5. The tier status updates to reflect the newly granted permissions

!!! tip "Admin consent"
If your organisation requires admin consent for these scopes, a tenant administrator can pre-consent for all users from the Azure Portal: **App registrations** > your app > **API permissions** > **Grant admin consent**.

## How Scopes Map to Features

| Feature                | Route              | Required Tier |
| ---------------------- | ------------------ | ------------- |
| Dashboard              | `/`                | Tier 1        |
| Apps                   | `/apps`            | Tier 1        |
| Configuration Profiles | `/profiles`        | Tier 1        |
| Bulk Assignment Wizard | `/assign`          | Tier 1        |
| Audit Log              | `/audit`           | Tier 1        |
| Deployment Status      | `/status`          | Tier 1        |
| Device Browsing        | `/devices`         | Tier 2        |
| Device Actions         | `/devices/actions` | Tier 3        |
| Autopilot              | `/autopilot`       | Tier 4        |

## Checking Granted Permissions

The **Settings** page shows which scopes have been granted in the current session. Granted scopes are tracked locally and persist across page refreshes. Signing out clears all tracked permissions.

## Revoking Permissions

To revoke permissions granted to the app:

1. Go to [myapps.microsoft.com](https://myapps.microsoft.com)
2. Find **Intune Assignments Manager** (or whatever you named the app registration)
3. Click the app and select **Revoke permissions**

Alternatively, a tenant administrator can revoke consent from the Azure Portal under the app registration's **API permissions** blade.
