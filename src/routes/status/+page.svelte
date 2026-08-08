<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<script lang="ts">
	import AuthGuard from '$lib/components/ui/AuthGuard.svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import StatCard from '$lib/components/ui/StatCard.svelte';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import ErrorState from '$lib/components/ui/ErrorState.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import {
		Activity,
		AppWindow,
		Settings,
		AlertTriangle,
		CheckCircle,
		ArrowRight
	} from 'lucide-svelte';
	import { getGraphClient } from '$lib/stores/graph';
	import { listApps } from '$lib/graph/apps';
	import { listConfigPolicies } from '$lib/graph/configurations';
	import { getAppInstallSummaries } from '$lib/graph/status';
	import { toFriendlyMessage } from '$lib/graph/errors';
	import { deviceConfigurationDeviceOverviewSchema } from '$lib/types/status-schemas';
	import type { MobileApp, ConfigurationPolicy, BatchRequestItem } from '$lib/types/graph';
	import type { AppInstallSummaryRow, DeviceConfigurationDeviceOverview } from '$lib/types/status';

	interface AppWithFailures {
		app: MobileApp;
		failedDeviceCount: number;
	}

	interface ProfileWithOverview {
		profile: ConfigurationPolicy;
		overview: DeviceConfigurationDeviceOverview;
	}

	let loading = $state(true);
	let error = $state<string | null>(null);
	let apps = $state<MobileApp[]>([]);
	let profiles = $state<ConfigurationPolicy[]>([]);
	let failedApps = $state<AppWithFailures[]>([]);
	let errorProfiles = $state<ProfileWithOverview[]>([]);

	async function fetchStatus(): Promise<void> {
		loading = true;
		error = null;
		try {
			const client = getGraphClient();

			// Fetch apps, profiles, and app install summaries in parallel
			const [appList, profileList, summaryRows] = await Promise.all([
				listApps(client),
				listConfigPolicies(client),
				getAppInstallSummaries(client)
			]);

			apps = appList;
			profiles = profileList;

			// Build a lookup from applicationId to failure count
			// eslint-disable-next-line svelte/prefer-svelte-reactivity
			const failureMap = new Map<string, AppInstallSummaryRow>();
			for (const row of summaryRows) {
				failureMap.set(row.applicationId, row);
			}

			// Match report rows to apps and filter for failures
			const appsWithFailures: AppWithFailures[] = [];
			for (const app of appList) {
				const row = failureMap.get(app.id);
				if (row && row.failedDeviceCount > 0) {
					appsWithFailures.push({ app, failedDeviceCount: row.failedDeviceCount });
				}
			}
			failedApps = appsWithFailures.sort((a, b) => b.failedDeviceCount - a.failedDeviceCount);

			// Batch-fetch device status overviews for profiles
			// Uses deviceConfigurations endpoint (legacy) - 404s expected for Settings Catalog profiles
			const profileBatchRequests: BatchRequestItem[] = profileList.map((profile) => ({
				id: profile.id,
				method: 'GET' as const,
				url: `/deviceManagement/deviceConfigurations/${profile.id}/deviceStatusOverview`
			}));

			const profileResponses =
				profileBatchRequests.length > 0
					? await client.batch(profileBatchRequests, { version: 'v1.0' })
					: [];

			const profilesWithErrors: ProfileWithOverview[] = [];
			for (const response of profileResponses) {
				if (response.status === 200) {
					try {
						const overview = deviceConfigurationDeviceOverviewSchema.parse(
							response.body
						) as DeviceConfigurationDeviceOverview;
						if (overview.errorCount > 0 || overview.failedCount > 0) {
							const profile = profileList.find((p) => p.id === response.id);
							if (profile) {
								profilesWithErrors.push({ profile, overview });
							}
						}
					} catch {
						// Skip unparseable responses
					}
				}
				// 404 = not a legacy profile, silently skip
			}
			errorProfiles = profilesWithErrors.sort(
				(a, b) =>
					b.overview.errorCount +
					b.overview.failedCount -
					(a.overview.errorCount + a.overview.failedCount)
			);
		} catch (err) {
			error = toFriendlyMessage(err);
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		fetchStatus();
	});
</script>

<AuthGuard>
	<div class="animate-fade-in-up">
		<PageHeader
			title="Deployment Status"
			icon={Activity}
			description="Monitor app installations and profile deployments across your devices"
		/>

		{#if error}
			<div class="mb-6">
				<ErrorState message={error} onretry={fetchStatus} />
			</div>
		{/if}

		{#if loading}
			<!-- Skeleton stat cards -->
			<div class="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{#each Array(4) as _, i (i)}
					<div class="panel-raised flex items-center gap-4">
						<Skeleton width="3rem" height="3rem" rounded="lg" />
						<div class="space-y-2">
							<Skeleton width="3rem" height="1.75rem" />
							<Skeleton width="5rem" height="0.875rem" />
						</div>
					</div>
				{/each}
			</div>

			<!-- Skeleton lists -->
			{#each Array(2) as _, i (i)}
				<div class="panel mb-6 overflow-hidden p-0">
					<div class="border-border border-b px-4 py-2.5">
						<Skeleton width="12rem" height="0.75rem" />
					</div>
					{#each Array(3) as _, j (j)}
						<div class="border-border flex items-center justify-between border-b px-4 py-3">
							<div class="space-y-1">
								<Skeleton width="14rem" height="0.875rem" />
								<Skeleton width="8rem" height="0.75rem" />
							</div>
							<div class="flex items-center gap-3">
								<Skeleton width="4rem" height="1.25rem" rounded="full" />
								<Skeleton width="1rem" height="1rem" />
							</div>
						</div>
					{/each}
				</div>
			{/each}
		{:else if !error}
			<!-- Summary stat cards -->
			<div class="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<StatCard label="Total Apps" value={apps.length} icon={AppWindow} />
				<StatCard label="Apps with Failures" value={failedApps.length} icon={AlertTriangle} />
				<StatCard label="Total Profiles" value={profiles.length} icon={Settings} />
				<StatCard label="Profiles with Errors" value={errorProfiles.length} icon={AlertTriangle} />
			</div>

			<!-- Apps with Failed Installations -->
			<section class="mb-6">
				<h2 class="text-ink mb-3 text-lg font-semibold">Apps with Failed Installations</h2>
				{#if failedApps.length === 0}
					<EmptyState
						icon={CheckCircle}
						title="All apps are installing successfully"
						description="No apps have failed device installations."
					/>
				{:else}
					<div class="panel overflow-hidden p-0">
						<div class="border-border border-b px-4 py-2.5">
							<p class="text-muted text-xs font-medium tracking-wide uppercase">
								{failedApps.length} app{failedApps.length !== 1 ? 's' : ''} with failures
							</p>
						</div>
						{#each failedApps as { app, failedDeviceCount } (app.id)}
							<a
								href="/apps/{app.id}"
								class="border-border hover:bg-canvas-deep flex items-center justify-between border-b px-4 py-3 transition-colors"
							>
								<div class="min-w-0 flex-1">
									<p class="text-ink truncate text-sm font-medium">{app.displayName}</p>
									<p class="text-ink-faint truncate text-xs">
										{app.publisher ?? 'Unknown publisher'}
									</p>
								</div>
								<div class="flex shrink-0 items-center gap-3">
									<Badge variant="uninstall">{failedDeviceCount} failed</Badge>
									<ArrowRight size={16} class="text-muted" />
								</div>
							</a>
						{/each}
					</div>
				{/if}
			</section>

			<!-- Profiles with Deployment Errors -->
			<section>
				<h2 class="text-ink mb-3 text-lg font-semibold">Profiles with Deployment Errors</h2>
				{#if errorProfiles.length === 0}
					<EmptyState
						icon={CheckCircle}
						title="All profiles are deploying successfully"
						description="No configuration profiles have deployment errors."
					/>
				{:else}
					<div class="panel overflow-hidden p-0">
						<div class="border-border border-b px-4 py-2.5">
							<p class="text-muted text-xs font-medium tracking-wide uppercase">
								{errorProfiles.length} profile{errorProfiles.length !== 1 ? 's' : ''} with errors
							</p>
						</div>
						{#each errorProfiles as { profile, overview } (profile.id)}
							<a
								href="/profiles/{profile.id}"
								class="border-border hover:bg-canvas-deep flex items-center justify-between border-b px-4 py-3 transition-colors"
							>
								<div class="min-w-0 flex-1">
									<p class="text-ink truncate text-sm font-medium">{profile.name}</p>
									<p class="text-ink-faint truncate text-xs">{profile.platforms}</p>
								</div>
								<div class="flex shrink-0 items-center gap-3">
									<Badge variant="uninstall">
										{overview.errorCount + overview.failedCount} error{overview.errorCount +
											overview.failedCount !==
										1
											? 's'
											: ''}
									</Badge>
									<ArrowRight size={16} class="text-muted" />
								</div>
							</a>
						{/each}
					</div>
				{/if}
			</section>
		{/if}
	</div>
</AuthGuard>
