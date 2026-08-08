# Intune Assignments Manager

A browser-based tool for bulk-managing Microsoft Intune app and configuration profile
assignments through the Microsoft Graph API.

Intune's own console makes you edit assignments one app or profile at a time. This does it
in bulk: select any number of apps, configuration profiles, compliance policies or endpoint
security policies, pick the groups and filters, review the merged result, and apply.

**Documentation: <https://m7kni.io/intune-assignments-manager/>**

## How it works

Everything runs client-side. There is no server, no backend and no database — the app is a
static SvelteKit build deployed to Cloudflare Pages. It authenticates you directly against
Microsoft Entra ID with the OAuth2 authorization code flow with PKCE, and every Graph API
call goes from your browser to Microsoft. No token or tenant data ever reaches a third party.

Graph's `assign` endpoint **replaces** an item's entire assignment list rather than adding to
it, so the bulk flow always fetches current assignments first, merges your changes in, flags
conflicts, and only then writes back.

## Features

- Browse mobile apps, Settings Catalog configuration profiles, compliance policies, endpoint
  security policies and managed devices across the tenant
- Bulk assignment wizard with conflict detection and a review step before anything is written
- CSV import for assignments defined outside the app
- Assignment filters, including/excluding groups, and `allDevices` / `allUsers` targets
- App install status reporting via the Intune Reports API
- Intune audit log browsing
- Incremental consent — extra Graph scopes are only requested when a feature needs them

## Running it locally

Requires [pnpm](https://pnpm.io/) and an Entra ID app registration (see the
[authentication docs](https://m7kni.io/intune-assignments-manager/authentication/) for the
redirect URI and API permissions it needs).

```sh
git clone https://github.com/rknightion/intune-assignments-manager.git
cd intune-assignments-manager
pnpm install
cp .env.example .env   # then set PUBLIC_ENTRA_CLIENT_ID
pnpm dev
```

Other commands:

```sh
pnpm build    # production build to .svelte-kit/cloudflare
pnpm check    # TypeScript / svelte-check
pnpm lint     # ESLint
pnpm format   # Prettier
```

## Contributing

Issues and pull requests are welcome. See the
[development docs](https://m7kni.io/intune-assignments-manager/development/) for the
architecture overview and conventions.

## License

Licensed under the GNU Affero General Public License v3.0 only. See [LICENSE](LICENSE).

Because this is network-deployed software, the AGPL's section 13 applies: if you run a
modified version and let others use it over a network, you must offer them the source of
your modified version.
