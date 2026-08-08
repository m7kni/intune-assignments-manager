// SPDX-License-Identifier: AGPL-3.0-only

import { goto } from '$app/navigation';
import { commandPalette } from './command-palette.svelte';

let shortcutsDialogOpen = $state(false);
let gPending = $state(false);
let gTimeout: ReturnType<typeof setTimeout> | null = null;

export const shortcuts = {
	get dialogOpen() {
		return shortcutsDialogOpen;
	},
	set dialogOpen(v: boolean) {
		shortcutsDialogOpen = v;
	}
};

const goRoutes: Record<string, string> = {
	d: '/',
	a: '/apps',
	p: '/profiles',
	l: '/audit',
	b: '/assign'
};

export function handleGlobalKeydown(e: KeyboardEvent): void {
	const target = e.target as HTMLElement;
	const isInput =
		target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

	// Cmd+K / Ctrl+K — command palette
	if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
		e.preventDefault();
		commandPalette.toggle();
		return;
	}

	// Ignore other shortcuts when in input fields
	if (isInput) return;

	// ? — shortcuts help
	if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
		e.preventDefault();
		shortcutsDialogOpen = true;
		return;
	}

	// / — focus search input
	if (e.key === '/' && !e.metaKey && !e.ctrlKey) {
		e.preventDefault();
		const searchInput = document.querySelector<HTMLInputElement>('[data-search-input]');
		searchInput?.focus();
		return;
	}

	// Escape — close modals
	if (e.key === 'Escape') {
		if (commandPalette.isOpen) {
			commandPalette.close();
			return;
		}
		if (shortcutsDialogOpen) {
			shortcutsDialogOpen = false;
			return;
		}
	}

	// G then ... — navigation
	if (e.key === 'g' && !e.metaKey && !e.ctrlKey && !gPending) {
		gPending = true;
		if (gTimeout) clearTimeout(gTimeout);
		gTimeout = setTimeout(() => {
			gPending = false;
		}, 500);
		return;
	}

	if (gPending) {
		gPending = false;
		if (gTimeout) clearTimeout(gTimeout);
		const route = goRoutes[e.key];
		if (route) {
			e.preventDefault();
			goto(route);
		}
	}
}
