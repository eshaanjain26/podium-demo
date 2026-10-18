<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { publicSessions, sortedLinks } from '#lib/demo-db.ts';
	import { fullName, pickPublicBio } from '#lib/profile.ts';
	import { db } from '#lib/store.svelte.ts';

	// In this prototype the visitor is always the owner, so a private profile shows as a preview.
	const p = $derived(db.profile?.slug === page.params.slug?.toLowerCase() ? db.profile : null);
	const name = $derived(p ? fullName(p) : '');
	const bio = $derived(p ? pickPublicBio(p.bios, p.publicBioLang) : null);
	const links = $derived(sortedLinks(db));
	const sessions = $derived(publicSessions(db));
</script>

<svelte:head>
	<title>{p ? `${name} · Speaker profile` : 'Not found · Podium'}</title>
	{#if p?.tagLine}<meta name="description" content={p.tagLine} />{/if}
</svelte:head>

{#if !p}
	<section class="card narrow">
		<h1>No speaker at this URL</h1>
		<p class="muted">This prototype holds one speaker per browser.</p>
		<p><a href={resolve('/')}>Back to start</a></p>
	</section>
{:else}
	{#if !p.isPublic}
		<p class="banner" role="status">
			Preview. Your profile is private, so only you can see this page.
			<a href={resolve('/dashboard')}>Make it public</a>
		</p>
	{/if}

	<article class="profile">
		<div class="cover" style:background-image={p.cover ? `url("${p.cover}")` : undefined}></div>
		<header class="profile-head">
			{#if p.avatar}
				<img class="avatar large" src={p.avatar} alt="" />
			{:else}
				<div class="avatar large placeholder" aria-hidden="true">{name[0]}</div>
			{/if}
			<div>
				<h1>{name}</h1>
				{#if p.tagLine}<p class="tagline">{p.tagLine}</p>{/if}
				{#if p.location}<p class="muted">{p.location}</p>{/if}
			</div>
		</header>

		{#if p.expertise?.length}
			<p class="tags">
				{#each p.expertise as t (t)}<span class="pill">{t}</span>{/each}
			</p>
		{/if}

		{#if bio}
			<section lang={bio.lang}>
				<h2>About</h2>
				{#each bio.text.split(/\n{2,}/) as para, i (i)}<p>{para}</p>{/each}
			</section>
		{/if}

		{#if links.length}
			<section>
				<h2>Links</h2>
				<ul class="inline-links">
					{#each links as l (l.id)}
						<li><a href={l.url} rel="me noopener noreferrer" target="_blank">{l.title}</a></li>
					{/each}
				</ul>
			</section>
		{/if}

		<section>
			<h2>Sessions</h2>
			{#each sessions as s (s.id)}
				<article class="card session-public">
					<h3>{s.title}</h3>
					<p class="muted small">
						{[s.externalEvent, s.deliveredAt?.slice(0, 10)].filter(Boolean).join(' · ')}
						{#if s.level}<span class="pill">{s.level}</span>{/if}
					</p>
					{#if s.description}
						{#each s.description.split(/\n{2,}/) as para, i (i)}<p>{para}</p>{/each}
					{/if}
					{#if s.tags?.length}<p class="tags">
							{#each s.tags as t (t)}<span class="pill">{t}</span>{/each}
						</p>{/if}
					{#if s.recordingUrl || s.slidesUrl}
						<p class="inline-links">
							{#if s.recordingUrl}<a href={s.recordingUrl} rel="noopener noreferrer" target="_blank"
									>Recording</a
								>{/if}
							{#if s.slidesUrl}<a href={s.slidesUrl} rel="noopener noreferrer" target="_blank"
									>Slides</a
								>{/if}
						</p>
					{/if}
				</article>
			{:else}
				<p class="muted">No sessions listed yet.</p>
			{/each}
		</section>
	</article>
{/if}
