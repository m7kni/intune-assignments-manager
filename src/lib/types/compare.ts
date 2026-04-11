// ─── Policy Comparison Types ────────────────────────────────────────

export type PolicyType = 'configProfile' | 'compliance' | 'security';

export type ComparisonStatus = 'identical' | 'changed' | 'added' | 'removed';

export interface SettingDiff {
	settingName: string;
	settingDefinitionId?: string;
	leftValue: unknown;
	rightValue: unknown;
	status: ComparisonStatus;
}

export interface AssignmentDiff {
	targetDisplayName: string;
	leftAssignment: Record<string, unknown> | null;
	rightAssignment: Record<string, unknown> | null;
	status: ComparisonStatus;
}

export interface ComparisonSummary {
	identical: number;
	changed: number;
	added: number;
	removed: number;
}

export interface PolicyComparisonResult {
	leftPolicy: { id: string; displayName: string };
	rightPolicy: { id: string; displayName: string };
	settingDiffs: SettingDiff[];
	assignmentDiffs: AssignmentDiff[];
	summary: ComparisonSummary;
}
