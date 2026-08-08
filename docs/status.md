---
title: Deployment Status
description: Monitor app installation failures and configuration profile deployment errors across your tenant
tags:
  - status
  - monitoring
  - deployment
  - errors
---

# Deployment Status

The Deployment Status page provides a health check on app installations and profile deployments across your Intune tenant. Use it to quickly identify items that are failing to deploy.

Navigate to **Status** in the sidebar or press ++ctrl+k++ and search for "status".

## Summary Cards

Four stat cards at the top give a high-level overview:

| Card                     | Description                                                      |
| ------------------------ | ---------------------------------------------------------------- |
| **Total Apps**           | Number of mobile apps in your tenant                             |
| **Apps with Failures**   | Number of apps that have at least one failed device installation |
| **Total Profiles**       | Number of configuration policies in your tenant                  |
| **Profiles with Errors** | Number of profiles with deployment errors                        |

## Apps with Failed Installations

This section lists apps that have at least one failed device installation, sorted by failure count (highest first).

Data source: Intune Reports API (`getAppsInstallSummaryReport`).

Each row shows:

| Field        | Description                                 |
| ------------ | ------------------------------------------- |
| App name     | The display name of the app                 |
| Publisher    | The app publisher                           |
| Failed count | Number of devices where installation failed |

Click any app to navigate to its detail page for more information.

!!! tip "Investigate failures"
From the app detail page, you can review the app's current assignments and verify that the correct groups and intent are configured.

## Profiles with Deployment Errors

This section lists configuration profiles that have deployment errors or failures, sorted by error count (highest first).

Data source: `deviceConfigurations/{id}/deviceStatusOverview` (v1.0 API).

Each row shows:

| Field        | Description                                        |
| ------------ | -------------------------------------------------- |
| Profile name | The display name of the configuration policy       |
| Platform     | The target platform                                |
| Error count  | Combined count of error and failed device statuses |

Click any profile to navigate to its detail page.

!!! warning "Settings Catalog limitation"
The device status overview endpoint only works for **legacy device configuration profiles**. Settings Catalog policies (`configurationPolicies`) return a 404 from this endpoint and are silently skipped. This means some profiles may not appear in the error list even if they have deployment issues.

## Data Freshness

The status data comes from the Intune Reports API and the device configuration status endpoints. This data reflects the **last reporting cycle**, not real-time device state.

- Reports API data may be up to several hours old
- The page loads all data on initial render; refresh the page to get updated numbers
- Large tenants with many apps may take several seconds to load as the Reports API processes the request

!!! note "Zero failures is good"
If both sections show empty states ("All apps are installing successfully" / "All profiles are deploying successfully"), your tenant has no reported deployment failures.
