import { z } from 'zod';

// Shapes of Sessionize's public event API (v2) `Speakers` and `All` views, taken from the demo
// event jl4ktls0 (tests/fixtures/sessionize-api-shape.json). Podium emits these shapes and parses
// them on import. The demo fills every text field, but real events send null (never "") for a
// missing bio, tagline, picture, description, or recording URL (checked on 7 public events,
// about 560 speakers, 2026-10-18), so those are nullable and Podium emits null the same way.

const int = z.number().int();

export const LinkSchema = z.object({
	title: z.string(),
	url: z.string(),
	linkType: z.string()
});

export const QuestionAnswerSchema = z.object({
	questionId: int,
	answerValue: z.string().nullable()
});

export const SpeakerSchema = z.object({
	id: z.string(),
	firstName: z.string(),
	lastName: z.string(),
	fullName: z.string(),
	bio: z.string().nullable(),
	tagLine: z.string().nullable(),
	profilePicture: z.string().nullable(),
	sessions: z.array(z.object({ id: int, name: z.string() })),
	isTopSpeaker: z.boolean(),
	links: z.array(LinkSchema),
	// Empty in the demo, so the item shape is unknown; Podium always emits [].
	questionAnswers: z.array(z.unknown()),
	categories: z.array(z.unknown())
});

export const SpeakersViewSchema = z.array(SpeakerSchema);

export const AllSessionSchema = z.object({
	id: z.string(),
	title: z.string(),
	description: z.string().nullable(),
	startsAt: z.string().nullable(),
	endsAt: z.string().nullable(),
	isServiceSession: z.boolean(),
	isPlenumSession: z.boolean(),
	speakers: z.array(z.string()),
	categoryItems: z.array(int),
	questionAnswers: z.array(QuestionAnswerSchema),
	roomId: int.nullable(),
	liveUrl: z.string().nullable(),
	recordingUrl: z.string().nullable(),
	status: z.string().nullable(),
	isInformed: z.boolean(),
	isConfirmed: z.boolean()
});

export const AllSpeakerSchema = z.object({
	id: z.string(),
	firstName: z.string(),
	lastName: z.string(),
	bio: z.string().nullable(),
	tagLine: z.string().nullable(),
	profilePicture: z.string().nullable(),
	isTopSpeaker: z.boolean(),
	links: z.array(LinkSchema),
	sessions: z.array(int),
	fullName: z.string(),
	categoryItems: z.array(int),
	questionAnswers: z.array(QuestionAnswerSchema)
});

export const QuestionSchema = z.object({
	id: int,
	question: z.string(),
	questionType: z.string(),
	sort: int
});

export const CategorySchema = z.object({
	id: int,
	title: z.string(),
	items: z.array(z.object({ id: int, name: z.string(), sort: int })),
	sort: int,
	type: z.string()
});

export const RoomSchema = z.object({ id: int, name: z.string(), sort: int });

export const AllViewSchema = z.object({
	sessions: z.array(AllSessionSchema),
	speakers: z.array(AllSpeakerSchema),
	questions: z.array(QuestionSchema),
	categories: z.array(CategorySchema),
	rooms: z.array(RoomSchema)
});

export type SessionizeSpeaker = z.infer<typeof SpeakerSchema>;
export type SpeakersView = z.infer<typeof SpeakersViewSchema>;
export type AllSession = z.infer<typeof AllSessionSchema>;
export type AllSpeaker = z.infer<typeof AllSpeakerSchema>;
export type AllCategory = z.infer<typeof CategorySchema>;
export type AllView = z.infer<typeof AllViewSchema>;
