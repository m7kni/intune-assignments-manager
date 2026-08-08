<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { auth, login } from '$lib/stores/auth.svelte';
	import Skeleton from './Skeleton.svelte';
	import Button from './Button.svelte';
	import { LogIn } from 'lucide-svelte';

	interface Props {
		children: Snippet;
	}

	const { children }: Props = $props();

	let isSigningIn = $state(false);

	async function handleSignIn() {
		isSigningIn = true;
		await login();
		isSigningIn = false;
	}
</script>

{#if auth.isInitializing}
	<div class="animate-fade-in-up space-y-4 py-8">
		<Skeleton width="40%" height="2rem" rounded="lg" />
		<Skeleton width="60%" height="1rem" />
		<div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			<Skeleton height="5rem" rounded="lg" />
			<Skeleton height="5rem" rounded="lg" />
			<Skeleton height="5rem" rounded="lg" />
		</div>
		<div class="mt-4 space-y-2">
			{#each Array(5) as _, i (i)}
				<Skeleton height="3rem" rounded="lg" />
			{/each}
		</div>
	</div>
{:else if !auth.isAuthenticated}
	<div class="animate-fade-in-up flex min-h-[50vh] items-center justify-center">
		<div class="panel-raised max-w-md text-center">
			<div
				class="bg-accent-light mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
			>
				<LogIn size={28} class="text-accent" />
			</div>
			<h2 class="text-ink text-lg font-semibold">Sign in required</h2>
			<p class="text-ink-faint mt-1 text-sm">
				Sign in with your Microsoft account to access Intune management features.
			</p>
			{#if auth.error}
				<p class="text-ember mt-2 text-sm">{auth.error}</p>
			{/if}
			<div class="mt-4">
				<Button
					variant="primary"
					size="lg"
					icon={LogIn}
					loading={isSigningIn}
					onclick={handleSignIn}
				>
					{isSigningIn ? 'Signing in...' : 'Sign in with Microsoft'}
				</Button>
			</div>
		</div>
	</div>
{:else}
	{@render children()}
{/if}
