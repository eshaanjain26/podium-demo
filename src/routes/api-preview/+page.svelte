<script lang="ts">
	import { resolve } from '$app/paths';
	import { publicFeed } from '#lib/demo-db.ts';
	import { toAllView, toSpeakersView } from '#lib/sessionize-feed.ts';
	import { db } from '#lib/store.svelte.ts';

	let view = $state<'speakers' | 'all'>('speakers');
	let copied = $state(false);

	const feed = $derived(publicFeed(db));
	const output = $derived(
		feed ? (view === 'speakers' ? toSpeakersView(feed) : toAllView(feed)) : null
	);
	// Uploaded images are data URLs here; shorten them so the JSON stays readable.
	const text = $derived(
		output
			? JSON.stringify(output, null, 2).replace(
					/"data:image\/[a-z]+;base64,[^"]{40,}"/g,
					(m) => `"${m.slice(1, 40)}…(${Math.round(m.length / 1024)} KB)"`
				)
			: ''
	);
	const path = $derived(
		db.profile ? `/api/v1/profile/${db.profile.slug}${view === 'all' ? '/all' : ''}` : ''
	);

	async function copy() {
		await navigator.clipboard.writeText(JSON.stringify(output, null, 2));
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}
</script>

<svelte:head>
	<title>API preview · Podium</title>
</svelte:head>

<div class="page-head">
	<div>
		<h1>API preview</h1>
		<p class="muted">
			In the full app these are public, read-only endpoints in Sessionize's JSON shapes, so a
			conference site or app that already reads Sessionize can read a Podium profile with no code
			changes. Here they're generated in your browser from the same code.
		</p>
	</div>
</div>

{#if !feed}
	<section class="card">
		<p>
			{db.profile ? 'Your profile is private, so the API returns 404.' : 'There is no profile yet.'}
			<a href={resolve('/dashboard')}>Go to the profile editor</a>
		</p>
	</section>
{:else}
	<nav class="tabs" aria-label="API view">
		<button
			type="button"
			aria-current={view === 'speakers' ? 'page' : undefined}
			onclick={() => (view = 'speakers')}>Speakers view</button
		>
		<button
			type="button"
			aria-current={view === 'all' ? 'page' : undefined}
			onclick={() => (view = 'all')}>All view</button
		>
	</nav>
	<section class="card stack">
		<div class="api-head">
			<code>GET {path}</code>
			<button class="button secondary small" type="button" onclick={copy}
				>{copied ? 'Copied' : 'Copy JSON'}</button
			>
		</div>
		<ul class="api-list muted small">
			<li>
				Only active sessions marked "show on public page" appear. Archived and hidden ones don't.
			</li>
			<li>Session ids are stable integers, as in Sessionize.</li>
		</ul>
		<pre class="json"><code>{text}</code></pre>
	</section>
{/if}
