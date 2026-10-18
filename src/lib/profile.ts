export const MAX_EXPERTISE = 10;
export const MAX_TAG_LENGTH = 40;

// BCP 47 subset: language, optional script or region (en, pt-BR, zh-Hant).
const LANG_PATTERN = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;

// HTML form posts send textarea newlines as CRLF.
export function normalizeNewlines(text: string): string {
	return text.replace(/\r\n?/g, '\n');
}

export function isValidLang(lang: string): boolean {
	return LANG_PATTERN.test(lang);
}

// Falls back to the first non-empty bio so a speaker who never picked a language still shows one.
export function pickPublicBio(
	bios: Record<string, string> | null | undefined,
	lang: string
): { lang: string; text: string } | null {
	if (!bios) return null;
	const chosen = bios[lang]?.trim();
	if (chosen) return { lang, text: chosen };
	for (const [key, text] of Object.entries(bios)) {
		if (text?.trim()) return { lang: key, text: text.trim() };
	}
	return null;
}

// Comma- or newline-separated list, trimmed, case-insensitively deduped, capped.
export function parseTagList(raw: string, max = MAX_EXPERTISE): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const piece of raw.split(/[,\n]/)) {
		const tag = piece.trim().slice(0, MAX_TAG_LENGTH);
		const key = tag.toLowerCase();
		if (!tag || seen.has(key)) continue;
		seen.add(key);
		out.push(tag);
		if (out.length === max) break;
	}
	return out;
}

// Form fields arrive as bioLang[] / bioText[] pairs; empty rows are dropped, later duplicates win.
export function parseBios(
	langs: string[],
	texts: string[]
): {
	bios: Record<string, string>;
	invalid: string[];
} {
	const bios: Record<string, string> = {};
	const invalid: string[] = [];
	langs.forEach((rawLang, i) => {
		const lang = rawLang.trim();
		const text = normalizeNewlines(texts[i] ?? '').trim();
		if (!lang && !text) return;
		if (!isValidLang(lang)) {
			invalid.push(lang || '(blank)');
			return;
		}
		if (text) bios[lang] = text;
	});
	return { bios, invalid };
}

export function suggestSlug(firstName: string, lastName: string): string {
	return `${firstName} ${lastName}`
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 40)
		.replace(/-+$/, '');
}

export function fullName(p: { firstName: string; lastName: string }): string {
	return `${p.firstName} ${p.lastName}`.trim();
}
