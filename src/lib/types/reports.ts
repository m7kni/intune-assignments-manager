// SPDX-License-Identifier: AGPL-3.0-only

// ─── Report Type Definitions ────────────────────────────────────────

export type ReportType =
	| 'appDeployment'
	| 'complianceSummary'
	| 'unassignedItems'
	| 'staleDevices'
	| 'failedDeployments'
	| 'assignmentCoverage';

export interface ReportConfig {
	type: ReportType;
	title: string;
	description: string;
	icon: string;
}

// The report row shapes below are `type` aliases, NOT `interface`s, on purpose.
// They are rendered by ReportTable, whose `rows` prop is `Record<string, unknown>[]`.
// TypeScript refuses to assign an `interface` to `Record<string, unknown>` because
// interfaces stay open to declaration merging, so it cannot guarantee the implicit
// index signature; a `type` alias has no such escape hatch and is accepted. Changing
// any of these back to `interface` reintroduces 6 type errors in
// src/routes/reports/[type]/+page.svelte.

export type AppDeploymentReportItem = {
	applicationId: string;
	displayName: string;
	platform?: string;
	installedDeviceCount: number;
	failedDeviceCount: number;
	pendingInstallDeviceCount: number;
	notApplicableDeviceCount: number;
	notInstalledDeviceCount: number;
};

export type UnassignedItem = {
	id: string;
	displayName: string;
	itemType: 'app' | 'profile' | 'compliance' | 'security';
	lastModified?: string;
};

export type StaleDevice = {
	id: string;
	deviceName: string;
	userDisplayName?: string;
	operatingSystem: string;
	osVersion: string;
	lastSyncDateTime: string;
	daysSinceSync: number;
	complianceState: string;
};

export type FailedDeploymentItem = {
	applicationId: string;
	displayName: string;
	platform?: string;
	failedDeviceCount: number;
};

export type AssignmentCoverageItem = {
	id: string;
	displayName: string;
	itemType: string;
	assignmentCount: number;
	hasAllDevices: boolean;
	hasAllUsers: boolean;
};
