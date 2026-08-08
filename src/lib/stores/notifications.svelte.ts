// SPDX-License-Identifier: AGPL-3.0-only

import { browser } from '$app/environment';

// ─── Types ──────────────────────────────────────────────────────────

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
	id: string;
	type: NotificationType;
	title: string;
	message?: string;
	persistent: boolean;
	createdAt: number;
}

// ─── State ──────────────────────────────────────────────────────────

let items = $state<Notification[]>([]);
let nextId = 0;

const AUTO_DISMISS_MS = 5000;
const MAX_VISIBLE = 5;

// ─── Read-only export ───────────────────────────────────────────────

export const notifications = {
	get items() {
		return items;
	}
};

// ─── Actions ────────────────────────────────────────────────────────

export function notify(params: {
	type: NotificationType;
	title: string;
	message?: string;
	persistent?: boolean;
}): string {
	const id = `toast-${++nextId}`;
	const persistent = params.persistent ?? params.type === 'error';

	const notification: Notification = {
		id,
		type: params.type,
		title: params.title,
		message: params.message,
		persistent,
		createdAt: Date.now()
	};

	items = [notification, ...items].slice(0, MAX_VISIBLE);

	if (!persistent && browser) {
		setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
	}

	return id;
}

export function notifySuccess(title: string, message?: string): string {
	return notify({ type: 'success', title, message });
}

export function notifyError(title: string, message?: string): string {
	return notify({ type: 'error', title, message, persistent: true });
}

export function notifyWarning(title: string, message?: string): string {
	return notify({ type: 'warning', title, message });
}

export function notifyInfo(title: string, message?: string): string {
	return notify({ type: 'info', title, message });
}

export function dismiss(id: string): void {
	items = items.filter((n) => n.id !== id);
}

export function dismissAll(): void {
	items = [];
}
