---
title: Getting Started
description: Prerequisites, Azure app registration, deployment, and first login for Intune Assignments Manager.
tags:
  - setup
  - azure
  - deployment
  - quickstart
---

# Getting Started

This guide walks you through setting up the Intune Assignments Manager from scratch: creating an Azure app registration, deploying the app, and signing in for the first time.

## Prerequisites

Before you begin, ensure you have:

- A **Microsoft 365 subscription** with **Microsoft Intune** licensed
- An **Azure AD (Entra ID) tenant** where you can create app registrations
- An account with permission to **create app registrations** in your tenant (or an admin who can do it for you)
- For local development: **Node.js 18+** and **pnpm**

## Azure App Registration

The app authenticates via OAuth2 PKCE (Authorization Code flow with Proof Key for Code Exchange). You need an app registration in Azure, but no client secret -- the PKCE flow is designed for public clients like single-page applications.

### Step 1: Create the registration

1. Open the [Azure Portal](https://portal.azure.com) and navigate to **Microsoft Entra ID** > **App registrations**
2. Click **New registration**
3. Enter a name (e.g. `Intune Assignments Manager`)
4. Under **Supported account types**, select **Accounts in this organizational directory only** (single tenant) or **Accounts in any organizational directory** (multi-tenant), depending on your needs
5. Click **Register**

### Step 2: Configure the platform

1. In your new app registration, go to **Authentication**
2. Click **Add a platform** and select **Single-page application (SPA)**
3. Add the following **Redirect URIs**:
    - `http://localhost:5173` (for local development)
    - Your Cloudflare Pages URL (e.g. `https://intune-assignments.pages.dev`) for production
4. Click **Configure**

!!! note "No client secret required"
    The PKCE flow does not use a client secret. Do not generate one -- it is not needed and would not be secure in a client-side application.

### Step 3: Copy the Client ID

1. Go to the **Overview** page of your app registration
2. Copy the **Application (client) ID** -- this is the only value you need

!!! tip "API permissions are handled automatically"
    You do **not** need to pre-configure API permissions on the app registration. The app requests permissions incrementally via consent popups when you first use each feature. An admin can also pre-consent for the entire organisation from the **API permissions** blade if preferred.

## Deployment

### Option A: Cloudflare Pages

1. Fork the repository to your GitHub account
2. In the [Cloudflare Dashboard](https://dash.cloudflare.com), go to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**
3. Select your forked repository
4. Configure the build:
    - **Build command**: `pnpm install && pnpm build`
    - **Build output directory**: `.svelte-kit/cloudflare`
5. Add the environment variable:
    - **Variable name**: `PUBLIC_ENTRA_CLIENT_ID`
    - **Value**: Your Application (client) ID from Step 3 above
6. Deploy

After deployment, add your Cloudflare Pages URL as a redirect URI in your Azure app registration (Step 2 above).

### Option B: Local development

```bash
# Clone the repository
git clone https://github.com/rknightion/intune-assignments-manager.git
cd intune-assignments-manager

# Install dependencies (pnpm is required)
pnpm install

# Create environment file
cp .env.example .env
```

Edit `.env` and set your Client ID:

```ini
PUBLIC_ENTRA_CLIENT_ID=your-client-id-here
```

Start the development server:

```bash
pnpm dev
```

The app will be available at `http://localhost:5173`.

## First Login

1. Open the app in your browser
2. Click **Sign in with Microsoft**
3. A popup window opens to the Microsoft login page -- sign in with your work account
4. On first sign-in, you will see a **consent prompt** requesting the core permissions (Tier 1). Review them and click **Accept**
5. The popup closes automatically and you are signed in

After signing in, the dashboard loads with your tenant's app and profile counts, assigned item totals, and recent audit activity.

!!! warning "Pop-up blockers"
    The sign-in flow uses a popup window. If your browser blocks popups, you will need to allow popups for the app's domain.

## Next Steps

- Review the [Permissions](permissions.md) page to understand what each scope enables
- Browse your [Apps](apps.md) and [Configuration Profiles](profiles.md)
- Try the [Bulk Assignment](bulk-assignment.md) wizard
