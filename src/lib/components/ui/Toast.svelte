<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<script lang="ts">
	import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-svelte';
	import type { Notification } from '$lib/stores/notifications.svelte';

	interface Props {
		notification: Notification;
		onDismiss: (id: string) => void;
	}

	const { notification, onDismiss }: Props = $props();

	const iconConfig: Record<string, { icon: typeof CheckCircle; color: string }> = {
		success: { icon: CheckCircle, color: 'text-success' },
		error: { icon: XCircle, color: 'text-ember' },
		warning: { icon: AlertTriangle, color: 'text-warn' },
		info: { icon: Info, color: 'text-accent' }
	};

	const config = $derived(iconConfig[notification.type]);

	let dismissed = $state(false);

	function handleDismiss() {
		dismissed = true;
		setTimeout(() => onDismiss(notification.id), 150);
	}

	// Auto-dismiss countdown duration (matches store's 5000ms)
	const duration = $derived(notification.type === 'error' ? 0 : 5000);
</script>

<div
	role="alert"
	class="border-border bg-surface/95 pointer-events-auto w-80 overflow-hidden rounded-xl border shadow-lg backdrop-blur-sm {dismissed
		? 'animate-slide-out'
		: 'animate-slide-in-right'}"
>
	<div class="flex items-start gap-3 p-4">
		<config.icon size={20} class="mt-0.5 shrink-0 {config.color}" />
		<div class="min-w-0 flex-1">
			<p class="text-ink text-sm font-medium">{notification.title}</p>
			{#if notification.message}
				<p class="text-muted mt-0.5 text-xs">{notification.message}</p>
			{/if}
		</div>
		<button
			onclick={handleDismiss}
			class="text-muted hover:text-ink shrink-0 rounded-md p-0.5 transition-colors"
			aria-label="Dismiss notification"
		>
			<X size={16} />
		</button>
	</div>
	{#if duration > 0}
		<div class="bg-border h-0.5">
			<div
				class="bg-accent/40 h-full"
				style="animation: countdownShrink {duration}ms linear forwards;"
			></div>
		</div>
	{/if}
</div>
