<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<script lang="ts">
	import Toast from './Toast.svelte';
	import { notifications, dismiss } from '$lib/stores/notifications.svelte';
</script>

<div
	aria-live="polite"
	aria-label="Notifications"
	class="pointer-events-none fixed top-4 right-4 z-[100] flex flex-col gap-2"
>
	{#each notifications.items as notification (notification.id)}
		<Toast {notification} onDismiss={dismiss} />
	{/each}
</div>
