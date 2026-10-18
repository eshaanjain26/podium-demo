import { AllViewSchema, type AllView } from './sessionize.ts';

const MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 10_000;

export class ImportError extends Error {}

// Same checks as Podium's server-side fetch. Sessionize's public API sends
// Access-Control-Allow-Origin: *, so the prototype can call it straight from the browser.
export async function fetchEventAll(
	url: string,
	fetchImpl: typeof fetch = fetch
): Promise<AllView> {
	let res: Response;
	try {
		res = await fetchImpl(url, {
			headers: { accept: 'application/json' },
			redirect: 'error',
			signal: AbortSignal.timeout(TIMEOUT_MS)
		});
	} catch {
		throw new ImportError('Could not reach Sessionize. Check the URL and try again.');
	}
	if (res.status === 404) throw new ImportError('Sessionize has no public API at that URL.');
	if (!res.ok) throw new ImportError(`Sessionize answered with HTTP ${res.status}.`);
	if (Number(res.headers.get('content-length') ?? 0) > MAX_BYTES) {
		throw new ImportError('That event is too large to import.');
	}
	const text = await res.text();
	if (text.length > MAX_BYTES) throw new ImportError('That event is too large to import.');
	let body: unknown;
	try {
		body = JSON.parse(text);
	} catch {
		throw new ImportError('Sessionize did not return JSON. Use the API URL ending in /view/All.');
	}
	const parsed = AllViewSchema.safeParse(body);
	if (!parsed.success) {
		throw new ImportError(
			'That response is not a Sessionize All view. Use the URL ending in /view/All.'
		);
	}
	return parsed.data;
}
