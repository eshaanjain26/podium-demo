import { describe, expect, it } from 'vitest';
import { buildExport, PodiumExportSchema } from './export.ts';
import type { Link, Profile, Session } from './types.ts';

const profile = {
	id: 'p1',
	user: 'u1',
	slug: 'jane',
	firstName: 'Jane',
	lastName: 'Doe',
	tagLine: '',
	bios: null,
	publicBioLang: '',
	location: '',
	expertise: null,
	avatar: '',
	cover: '',
	isPublic: false,
	collectionId: 'c',
	collectionName: 'profiles'
} satisfies Profile;

const session = {
	id: 's1',
	publicId: 3,
	profile: 'p1',
	title: 'Archived talk',
	description: '',
	status: 'archived',
	isPublic: false,
	level: '',
	tags: null,
	externalEvent: '',
	deliveredAt: '',
	recordingUrl: '',
	slidesUrl: '',
	updated: ''
} satisfies Session;

const link = {
	id: 'l1',
	profile: 'p1',
	linkType: 'Blog',
	title: 'Blog',
	url: 'https://b.test',
	sort: 0
} satisfies Link;

describe('buildExport', () => {
	const now = new Date('2026-10-18T12:00:00Z');

	it('produces a file that matches the export schema exactly, private data included', () => {
		const out = buildExport({
			account: { id: 'u1', email: 'j@x.test' },
			profile,
			links: [link],
			sessions: [session],
			avatarUrl: '',
			coverUrl: '',
			now
		});
		expect(PodiumExportSchema.parse(out)).toEqual(out);
		expect(out.exportedAt).toBe('2026-10-18T12:00:00.000Z');
		expect(out.sessions[0]).toMatchObject({ status: 'archived', publicId: 3 });
		expect(out.sessionize?.speakers[0].sessions).toEqual([{ id: 3, name: 'Archived talk' }]);
		expect(out.sessionize?.all.sessions[0].id).toBe('3');
	});

	it('handles an account with no profile yet', () => {
		const out = buildExport({
			account: { id: 'u1', email: 'j@x.test' },
			profile: null,
			links: [],
			sessions: [],
			avatarUrl: '',
			coverUrl: '',
			now
		});
		expect(PodiumExportSchema.parse(out)).toEqual(out);
		expect(out.sessionize).toBeNull();
	});
});
