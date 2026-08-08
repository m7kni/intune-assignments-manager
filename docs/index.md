---
title: Intune Assignments Manager
description: Bulk-manage Microsoft Intune app and configuration profile assignments from a single interface.
image: assets/social-card.png
tags:
  - intune
  - assignments
  - microsoft-graph
  - bulk-management
---

# Intune Assignments Manager

An enterprise tool for bulk-managing Microsoft Intune mobile app and configuration profile assignments. Browse your tenant's apps and policies, assign them to Azure AD groups in bulk, and audit every change -- all from a single browser-based interface.

The app runs entirely client-side. Your credentials and data never leave your browser except to communicate directly with the Microsoft Graph API. Deploy it to Cloudflare Pages or run it locally.

## Features

<div class="grid cards" markdown>

- :material-microsoft-azure:{ .lg .middle } **Getting Started**

  ***

  Prerequisites, Azure app registration, and first login walkthrough.

  [:octicons-arrow-right-24: Get started](getting-started.md)

- :material-shield-lock-outline:{ .lg .middle } **Authentication**

  ***

  How sign-in works, token management, and security model.

  [:octicons-arrow-right-24: Authentication](authentication.md)

- :material-key-variant:{ .lg .middle } **Permissions**

  ***

  Four permission tiers, what each scope enables, and how to grant them.

  [:octicons-arrow-right-24: Permissions](permissions.md)

- :material-view-dashboard-outline:{ .lg .middle } **Dashboard**

  ***

  Tenant overview with stats, recent activity, and quick actions.

  [:octicons-arrow-right-24: Dashboard](dashboard.md)

- :material-apps:{ .lg .middle } **Apps**

  ***

  Browse, filter, and search your Intune mobile applications.

  [:octicons-arrow-right-24: Apps](apps.md)

- :material-cog-outline:{ .lg .middle } **Configuration Profiles**

  ***

  Browse, filter, and search Settings Catalog configuration policies.

  [:octicons-arrow-right-24: Profiles](profiles.md)

- :material-layers-triple:{ .lg .middle } **Bulk Assignment**

  ***

  Five-step wizard for assigning apps and profiles to groups at scale.

  [:octicons-arrow-right-24: Bulk Assignment](assign/index.md)

- :material-file-delimited-outline:{ .lg .middle } **CSV Import / Export**

  ***

  Export assignments to CSV and import them back for repeatable workflows.

  [:octicons-arrow-right-24: CSV](csv.md)

- :material-clipboard-text-clock-outline:{ .lg .middle } **Audit Log**

  ***

  Review Intune assignment changes with date range and activity filters.

  [:octicons-arrow-right-24: Audit Log](audit.md)

- :material-chart-bar:{ .lg .middle } **Deployment Status**

  ***

  Monitor app install failures and profile deployment errors.

  [:octicons-arrow-right-24: Status](status.md)

</div>

## What it does

Intune Assignments Manager connects to your Microsoft 365 tenant via the Microsoft Graph API and provides:

- **Unified browsing** of all mobile apps and Settings Catalog configuration profiles in your Intune tenant
- **Bulk assignment** of multiple apps and profiles to multiple Azure AD groups in a single operation
- **Conflict detection** when the same group is targeted with different assignment settings
- **Safe merging** of new assignments with existing ones (the Graph API replaces all assignments on each POST, so the app always fetches current state first)
- **CSV workflows** for exporting current assignments and importing new ones
- **Audit visibility** into recent assignment-related changes in your tenant
- **Deployment monitoring** for app install and profile deployment failures

All operations use the Microsoft Graph `beta` endpoint and require appropriate Intune administrator permissions.
