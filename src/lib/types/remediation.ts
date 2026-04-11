import type { AssignmentTarget } from './graph';

// ─── Remediation Script Types ──────────────────────────────────────

export interface DeviceHealthScript {
	id: string;
	displayName: string;
	description: string | null;
	publisher: string | null;
	detectionScriptContent: string | null;
	remediationScriptContent: string | null;
	runAsAccount: 'system' | 'user';
	enforceSignatureCheck: boolean;
	runAs32Bit: boolean;
	createdDateTime: string;
	lastModifiedDateTime: string;
	isGlobalScript: boolean;
}

export interface DeviceHealthScriptAssignment {
	id: string;
	target: AssignmentTarget;
	runRemediationScript: boolean;
	runSchedule: DeviceHealthScriptRunSchedule | null;
}

export interface DeviceHealthScriptRunSchedule {
	'@odata.type'?: string;
	interval?: number;
	useUtc?: boolean;
	time?: string;
}

export type DeviceHealthScriptDetectionState =
	| 'unknown'
	| 'success'
	| 'fail'
	| 'scriptError'
	| 'pending'
	| 'notApplicable';

export interface DeviceHealthScriptDeviceState {
	id: string;
	detectionState: DeviceHealthScriptDetectionState;
	remediationState: DeviceHealthScriptDetectionState;
	lastStateUpdateDateTime: string | null;
	preRemediationDetectionScriptOutput: string | null;
	remediationScriptError: string | null;
	managedDevice: {
		id: string;
		deviceName: string;
	} | null;
}

export interface DeviceHealthScriptRunSummary {
	noIssueDetectedDeviceCount: number;
	issueDetectedDeviceCount: number;
	issueRemediatedDeviceCount: number;
	issueReoccurredDeviceCount: number;
	scriptErrorDeviceCount: number;
}
