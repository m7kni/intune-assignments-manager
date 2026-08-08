// SPDX-License-Identifier: AGPL-3.0-only

import type { GraphClient } from './client';
import type { AuditEvent } from '$lib/types/graph';
import { auditEventSchema } from '$lib/types/schemas';

// ─── Types ──────────────────────────────────────────────────────────

export interface AuditListOptions {
	top?: number;
	filter?: string;
	orderBy?: string;
	skip?: number;
}

export interface AuditPageResult {
	events: AuditEvent[];
	nextLink: string | null;
	totalCount?: number;
}

export interface AuditFilterOptions {
	dateFrom?: string;
	dateTo?: string;
	categories?: string[];
	assignmentOnly?: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────

export const AUDIT_CATEGORIES = [
	'Application',
	'Compliance',
	'Device',
	'DeviceConfiguration',
	'DeviceIntent',
	'Enrollment',
	'Other',
	'Role',
	'SoftwareUpdates'
] as const;

const ASSIGNMENT_FILTER =
	"componentName eq 'Assignment'" +
	" or activity eq 'Assign'" +
	" or activity eq 'Unassign'" +
	" or contains(activity, 'assignment')";

// ─── Filter Builders ────────────────────────────────────────────────

export function buildAuditFilter(options: AuditFilterOptions): string | undefined {
	const parts: string[] = [];

	if (options.assignmentOnly) {
		parts.push(`(${ASSIGNMENT_FILTER})`);
	}

	if (options.categories && options.categories.length > 0) {
		const categoryParts = options.categories.map((c) => `category eq '${c}'`);
		parts.push(`(${categoryParts.join(' or ')})`);
	}

	if (options.dateFrom) {
		parts.push(`activityDateTime ge ${options.dateFrom}T00:00:00Z`);
	}
	if (options.dateTo) {
		parts.push(`activityDateTime le ${options.dateTo}T23:59:59Z`);
	}

	return parts.length > 0 ? parts.join(' and ') : undefined;
}

export function buildAssignmentFilter(dateFrom?: string, dateTo?: string): string {
	const parts: string[] = [];
	parts.push(`(${ASSIGNMENT_FILTER})`);

	if (dateFrom) {
		parts.push(`activityDateTime ge ${dateFrom}T00:00:00Z`);
	}
	if (dateTo) {
		parts.push(`activityDateTime le ${dateTo}T23:59:59Z`);
	}

	return parts.join(' and ');
}

// ─── API Functions ──────────────────────────────────────────────────

export async function listAuditEvents(
	client: GraphClient,
	options?: AuditListOptions
): Promise<AuditPageResult> {
	const params: Record<string, string> = {
		$orderby: options?.orderBy ?? 'activityDateTime desc',
		$top: String(options?.top ?? 50),
		$count: 'true'
	};

	if (options?.filter) {
		params['$filter'] = options.filter;
	}

	if (options?.skip) {
		params['$skip'] = String(options.skip);
	}

	const response = await client.request<{
		value: unknown[];
		'@odata.nextLink'?: string;
		'@odata.count'?: number;
	}>('/deviceManagement/auditEvents', {
		params,
		headers: { ConsistencyLevel: 'eventual' }
	});

	return {
		events: parseAuditEvents(response.value),
		nextLink: response['@odata.nextLink'] ?? null,
		totalCount: response['@odata.count']
	};
}

export async function fetchAuditNextPage(
	client: GraphClient,
	nextLink: string
): Promise<AuditPageResult> {
	// nextLink is a full URL like https://graph.microsoft.com/beta/deviceManagement/...
	// Strip the base to get a path compatible with client.request()
	const url = new URL(nextLink);
	const pathAndQuery = url.pathname.replace(/^\/beta/, '') + url.search;

	const response = await client.request<{
		value: unknown[];
		'@odata.nextLink'?: string;
		'@odata.count'?: number;
	}>(pathAndQuery, {
		headers: { ConsistencyLevel: 'eventual' }
	});

	return {
		events: parseAuditEvents(response.value),
		nextLink: response['@odata.nextLink'] ?? null,
		totalCount: response['@odata.count']
	};
}

// ─── Helpers ────────────────────────────────────────────────────────

function parseAuditEvents(value: unknown[]): AuditEvent[] {
	return (value ?? []).map((item) => auditEventSchema.parse(item) as AuditEvent);
}
