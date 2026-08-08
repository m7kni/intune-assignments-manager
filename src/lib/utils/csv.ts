// SPDX-License-Identifier: AGPL-3.0-only

// ─── Types ──────────────────────────────────────────────────────────

export interface CsvParseError {
	line: number;
	message: string;
}

export interface CsvParseResult {
	headers: string[];
	rows: Record<string, string>[];
	errors: CsvParseError[];
}

// ─── Serialization ──────────────────────────────────────────────────

export function escapeField(value: string): string {
	if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
		return '"' + value.replace(/"/g, '""') + '"';
	}
	return value;
}

export function serializeCsvRow(fields: string[]): string {
	return fields.map(escapeField).join(',');
}

export function serializeCsv(headers: string[], rows: string[][]): string {
	const lines = [serializeCsvRow(headers), ...rows.map(serializeCsvRow)];
	return '\uFEFF' + lines.join('\r\n') + '\r\n';
}

// ─── Parsing ────────────────────────────────────────────────────────

export function parseCsvLine(line: string): string[] {
	const fields: string[] = [];
	let current = '';
	let inQuotes = false;
	let i = 0;

	while (i < line.length) {
		const char = line[i];

		if (inQuotes) {
			if (char === '"') {
				if (i + 1 < line.length && line[i + 1] === '"') {
					current += '"';
					i += 2;
				} else {
					inQuotes = false;
					i++;
				}
			} else {
				current += char;
				i++;
			}
		} else {
			if (char === '"') {
				inQuotes = true;
				i++;
			} else if (char === ',') {
				fields.push(current.trim());
				current = '';
				i++;
			} else {
				current += char;
				i++;
			}
		}
	}

	fields.push(current.trim());
	return fields;
}

export function parseCsv(text: string): CsvParseResult {
	const clean = text.startsWith('\uFEFF') ? text.slice(1) : text;

	const lines = clean.split(/\r?\n|\r/).filter((l) => l.trim() !== '' && !l.trim().startsWith('#'));

	if (lines.length === 0) {
		return { headers: [], rows: [], errors: [{ line: 0, message: 'Empty CSV file' }] };
	}

	const headers = parseCsvLine(lines[0]);
	const rows: Record<string, string>[] = [];
	const errors: CsvParseError[] = [];

	for (let i = 1; i < lines.length; i++) {
		const fields = parseCsvLine(lines[i]);
		if (fields.length !== headers.length) {
			errors.push({
				line: i + 1,
				message: `Expected ${headers.length} columns but found ${fields.length}`
			});
			continue;
		}
		const row: Record<string, string> = {};
		for (let j = 0; j < headers.length; j++) {
			row[headers[j]] = fields[j];
		}
		rows.push(row);
	}

	return { headers, rows, errors };
}
