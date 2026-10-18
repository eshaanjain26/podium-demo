<script lang="ts">
	import { resolve } from '$app/paths';
	import { parseSessionForm, type SessionInput } from '#lib/sessions.ts';

	let {
		values,
		submitLabel,
		onsave
	}: {
		values: Partial<Omit<SessionInput, 'tags'>> & { tags?: string[] | null };
		submitLabel: string;
		onsave: (input: SessionInput) => string | null;
	} = $props();

	let errors = $state<Record<string, string>>({});

	function submit(e: SubmitEvent) {
		e.preventDefault();
		const { input, errors: found } = parseSessionForm(
			new FormData(e.currentTarget as HTMLFormElement)
		);
		errors = found;
		if (Object.keys(found).length) return;
		const failure = onsave(input);
		if (failure) errors = { form: failure };
	}
</script>

<form class="card stack" onsubmit={submit}>
	<label>
		Title
		<input name="title" required maxlength="200" value={values.title ?? ''} />
		{#if errors.title}<span class="error">{errors.title}</span>{/if}
	</label>
	<label>
		Abstract
		<textarea name="description" rows="8">{values.description ?? ''}</textarea>
	</label>
	<div class="row">
		<label>
			Level
			<select name="level" value={values.level ?? ''}>
				<option value="">Not set</option>
				<option value="introductory">Introductory</option>
				<option value="intermediate">Intermediate</option>
				<option value="advanced">Advanced</option>
			</select>
		</label>
		<label class="grow">
			Tags (comma-separated, up to 8)
			<input name="tags" value={(values.tags ?? []).join(', ')} />
		</label>
	</div>
	<div class="row">
		<label class="grow">
			Delivered at (event name, optional)
			<input
				name="externalEvent"
				maxlength="200"
				value={values.externalEvent ?? ''}
				placeholder="Dreamforce 2025"
			/>
		</label>
		<label>
			Date
			<input name="deliveredAt" type="date" value={values.deliveredAt?.slice(0, 10) ?? ''} />
			{#if errors.deliveredAt}<span class="error">{errors.deliveredAt}</span>{/if}
		</label>
	</div>
	<div class="row">
		<label class="grow">
			Recording URL
			<input
				name="recordingUrl"
				type="url"
				value={values.recordingUrl ?? ''}
				placeholder="https://"
			/>
			{#if errors.recordingUrl}<span class="error">{errors.recordingUrl}</span>{/if}
		</label>
		<label class="grow">
			Slides URL
			<input name="slidesUrl" type="url" value={values.slidesUrl ?? ''} placeholder="https://" />
			{#if errors.slidesUrl}<span class="error">{errors.slidesUrl}</span>{/if}
		</label>
	</div>
	<label class="check">
		<input type="checkbox" name="isPublic" checked={values.isPublic ?? true} />
		Show on my public page
	</label>
	{#if errors.form}<p class="error" role="alert">{errors.form}</p>{/if}
	<div class="form-footer">
		<a class="button secondary" href={resolve('/dashboard/sessions')}>Cancel</a>
		<button class="button" type="submit">{submitLabel}</button>
	</div>
</form>
