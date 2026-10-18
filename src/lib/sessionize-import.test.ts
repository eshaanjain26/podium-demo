import { describe, expect, it } from 'vitest';
import type { AllView } from './sessionize.ts';
import {
	buildCandidates,
	CandidateSchema,
	parseEventUrl,
	planImport,
	type Candidate,
	type ImportOptions
} from './sessionize-import.ts';

// Synthetic event in Sessionize's All shape (field layout from the demo event, invented content).
const event: AllView = {
	sessions: [
		{
			id: '501',
			title: 'Pricing engines at scale',
			description: 'How we cut quote time.',
			startsAt: '2025-05-01T09:00:00Z',
			endsAt: '2025-05-01T10:00:00Z',
			isServiceSession: false,
			isPlenumSession: false,
			speakers: ['spk-a'],
			categoryItems: [11, 21, 22],
			questionAnswers: [],
			roomId: 1,
			liveUrl: null,
			recordingUrl: 'https://video.example/501',
			status: 'Accepted',
			isInformed: true,
			isConfirmed: true
		},
		{
			id: '502',
			title: 'Lunch',
			description: null,
			startsAt: null,
			endsAt: null,
			isServiceSession: true,
			isPlenumSession: true,
			speakers: [],
			categoryItems: [],
			questionAnswers: [],
			roomId: null,
			liveUrl: null,
			recordingUrl: null,
			status: null,
			isInformed: false,
			isConfirmed: false
		}
	],
	speakers: [
		{
			id: 'spk-a',
			firstName: 'Ana',
			lastName: 'Lee',
			bio: 'Builds CPQ.\r\n\r\nLikes maps.',
			tagLine: 'Architect',
			profilePicture: null,
			isTopSpeaker: false,
			links: [
				{ title: 'LinkedIn', url: 'https://linkedin.com/in/ana', linkType: 'LinkedIn' },
				{ title: 'Sessionize', url: 'https://sessionize.com/ana', linkType: 'Sessionize' }
			],
			sessions: [501, 502, 999],
			fullName: 'Ana Lee',
			categoryItems: [],
			questionAnswers: []
		},
		{
			id: 'spk-b',
			firstName: 'Bo',
			lastName: 'Kim',
			bio: null,
			tagLine: null,
			profilePicture: 'https://cdn.example/bo.jpg',
			isTopSpeaker: true,
			links: [],
			sessions: [],
			fullName: '',
			categoryItems: [],
			questionAnswers: []
		}
	],
	questions: [],
	categories: [
		{
			id: 1,
			title: 'Level',
			items: [{ id: 11, name: 'Advanced', sort: 0 }],
			sort: 0,
			type: 'session'
		},
		{
			id: 2,
			title: 'Track',
			items: [
				{ id: 21, name: 'Business', sort: 0 },
				{ id: 22, name: 'Technical', sort: 1 }
			],
			sort: 1,
			type: 'session'
		}
	],
	rooms: [{ id: 1, name: 'Main', sort: 0 }]
};

const all: ImportOptions = {
	bio: true,
	tagLine: true,
	links: true,
	sessions: true,
	bioLang: 'en',
	externalEvent: 'CPQ Summit',
	showSessions: false
};

const empty = { bios: null, publicBioLang: '', links: [], sessions: [] };

describe('parseEventUrl', () => {
	it('accepts the All view URL and normalizes it', () => {
		expect(parseEventUrl(' https://Sessionize.com/api/v2/JL4ktls0/view/all/ ')).toEqual({
			eventId: 'jl4ktls0',
			url: 'https://sessionize.com/api/v2/jl4ktls0/view/All'
		});
	});

	it.each([
		'http://sessionize.com/api/v2/jl4ktls0/view/All',
		'https://sessionize.com/api/v2/jl4ktls0/view/Speakers',
		'https://sessionize.com.evil.test/api/v2/jl4ktls0/view/All',
		'https://evil.test/?u=https://sessionize.com/api/v2/jl4ktls0/view/All',
		'https://sessionize.com/api/v2/jl4ktls0/view/All?x=1',
		'https://sessionize.com/api/v2/../admin/view/All',
		'https://user@sessionize.com/api/v2/jl4ktls0/view/All',
		''
	])('rejects %s', (url) => {
		expect(parseEventUrl(url)).toBeNull();
	});
});

describe('buildCandidates', () => {
	const [ana, bo] = buildCandidates(event);

	it('resolves each speaker’s sessions, skipping service sessions and unknown ids', () => {
		expect(ana.sessions).toEqual([
			{
				title: 'Pricing engines at scale',
				description: 'How we cut quote time.',
				recordingUrl: 'https://video.example/501',
				level: 'advanced',
				tags: ['Business', 'Technical']
			}
		]);
	});

	it('fills a missing full name and turns nulls into empty strings', () => {
		expect(bo).toMatchObject({ fullName: 'Bo Kim', bio: '', tagLine: '', sessions: [] });
	});

	it('produces records the claim form accepts back', () => {
		for (const c of buildCandidates(event)) expect(CandidateSchema.parse(c)).toEqual(c);
	});
});

describe('planImport', () => {
	const [ana] = buildCandidates(event);

	it('copies bio, tagline, links, and sessions into an empty profile', () => {
		const plan = planImport(empty, ana, all);
		expect(plan.profile).toEqual({
			bios: { en: 'Builds CPQ.\n\nLikes maps.' },
			publicBioLang: 'en',
			tagLine: 'Architect'
		});
		expect(plan.links).toEqual([
			{ linkType: 'LinkedIn', title: 'LinkedIn', url: 'https://linkedin.com/in/ana' },
			{ linkType: 'Other', title: 'Sessionize', url: 'https://sessionize.com/ana' }
		]);
		expect(plan.sessions).toEqual([
			{
				title: 'Pricing engines at scale',
				description: 'How we cut quote time.',
				recordingUrl: 'https://video.example/501',
				level: 'advanced',
				tags: ['Business', 'Technical'],
				externalEvent: 'CPQ Summit',
				status: 'active',
				isPublic: false
			}
		]);
	});

	it('keeps other bio languages and the existing public pick', () => {
		const plan = planImport({ ...empty, bios: { de: 'Hallo.' }, publicBioLang: 'de' }, ana, all);
		expect(plan.profile.bios).toEqual({ de: 'Hallo.', en: 'Builds CPQ.\n\nLikes maps.' });
		expect(plan.profile.publicBioLang).toBeUndefined();
	});

	it('skips links and sessions already present, so a second import adds nothing', () => {
		const plan = planImport(
			{
				...empty,
				links: [{ url: 'HTTPS://linkedin.com/in/ana/' }],
				sessions: [{ title: ' pricing engines AT scale ' }]
			},
			ana,
			all
		);
		expect(plan.links.map((l) => l.url)).toEqual(['https://sessionize.com/ana']);
		expect(plan.sessions).toEqual([]);
		expect([plan.skippedLinks, plan.skippedSessions]).toEqual([1, 1]);
	});

	it('copies only what was ticked', () => {
		const plan = planImport(empty, ana, { ...all, bio: false, links: false, sessions: false });
		expect(plan.profile).toEqual({ tagLine: 'Architect' });
		expect(plan.links).toEqual([]);
		expect(plan.sessions).toEqual([]);
	});

	it('drops non-web links and recording URLs and trims to field limits', () => {
		const c: Candidate = {
			...ana,
			tagLine: 'x'.repeat(300),
			links: [{ title: '', url: 'javascript:alert(1)', linkType: 'Blog' }],
			sessions: [{ ...ana.sessions[0], title: 't'.repeat(300), recordingUrl: 'ftp://x' }]
		};
		const plan = planImport(empty, c, all);
		expect(plan.profile.tagLine).toHaveLength(200);
		expect(plan.links).toEqual([]);
		expect(plan.sessions[0].title).toHaveLength(200);
		expect(plan.sessions[0].recordingUrl).toBe('');
	});
});
