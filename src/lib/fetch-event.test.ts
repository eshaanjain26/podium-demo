import { describe, expect, it } from 'vitest';
import { fetchEventAll, ImportError } from './fetch-event.ts';

const minimal = { sessions: [], speakers: [], questions: [], categories: [], rooms: [] };

function fakeFetch(res: Response | Error) {
	const calls: { url: string; init?: RequestInit }[] = [];
	const impl = (async (url: string, init?: RequestInit) => {
		calls.push({ url, init });
		if (res instanceof Error) throw res;
		return res;
	}) as typeof fetch;
	return { impl, calls };
}

describe('fetchEventAll', () => {
	it('makes one request that refuses redirects, and returns the parsed view', async () => {
		const { impl, calls } = fakeFetch(Response.json(minimal));
		expect(await fetchEventAll('https://sessionize.com/api/v2/x/view/All', impl)).toEqual(minimal);
		expect(calls).toHaveLength(1);
		expect(calls[0].init?.redirect).toBe('error');
	});

	it.each([
		['network failure', new TypeError('fetch failed'), /reach Sessionize/],
		['404', new Response('nope', { status: 404 }), /no public API/],
		['500', new Response('x', { status: 500 }), /HTTP 500/],
		['HTML body', new Response('<html>'), /did not return JSON/],
		['wrong JSON shape', Response.json([{ id: 'x' }]), /not a Sessionize All view/],
		[
			'oversized body',
			new Response('{}', { headers: { 'content-length': String(6 * 1024 * 1024) } }),
			/too large/
		]
	])('reports %s as an ImportError', async (_, res, message) => {
		const { impl } = fakeFetch(res);
		const err = await fetchEventAll('https://sessionize.com/api/v2/x/view/All', impl).catch(
			(e: unknown) => e
		);
		expect(err).toBeInstanceOf(ImportError);
		expect((err as Error).message).toMatch(message);
	});
});
