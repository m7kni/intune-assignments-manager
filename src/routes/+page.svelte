<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<script lang="ts">
	import { browser } from '$app/environment';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import StatCard from '$lib/components/ui/StatCard.svelte';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import {
		AppWindow,
		Settings,
		ShieldCheck,
		Swords,
		Activity,
		Layers,
		Download,
		Upload,
		RefreshCw
	} from 'lucide-svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { getGraphClient } from '$lib/stores/graph';
	import { dashboardCache } from '$lib/stores/dashboard-cache.svelte';
	import { toFriendlyMessage } from '$lib/graph/errors';
	import { listAuditEvents, buildAssignmentFilter } from '$lib/graph/audit';
	import { listCompliancePolicies } from '$lib/graph/compliance';
	import { listSecurityPolicies } from '$lib/graph/security';
	import type { MobileApp, ConfigurationPolicy } from '$lib/types/graph';

	// ─── Time-based Greeting ─────────────────────────────────────
	const greeting = $derived.by(() => {
		const hour = new Date().getHours();
		if (hour < 12) return 'Good morning';
		if (hour < 18) return 'Good afternoon';
		return 'Good evening';
	});

	const displayName = $derived(auth.account?.name?.split(' ')[0] ?? 'there');

	// ─── Dashboard Data Loading ──────────────────────────────────
	let refreshing = $state(false);

	async function fetchDashboardData(force = false): Promise<void> {
		if (!auth.isAuthenticated) return;

		// Try cache first
		if (!force && browser && dashboardCache.loadFromLocalStorage()) {
			return;
		}

		dashboardCache.setLoading(true);
		dashboardCache.setError(null);

		try {
			const client = getGraphClient();

			const [apps, profiles, compliancePolicies, securityPolicies, auditResult] =
				await Promise.all([
					client.fetchAll<MobileApp>('/deviceAppManagement/mobileApps'),
					client.fetchAll<ConfigurationPolicy>(
						'/deviceManagement/configurationPolicies'
					),
					listCompliancePolicies(client),
					listSecurityPolicies(client),
					listAuditEvents(client, {
						filter: buildAssignmentFilter(),
						top: 5
					})
				]);

			dashboardCache.setCounts(
				apps.length,
				profiles.length,
				compliancePolicies.length,
				securityPolicies.length
			);
			dashboardCache.setRecentActivity(auditResult.events);
		} catch (err) {
			dashboardCache.setError(toFriendlyMessage(err));
		} finally {
			dashboardCache.setLoading(false);
			refreshing = false;
		}
	}

	function handleRefresh() {
		refreshing = true;
		dashboardCache.clearCache();
		fetchDashboardData(true);
	}

	function formatTimeAgo(iso: string): string {
		const diff = Date.now() - new Date(iso).getTime();
		const mins = Math.floor(diff / 60000);
		if (mins < 1) return 'Just now';
		if (mins < 60) return `${mins}m ago`;
		const hours = Math.floor(mins / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		return `${days}d ago`;
	}

	$effect(() => {
		if (auth.isAuthenticated) {
			fetchDashboardData();
		}
	});
</script>

<div class="animate-fade-in-up">
	<PageHeader title="{greeting}, {displayName}" description="Your Intune management overview">
		{#snippet actions()}
			{#if auth.isAuthenticated}
				<Button
					variant="ghost"
					size="sm"
					icon={RefreshCw}
					onclick={handleRefresh}
					loading={refreshing}
				>
					Refresh
				</Button>
			{/if}
		{/snippet}
	</PageHeader>

	{#if !auth.isAuthenticated}
		<!-- Auth prompt -->
		<div class="panel mb-6">
			<p class="text-ink-faint text-sm">
				Sign in with your Microsoft account to manage Intune assignments.
			</p>
		</div>
	{/if}

	<!-- Stat cards -->
	{#if dashboardCache.loading && dashboardCache.appCount === null}
		<div class="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			{#each Array(4) as _}
				<Skeleton height="5.5rem" rounded="lg" />
			{/each}
		</div>
	{:else}
		<div class="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<StatCard label="Total Apps" value={dashboardCache.appCount ?? '---'} icon={AppWindow} />
			<StatCard
				label="Config Profiles"
				value={dashboardCache.profileCount ?? '---'}
				icon={Settings}
			/>
			<StatCard
				label="Compliance Policies"
				value={dashboardCache.complianceCount ?? '---'}
				icon={ShieldCheck}
			/>
			<StatCard
				label="Security Policies"
				value={dashboardCache.securityCount ?? '---'}
				icon={Swords}
			/>
		</div>
	{/if}

	{#if dashboardCache.error}
		<div class="panel border-ember/20 bg-ember-light/50 mb-6">
			<p class="text-ember text-sm">{dashboardCache.error}</p>
		</div>
	{/if}

	<!-- Two-column layout -->
	{#if auth.isAuthenticated}
		<div class="grid gap-6 lg:grid-cols-3">
			<!-- Recent Activity (2/3) -->
			<div class="lg:col-span-2">
				<h2 class="text-ink-faint mb-3 text-sm font-semibold tracking-wide uppercase">
					Recent Activity
				</h2>
				{#if dashboardCache.loading && dashboardCache.recentActivity.length === 0}
					<div class="panel space-y-3 p-4">
						{#each Array(5) as _}
							<div class="flex items-center gap-3">
								<Skeleton width="2rem" height="2rem" rounded="full" />
								<div class="flex-1 space-y-1">
									<Skeleton width="60%" height="0.875rem" />
									<Skeleton width="40%" height="0.75rem" />
								</div>
							</div>
						{/each}
					</div>
				{:else if dashboardCache.recentActivity.length === 0}
					<div class="panel p-6 text-center">
						<p class="text-ink-faint text-sm">No recent activity</p>
					</div>
				{:else}
					<div class="panel overflow-hidden p-0">
						{#each dashboardCache.recentActivity as evt (evt.id)}
							<div class="border-border flex items-center gap-3 border-b px-4 py-3 last:border-b-0">
								<div
									class="bg-accent-light flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
								>
									<Activity size={14} class="text-accent" />
								</div>
								<div class="min-w-0 flex-1">
									<p class="text-ink truncate text-sm font-medium">{evt.activity}</p>
									<p class="text-ink-faint truncate text-xs">
										{evt.actor.userPrincipalName ?? evt.actor.applicationDisplayName ?? 'System'}
									</p>
								</div>
								<span class="text-muted shrink-0 text-xs">
									{formatTimeAgo(evt.activityDateTime)}
								</span>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Quick Actions (1/3) -->
			<div>
				<h2 class="text-ink-faint mb-3 text-sm font-semibold tracking-wide uppercase">
					Quick Actions
				</h2>
				<div class="space-y-3">
					<Button variant="primary" size="lg" icon={Layers} href="/assign">Bulk Assign</Button>
					<Button variant="secondary" size="lg" icon={Download} href="/apps">Browse Apps</Button>
					<Button variant="secondary" size="lg" icon={Upload} href="/profiles">
						Browse Profiles
					</Button>
				</div>
			</div>
		</div>
	{/if}
</div>
