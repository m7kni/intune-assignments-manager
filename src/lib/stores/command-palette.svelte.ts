// SPDX-License-Identifier: AGPL-3.0-only

interface DynamicItem {
	id: string;
	label: string;
	group: string;
	icon: any;
	action: () => void;
	keywords?: string;
}

function createCommandPaletteStore() {
	let isOpen = $state(false);
	let dynamicItems = $state<DynamicItem[]>([]);

	return {
		get isOpen() {
			return isOpen;
		},
		get dynamicItems() {
			return dynamicItems;
		},
		open() {
			isOpen = true;
		},
		close() {
			isOpen = false;
		},
		toggle() {
			isOpen = !isOpen;
		},
		registerItems(items: DynamicItem[]) {
			// Merge without duplicates
			const ids = new Set(dynamicItems.map((i) => i.id));
			const newItems = items.filter((i) => !ids.has(i.id));
			dynamicItems = [...dynamicItems, ...newItems];
		},
		clearDynamicItems() {
			dynamicItems = [];
		}
	};
}

export const commandPalette = createCommandPaletteStore();
