export type LinkType =
	'Twitter' | 'LinkedIn' | 'Blog' | 'Company_Website' | 'Facebook' | 'Instagram' | 'Other';

export const LINK_TYPES: LinkType[] = [
	'LinkedIn',
	'Twitter',
	'Blog',
	'Company_Website',
	'Facebook',
	'Instagram',
	'Other'
];

export type SessionStatus = 'active' | 'archived';
export type SessionLevel = '' | 'introductory' | 'intermediate' | 'advanced';

export interface Profile {
	id: string;
	user: string;
	slug: string;
	firstName: string;
	lastName: string;
	tagLine: string;
	bios: Record<string, string> | null;
	publicBioLang: string;
	location: string;
	expertise: string[] | null;
	avatar: string;
	cover: string;
	isPublic: boolean;
	collectionId: string;
	collectionName: string;
}

export interface Link {
	id: string;
	profile: string;
	linkType: LinkType;
	title: string;
	url: string;
	sort: number;
}

export interface Session {
	id: string;
	// Integer id assigned by a PocketBase hook; Sessionize-shaped output uses it as the session id.
	publicId: number;
	profile: string;
	title: string;
	description: string;
	status: SessionStatus;
	isPublic: boolean;
	level: SessionLevel;
	tags: string[] | null;
	externalEvent: string;
	deliveredAt: string;
	recordingUrl: string;
	slidesUrl: string;
	updated: string;
}
