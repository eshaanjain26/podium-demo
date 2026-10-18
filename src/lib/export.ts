import { z } from 'zod';
import { AllViewSchema, SpeakersViewSchema } from './sessionize.ts';
import { toAllView, toSpeakersView } from './sessionize-feed.ts';
import { LINK_TYPES, type Link, type Profile, type Session } from './types.ts';

export const EXPORT_FORMAT = 'podium-export';
export const EXPORT_VERSION = 1;

const NativeProfileSchema = z.object({
	id: z.string(),
	slug: z.string(),
	firstName: z.string(),
	lastName: z.string(),
	tagLine: z.string(),
	bios: z.record(z.string(), z.string()),
	publicBioLang: z.string(),
	location: z.string(),
	expertise: z.array(z.string()),
	isPublic: z.boolean(),
	avatarUrl: z.string(),
	coverUrl: z.string()
});

const NativeLinkSchema = z.object({
	id: z.string(),
	linkType: z.enum(LINK_TYPES),
	title: z.string(),
	url: z.string(),
	sort: z.number()
});

const NativeSessionSchema = z.object({
	id: z.string(),
	publicId: z.number().int(),
	title: z.string(),
	description: z.string(),
	status: z.enum(['active', 'archived']),
	isPublic: z.boolean(),
	level: z.enum(['', 'introductory', 'intermediate', 'advanced']),
	tags: z.array(z.string()),
	externalEvent: z.string(),
	deliveredAt: z.string(),
	recordingUrl: z.string(),
	slidesUrl: z.string()
});

export const PodiumExportSchema = z.object({
	format: z.literal(EXPORT_FORMAT),
	version: z.literal(EXPORT_VERSION),
	exportedAt: z.string(),
	account: z.object({ id: z.string(), email: z.string() }),
	profile: NativeProfileSchema.nullable(),
	links: z.array(NativeLinkSchema),
	sessions: z.array(NativeSessionSchema),
	// Both views include every session, archived and private ones too: this file is for the owner.
	sessionize: z.object({ speakers: SpeakersViewSchema, all: AllViewSchema }).nullable()
});

export type PodiumExport = z.infer<typeof PodiumExportSchema>;

export function buildExport(input: {
	account: { id: string; email: string };
	profile: Profile | null;
	links: Link[];
	sessions: Session[];
	avatarUrl: string;
	coverUrl: string;
	now?: Date;
}): PodiumExport {
	const { profile, links, sessions, avatarUrl, coverUrl } = input;
	return {
		format: EXPORT_FORMAT,
		version: EXPORT_VERSION,
		exportedAt: (input.now ?? new Date()).toISOString(),
		account: input.account,
		profile: profile && {
			id: profile.id,
			slug: profile.slug,
			firstName: profile.firstName,
			lastName: profile.lastName,
			tagLine: profile.tagLine,
			bios: profile.bios ?? {},
			publicBioLang: profile.publicBioLang,
			location: profile.location,
			expertise: profile.expertise ?? [],
			isPublic: profile.isPublic,
			avatarUrl,
			coverUrl
		},
		links: links.map(({ id, linkType, title, url, sort }) => ({ id, linkType, title, url, sort })),
		sessions: sessions.map((s) => ({
			id: s.id,
			publicId: s.publicId,
			title: s.title,
			description: s.description,
			status: s.status,
			isPublic: s.isPublic,
			level: s.level,
			tags: s.tags ?? [],
			externalEvent: s.externalEvent,
			deliveredAt: s.deliveredAt,
			recordingUrl: s.recordingUrl,
			slidesUrl: s.slidesUrl
		})),
		sessionize: profile && {
			speakers: toSpeakersView({ profile, links, sessions, avatarUrl }),
			all: toAllView({ profile, links, sessions, avatarUrl })
		}
	};
}
