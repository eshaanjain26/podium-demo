<script lang="ts">
	import { resolve } from '$app/paths';
	import { addLink, createProfile, deleteLink, sortedLinks, updateProfile } from '#lib/demo-db.ts';
	import { shrinkImage } from '#lib/images.ts';
	import { isValidLang, parseBios, parseTagList, suggestSlug } from '#lib/profile.ts';
	import { db, save } from '#lib/store.svelte.ts';
	import { LINK_TYPES, type LinkType } from '#lib/types.ts';
	import SlugField from './SlugField.svelte';

	const TABS = [
		{ id: 'basic', label: 'Basic' },
		{ id: 'bio', label: 'Tagline & bio' },
		{ id: 'public', label: 'Public profile' },
		{ id: 'links', label: 'Links' }
	] as const;
	type TabId = (typeof TABS)[number]['id'];

	let tab = $state<TabId>('basic');
	let errors = $state<Record<string, string>>({});
	let savedFor = $state<string | null>(null);

	let firstName = $state('');
	let lastName = $state('');
	let slugTouched = $state(false);
	let newSlug = $state('');
	$effect(() => {
		if (!slugTouched) newSlug = suggestSlug(firstName, lastName);
	});

	let bioRows = $state<{ lang: string; text: string }[]>([]);
	function loadBioRows() {
		const rows = Object.entries(db.profile?.bios ?? {}).map(([lang, text]) => ({ lang, text }));
		bioRows = rows.length ? rows : [{ lang: 'en', text: '' }];
	}
	loadBioRows();

	const links = $derived(sortedLinks(db));

	function show(next: TabId) {
		tab = next;
		errors = {};
		savedFor = null;
		if (next === 'bio') loadBioRows();
	}

	function finish(action: string, result: Record<string, string>) {
		errors = result;
		if (Object.keys(result).length) {
			savedFor = null;
			return false;
		}
		const storageError = save();
		if (storageError) {
			errors = { form: storageError };
			return false;
		}
		savedFor = action;
		return true;
	}

	function fields(e: SubmitEvent) {
		e.preventDefault();
		return new FormData(e.currentTarget as HTMLFormElement);
	}
	const str = (form: FormData, key: string) => String(form.get(key) ?? '').trim();

	async function image(form: FormData, key: 'avatar' | 'cover', maxSide: number) {
		const file = form.get(key);
		if (file instanceof File && file.size > 0) {
			if (!file.type.startsWith('image/')) throw new Error('Pick an image file.');
			return shrinkImage(file, maxSide);
		}
		return form.get(`remove_${key}`) === 'on' ? '' : undefined;
	}

	function onCreate(e: SubmitEvent) {
		const form = fields(e);
		finish(
			'create',
			createProfile(db, {
				firstName: str(form, 'firstName'),
				lastName: str(form, 'lastName'),
				slug: str(form, 'slug')
			})
		);
		loadBioRows();
	}

	async function onBasic(e: SubmitEvent) {
		const form = fields(e);
		let avatar: string | undefined;
		try {
			avatar = await image(form, 'avatar', 400);
		} catch (err) {
			errors = { avatar: (err as Error).message || 'That image could not be read.' };
			return;
		}
		finish(
			'basic',
			updateProfile(db, {
				firstName: str(form, 'firstName'),
				lastName: str(form, 'lastName'),
				tagLine: str(form, 'tagLine').slice(0, 200),
				...(avatar !== undefined && { avatar })
			})
		);
	}

	function onBio(e: SubmitEvent) {
		const form = fields(e);
		const { bios, invalid } = parseBios(
			form.getAll('bioLang').map(String),
			form.getAll('bioText').map(String)
		);
		if (invalid.length) {
			errors = { bios: `Use a language code like en or pt-BR (got ${invalid.join(', ')}).` };
			return;
		}
		let publicBioLang = str(form, 'publicBioLang');
		if (!isValidLang(publicBioLang) || !bios[publicBioLang]) {
			publicBioLang = Object.keys(bios)[0] ?? '';
		}
		finish('bio', updateProfile(db, { bios, publicBioLang }));
	}

	async function onPublic(e: SubmitEvent) {
		const form = fields(e);
		let cover: string | undefined;
		try {
			cover = await image(form, 'cover', 1200);
		} catch (err) {
			errors = { cover: (err as Error).message || 'That image could not be read.' };
			return;
		}
		finish(
			'public',
			updateProfile(db, {
				slug: str(form, 'slug'),
				location: str(form, 'location').slice(0, 120),
				expertise: parseTagList(str(form, 'expertise')),
				isPublic: form.get('isPublic') === 'on',
				...(cover !== undefined && { cover })
			})
		);
	}

	function onAddLink(e: SubmitEvent) {
		const form = fields(e);
		const linkType = str(form, 'linkType') as LinkType;
		if (!LINK_TYPES.includes(linkType)) {
			errors = { linkType: 'Pick a link type.' };
			return;
		}
		if (
			finish('links', addLink(db, { linkType, title: str(form, 'title'), url: str(form, 'url') }))
		) {
			(e.currentTarget as HTMLFormElement).reset();
		}
	}

	function onDeleteLink(id: string) {
		deleteLink(db, id);
		finish('links', {});
	}
</script>

<svelte:head>
	<title>Your profile · Podium</title>
</svelte:head>

{#if !db.profile}
	<section class="card narrow">
		<h1>Create your speaker profile</h1>
		<p class="muted">Start with your name and the URL you want. You can change everything later.</p>
		<form class="stack" onsubmit={onCreate}>
			<div class="row">
				<label>
					First name
					<input name="firstName" required bind:value={firstName} autocomplete="given-name" />
					{#if errors.firstName}<span class="error">{errors.firstName}</span>{/if}
				</label>
				<label>
					Last name
					<input name="lastName" bind:value={lastName} autocomplete="family-name" />
				</label>
			</div>
			<SlugField bind:value={newSlug} error={errors.slug} oninput={() => (slugTouched = true)} />
			{#if errors.form}<p class="error" role="alert">{errors.form}</p>{/if}
			<button class="button" type="submit">Create profile</button>
		</form>
	</section>
{:else}
	{@const p = db.profile}
	<div class="page-head">
		<div>
			<h1>{p.firstName} {p.lastName}</h1>
			<p class="muted">
				{#if p.isPublic}
					Public at <a href={resolve('/s/[slug]', { slug: p.slug })}>/s/{p.slug}</a>
				{:else}
					Private. Only you can see <a href={resolve('/s/[slug]', { slug: p.slug })}>/s/{p.slug}</a
					>.
				{/if}
			</p>
		</div>
		<a class="button secondary" href={resolve('/dashboard/sessions')}>Manage sessions</a>
	</div>

	<nav class="tabs" aria-label="Profile sections">
		{#each TABS as t (t.id)}
			<button
				type="button"
				aria-current={tab === t.id ? 'page' : undefined}
				onclick={() => show(t.id)}>{t.label}</button
			>
		{/each}
	</nav>

	<section class="card">
		{#if tab === 'basic'}
			<form class="stack" onsubmit={onBasic}>
				<div class="row">
					<label>
						First name
						<input name="firstName" required value={p.firstName} />
						{#if errors.firstName}<span class="error">{errors.firstName}</span>{/if}
					</label>
					<label>
						Last name
						<input name="lastName" value={p.lastName} />
					</label>
				</div>
				<label>
					Tagline
					<input
						name="tagLine"
						maxlength="200"
						value={p.tagLine}
						placeholder="Lead Product Owner, CPQ"
					/>
				</label>
				<div class="avatar-row">
					{#if p.avatar}
						<img class="avatar" src={p.avatar} alt="Current headshot" />
					{:else}
						<div class="avatar placeholder" aria-hidden="true">{p.firstName[0]}</div>
					{/if}
					<div class="stack">
						<label>
							Headshot (resized to 400 px and kept in this browser)
							<input name="avatar" type="file" accept="image/jpeg,image/png,image/webp,image/gif" />
						</label>
						{#if p.avatar}
							<label class="check"
								><input type="checkbox" name="remove_avatar" /> Remove current headshot</label
							>
						{/if}
						{#if errors.avatar}<span class="error">{errors.avatar}</span>{/if}
					</div>
				</div>
				{@render footer('basic')}
			</form>
		{:else if tab === 'bio'}
			<form class="stack" onsubmit={onBio}>
				<p class="muted">Add a bio per language. The one you mark public appears on your page.</p>
				{#each bioRows as row, i (i)}
					<fieldset class="bio-row">
						<div class="row">
							<label class="lang">
								Language
								<input name="bioLang" bind:value={row.lang} placeholder="en" />
							</label>
							<label class="check">
								<input
									type="radio"
									name="publicBioLang"
									value={row.lang}
									checked={(p.publicBioLang || bioRows[0]?.lang) === row.lang}
								/>
								Show publicly
							</label>
							{#if bioRows.length > 1}
								<button type="button" class="link-button" onclick={() => bioRows.splice(i, 1)}
									>Remove</button
								>
							{/if}
						</div>
						<label>
							Bio
							<textarea name="bioText" rows="6" bind:value={row.text}></textarea>
						</label>
					</fieldset>
				{/each}
				<button
					type="button"
					class="button secondary small"
					onclick={() => bioRows.push({ lang: '', text: '' })}
				>
					Add another language
				</button>
				{#if errors.bios}<span class="error">{errors.bios}</span>{/if}
				{@render footer('bio')}
			</form>
		{:else if tab === 'public'}
			<form class="stack" onsubmit={onPublic}>
				<label class="check toggle">
					<input type="checkbox" name="isPublic" checked={p.isPublic} />
					<span>
						<strong>Enable public speaker profile</strong>
						<small class="muted">Off hides your page and API output from everyone else.</small>
					</span>
				</label>
				<SlugField value={p.slug} error={errors.slug} />
				<label>
					Location
					<input name="location" value={p.location} placeholder="Seattle, WA" />
				</label>
				<label>
					Areas of expertise (comma-separated, up to 10)
					<input
						name="expertise"
						value={(p.expertise ?? []).join(', ')}
						placeholder="CPQ, Agentic AI, Salesforce"
					/>
				</label>
				{#if p.cover}
					<img class="cover-preview" src={p.cover} alt="Current cover" />
					<label class="check"
						><input type="checkbox" name="remove_cover" /> Remove current cover</label
					>
				{/if}
				<label>
					Cover image (resized to 1200 px)
					<input name="cover" type="file" accept="image/jpeg,image/png,image/webp" />
				</label>
				{#if errors.cover}<span class="error">{errors.cover}</span>{/if}
				{@render footer('public')}
			</form>
		{:else}
			<ul class="link-list">
				{#each links as link (link.id)}
					<li>
						<span class="pill">{link.linkType.replace('_', ' ')}</span>
						<a href={link.url} rel="noopener noreferrer" target="_blank">{link.title}</a>
						<button
							class="link-button danger"
							type="button"
							aria-label="Remove {link.title}"
							onclick={() => onDeleteLink(link.id)}>Remove</button
						>
					</li>
				{:else}
					<li class="muted">No links yet.</li>
				{/each}
			</ul>
			<form class="row align-end" onsubmit={onAddLink}>
				<label>
					Type
					<select name="linkType">
						{#each LINK_TYPES as t (t)}<option value={t}>{t.replace('_', ' ')}</option>{/each}
					</select>
				</label>
				<label>
					Title
					<input name="title" placeholder="Optional" />
				</label>
				<label class="grow">
					URL
					<input name="url" type="url" required placeholder="https://" />
					{#if errors.url}<span class="error">{errors.url}</span>{/if}
				</label>
				<button class="button" type="submit">Add link</button>
			</form>
			{#if errors.form}<p class="error" role="alert">{errors.form}</p>{/if}
		{/if}
	</section>
{/if}

{#snippet footer(action: string)}
	<div class="form-footer">
		{#if errors.form}<p class="error" role="alert">{errors.form}</p>{/if}
		{#if savedFor === action}<p class="saved" role="status">Saved.</p>{/if}
		<button class="button" type="submit">Save</button>
	</div>
{/snippet}
