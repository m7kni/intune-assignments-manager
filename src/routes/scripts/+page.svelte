<script lang="ts">
	import { fly } from 'svelte/transition';
	import AuthGuard from '$lib/components/ui/AuthGuard.svelte';
	import PermissionGuard from '$lib/components/ui/PermissionGuard.svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import SearchInput from '$lib/components/ui/SearchInput.svelte';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import ErrorState from '$lib/components/ui/ErrorState.svelte';
	import DropdownMenu from '$lib/components/ui/DropdownMenu.svelte';
	import ScriptRow from '$lib/components/ui/ScriptRow.svelte';
	import {
		Search,
		FileCode,
		ArrowDownAZ,
		ArrowUpZA,
		Clock
	} from 'lucide-svelte';
	import { getGraphClient } from '$lib/stores/graph';
	import type { DeviceManagementScript } from '$lib/types/scripts';
	import { listScripts } from '$lib/graph/scripts';
	import { toFriendlyMessage } from '$lib/graph/errors';

	let scripts = $state<DeviceManagementScript[]>([]);
	let search = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);
	let sortBy = $state<string>('name-asc');

	const sortOptions = [
		{ id: 'name-asc', label: 'Name A\u2013Z', icon: ArrowDownAZ },
		{ id: 'name-desc', label: 'Name Z\u2013A', icon: ArrowUpZA },
		{ id: 'modified', label: 'Last Modified', icon: Clock }
	];

	const filteredScripts = $derived.by(() => {
		let result = scripts;

		if (search.trim()) {
			const q = search.toLowerCase();
			result = result.filter(
				(s) =>
					s.displayName.toLowerCase().includes(q) ||
					(s.fileName ?? '').toLowerCase().includes(q) ||
					(s.description ?? '').toLowerCase().includes(q)
			);
		}

		if (sortBy === 'name-desc') {
			result = [...result].sort((a, b) => b.displayName.localeCompare(a.displayName));
		} else if (sortBy === 'modified') {
			result = [...result].sort(
				(a, b) =>
					new Date(b.lastModifiedDateTime).getTime() -
					new Date(a.lastModifiedDateTime).getTime()
			);
		} else {
			result = [...result].sort((a, b) => a.displayName.localeCompare(b.displayName));
		}

		return result;
	});

	async function fetchScripts(): Promise<void> {
		loading = true;
		error = null;
		try {
			const client = getGraphClient();
			scripts = await listScripts(client);
		} catch (err) {
			error = toFriendlyMessage(err);
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		fetchScripts();
	});
</script>

<AuthGuard>
	<PermissionGuard
		requiredScopes={['DeviceManagementConfiguration.Read.All']}
		featureName="Platform Scripts"
	>
		<div class="animate-fade-in-up">
			<PageHeader
				title="Platform Scripts"
				icon={FileCode}
				description="Browse and manage your Intune PowerShell scripts"
			/>

			<!-- Filter bar -->
			<div class="mb-4 flex flex-wrap items-center gap-3">
				<div class="min-w-0 flex-1">
					<SearchInput placeholder="Filter scripts by name..." bind:value={search} />
				</div>
				<DropdownMenu
					items={sortOptions}
					selected={sortBy}
					label="Sort"
					onselect={(id) => (sortBy = id)}
				/>
			</div>

			{#if error}
				<div class="mb-4">
					<ErrorState message={error} onretry={fetchScripts} />
				</div>
			{/if}

			{#if loading}
				<div class="panel overflow-clip p-0">
					<div class="border-border border-b px-4 py-2.5">
						<Skeleton width="10rem" height="0.75rem" />
					</div>
					{#each Array(8) as _, i (i)}
						<div class="border-border flex items-center gap-4 border-b px-4 py-3">
							<Skeleton width="2.5rem" height="2.5rem" rounded="lg" />
							<div class="flex-1 space-y-1">
								<Skeleton width="{60 - i * 3}%" height="0.875rem" />
								<Skeleton width="30%" height="0.75rem" />
							</div>
							<Skeleton width="4rem" height="1.25rem" rounded="full" />
						</div>
					{/each}
				</div>
			{:else if filteredScripts.length === 0 && search.trim() !== ''}
				<EmptyState
					icon={Search}
					title="No scripts match your search"
					description="Try adjusting your search term."
				/>
			{:else if scripts.length === 0}
				<EmptyState
					icon={FileCode}
					title="No platform scripts found"
					description="Your Intune tenant doesn't have any PowerShell scripts configured."
				/>
			{:else}
				<div class="panel overflow-clip p-0">
					<div
						class="border-border bg-surface/95 sticky top-12 z-10 border-b px-4 py-2.5 backdrop-blur-sm"
					>
						<p class="text-muted text-xs font-medium tracking-wide uppercase">
							{filteredScripts.length}{search.trim() !== ''
								? ` of ${scripts.length}`
								: ''} script{filteredScripts.length !== 1 ? 's' : ''}
							{#if search.trim() !== ''}
								matching "{search.trim()}"
							{/if}
						</p>
					</div>

					{#each filteredScripts as script, i (script.id)}
						<div in:fly={{ y: 10, duration: 200, delay: Math.min(i * 30, 300) }}>
							<ScriptRow {script} />
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</PermissionGuard>
</AuthGuard>
