import { describe, expect, it } from 'vitest';
import {
	addLink,
	applyImportPlan,
	createProfile,
	createSession,
	deleteSession,
	isDemoData,
	newId,
	publicFeed,
	seed,
	slugProblem,
	updateProfile,
	updateSession,
	type DemoData
} from './demo-db.ts';
import { buildExport, PodiumExportSchema } from './export.ts';
import { AllViewSchema, SpeakersViewSchema } from './sessionize.ts';
import { toAllView, toSpeakersView } from './sessionize-feed.ts';
import type { SessionInput } from './sessions.ts';

const input: SessionInput = {
	title: 'Talk',
	description: '',
	level: '',
	tags: [],
	externalEvent: '',
	deliveredAt: '',
	recordingUrl: '',
	slidesUrl: '',
	isPublic: true
};

function empty(): DemoData {
	return { version: 1, profile: null, links: [], sessions: [] };
}

describe('seed', () => {
	it('is a valid public profile with active, hidden, and archived sessions', () => {
		const db = seed();
		expect(isDemoData(db)).toBe(true);
		expect(db.profile?.isPublic).toBe(true);
		expect(db.sessions.map((s) => [s.status, s.isPublic])).toEqual([
			['active', true],
			['active', true],
			['active', false],
			['archived', true]
		]);
		expect(db.sessions.map((s) => s.publicId)).toEqual([1, 2, 3, 4]);
	});

	it('produces API output that matches the Sessionize schemas exactly', () => {
		const feed = publicFeed(seed())!;
		const speakers = toSpeakersView(feed);
		const all = toAllView(feed);
		expect(SpeakersViewSchema.parse(speakers)).toEqual(speakers);
		expect(AllViewSchema.parse(all)).toEqual(all);
		expect(speakers[0].sessions.map((s) => s.name)).toEqual([
			'Guardrails for pricing agents',
			'Quote to cash without the spreadsheet'
		]);
	});

	it('exports a file that matches the Podium export schema', () => {
		const db = seed();
		const out = buildExport({
			account: { id: 'demo', email: '' },
			profile: db.profile,
			links: db.links,
			sessions: db.sessions,
			avatarUrl: '',
			coverUrl: ''
		});
		expect(PodiumExportSchema.parse(out)).toEqual(out);
		expect(out.sessions).toHaveLength(4);
	});
});

describe('profiles', () => {
	it('validates the name and slug like the real app', () => {
		const db = empty();
		expect(createProfile(db, { firstName: ' ', lastName: '', slug: 'admin' })).toEqual({
			firstName: 'Add your first name.',
			slug: 'That URL is reserved.'
		});
		expect(createProfile(db, { firstName: 'Sam', lastName: 'Lee', slug: ' Sam-Lee ' })).toEqual({});
		expect(db.profile?.slug).toBe('sam-lee');
		expect(db.profile?.isPublic).toBe(false);
	});

	it.each(['ab', 'a--b', '-ab', 'ab-', 'a_b'])('rejects slug %s', (slug) => {
		expect(slugProblem(slug)).not.toBeNull();
	});

	it('rejects a bad slug on update and leaves the profile unchanged', () => {
		const db = seed();
		expect(updateProfile(db, { slug: 'x' })).toHaveProperty('slug');
		expect(db.profile?.slug).toBe('jordan-rivera');
		expect(updateProfile(db, { slug: 'New-Name', tagLine: 'Hi' })).toEqual({});
		expect(db.profile).toMatchObject({ slug: 'new-name', tagLine: 'Hi' });
	});
});

describe('public feed', () => {
	it('is empty for a private profile', () => {
		const db = seed();
		db.profile!.isPublic = false;
		expect(publicFeed(db)).toBeNull();
	});

	it('follows archive and visibility changes', () => {
		const db = seed();
		const [first] = db.sessions;
		updateSession(db, first.id, { status: 'archived' });
		expect(publicFeed(db)!.sessions.map((s) => s.title)).toEqual(['Guardrails for pricing agents']);
	});
});

describe('sessions', () => {
	it('never reuses a publicId, even after a delete', () => {
		const db = seed();
		deleteSession(db, db.sessions[3].id);
		expect(createSession(db, input)?.publicId).toBe(4);
		deleteSession(db, db.sessions[0].id);
		expect(createSession(db, input)?.publicId).toBe(5);
	});

	it('keeps publicId and owner when updating', () => {
		const db = seed();
		const s = db.sessions[0];
		updateSession(db, s.id, { title: 'Renamed' });
		expect(db.sessions[0]).toMatchObject({
			title: 'Renamed',
			publicId: 1,
			profile: db.profile!.id
		});
	});
});

describe('links', () => {
	it('requires a web URL and appends in order', () => {
		const db = seed();
		expect(addLink(db, { linkType: 'Blog', title: '', url: 'ftp://x' })).toHaveProperty('url');
		expect(
			addLink(db, { linkType: 'Company_Website', title: '', url: 'https://c.example' })
		).toEqual({});
		expect(db.links.at(-1)).toMatchObject({ title: 'Company Website', sort: 3 });
	});
});

describe('applyImportPlan', () => {
	it('writes profile fields, links, and sessions with fresh publicIds', () => {
		const db = seed();
		applyImportPlan(db, {
			profile: { tagLine: 'Imported' },
			links: [{ linkType: 'Twitter', title: 'X', url: 'https://x.example/me' }],
			sessions: [
				{
					title: 'From Sessionize',
					description: 'd',
					recordingUrl: '',
					level: '',
					tags: [],
					externalEvent: 'Event',
					status: 'active',
					isPublic: false
				}
			],
			skippedLinks: 0,
			skippedSessions: 0
		});
		expect(db.profile?.tagLine).toBe('Imported');
		expect(db.links.at(-1)?.url).toBe('https://x.example/me');
		expect(db.sessions.at(-1)).toMatchObject({
			title: 'From Sessionize',
			publicId: 5,
			isPublic: false
		});
	});
});

describe('isDemoData', () => {
	it('rejects stored data from another version', () => {
		expect(isDemoData({ version: 2, profile: null, links: [], sessions: [] })).toBe(false);
		expect(isDemoData(null)).toBe(false);
	});
});

describe('newId', () => {
	it('makes PocketBase-style 15-character ids', () => {
		expect(newId()).toMatch(/^[a-z0-9]{15}$/);
	});
});
