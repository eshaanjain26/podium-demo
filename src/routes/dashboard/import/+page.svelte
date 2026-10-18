<script lang="ts">
	import { resolve } from '$app/paths';
	import { applyImportPlan } from '#lib/demo-db.ts';
	import { fetchEventAll, ImportError } from '#lib/fetch-event.ts';
	import { isValidLang } from '#lib/profile.ts';
	import {
		buildCandidates,
		parseEventUrl,
		planImport,
		type Candidate,
		type ImportPlan
	} from '#lib/sessionize-import.ts';
	import { db, save } from '#lib/store.svelte.ts';

	// Sessionize's documented demo event, filled in so the flow can be tried without a real event.
	const DEMO_URL = 'https://sessionize.com/api/v2/jl4ktls0/view/All';

	let url = $state(DEMO_URL);
	let urlError = $state('');
	let fetching = $state(false);
	let eventId = $state('');
	let candidates = $state<Candidate[]>([]);
	let query = $state('');
	let chosen = $state<string | null>(null);
	let formError = $state('');
	let done = $state<{ name: string; plan: ImportPlan; shown: boolean } | null>(null);

	const shown = $derived(
		query.trim()
			? candidates.filter((c) => c.fullName.toLowerCase().includes(query.trim().toLowerCase()))
			: candidates
	);

	async function find(e: SubmitEvent) {
		e.preventDefault();
		urlError = '';
		candidates = [];
		chosen = null;
		done = null;
		const target = parseEventUrl(url);
		if (!target) {
			urlError = 'Use a URL like https://sessionize.com/api/v2/abc123/view/All';
			return;
		}
		fetching = true;
		try {
			candidates = buildCandidates(await fetchEventAll(target.url));
			eventId = target.eventId;
		} catch (err) {
			urlError = err instanceof ImportError ? err.message : 'Something went wrong. Try again.';
		} finally {
			fetching = false;
		}
	}

	function claim(e: SubmitEvent) {
		e.preventDefault();
		formError = '';
		const candidate = candidates.find((c) => c.id === chosen);
		if (!candidate || !db.profile) {
			formError = 'Pick your speaker record first.';
			return;
		}
		const form = new FormData(e.currentTarget as HTMLFormElement);
		const bioLang = String(form.get('bioLang') ?? '').trim() || 'en';
		if (!isValidLang(bioLang)) {
			formError = `"${bioLang}" is not a language code like en or pt-BR.`;
			return;
		}
		const on = (k: string) => form.get(k) === 'on';
		const plan = planImport(
			{
				bios: db.profile.bios,
				publicBioLang: db.profile.publicBioLang,
				links: db.links,
				sessions: db.sessions
			},
			candidate,
			{
				bio: on('copyBio'),
				tagLine: on('copyTagLine'),
				links: on('copyLinks'),
				sessions: on('copySessions'),
				bioLang,
				externalEvent: String(form.get('externalEvent') ?? ''),
				showSessions: on('showSessions')
			}
		);
		applyImportPlan(db, plan);
		const failure = save();
		if (failure) {
			formError = failure;
			return;
		}
		// Drop the other speakers' records as soon as one is claimed.
		candidates = [];
		done = { name: candidate.fullName, plan, shown: on('showSessions') };
	}
</script>

<svelte:head>
	<title>Import from Sessionize · Podium</title>
</svelte:head>

<div class="page-head">
	<div>
		<h1>Import from Sessionize</h1>
		<p class="muted">
			Copy your bio, tagline, links, and sessions from an event you spoke at. Podium reads the
			event's public API once, you pick your own speaker record, and only that record is saved.
		</p>
	</div>
</div>

{#if !db.profile}
	<section class="card">
		<p>Create your profile first, then come back to import.</p>
		<p><a class="button" href={resolve('/dashboard')}>Create profile</a></p>
	</section>
{:else if done}
	{@const plan = done.plan}
	<section class="card stack" role="status">
		<h2>Imported {done.name}</h2>
		<ul class="api-list">
			{#if plan.profile.bios}<li>Bio copied</li>{/if}
			{#if plan.profile.tagLine !== undefined}<li>Tagline copied</li>{/if}
			<li>
				{plan.links.length} link{plan.links.length === 1 ? '' : 's'} added{#if plan.skippedLinks}, {plan.skippedLinks}
					already there or not a web link{/if}
			</li>
			<li>
				{plan.sessions.length} session{plan.sessions.length === 1 ? '' : 's'} added{#if plan.skippedSessions},
					{plan.skippedSessions}
					with a title you already have{/if}
			</li>
		</ul>
		{#if plan.sessions.length && !done.shown}
			<p class="muted">
				Imported sessions are hidden from your public page until you turn on "show on public page".
			</p>
		{/if}
		<p class="row">
			<a class="button" href={resolve('/dashboard')}>Review profile</a>
			<a class="button secondary" href={resolve('/dashboard/sessions')}>Review sessions</a>
			<button class="button secondary" type="button" onclick={() => (done = null)}
				>Import another</button
			>
		</p>
	</section>
{:else}
	<section class="card stack">
		<form class="row align-end" onsubmit={find}>
			<label class="grow">
				Event API URL
				<input
					name="url"
					type="url"
					required
					bind:value={url}
					placeholder="https://sessionize.com/api/v2/abc123/view/All"
				/>
				{#if urlError}<span class="error">{urlError}</span>{/if}
			</label>
			<button class="button" type="submit" disabled={fetching}
				>{fetching ? 'Fetching…' : 'Find speakers'}</button
			>
		</form>
		<p class="muted small">
			Organizers share this link from Sessionize's API/Embed page. It must end in <code
				>/view/All</code
			>. The link filled in above is Sessionize's public demo event.
		</p>
	</section>

	{#if candidates.length}
		<section class="card stack">
			<h2>Which speaker are you?</h2>
			<p class="muted">
				{candidates.length} speakers in event <code>{eventId}</code>. Claim only your own record.
			</p>
			{#if candidates.length > 8}
				<label>
					Filter by name
					<input bind:value={query} type="search" autocomplete="off" />
				</label>
			{/if}
			<form class="stack" onsubmit={claim}>
				<ul class="candidate-list">
					{#each shown as c (c.id)}
						<li>
							<label class="check candidate card">
								<input type="radio" name="candidate" value={c.id} bind:group={chosen} required />
								{#if c.profilePicture}
									<img class="avatar" src={c.profilePicture} alt="" loading="lazy" />
								{/if}
								<span class="candidate-main">
									<strong>{c.fullName}</strong>
									{#if c.tagLine}<span>{c.tagLine}</span>{/if}
									<span class="muted small">
										{c.sessions.length} session{c.sessions.length === 1 ? '' : 's'} ·
										{c.links.length} link{c.links.length === 1 ? '' : 's'}
									</span>
									{#if c.sessions.length}
										<span class="muted small">{c.sessions.map((x) => x.title).join(' · ')}</span>
									{/if}
								</span>
							</label>
						</li>
					{:else}
						<li class="muted">No speaker matches that name.</li>
					{/each}
				</ul>

				<fieldset class="stack import-options">
					<legend>Copy into my profile</legend>
					<div class="options">
						<label class="check"><input type="checkbox" name="copyBio" checked /> Bio</label>
						<label class="check"><input type="checkbox" name="copyTagLine" checked /> Tagline</label
						>
						<label class="check"><input type="checkbox" name="copyLinks" checked /> Links</label>
						<label class="check"
							><input type="checkbox" name="copySessions" checked /> Sessions</label
						>
					</div>
					<div class="row">
						<label>
							Bio language
							<input name="bioLang" value={db.profile.publicBioLang || 'en'} />
						</label>
						<label class="grow">
							Event name for imported sessions (optional)
							<input name="externalEvent" placeholder="e.g. Dreamforce 2025" />
						</label>
					</div>
					<label class="check">
						<input type="checkbox" name="showSessions" /> Show imported sessions on my public page
					</label>
					<p class="muted small">
						The bio replaces your bio in that language. Links and sessions you already have are
						skipped. Headshots aren't copied.
					</p>
				</fieldset>
				{#if formError}<p class="error" role="alert">{formError}</p>{/if}
				<button class="button" type="submit">Claim this speaker record</button>
			</form>
		</section>
	{/if}
{/if}
