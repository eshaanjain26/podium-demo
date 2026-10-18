<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { createSession } from '#lib/demo-db.ts';
	import { db, save } from '#lib/store.svelte.ts';
	import SessionForm from '../SessionForm.svelte';
</script>

<svelte:head>
	<title>New session · Podium</title>
</svelte:head>

<h1>New session</h1>
{#if db.profile}
	<SessionForm
		values={{}}
		submitLabel="Add session"
		onsave={(input) => {
			createSession(db, input);
			const failure = save();
			if (!failure) goto(resolve('/dashboard/sessions'));
			return failure;
		}}
	/>
{:else}
	<p>Create your profile first. <a href={resolve('/dashboard')}>Create profile</a></p>
{/if}
