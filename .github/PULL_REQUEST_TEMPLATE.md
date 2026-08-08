<!--
Thanks for contributing! Please keep PRs focused.
Do not include secrets, tokens, tenant identifiers, or any Entra ID / Intune record content.
-->

## What & why

<!-- What does this change do, and what problem does it solve? -->

## Checklist

- [ ] `pnpm lint`, `pnpm check` and `pnpm build` are all green
- [ ] New `.ts` / `.svelte` files carry the `SPDX-License-Identifier: AGPL-3.0-only` header
- [ ] Conventional Commit title (`feat:` / `fix:` / `docs:` / … ; `!` for breaking)
- [ ] No tenant-specific or customer-specific values added (kept configurable)
- [ ] Svelte 5 conventions: `SvelteMap`/`SvelteSet` over native, `const` for `$derived`, every `{#each}` keyed
- [ ] Graph API endpoints verified to actually exist — many documented Intune endpoints are removed or 500

## Notes for reviewers

<!-- Anything reviewers should focus on, risks, follow-ups. -->
