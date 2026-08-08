<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import Button from './Button.svelte';
	import { ShieldCheck, ArrowLeft, ShieldAlert } from 'lucide-svelte';
	import { SCOPE_DESCRIPTIONS } from '$lib/auth/permissions';
	import {
		permissions,
		ensurePermissions,
		clearConsentError
	} from '$lib/stores/permissions.svelte';

	interface Props {
		featureName: string;
		requiredScopes: string[];
		ongranted?: () => void;
	}

	const { featureName, requiredScopes, ongranted }: Props = $props();

	let isRequesting = $state(false);

	async function handleGrantAccess() {
		isRequesting = true;
		clearConsentError();
		const granted = await ensurePermissions(requiredScopes);
		isRequesting = false;

		if (granted && ongranted) {
			ongranted();
		}
	}

	function handleGoBack() {
		goto('/');
	}

	function getScopeDescription(scope: string): string {
		return SCOPE_DESCRIPTIONS[scope] ?? scope;
	}
</script>

<div class="animate-fade-in-up flex min-h-[50vh] items-center justify-center">
	<div class="panel-raised max-w-lg text-center">
		<div class="bg-warn-light mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl">
			<ShieldCheck size={28} class="text-warn" />
		</div>
		<h2 class="text-ink text-lg font-semibold">Additional permissions required</h2>
		<p class="text-ink-faint mt-1 text-sm">
			<span class="text-ink font-medium">{featureName}</span> requires additional permissions that have
			not yet been granted.
		</p>

		<!-- Permission list -->
		<div class="panel-inset mt-4 text-left">
			<p class="text-muted mb-2 text-xs font-semibold tracking-wide uppercase">
				Permissions requested
			</p>
			<ul class="space-y-1.5">
				{#each requiredScopes as scope (scope)}
					<li class="text-ink-light flex items-start gap-2 text-sm">
						<ShieldAlert size={14} class="text-warn mt-0.5 shrink-0" />
						<span>{getScopeDescription(scope)}</span>
					</li>
				{/each}
			</ul>
		</div>

		{#if permissions.consentError}
			<div class="bg-ember-light/50 text-ember mt-3 rounded-lg px-3 py-2 text-sm">
				{permissions.consentError}
			</div>
		{/if}

		<div class="mt-5 flex justify-center gap-3">
			<Button variant="ghost" icon={ArrowLeft} onclick={handleGoBack}>Go Back</Button>
			<Button
				variant="primary"
				icon={ShieldCheck}
				loading={isRequesting}
				onclick={handleGrantAccess}
			>
				{isRequesting ? 'Requesting...' : 'Grant Access'}
			</Button>
		</div>
	</div>
</div>
