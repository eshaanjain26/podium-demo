import { fullName, pickPublicBio } from './profile.ts';
import type { AllCategory, AllView, SessionizeSpeaker, SpeakersView } from './sessionize.ts';
import type { Link, Profile, Session, SessionLevel } from './types.ts';

export interface FeedInput {
	profile: Pick<Profile, 'id' | 'firstName' | 'lastName' | 'tagLine' | 'bios' | 'publicBioLang'>;
	links: Pick<Link, 'title' | 'url' | 'linkType'>[];
	sessions: Pick<
		Session,
		'publicId' | 'title' | 'description' | 'level' | 'tags' | 'recordingUrl'
	>[];
	avatarUrl: string;
}

// Category and item ids only need to be unique within one response, like Sessionize's, which are
// scoped to an event. Level ids are fixed; tag ids follow alphabetical order in the response.
const LEVEL_CATEGORY_ID = 1;
const TAGS_CATEGORY_ID = 2;
const TAG_ITEM_BASE = 1000;
const LEVEL_ITEMS: { id: number; name: string; level: Exclude<SessionLevel, ''> }[] = [
	{ id: 1, name: 'Introductory', level: 'introductory' },
	{ id: 2, name: 'Intermediate', level: 'intermediate' },
	{ id: 3, name: 'Advanced', level: 'advanced' }
];

function speakerBase(input: FeedInput) {
	const { profile, links, avatarUrl } = input;
	return {
		id: profile.id,
		firstName: profile.firstName,
		lastName: profile.lastName,
		fullName: fullName(profile),
		bio: pickPublicBio(profile.bios, profile.publicBioLang)?.text ?? null,
		tagLine: profile.tagLine || null,
		profilePicture: avatarUrl || null,
		isTopSpeaker: false,
		links: links.map(({ title, url, linkType }) => ({ title, url, linkType }))
	};
}

export function toSpeakersView(input: FeedInput): SpeakersView {
	const speaker: SessionizeSpeaker = {
		...speakerBase(input),
		sessions: input.sessions.map((s) => ({ id: s.publicId, name: s.title })),
		questionAnswers: [],
		categories: []
	};
	return [speaker];
}

export function toAllView(input: FeedInput): AllView {
	const base = speakerBase(input);
	const tagNames = [...new Set(input.sessions.flatMap((s) => s.tags ?? []))].sort((a, b) =>
		a.localeCompare(b)
	);
	const tagIds = new Map(tagNames.map((name, i) => [name, TAG_ITEM_BASE + i]));

	const categories: AllCategory[] = [
		{
			id: LEVEL_CATEGORY_ID,
			title: 'Level',
			items: LEVEL_ITEMS.map(({ id, name }, sort) => ({ id, name, sort })),
			sort: 0,
			type: 'session'
		}
	];
	if (tagNames.length) {
		categories.push({
			id: TAGS_CATEGORY_ID,
			title: 'Tags',
			items: tagNames.map((name, sort) => ({ id: TAG_ITEM_BASE + sort, name, sort })),
			sort: 1,
			type: 'session'
		});
	}

	return {
		sessions: input.sessions.map((s) => ({
			id: String(s.publicId),
			title: s.title,
			description: s.description || null,
			// A profile session has no slot in an event schedule.
			startsAt: null,
			endsAt: null,
			isServiceSession: false,
			isPlenumSession: false,
			speakers: [base.id],
			categoryItems: [
				...LEVEL_ITEMS.filter((l) => l.level === s.level).map((l) => l.id),
				...(s.tags ?? []).map((t) => tagIds.get(t)!)
			],
			questionAnswers: [],
			roomId: null,
			liveUrl: null,
			recordingUrl: s.recordingUrl || null,
			// Sessionize's public views publish accepted sessions; a public Podium session is the equivalent.
			status: 'Accepted',
			isInformed: false,
			isConfirmed: false
		})),
		speakers: [
			{
				...base,
				sessions: input.sessions.map((s) => s.publicId),
				categoryItems: [],
				questionAnswers: []
			}
		],
		questions: [],
		categories,
		rooms: []
	};
}
