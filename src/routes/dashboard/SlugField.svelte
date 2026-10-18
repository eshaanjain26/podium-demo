<script lang="ts">
	import { normalizeSlug, slugProblem } from '#lib/demo-db.ts';

	let {
		value = $bindable(''),
		error = '',
		oninput
	}: { value?: string; error?: string; oninput?: () => void } = $props();

	// One speaker per browser, so only the format and reserved-name checks apply here.
	const problem = $derived(value ? slugProblem(normalizeSlug(value)) : null);
</script>

<label>
	Profile URL
	<span class="prefixed">
		<span class="prefix">/s/</span>
		<input
			name="slug"
			required
			minlength="3"
			maxlength="40"
			autocapitalize="off"
			spellcheck="false"
			bind:value
			oninput={() => oninput?.()}
		/>
	</span>
	{#if error}
		<span class="error">{error}</span>
	{:else if value}
		<span class={problem ? 'error' : 'ok'} aria-live="polite">{problem ?? 'Available'}</span>
	{/if}
</label>
