import { z } from 'zod';
import { MAX_SESSION_TAGS } from './sessions.ts';
import { MAX_TAG_LENGTH, normalizeNewlines } from './profile.ts';
import type { AllView } from './sessionize.ts';
import { LINK_TYPES, type LinkType, type SessionLevel } from './types.ts';

// Only Sessionize's public event endpoint, so the server can't be pointed at any other host.
const EVENT_URL = /^https:\/\/sessionize\.com\/api\/v2\/([a-z0-9]{1,32})\/view\/all\/?$/i;

export function parseEventUrl(raw: string): { eventId: string; url: string } | null {
	const match = EVENT_URL.exec(raw.trim());
	if (!match) return null;
	const eventId = match[1].toLowerCase();
	return { eventId, url: `https://sessionize.com/api/v2/${eventId}/view/All` };
}

// What the claim form carries for one speaker. Re-validated on submit; it only ever writes to the
// signed-in user's own profile, so a tampered payload can do no more than typing into the editor.
export const CandidateSchema = z.object({
	id: z.string().max(100),
	fullName: z.string().max(200),
	tagLine: z.string().max(1000),
	bio: z.string().max(20000),
	profilePicture: z.string().max(2000),
	links: z
		.array(
			z.object({
				title: z.string().max(200),
				url: z.string().max(2000),
				linkType: z.string().max(50)
			})
		)
		.max(50),
	sessions: z
		.array(
			z.object({
				title: z.string().max(500),
				description: z.string().max(20000),
				recordingUrl: z.string().max(2000),
				level: z.enum(['', 'introductory', 'intermediate', 'advanced']),
				tags: z.array(z.string().max(200)).max(50)
			})
		)
		.max(200)
});

export type Candidate = z.infer<typeof CandidateSchema>;

function levelFrom(name: string): SessionLevel {
	if (/^intro/i.test(name)) return 'introductory';
	if (/^inter/i.test(name)) return 'intermediate';
	if (/^adv/i.test(name)) return 'advanced';
	return '';
}

export function buildCandidates(all: AllView): Candidate[] {
	const items = new Map<number, { name: string; isLevel: boolean }>();
	for (const category of all.categories) {
		const isLevel = /level/i.test(category.title);
		for (const item of category.items) items.set(item.id, { name: item.name, isLevel });
	}
	const sessions = new Map(all.sessions.map((s) => [s.id, s]));

	return all.speakers.map((speaker) => ({
		id: speaker.id,
		fullName: speaker.fullName || `${speaker.firstName} ${speaker.lastName}`.trim(),
		tagLine: speaker.tagLine ?? '',
		bio: speaker.bio ?? '',
		profilePicture: speaker.profilePicture ?? '',
		links: speaker.links.map(({ title, url, linkType }) => ({ title, url, linkType })),
		sessions: speaker.sessions.flatMap((id) => {
			const s = sessions.get(String(id));
			if (!s || s.isServiceSession) return [];
			const resolved = s.categoryItems.flatMap((i) => items.get(i) ?? []);
			return [
				{
					title: s.title,
					description: s.description ?? '',
					recordingUrl: s.recordingUrl ?? '',
					level: resolved.map((r) => (r.isLevel ? levelFrom(r.name) : '')).find(Boolean) ?? '',
					tags: resolved.filter((r) => !r.isLevel).map((r) => r.name)
				}
			];
		})
	}));
}

export interface ImportOptions {
	bio: boolean;
	tagLine: boolean;
	links: boolean;
	sessions: boolean;
	bioLang: string;
	externalEvent: string;
	showSessions: boolean;
}

export interface ImportPlan {
	profile: { tagLine?: string; bios?: Record<string, string>; publicBioLang?: string };
	links: { linkType: LinkType; title: string; url: string }[];
	sessions: {
		title: string;
		description: string;
		recordingUrl: string;
		level: SessionLevel;
		tags: string[];
		externalEvent: string;
		status: 'active';
		isPublic: boolean;
	}[];
	skippedLinks: number;
	skippedSessions: number;
}

function linkKey(url: string) {
	return url.trim().toLowerCase().replace(/\/+$/, '');
}

function cleanTags(names: string[]): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const name of names) {
		const tag = name.trim().slice(0, MAX_TAG_LENGTH);
		if (!tag || seen.has(tag.toLowerCase())) continue;
		seen.add(tag.toLowerCase());
		out.push(tag);
		if (out.length === MAX_SESSION_TAGS) break;
	}
	return out;
}

// Duplicates (same link URL, same session title) are skipped so importing twice is harmless.
// Lengths are cut to the PocketBase field limits.
export function planImport(
	existing: {
		bios: Record<string, string> | null;
		publicBioLang: string;
		links: { url: string }[];
		sessions: { title: string }[];
	},
	candidate: Candidate,
	options: ImportOptions
): ImportPlan {
	const plan: ImportPlan = {
		profile: {},
		links: [],
		sessions: [],
		skippedLinks: 0,
		skippedSessions: 0
	};

	const bio = normalizeNewlines(candidate.bio).trim();
	if (options.bio && bio) {
		plan.profile.bios = { ...(existing.bios ?? {}), [options.bioLang]: bio };
		if (!existing.publicBioLang) plan.profile.publicBioLang = options.bioLang;
	}
	const tagLine = candidate.tagLine.trim();
	if (options.tagLine && tagLine) plan.profile.tagLine = tagLine.slice(0, 200);

	if (options.links) {
		const seen = new Set(existing.links.map((l) => linkKey(l.url)));
		for (const link of candidate.links) {
			const key = linkKey(link.url);
			if (!/^https?:\/\//i.test(link.url.trim()) || seen.has(key)) {
				plan.skippedLinks++;
				continue;
			}
			seen.add(key);
			const linkType = (LINK_TYPES as string[]).includes(link.linkType)
				? (link.linkType as LinkType)
				: 'Other';
			plan.links.push({
				linkType,
				title: (link.title.trim() || linkType.replace('_', ' ')).slice(0, 100),
				url: link.url.trim()
			});
		}
	}

	if (options.sessions) {
		const seen = new Set(existing.sessions.map((s) => s.title.trim().toLowerCase()));
		for (const s of candidate.sessions) {
			const title = s.title.trim().slice(0, 200);
			if (!title || seen.has(title.toLowerCase())) {
				plan.skippedSessions++;
				continue;
			}
			seen.add(title.toLowerCase());
			plan.sessions.push({
				title,
				description: normalizeNewlines(s.description).trim().slice(0, 5000),
				recordingUrl: /^https?:\/\//i.test(s.recordingUrl) ? s.recordingUrl : '',
				level: s.level,
				tags: cleanTags(s.tags),
				externalEvent: options.externalEvent.trim().slice(0, 200),
				status: 'active',
				isPublic: options.showSessions
			});
		}
	}

	return plan;
}
