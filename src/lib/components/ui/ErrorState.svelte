<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<script lang="ts">
	import { AlertTriangle } from 'lucide-svelte';
	import Button from './Button.svelte';

	interface Props {
		message: string;
		onretry?: () => void;
	}

	const { message, onretry }: Props = $props();
</script>

<div class="panel border-ember/20 bg-ember-light/50">
	<div class="flex items-start gap-3">
		<AlertTriangle size={20} class="text-ember mt-0.5 shrink-0" />
		<div class="min-w-0 flex-1">
			<p class="text-ember text-sm">{message}</p>
			{#if onretry}
				<div class="mt-3">
					<Button variant="outline" size="sm" onclick={onretry}>Try again</Button>
				</div>
			{/if}
		</div>
	</div>
</div>
