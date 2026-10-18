<script lang="ts">
	import { resolve } from '$app/paths';
	import { db } from '#lib/store.svelte.ts';
</script>

<svelte:head>
	<title>Podium: your speaker profile, yours to keep</title>
	<meta
		name="description"
		content="Prototype of Podium, an open-source speaker profile with a Sessionize-compatible API, JSON export, and import from Sessionize events."
	/>
</svelte:head>

<section class="hero">
	<h1>One speaker profile. Every conference.</h1>
	<p class="lede">
		Keep your bio, headshot, links, and talks in one place. Choose which sessions show on your
		public page, archive the rest, and reuse them when the next call for papers opens.
	</p>
	<p class="row">
		{#if db.profile}
			<a class="button" href={resolve('/dashboard')}>Edit the sample profile</a>
			<a class="button secondary" href={resolve('/s/[slug]', { slug: db.profile.slug })}
				>See the public page</a
			>
		{:else}
			<a class="button" href={resolve('/dashboard')}>Create your profile</a>
		{/if}
	</p>
	{#if !db.profile}
		<p class="muted">
			There's no profile in this browser. Create one, or use "Reset sample data" above to bring back
			the sample speaker.
		</p>
	{/if}
</section>

<section class="tour">
	<h2>What to try</h2>
	<ol class="tour-list">
		<li class="card">
			<strong>Edit the profile</strong>
			<span>Change the tagline, add a bio in another language, upload a headshot.</span>
			<a href={resolve('/dashboard')}>Profile editor</a>
		</li>
		<li class="card">
			<strong>Curate sessions</strong>
			<span>Hide a talk from the public page or archive it. It stays in your library.</span>
			<a href={resolve('/dashboard/sessions')}>Sessions</a>
		</li>
		<li class="card">
			<strong>Import from Sessionize</strong>
			<span
				>Paste a public event API link and claim your own speaker record. Try the demo event that's
				filled in for you.</span
			>
			<a href={resolve('/dashboard/import')}>Import</a>
		</li>
		<li class="card">
			<strong>Read it as an API</strong>
			<span
				>The same profile in Sessionize's <code>Speakers</code> and <code>All</code> JSON shapes, so event
				tools built for Sessionize can read it.</span
			>
			<a href={resolve('/api-preview')}>API preview</a>
		</li>
		<li class="card">
			<strong>Take your data with you</strong>
			<span>Download everything as one JSON file, or delete it all.</span>
			<a href={resolve('/dashboard/account')}>Account</a>
		</li>
	</ol>
</section>

<section class="card stack about-demo">
	<h2>About this prototype</h2>
	<p>
		The full app runs on PocketBase and SvelteKit with real accounts. This hosted prototype runs
		entirely in your browser so it can live on free static hosting: there's no sign-in, nothing is
		sent to a server, and each visitor gets their own copy of the sample speaker, Jordan Rivera (a
		fictional person).
	</p>
	<p class="muted small">
		The one network call is the Sessionize import, which reads a public event API directly from your
		browser.
	</p>
</section>
