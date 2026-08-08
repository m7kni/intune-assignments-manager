// SPDX-License-Identifier: AGPL-3.0-only

import { browser } from '$app/environment';

// ─── Types ──────────────────────────────────────────────────────────

type Theme = 'light' | 'dark' | 'system';

// ─── State ──────────────────────────────────────────────────────────

const STORAGE_KEY = 'theme-preference';

let preference = $state<Theme>('system');

// ─── Read-only export ───────────────────────────────────────────────

export const theme = {
	get preference() {
		return preference;
	},
	get isDark() {
		if (!browser) return false;
		return document.documentElement.classList.contains('dark');
	}
};

// ─── Actions ────────────────────────────────────────────────────────

export function setTheme(newTheme: Theme): void {
	preference = newTheme;
	if (browser) {
		localStorage.setItem(STORAGE_KEY, newTheme);
		applyTheme(true);
	}
}

export function initTheme(): void {
	if (!browser) return;

	const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
	if (stored && ['light', 'dark', 'system'].includes(stored)) {
		preference = stored;
	}

	window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
		if (preference === 'system') {
			applyTheme(true);
		}
	});

	// Sync state — the inline script in app.html already applied the class
	applyTheme(false);
}

function applyTheme(animate: boolean): void {
	if (!browser) return;

	const isDark =
		preference === 'system'
			? window.matchMedia('(prefers-color-scheme: dark)').matches
			: preference === 'dark';

	if (animate) {
		document.documentElement.classList.add('transitioning');
	}

	document.documentElement.classList.toggle('dark', isDark);

	if (animate) {
		setTimeout(() => {
			document.documentElement.classList.remove('transitioning');
		}, 250);
	}
}
