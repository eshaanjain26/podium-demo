import { describe, expect, it } from 'vitest';
import { isValidLang, parseBios, parseTagList, pickPublicBio, suggestSlug } from './profile.ts';

describe('pickPublicBio', () => {
	it('returns the chosen language', () => {
		expect(pickPublicBio({ en: 'Hello', de: 'Hallo' }, 'de')).toEqual({
			lang: 'de',
			text: 'Hallo'
		});
	});

	it('falls back to the first non-empty bio when the chosen one is missing or blank', () => {
		expect(pickPublicBio({ en: '  ', fr: 'Bonjour' }, 'en')).toEqual({
			lang: 'fr',
			text: 'Bonjour'
		});
		expect(pickPublicBio({ en: 'Hello' }, '')).toEqual({ lang: 'en', text: 'Hello' });
	});

	it('returns null with no usable bio', () => {
		expect(pickPublicBio(null, 'en')).toBeNull();
		expect(pickPublicBio({ en: '' }, 'en')).toBeNull();
	});
});

describe('parseTagList', () => {
	it('splits on commas and newlines, trims, and dedupes case-insensitively', () => {
		expect(parseTagList('Kubernetes, kubernetes\nCPQ ,  , Salesforce')).toEqual([
			'Kubernetes',
			'CPQ',
			'Salesforce'
		]);
	});

	it('caps the count and each tag length', () => {
		const many = Array.from({ length: 15 }, (_, i) => `t${i}`).join(',');
		expect(parseTagList(many)).toHaveLength(10);
		expect(parseTagList('x'.repeat(60))[0]).toHaveLength(40);
	});
});

describe('isValidLang', () => {
	it.each(['en', 'pt-BR', 'zh-Hant', 'fil'])('accepts %s', (lang) => {
		expect(isValidLang(lang)).toBe(true);
	});
	it.each(['', 'EN', 'english', 'e', 'en_US'])('rejects %s', (lang) => {
		expect(isValidLang(lang)).toBe(false);
	});
});

describe('parseBios', () => {
	it('pairs languages with texts, drops empty rows, and reports bad tags', () => {
		expect(parseBios(['en', '', 'xx_YY', 'de'], ['Hi', '', 'nope', '  '])).toEqual({
			bios: { en: 'Hi' },
			invalid: ['xx_YY']
		});
	});

	it('normalizes CRLF newlines from form posts', () => {
		expect(parseBios(['en'], ['One.\r\n\r\nTwo.']).bios.en).toBe('One.\n\nTwo.');
	});

	it('flags text with a blank language', () => {
		expect(parseBios([''], ['orphan text']).invalid).toEqual(['(blank)']);
	});
});

describe('suggestSlug', () => {
	it('builds a URL-safe slug from the name', () => {
		expect(suggestSlug('José', "O'Brien")).toBe('jose-o-brien');
		expect(suggestSlug('  Ada ', '')).toBe('ada');
	});

	it('never ends in a hyphen after truncation', () => {
		const slug = suggestSlug('a'.repeat(39), 'b');
		expect(slug.length).toBeLessThanOrEqual(40);
		expect(slug.endsWith('-')).toBe(false);
	});
});
