<script lang="ts">
	import favicon from '#lib/assets/favicon.svg';
	import '#lib/app.css';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { db, resetToSample } from '#lib/store.svelte.ts';

	let { children } = $props();

	const NAV = [
		{ href: '/dashboard', label: 'Profile' },
		{ href: '/dashboard/sessions', label: 'Sessions' },
		{ href: '/dashboard/import', label: 'Import' },
		{ href: '/api-preview', label: 'API' },
		{ href: '/dashboard/account', label: 'Account' }
	] as const;

	function current(href: string) {
		const path = page.url.pathname;
		return href === '/dashboard' ? path === href : path.startsWith(href);
	}

	function reset() {
		if (confirm('Replace everything in this browser with the sample speaker?')) resetToSample();
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="demo-bar" role="note">
	<span><strong>Prototype.</strong> Your edits are saved only in this browser.</span>
	<button class="link-button" type="button" onclick={reset}>Reset sample data</button>
</div>

<header class="site-header">
	<a class="wordmark" href={resolve('/')}>Podium</a>
	<nav aria-label="Main">
		{#each NAV as item (item.href)}
			<a href={resolve(item.href)} aria-current={current(item.href) ? 'page' : undefined}
				>{item.label}</a
			>
		{/each}
		{#if db.profile}
			<a class="button small" href={resolve('/s/[slug]', { slug: db.profile.slug })}>Public page</a>
		{/if}
	</nav>
</header>

<main>
	{@render children()}
</main>

<footer class="site-footer muted small">
	Podium is a clean-room, open-source speaker profile. Not affiliated with Sessionize.
</footer>
