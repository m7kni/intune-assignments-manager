import type { MobileApp, ConfigurationPolicy, AssignmentIntent } from './graph';
import type { DeviceCompliancePolicy } from './compliance';
import type { WindowsUpdateForBusinessConfiguration } from './updates';
import type { DeviceHealthScript } from './remediation';
import type { DeviceManagementScript } from './scripts';

// ─── Group Target ──────────────────────────────────────────────────

export type GroupTargetType = 'group' | 'allDevices' | 'allUsers';

export interface GroupTarget {
	type: GroupTargetType;
	groupId?: string;
	displayName: string;
}

// ─── Filter Configuration ──────────────────────────────────────────

export interface FilterConfig {
	filterId: string;
	filterName: string;
	filterType: 'include' | 'exclude';
}

// ─── Replace Configuration ───────────────────────────────────────

export interface ReplaceConfig {
	/** Which app intent categories to replace (empty = no app replacement) */
	appIntents: AssignmentIntent[];
	/** Whether to replace inclusion assignments for policies */
	policyInclusions: boolean;
	/** Whether to replace exclusion assignments for policies */
	policyExclusions: boolean;
}

// ─── Wizard State ──────────────────────────────────────────────────

export interface WizardState {
	selectedApps: MobileApp[];
	selectedProfiles: ConfigurationPolicy[];
	selectedCompliancePolicies: DeviceCompliancePolicy[];
	selectedSecurityPolicies: ConfigurationPolicy[];
	selectedUpdateRings: WindowsUpdateForBusinessConfiguration[];
	selectedRemediations: DeviceHealthScript[];
	selectedScripts: DeviceManagementScript[];
	selectedGroups: GroupTarget[];
	intent: AssignmentIntent;
	filterConfig: FilterConfig | null;
	exclusionGroups: GroupTarget[];
	replaceMode: boolean;
	replaceConfig: ReplaceConfig;
}

export function createDefaultWizardState(): WizardState {
	return {
		selectedApps: [],
		selectedProfiles: [],
		selectedCompliancePolicies: [],
		selectedSecurityPolicies: [],
		selectedUpdateRings: [],
		selectedRemediations: [],
		selectedScripts: [],
		selectedGroups: [],
		intent: 'required',
		filterConfig: null,
		exclusionGroups: [],
		replaceMode: false,
		replaceConfig: {
			appIntents: [],
			policyInclusions: false,
			policyExclusions: false
		}
	};
}

// ─── Step Definitions ──────────────────────────────────────────────

export type WizardStep = 'items' | 'groups' | 'configure' | 'review' | 'results';

export interface StepDefinition {
	id: WizardStep;
	label: string;
	shortLabel: string;
}

export const WIZARD_STEPS: StepDefinition[] = [
	{ id: 'items', label: 'Select Items', shortLabel: 'Items' },
	{ id: 'groups', label: 'Select Groups', shortLabel: 'Groups' },
	{ id: 'configure', label: 'Configure', shortLabel: 'Config' },
	{ id: 'review', label: 'Review', shortLabel: 'Review' },
	{ id: 'results', label: 'Results', shortLabel: 'Done' }
];

// ─── Conflict Detection ────────────────────────────────────────────

export type ConflictResolution = 'update' | 'skip';

export interface AssignmentConflict {
	itemId: string;
	itemName: string;
	itemType: 'app' | 'profile' | 'compliance' | 'security' | 'updateRing' | 'remediation' | 'script';
	targetDisplayName: string;
	targetKey: string;
	existingIntent: string | null;
	existingFilterId: string | null;
	newIntent: AssignmentIntent;
	newFilterConfig: FilterConfig | null;
	resolution: ConflictResolution;
}

// ─── Execution Types ───────────────────────────────────────────────

export type AssignableItem =
	| { kind: 'app'; id: string; displayName: string }
	| { kind: 'profile'; id: string; displayName: string }
	| { kind: 'compliance'; id: string; displayName: string }
	| { kind: 'security'; id: string; displayName: string }
	| { kind: 'updateRing'; id: string; displayName: string }
	| { kind: 'remediation'; id: string; displayName: string }
	| { kind: 'script'; id: string; displayName: string };

export interface ConflictChoice {
	itemId: string;
	targetKey: string;
	resolution: ConflictResolution;
}

export interface AssignmentResult {
	itemId: string;
	itemName: string;
	itemKind: 'app' | 'profile' | 'compliance' | 'security' | 'updateRing' | 'remediation' | 'script';
	status: 'success' | 'error';
	error?: string;
}

export interface BulkProgress {
	phase: 'fetching' | 'merging' | 'applying';
	completed: number;
	total: number;
	currentItem?: string;
}

export type ProgressCallback = (progress: BulkProgress) => void;
