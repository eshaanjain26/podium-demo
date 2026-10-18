import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { z } from 'zod';
import { AllViewSchema, SpeakersViewSchema } from './sessionize.ts';
import { toAllView, toSpeakersView, type FeedInput } from './sessionize-feed.ts';

const shape = JSON.parse(
	readFileSync(
		resolve(import.meta.dirname, '../../tests/fixtures/sessionize-api-shape.json'),
		'utf8'
	)
);

// Turns the type-only reference ({"id": "str", ...}) into a value with the same keys and types.
function sample(node: unknown): unknown {
	if (Array.isArray(node)) return node.map(sample);
	if (node && typeof node === 'object') {
		return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, sample(v)]));
	}
	return { str: 'x', int: 7, bool: true, NoneType: null }[node as string];
}

// parse() strips unknown keys and rejects missing ones, so a round trip that changes nothing means
// the schema has exactly the value's keys.
function expectExactShape(schema: z.ZodType, value: unknown) {
	expect(schema.parse(value)).toEqual(value);
}

const input: FeedInput = {
	profile: {
		id: 'abc123def456ghi',
		firstName: 'Jane',
		lastName: 'Doe',
		tagLine: 'Staff engineer',
		bios: { en: 'Hello.', de: 'Hallo.' },
		publicBioLang: 'de'
	},
	links: [{ title: 'LinkedIn', url: 'https://linkedin.com/in/jane', linkType: 'LinkedIn' }],
	sessions: [
		{
			publicId: 41,
			title: 'Quote to cash',
			description: 'Long form.',
			level: 'advanced',
			tags: ['CPQ', 'AI'],
			recordingUrl: 'https://video.example/1'
		},
		{ publicId: 7, title: 'Short one', description: '', level: '', tags: null, recordingUrl: '' }
	],
	avatarUrl: 'https://pb.example/api/files/x/y/a.png'
};

describe('schemas match the saved Sessionize demo shape', () => {
	it('Speakers view', () => {
		expectExactShape(SpeakersViewSchema, sample(shape.speakers.shape));
	});

	it('All view', () => {
		expectExactShape(AllViewSchema, sample(shape.all.shape));
	});

	it('rejects a Speakers-view session id sent as a string', () => {
		const value = sample(shape.speakers.shape) as { sessions: { id: unknown }[] }[];
		value[0].sessions[0].id = '14022';
		expect(SpeakersViewSchema.safeParse(value).success).toBe(false);
	});
});

describe('toSpeakersView', () => {
	it('emits exactly the Speakers shape with integer session ids', () => {
		const out = toSpeakersView(input);
		expectExactShape(SpeakersViewSchema, out);
		expect(out).toHaveLength(1);
		expect(out[0]).toMatchObject({
			id: 'abc123def456ghi',
			fullName: 'Jane Doe',
			bio: 'Hallo.',
			sessions: [
				{ id: 41, name: 'Quote to cash' },
				{ id: 7, name: 'Short one' }
			]
		});
	});

	it('uses null for empty optional text', () => {
		const [s] = toSpeakersView({
			...input,
			profile: { ...input.profile, tagLine: '', bios: null },
			avatarUrl: ''
		});
		expect([s.bio, s.tagLine, s.profilePicture]).toEqual([null, null, null]);
	});
});

describe('toAllView', () => {
	it('emits exactly the All shape', () => {
		expectExactShape(AllViewSchema, toAllView(input));
	});

	it('links sessions and speaker both ways, with string ids on sessions and ints on the speaker', () => {
		const all = toAllView(input);
		expect(all.sessions.map((s) => s.id)).toEqual(['41', '7']);
		expect(all.speakers[0].sessions).toEqual([41, 7]);
		expect(all.sessions.every((s) => s.speakers[0] === all.speakers[0].id)).toBe(true);
	});

	it('maps level and tags to category items that resolve', () => {
		const all = toAllView(input);
		const items = new Map(all.categories.flatMap((c) => c.items.map((i) => [i.id, i.name])));
		expect(all.sessions[0].categoryItems.map((id) => items.get(id))).toEqual([
			'Advanced',
			'CPQ',
			'AI'
		]);
		expect(all.sessions[1].categoryItems).toEqual([]);
	});

	it('omits the Tags category when no session has tags', () => {
		const all = toAllView({ ...input, sessions: [input.sessions[1]] });
		expect(all.categories.map((c) => c.title)).toEqual(['Level']);
	});
});
