import { isDemoData, seed, STORAGE_KEY, type DemoData } from './demo-db.ts';

function load(): DemoData {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) {
			const parsed: unknown = JSON.parse(raw);
			if (isDemoData(parsed)) return parsed;
		}
	} catch {
		// Private mode or blocked storage: fall through to the sample speaker.
	}
	return seed();
}

export const db = $state<DemoData>(load());

// Call after every change. Returns an error message when the browser refuses to store the data
// (usually a full quota after large images).
export function save(): string | null {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
		return null;
	} catch {
		return 'Your browser would not save this change (storage is full or blocked). Try a smaller image.';
	}
}

export function resetToSample() {
	Object.assign(db, seed());
	save();
}

export function deleteEverything() {
	Object.assign(db, { version: 1, profile: null, links: [], sessions: [] } satisfies DemoData);
	save();
}
