import { normalizeNewlines, parseTagList } from './profile.ts';
import type { Session, SessionLevel } from './types.ts';

export const MAX_SESSION_TAGS = 8;
const LEVELS: SessionLevel[] = ['', 'introductory', 'intermediate', 'advanced'];

export function groupSessions<T extends Pick<Session, 'status'>>(
	sessions: T[]
): { active: T[]; archived: T[] } {
	return {
		active: sessions.filter((s) => s.status === 'active'),
		archived: sessions.filter((s) => s.status === 'archived')
	};
}

// What appears on the public profile: active and marked public. Archive is the Sessionize-style
// hide; isPublic covers "keep it for reuse, but not on my page".
export function isShownPublicly(s: Pick<Session, 'status' | 'isPublic'>): boolean {
	return s.status === 'active' && s.isPublic;
}

export interface SessionInput {
	title: string;
	description: string;
	level: SessionLevel;
	tags: string[];
	externalEvent: string;
	deliveredAt: string;
	recordingUrl: string;
	slidesUrl: string;
	isPublic: boolean;
}

export function parseSessionForm(form: FormData): {
	input: SessionInput;
	errors: Record<string, string>;
} {
	const get = (k: string) => String(form.get(k) ?? '').trim();
	const errors: Record<string, string> = {};

	const title = get('title');
	if (!title) errors.title = 'Give the session a title.';

	const level = get('level') as SessionLevel;
	if (!LEVELS.includes(level)) errors.level = 'Pick a listed level.';

	const deliveredAt = get('deliveredAt');
	if (deliveredAt && Number.isNaN(Date.parse(deliveredAt)))
		errors.deliveredAt = 'Use a valid date.';

	for (const key of ['recordingUrl', 'slidesUrl'] as const) {
		const value = get(key);
		if (value && !/^https?:\/\//i.test(value)) errors[key] = 'Use a full http(s) URL.';
	}

	return {
		input: {
			title,
			description: normalizeNewlines(get('description')),
			level: LEVELS.includes(level) ? level : '',
			tags: parseTagList(get('tags'), MAX_SESSION_TAGS),
			externalEvent: get('externalEvent'),
			// PocketBase date fields take "YYYY-MM-DD 00:00:00.000Z".
			deliveredAt: deliveredAt && !errors.deliveredAt ? `${deliveredAt} 00:00:00.000Z` : '',
			recordingUrl: get('recordingUrl'),
			slidesUrl: get('slidesUrl'),
			isPublic: form.get('isPublic') === 'on'
		},
		errors
	};
}
