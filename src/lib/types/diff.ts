// SPDX-License-Identifier: AGPL-3.0-only

export type DiffStatus = 'added' | 'removed' | 'changed' | 'unchanged';

export interface DiffEntry {
	status: DiffStatus;
	targetKey: string;
	targetDisplayName: string;
	isExclusion: boolean;
	currentIntent: string | null;
	currentFilterName: string | null;
	currentFilterMode: string | null;
	newIntent: string | null;
	newFilterName: string | null;
	newFilterMode: string | null;
}

export interface ItemDiff {
	itemId: string;
	itemName: string;
	itemType: 'app' | 'profile' | 'compliance' | 'security';
	entries: DiffEntry[];
}

export interface AssignmentDiffResult {
	items: ItemDiff[];
	summary: {
		added: number;
		removed: number;
		changed: number;
		unchanged: number;
	};
}
