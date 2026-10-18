<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { buildExport } from '#lib/export.ts';
	import { db, deleteEverything } from '#lib/store.svelte.ts';

	const CONFIRM_PHRASE = 'delete my account';
	let confirmText = $state('');
	let error = $state('');

	function download() {
		const body = buildExport({
			account: { id: 'demo', email: '' },
			profile: db.profile,
			links: db.links,
			sessions: db.sessions,
			avatarUrl: db.profile?.avatar ?? '',
			coverUrl: db.profile?.cover ?? ''
		});
		const blob = new Blob([JSON.stringify(body, null, 2)], { type: 'application/json' });
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = `podium-export-${db.profile?.slug ?? 'demo'}-${body.exportedAt.slice(0, 10)}.json`;
		a.click();
		URL.revokeObjectURL(a.href);
	}

	function remove(e: SubmitEvent) {
		e.preventDefault();
		if (confirmText.trim().toLowerCase() !== CONFIRM_PHRASE) {
			error = `Type "${CONFIRM_PHRASE}" to confirm.`;
			return;
		}
		deleteEverything();
		goto(resolve('/'));
	}
</script>

<svelte:head>
	<title>Account · Podium</title>
</svelte:head>

<div class="page-head">
	<div>
		<h1>Account</h1>
		<p class="muted">Your data is yours: take a copy any time, or delete everything.</p>
	</div>
</div>

<section class="card stack">
	<h2>Export your data</h2>
	<p>
		One JSON file with your profile, links, and every session (archived and private ones too), plus
		the same data in Sessionize's <code>Speakers</code> and <code>All</code> shapes.
	</p>
	<p>
		<button class="button secondary" type="button" onclick={download}>Download JSON export</button>
	</p>
</section>

<section class="card stack">
	<h2>Public API</h2>
	{#if db.profile?.isPublic}
		<p>
			Event tools that read Sessionize's API can read your public profile from
			<code>/api/v1/profile/{db.profile.slug}</code> and
			<code>/api/v1/profile/{db.profile.slug}/all</code>.
		</p>
		<p><a href={resolve('/api-preview')}>See the JSON</a></p>
	{:else}
		<p class="muted">Make your profile public to turn on the read-only API.</p>
	{/if}
</section>

<section class="card stack">
	<h2>Delete account</h2>
	<p>
		This deletes your profile, links, sessions, and images. In the full app it removes your sign-in
		too, and it can't be undone. Here, "Reset sample data" at the top brings the sample speaker
		back.
	</p>
	<details open={!!error}>
		<summary class="button danger-button">Delete my account…</summary>
		<form class="stack confirm-delete" onsubmit={remove}>
			<label>
				<span>Type <strong>{CONFIRM_PHRASE}</strong> to confirm</span>
				<input name="confirm" autocomplete="off" required bind:value={confirmText} />
				{#if error}<span class="error">{error}</span>{/if}
			</label>
			<button class="button danger-button" type="submit">Permanently delete account</button>
		</form>
	</details>
</section>
