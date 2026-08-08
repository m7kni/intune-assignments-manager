<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<script lang="ts">
	import { Download } from 'lucide-svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { downloadCsv } from '$lib/utils/csv-download';
	import { notifySuccess } from '$lib/stores/notifications.svelte';

	interface Props {
		getCsvContent: () => Promise<string> | string;
		filename?: string;
		disabled?: boolean;
		label?: string;
	}

	const {
		getCsvContent,
		filename = 'export.csv',
		disabled = false,
		label = 'Export CSV'
	}: Props = $props();

	let loading = $state(false);

	async function handleExport(): Promise<void> {
		if (loading || disabled) return;
		loading = true;
		try {
			const content = await getCsvContent();
			downloadCsv(content, filename);
			notifySuccess('CSV exported', `Downloaded ${filename}`);
		} catch (err) {
			console.error('CSV export failed:', err);
		} finally {
			loading = false;
		}
	}
</script>

<Button
	variant="secondary"
	icon={Download}
	{loading}
	disabled={disabled || loading}
	onclick={handleExport}
>
	{label}
</Button>
