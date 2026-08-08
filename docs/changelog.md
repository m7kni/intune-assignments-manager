---
title: Changelog
description: Release history and notable changes
tags:
  - changelog
  - releases
---

# Changelog

All notable changes to Intune Assignments Manager are documented here.

## v1.0.0 -- Initial Release

### Features

- **Dashboard** -- Tenant overview with app/profile counts, recent activity feed, and quick actions
- **App Browser** -- Browse and filter all mobile apps with platform, type, and assignment status filters
- **Config Profile Browser** -- Browse and filter Settings Catalog configuration policies
- **Bulk Assignment Wizard** -- 5-step wizard for bulk-assigning apps and profiles to AAD groups
  - Step 1: Select multiple apps and/or profiles
  - Step 2: Select target groups, All Devices, All Users, and exclusion groups
  - Step 3: Configure assignment intent and optional assignment filters
  - Step 4: Review merged assignments with conflict detection and resolution
  - Step 5: Track execution progress with per-item retry on failure
- **CSV Import/Export** -- Import assignment configurations from CSV; export current assignments
- **Audit Log** -- Browse Intune audit events with filtering and expandable row details
- **Deployment Status** -- App install failure summary and profile deployment error overview
- **Permission Management** -- Tiered permission model with incremental consent
- **Dark/Light Theme** -- System preference detection with manual toggle
- **Command Palette** -- Quick navigation with keyboard shortcut (Ctrl+K / Cmd+K)
- **Keyboard Shortcuts** -- Full keyboard navigation support
