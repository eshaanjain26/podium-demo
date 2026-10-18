<script lang="ts">
	import { resolve } from '$app/paths';
	import { deleteSession, updateSession } from '#lib/demo-db.ts';
	import { groupSessions, isShownPublicly } from '#lib/sessions.ts';
	import { db, save } from '#lib/store.svelte.ts';
	import type { Session } from '#lib/types.ts';

	let view = $state<'active' | 'archived'>('active');
	let failure = $state<string | null>(null);

	const groups = $derived(groupSessions(db.sessions));
	const rows = $derived(view === 'archived' ? groups.archived : groups.active);
	const shownCount = $derived(groups.active.filter(isShownPublicly).length);

	function change(s: Session, patch: Partial<Session>) {
		updateSession(db, s.id, patch);
		failure = save();
	}

	function remove(s: Session) {
		if (!confirm(`Delete "${s.title}" permanently?`)) return;
		deleteSession(db, s.id);
		failure = save();
	}
</script>

<svelte:head>
	<title>Sessions · Podium</title>
</svelte:head>

<div class="page-head">
	<div>
		<h1>Sessions</h1>
		<p class="muted">
			{shownCount} of {groups.active.length} active sessions show on your public page. Archive talks you
			no longer give; they stay here for your records.
		</p>
	</div>
	{#if db.profile}<a class="button" href={resolve('/dashboard/sessions/new')}>New session</a>{/if}
</div>

<nav class="tabs" aria-label="Session status">
	<button
		type="button"
		aria-current={view === 'active' ? 'page' : undefined}
		onclick={() => (view = 'active')}>Active ({groups.active.length})</button
	>
	<button
		type="button"
		aria-current={view === 'archived' ? 'page' : undefined}
		onclick={() => (view = 'archived')}>Archived ({groups.archived.length})</button
	>
</nav>

{#if failure}<p class="error" role="alert">{failure}</p>{/if}

<ul class="session-list">
	{#each rows as s (s.id)}
		<li class="card session">
			<div class="session-main">
				<h2><a href={resolve('/dashboard/sessions/[id]', { id: s.id })}>{s.title}</a></h2>
				<p class="muted small">
					{[s.externalEvent, s.deliveredAt?.slice(0, 10)].filter(Boolean).join(' · ')}
					{#if s.level}<span class="pill">{s.level}</span>{/if}
				</p>
				{#if s.tags?.length}
					<p class="tags">
						{#each s.tags as t (t)}<span class="pill">{t}</span>{/each}
					</p>
				{/if}
			</div>
			<div class="session-actions">
				{#if s.status === 'active'}
					<button
						class="toggle-pill"
						class:on={s.isPublic}
						type="button"
						aria-pressed={s.isPublic}
						onclick={() => change(s, { isPublic: !s.isPublic })}
					>
						{s.isPublic ? 'On public page' : 'Hidden from page'}
					</button>
					<button
						class="link-button"
						type="button"
						onclick={() => change(s, { status: 'archived' })}>Archive</button
					>
				{:else}
					<button class="link-button" type="button" onclick={() => change(s, { status: 'active' })}
						>Restore</button
					>
					<button class="link-button danger" type="button" onclick={() => remove(s)}>Delete</button>
				{/if}
			</div>
		</li>
	{:else}
		<li class="empty card">
			{#if view === 'active'}
				No active sessions. <a href={resolve('/dashboard/sessions/new')}>Add your first talk</a>.
			{:else}
				Nothing archived.
			{/if}
		</li>
	{/each}
</ul>
