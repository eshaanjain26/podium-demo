import { isShownPublicly } from './sessions.ts';
import type { SessionInput } from './sessions.ts';
import type { FeedInput } from './sessionize-feed.ts';
import type { ImportPlan } from './sessionize-import.ts';
import type { Link, LinkType, Profile, Session } from './types.ts';

// The prototype keeps one speaker's data in the visitor's browser. These functions stand in for
// Podium's PocketBase collections and hooks; they mutate the object they're given, so they work
// on a Svelte $state proxy as well as on a plain object in tests.

export const STORAGE_KEY = 'podium-demo:v1';

export interface DemoData {
	version: 1;
	profile: Profile | null;
	links: Link[];
	sessions: Session[];
}

// Same rules as pb/pb_hooks/slug.js in the Podium repo.
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const RESERVED = new Set([
	'about',
	'account',
	'admin',
	'administrator',
	'api',
	'app',
	'auth',
	'dashboard',
	'directory',
	'docs',
	'help',
	'login',
	'logout',
	'me',
	'new',
	'official',
	'podium',
	'privacy',
	'register',
	'root',
	'security',
	'settings',
	'signup',
	'staff',
	'support',
	'system',
	'terms'
]);

export function normalizeSlug(raw: string): string {
	return raw.trim().toLowerCase();
}

export function slugProblem(slug: string): string | null {
	if (slug.length < 3 || slug.length > 40) return 'Use 3 to 40 characters.';
	if (!SLUG_PATTERN.test(slug)) {
		return 'Use lowercase letters, digits, and single hyphens; start and end with a letter or digit.';
	}
	if (slug.includes('--')) return 'Hyphens cannot repeat.';
	if (RESERVED.has(slug)) return 'That URL is reserved.';
	return null;
}

export function newId(random: () => number = Math.random): string {
	const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
	let id = '';
	for (let i = 0; i < 15; i++) id += chars[Math.floor(random() * chars.length)];
	return id;
}

// Mirrors the publicId hook: next integer after the highest ever stored in this browser.
export function nextPublicId(sessions: Pick<Session, 'publicId'>[]): number {
	return sessions.reduce((max, s) => Math.max(max, s.publicId), 0) + 1;
}

function nowIso(): string {
	return new Date().toISOString();
}

function blankProfile(): Profile {
	return {
		id: newId(),
		user: 'demo',
		slug: '',
		firstName: '',
		lastName: '',
		tagLine: '',
		bios: {},
		publicBioLang: 'en',
		location: '',
		expertise: [],
		avatar: '',
		cover: '',
		isPublic: false,
		collectionId: 'demo',
		collectionName: 'profiles'
	};
}

type Errors = Record<string, string>;

export function createProfile(
	db: DemoData,
	input: { firstName: string; lastName: string; slug: string }
): Errors {
	const errors: Errors = {};
	const slug = normalizeSlug(input.slug);
	if (!input.firstName.trim()) errors.firstName = 'Add your first name.';
	const problem = slugProblem(slug);
	if (problem) errors.slug = problem;
	if (Object.keys(errors).length) return errors;
	db.profile = {
		...blankProfile(),
		firstName: input.firstName.trim().slice(0, 100),
		lastName: input.lastName.trim().slice(0, 100),
		slug
	};
	return {};
}

export function updateProfile(db: DemoData, patch: Partial<Profile>): Errors {
	if (!db.profile) return { form: 'Create your profile first.' };
	if (patch.slug !== undefined) {
		const slug = normalizeSlug(patch.slug);
		const problem = slugProblem(slug);
		if (problem) return { slug: problem };
		patch = { ...patch, slug };
	}
	if (patch.firstName !== undefined && !patch.firstName.trim()) {
		return { firstName: 'Add your first name.' };
	}
	Object.assign(db.profile, patch);
	return {};
}

export function addLink(
	db: DemoData,
	input: { linkType: LinkType; title: string; url: string }
): Errors {
	if (!db.profile) return { form: 'Create your profile first.' };
	if (!/^https?:\/\//i.test(input.url.trim())) return { url: 'Use a full http(s) URL.' };
	db.links.push({
		id: newId(),
		profile: db.profile.id,
		linkType: input.linkType,
		title: (input.title.trim() || input.linkType.replace('_', ' ')).slice(0, 100),
		url: input.url.trim(),
		sort: db.links.reduce((max, l) => Math.max(max, l.sort), 0) + 1
	});
	return {};
}

export function deleteLink(db: DemoData, id: string) {
	db.links = db.links.filter((l) => l.id !== id);
}

export function createSession(
	db: DemoData,
	input: SessionInput,
	status: Session['status'] = 'active'
): Session | null {
	if (!db.profile) return null;
	const session: Session = {
		...input,
		id: newId(),
		publicId: nextPublicId(db.sessions),
		profile: db.profile.id,
		status,
		updated: nowIso()
	};
	db.sessions.push(session);
	return session;
}

export function updateSession(
	db: DemoData,
	id: string,
	patch: Partial<Omit<Session, 'id' | 'publicId' | 'profile'>>
): boolean {
	const session = db.sessions.find((s) => s.id === id);
	if (!session) return false;
	Object.assign(session, patch, { updated: nowIso() });
	return true;
}

export function deleteSession(db: DemoData, id: string) {
	db.sessions = db.sessions.filter((s) => s.id !== id);
}

export function applyImportPlan(db: DemoData, plan: ImportPlan) {
	if (!db.profile) return;
	Object.assign(db.profile, plan.profile);
	for (const link of plan.links) addLink(db, link);
	for (const s of plan.sessions) {
		const { status, ...input } = s;
		createSession(db, { ...input, deliveredAt: '', slidesUrl: '' }, status);
	}
}

function byNewest(a: Session, b: Session) {
	return (
		(b.deliveredAt || '').localeCompare(a.deliveredAt || '') || b.updated.localeCompare(a.updated)
	);
}

export function sortedLinks(db: DemoData): Link[] {
	return [...db.links].sort((a, b) => a.sort - b.sort);
}

export function publicSessions(db: DemoData): Session[] {
	return db.sessions.filter(isShownPublicly).sort(byNewest);
}

// What the real /api/v1/profile/{slug} endpoints would serve: nothing for a private profile.
export function publicFeed(db: DemoData): FeedInput | null {
	if (!db.profile?.isPublic) return null;
	return {
		profile: db.profile,
		links: sortedLinks(db),
		sessions: publicSessions(db),
		avatarUrl: db.profile.avatar
	};
}

export function isDemoData(value: unknown): value is DemoData {
	const v = value as DemoData;
	return (
		!!v &&
		v.version === 1 &&
		Array.isArray(v.links) &&
		Array.isArray(v.sessions) &&
		(v.profile === null || typeof v.profile === 'object')
	);
}

// A fictional speaker so the prototype opens with something to look at. Every URL is on an
// example domain.
export function seed(): DemoData {
	const profile: Profile = {
		...blankProfile(),
		slug: 'jordan-rivera',
		firstName: 'Jordan',
		lastName: 'Rivera',
		tagLine: 'Staff engineer, pricing and quoting systems',
		bios: {
			en: 'Jordan builds the systems that turn a product catalog into a signed quote.\n\nThey have spent the last decade on configure-price-quote platforms, and now work on putting AI agents into the quoting flow without letting them invent discounts.',
			es: 'Jordan construye los sistemas que convierten un catálogo de productos en una cotización firmada.'
		},
		publicBioLang: 'en',
		location: 'Seattle, WA',
		expertise: ['CPQ', 'Pricing', 'Agentic AI', 'Platform engineering'],
		isPublic: true
	};
	const db: DemoData = { version: 1, profile, links: [], sessions: [] };
	addLink(db, {
		linkType: 'LinkedIn',
		title: 'LinkedIn',
		url: 'https://linkedin.example.org/jordan-rivera'
	});
	addLink(db, { linkType: 'Blog', title: 'Blog', url: 'https://jordan-rivera.example.org' });

	const base = { externalEvent: '', deliveredAt: '', recordingUrl: '', slidesUrl: '', tags: [] };
	createSession(db, {
		...base,
		title: 'Quote to cash without the spreadsheet',
		description:
			'What breaks when pricing rules live in spreadsheets, and how one team moved 400 rules into a tested pricing engine.\n\nWe cover rule ownership, approval paths, and the migration order that kept sales quoting the whole time.',
		level: 'advanced',
		tags: ['CPQ', 'Pricing'],
		externalEvent: 'Example Summit 2025',
		deliveredAt: '2025-09-18 00:00:00.000Z',
		recordingUrl: 'https://video.example.org/quote-to-cash',
		isPublic: true
	});
	createSession(db, {
		...base,
		title: 'Guardrails for pricing agents',
		description:
			'An AI agent that drafts quotes is useful right up to the moment it offers a discount nobody approved. This talk shows the checks that sit between the agent and the price.',
		level: 'intermediate',
		tags: ['Agentic AI', 'Pricing'],
		externalEvent: 'Example DevDays 2026',
		deliveredAt: '2026-03-12 00:00:00.000Z',
		slidesUrl: 'https://slides.example.org/pricing-agents',
		isPublic: true
	});
	createSession(db, {
		...base,
		title: 'Product catalog modeling workshop',
		description: 'A hands-on session on modeling bundles and options. Still a draft.',
		level: 'introductory',
		tags: ['CPQ'],
		isPublic: false
	});
	createSession(
		db,
		{
			...base,
			title: 'Migrating a monolith quote engine',
			description: 'Retired talk from 2023, kept for the record.',
			level: 'intermediate',
			externalEvent: 'Example Conf 2023',
			deliveredAt: '2023-05-04 00:00:00.000Z',
			isPublic: true
		},
		'archived'
	);
	return db;
}
