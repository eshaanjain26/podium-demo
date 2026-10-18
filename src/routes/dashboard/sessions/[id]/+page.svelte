<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { updateSession } from '#lib/demo-db.ts';
	import { db, save } from '#lib/store.svelte.ts';
	import SessionForm from '../SessionForm.svelte';

	const session = $derived(db.sessions.find((s) => s.id === page.params.id));
</script>

<svelte:head>
	<title>Edit session · Podium</title>
</svelte:head>

{#if session}
	<h1>Edit session</h1>
	<p class="muted">
		{session.status === 'archived'
			? 'Archived. Restore it from the sessions list to reuse it.'
			: 'Active.'}
		Public id {session.publicId}.
	</p>
	{#key session.id}
		<SessionForm
			values={session}
			submitLabel="Save changes"
			onsave={(input) => {
				updateSession(db, session.id, input);
				const failure = save();
				if (!failure) goto(resolve('/dashboard/sessions'));
				return failure;
			}}
		/>
	{/key}
{:else}
	<h1>Session not found</h1>
	<p><a href={resolve('/dashboard/sessions')}>Back to sessions</a></p>
{/if}
