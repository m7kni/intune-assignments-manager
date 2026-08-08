<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<script lang="ts">
	import AuthGuard from '$lib/components/ui/AuthGuard.svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { ShieldCheck, Check, Lock } from 'lucide-svelte';
	import { PERMISSION_TIERS, SCOPE_DESCRIPTIONS } from '$lib/auth/permissions';
	import {
		hasAllPermissions,
		ensurePermissions,
		permissions,
		clearConsentError
	} from '$lib/stores/permissions.svelte';

	let grantingTierId = $state<number | null>(null);

	async function handleGrant(tierId: number, scopes: readonly string[]) {
		grantingTierId = tierId;
		clearConsentError();
		await ensurePermissions([...scopes]);
		grantingTierId = null;
	}

	function isTierGranted(scopes: readonly string[]): boolean {
		return hasAllPermissions(scopes);
	}

	function getScopeDescription(scope: string): string {
		return SCOPE_DESCRIPTIONS[scope] ?? scope;
	}
</script>

<AuthGuard>
	<div class="animate-fade-in-up">
		<PageHeader
			title="Permissions & Consent"
			icon={ShieldCheck}
			description="Manage Microsoft Graph API permissions for this application"
		/>

		<div class="space-y-4">
			{#each PERMISSION_TIERS as tier (tier.id)}
				{@const granted = isTierGranted(tier.scopes)}
				<div class="panel">
					<div class="flex items-start justify-between gap-4">
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2">
								<h3 class="text-ink text-base font-semibold">
									Tier {tier.id}: {tier.name}
								</h3>
								{#if granted}
									<Badge variant="required" dot>Granted</Badge>
								{:else if tier.id === 1}
									<Badge variant="available" dot>Sign-in</Badge>
								{:else}
									<Badge variant="neutral" dot>Not granted</Badge>
								{/if}
							</div>
							<p class="text-ink-faint mt-1 text-sm">{tier.description}</p>
						</div>

						{#if !granted && tier.id !== 1}
							<Button
								variant="primary"
								size="sm"
								icon={Lock}
								loading={grantingTierId === tier.id}
								onclick={() => handleGrant(tier.id, tier.scopes)}
							>
								{grantingTierId === tier.id ? 'Requesting...' : 'Grant'}
							</Button>
						{:else if granted}
							<div
								class="bg-success-light flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
							>
								<Check size={16} class="text-success" />
							</div>
						{/if}
					</div>

					<!-- Scope details -->
					<div class="panel-inset mt-3">
						<ul class="space-y-1">
							{#each tier.scopes as scope (scope)}
								<li class="flex items-center gap-2 text-sm">
									<span
										class="h-1.5 w-1.5 shrink-0 rounded-full {granted ? 'bg-success' : 'bg-muted'}"
									></span>
									<span class="text-ink-light">{getScopeDescription(scope)}</span>
									<span class="text-muted ml-auto font-mono text-xs">
										{scope}
									</span>
								</li>
							{/each}
						</ul>
					</div>
				</div>
			{/each}
		</div>

		{#if permissions.consentError}
			<div class="border-ember/20 bg-ember-light/50 mt-4 rounded-lg border px-4 py-3">
				<p class="text-ember text-sm">{permissions.consentError}</p>
			</div>
		{/if}
	</div>
</AuthGuard>
