import { RefreshCw, Star, ShieldCheck, Cpu } from 'lucide-svelte';
import type { UpdateCategory } from '$lib/types/updates';

// ─── Types ──────────────────────────────────────────────────────────

export interface UpdateCategoryInfo {
	label: string;
	description: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	icon: any;
}

// ─── Category Info ──────────────────────────────────────────────────

const UPDATE_CATEGORY_MAP: Record<UpdateCategory, UpdateCategoryInfo> = {
	updateRing: {
		label: 'Update Ring',
		description: 'Windows Update for Business deferral and deadline settings',
		icon: RefreshCw
	},
	featureUpdate: {
		label: 'Feature Update',
		description: 'Windows feature update version targeting and rollout',
		icon: Star
	},
	qualityUpdate: {
		label: 'Quality Update',
		description: 'Windows quality (security) update expediting',
		icon: ShieldCheck
	},
	driverUpdate: {
		label: 'Driver Update',
		description: 'Windows driver update approval and deployment',
		icon: Cpu
	}
};

// ─── Exports ────────────────────────────────────────────────────────

export function getUpdateCategoryInfo(category: UpdateCategory): UpdateCategoryInfo {
	return UPDATE_CATEGORY_MAP[category];
}

export function formatDeferralPeriod(days: number | null | undefined): string {
	if (days === null || days === undefined) return 'Not configured';
	if (days === 0) return '0 days (immediate)';
	return `${days} day${days !== 1 ? 's' : ''}`;
}
