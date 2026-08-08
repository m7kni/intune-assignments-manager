<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { hasAllPermissions } from '$lib/stores/permissions.svelte';
	import ConsentPrompt from './ConsentPrompt.svelte';

	interface Props {
		requiredScopes: string[];
		featureName: string;
		children: Snippet;
	}

	const { requiredScopes, featureName, children }: Props = $props();

	let consentJustGranted = $state(false);

	const hasAccess = $derived(
		requiredScopes.length === 0 || hasAllPermissions(requiredScopes) || consentJustGranted
	);

	function handleGranted() {
		consentJustGranted = true;
	}
</script>

{#if hasAccess}
	{@render children()}
{:else}
	<ConsentPrompt {featureName} {requiredScopes} ongranted={handleGranted} />
{/if}
