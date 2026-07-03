---
title: FAQ
description: Frequently asked questions about authentication, bulk assignments, CSV operations, and common issues
tags:
  - faq
  - troubleshooting
  - help
---

# Frequently Asked Questions

## Authentication

**Q: I get a popup blocker message when signing in.**

A: The app uses a popup window for Microsoft authentication. Allow popups for the site in your browser settings. Most browsers show a notification in the address bar when a popup is blocked -- click it to allow and try again.

---

**Q: My session expires and I have to sign in again.**

A: Access tokens expire after approximately 1 hour. The app automatically attempts to refresh your token in the background. If the silent refresh fails (e.g., due to a network issue or a change in your account), you will need to sign in again. Your wizard state is preserved in memory, so you can resume after re-authenticating.

---

**Q: I see "insufficient permissions" errors.**

A: Navigate to **Settings** and check the permission tiers. The app uses incremental consent -- you can grant permissions in stages. Some operations require higher-level permissions:

| Operation | Required scopes |
|---|---|
| **Read-only browsing** | `DeviceManagementApps.Read.All`, `DeviceManagementConfiguration.Read.All` |
| **Assignment management** | `DeviceManagementApps.ReadWrite.All`, `DeviceManagementConfiguration.ReadWrite.All` |
| **Group search** | `Group.Read.All` |
| **Audit log** | `DeviceManagementApps.Read.All` |

Click **Grant Permissions** on the Settings page for the tier you need.

---

## Bulk Assignment

**Q: Will this overwrite my existing assignments?**

A: The app always fetches current assignments and merges your new assignments with them. Existing assignments that are not part of your new selections are preserved. However, you should always review the changes on the **Review** step before applying. The underlying Graph API `assign` endpoint replaces the full assignment list, which is why the merge step is critical.

---

**Q: What happens if an assignment fails?**

A: Each item is processed independently. If one app's assignment fails, other items are unaffected. Failed items show an error message on the Results step. You can click **Retry Failed** to re-attempt all items, or investigate the error and make corrections.

---

**Q: Can I assign to All Devices and a specific group at the same time?**

A: Yes. On Step 2 (Select Groups), select the **All Devices** checkbox and also search for and select specific groups. Both will receive the assignment.

---

**Q: Why do I see conflicts?**

A: A conflict means the same group already has an assignment for that app or profile, but with different settings -- a different intent (e.g., "Available" vs. "Required") or a different assignment filter. For each conflict, choose **Update** to apply your new settings, or **Skip** to keep the existing assignment unchanged.

---

**Q: Can I set different intents for different apps in the same wizard run?**

A: No. The wizard applies a single intent to all selected items and groups. If you need different intents, run separate wizard sessions for each intent group.

---

## CSV

**Q: My CSV import shows validation errors.**

A: Check the following:

| Error | Cause |
|---|---|
| **Missing headers** | The CSV must include `ItemType`, `ItemName`, and `TargetType` columns at minimum |
| **Invalid ItemType** | Must be `app` or `profile` (case-insensitive) |
| **Invalid TargetType** | Must be `group`, `exclusion`, `allDevices`, or `allUsers` |
| **Missing group info** | `group` and `exclusion` targets require either `GroupId` or `GroupName` |
| **Unresolved IDs** | App/profile/group IDs must exist in your tenant. If using names instead of IDs, the names must match exactly |

---

**Q: Can I export existing assignments and re-import them?**

A: Yes, this is a supported workflow. Export from the app/profile list pages, then import the CSV on the Bulk Assign page. The wizard will validate the data and let you review before applying. This is useful for cloning assignments or creating a backup.

---

**Q: Do I need both the ID and Name columns?**

A: Provide at least one. If `ItemId` is present, the name is used only for display. If `ItemId` is empty, the app resolves the `ItemName` by searching your tenant. The same applies to `GroupId`/`GroupName` and `FilterId`/`FilterName`. Using IDs is more reliable since name resolution depends on exact matches.

---

## Status Page

**Q: Why are some profiles missing from the status page?**

A: The device status overview endpoint only works for legacy device configuration profiles. **Settings Catalog policies** (the newer configuration format) return a 404 from this endpoint and are silently excluded. Microsoft has not yet provided a working Reports API endpoint for Settings Catalog profile status.

---

**Q: The failure counts look wrong or outdated.**

A: The Reports API data reflects the last sync cycle, which may be several hours old. Wait for the next reporting cycle and refresh the page. The status page does not show real-time device state.

---

## General

**Q: Is my data stored anywhere externally?**

A: No. All data is fetched directly from the Microsoft Graph API in your browser. Nothing is sent to or stored on external servers. The app is entirely client-side -- it runs on Cloudflare Pages as static files. The only data stored locally is your browser's localStorage cache (group names, filter lists, theme preference).

---

**Q: Do I need admin consent for the app registration?**

A: Yes. The Microsoft Graph API permissions required by this app (`DeviceManagementApps.ReadWrite.All`, `DeviceManagementConfiguration.ReadWrite.All`, `Group.Read.All`) are admin-level permissions. A **Global Administrator** or **Intune Administrator** needs to grant admin consent for your Entra ID tenant through the Azure portal or during the first sign-in.

---

**Q: Which browsers are supported?**

A: The app works in modern evergreen browsers: Chrome, Edge, Firefox, and Safari. Internet Explorer is not supported. The app requires JavaScript enabled and popup windows allowed for authentication.

---

**Q: Can I use this app with GCC or sovereign cloud tenants?**

A: The app is configured for the Microsoft public cloud (`login.microsoftonline.com` / `graph.microsoft.com`). GCC High, DoD, and sovereign clouds use different endpoints and are not supported without modifying the MSAL and Graph API configuration.
