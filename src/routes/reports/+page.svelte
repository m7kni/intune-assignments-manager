<script lang="ts">
	import AuthGuard from '$lib/components/ui/AuthGuard.svelte';
	import PermissionGuard from '$lib/components/ui/PermissionGuard.svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import ReportCard from '$lib/components/reports/ReportCard.svelte';
	import { FileBarChart } from 'lucide-svelte';
	import { REPORT_CONFIGS } from '$lib/utils/reports';
</script>

<AuthGuard>
	<PermissionGuard
		requiredScopes={['DeviceManagementApps.Read.All']}
		featureName="Reports"
	>
		<div class="animate-fade-in-up">
			<PageHeader
				title="Reports"
				icon={FileBarChart}
				description="Generate and export reports for common Intune management tasks"
			/>

			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each REPORT_CONFIGS as config (config.type)}
					<ReportCard {config} />
				{/each}
			</div>
		</div>
	</PermissionGuard>
</AuthGuard>
