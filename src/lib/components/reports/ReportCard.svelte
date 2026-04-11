<script lang="ts">
	import type { ReportConfig } from '$lib/types/reports';
	import {
		BarChart3,
		ShieldCheck,
		PackageX,
		Clock,
		AlertTriangle,
		Target,
		ChevronRight
	} from 'lucide-svelte';

	interface Props {
		config: ReportConfig;
	}

	const { config }: Props = $props();

	const iconMap: Record<string, typeof BarChart3> = {
		BarChart3,
		ShieldCheck,
		PackageX,
		Clock,
		AlertTriangle,
		Target
	};

	const Icon = $derived(iconMap[config.icon] ?? BarChart3);
</script>

<a
	href="/reports/{config.type}"
	class="panel group flex flex-col gap-3 p-5 transition-all hover:shadow-md hover:border-accent/30"
>
	<div class="flex items-start justify-between">
		<div class="bg-accent-light flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
			<Icon size={20} class="text-accent" />
		</div>
		<ChevronRight
			size={16}
			class="text-muted opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5"
		/>
	</div>
	<div>
		<h3 class="text-ink text-sm font-semibold">{config.title}</h3>
		<p class="text-ink-faint mt-1 text-xs leading-relaxed">{config.description}</p>
	</div>
</a>
