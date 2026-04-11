import type { AssignmentTarget } from './graph';

// ─── Device Management Script Types ────────────────────────────────

export interface DeviceManagementScript {
	id: string;
	displayName: string;
	description: string | null;
	scriptContent: string | null;
	createdDateTime: string;
	lastModifiedDateTime: string;
	runAsAccount: 'system' | 'user';
	enforceSignatureCheck: boolean;
	fileName: string;
	runAs32Bit: boolean;
	roleScopeTagIds: string[];
}

export interface DeviceManagementScriptAssignment {
	id: string;
	target: AssignmentTarget;
}

export interface DeviceManagementScriptDeviceState {
	id: string;
	runState: 'unknown' | 'success' | 'fail' | 'scriptError' | 'pending' | 'notApplicable';
	resultMessage: string | null;
	errorCode: number;
	lastStateUpdateDateTime: string;
	managedDevice: {
		id: string;
		deviceName: string;
	};
}

export interface DeviceManagementScriptRunSummary {
	successDeviceCount: number;
	errorDeviceCount: number;
}
