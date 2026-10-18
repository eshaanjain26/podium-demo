import { describe, expect, it } from 'vitest';
import { groupSessions, isShownPublicly, parseSessionForm } from './sessions.ts';

function form(fields: Record<string, string>): FormData {
	const fd = new FormData();
	for (const [k, v] of Object.entries(fields)) fd.set(k, v);
	return fd;
}

describe('isShownPublicly', () => {
	it('requires active and public', () => {
		expect(isShownPublicly({ status: 'active', isPublic: true })).toBe(true);
		expect(isShownPublicly({ status: 'active', isPublic: false })).toBe(false);
		expect(isShownPublicly({ status: 'archived', isPublic: true })).toBe(false);
	});
});

describe('groupSessions', () => {
	it('splits by status and keeps order', () => {
		const rows = [
			{ id: 1, status: 'archived' as const },
			{ id: 2, status: 'active' as const },
			{ id: 3, status: 'active' as const }
		];
		const { active, archived } = groupSessions(rows);
		expect(active.map((r) => r.id)).toEqual([2, 3]);
		expect(archived.map((r) => r.id)).toEqual([1]);
	});
});

describe('parseSessionForm', () => {
	it('parses a full form', () => {
		const { input, errors } = parseSessionForm(
			form({
				title: '  Agentic CPQ ',
				description: 'Abstract',
				level: 'advanced',
				tags: 'AI, CPQ, ai',
				externalEvent: 'Dreamforce 2025',
				deliveredAt: '2025-10-14',
				recordingUrl: 'https://youtu.be/x',
				slidesUrl: '',
				isPublic: 'on'
			})
		);
		expect(errors).toEqual({});
		expect(input).toEqual({
			title: 'Agentic CPQ',
			description: 'Abstract',
			level: 'advanced',
			tags: ['AI', 'CPQ'],
			externalEvent: 'Dreamforce 2025',
			deliveredAt: '2025-10-14 00:00:00.000Z',
			recordingUrl: 'https://youtu.be/x',
			slidesUrl: '',
			isPublic: true
		});
	});

	it('normalizes CRLF newlines in the abstract', () => {
		const { input } = parseSessionForm(
			form({ title: 'T', level: '', description: 'A.\r\n\r\nB.' })
		);
		expect(input.description).toBe('A.\n\nB.');
	});

	it('reports missing title, bad level, bad date, and non-http URLs', () => {
		const { input, errors } = parseSessionForm(
			form({ title: ' ', level: 'expert', deliveredAt: 'soon', slidesUrl: 'javascript:alert(1)' })
		);
		expect(Object.keys(errors).sort()).toEqual(['deliveredAt', 'level', 'slidesUrl', 'title']);
		expect(input.level).toBe('');
		expect(input.deliveredAt).toBe('');
		expect(input.isPublic).toBe(false);
	});
});
