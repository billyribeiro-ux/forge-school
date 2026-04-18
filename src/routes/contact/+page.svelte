<script lang="ts">
	import { track } from '$lib/analytics/events';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();

	const values = $derived(form?.values ?? { name: '', email: '', message: '' });
	const sent = $derived(form?.sent === true);
	const error = $derived(form && 'error' in form ? form.error : undefined);

	$effect(() => {
		if (sent) track('contact_submitted');
	});
</script>

<svelte:head>
	<title>Contact — ForgeSchool</title>
	<meta name="description" content="Get in touch with the ForgeSchool team." />
</svelte:head>

<main class="prose">
	<header>
		<p class="eyebrow">Contact</p>
		<h1>Send a note.</h1>
	</header>

	{#if sent}
		<p class="success" role="status">Thanks. We'll respond within one business day.</p>
	{:else}
		<form method="POST" class="contact-form">
			<label>
				<span>Name</span>
				<input name="name" type="text" required value={values.name} autocomplete="name" />
			</label>
			<label>
				<span>Email</span>
				<input name="email" type="email" required value={values.email} autocomplete="email" />
			</label>
			<label>
				<span>Message</span>
				<textarea name="message" rows="6" required>{values.message}</textarea>
			</label>
			{#if error !== undefined}
				<p class="error" role="alert">{error}</p>
			{/if}
			<button type="submit">Send</button>
		</form>
	{/if}
</main>

<style>
	@layer components {
		.prose {
			max-inline-size: 42rem;
			margin-inline: auto;
			padding-inline: 1.5rem;
			padding-block: 3rem;
		}
		.eyebrow {
			font-size: var(--font-size-xs);
			letter-spacing: var(--letter-spacing-widest);
			text-transform: uppercase;
			color: var(--color-brand);
			font-weight: var(--font-weight-semibold);
		}
		h1 {
			font-size: var(--font-size-3xl);
			margin-block: 0.5rem 2rem;
		}
		.contact-form {
			display: grid;
			gap: 1rem;
		}
		label {
			display: grid;
			gap: 0.25rem;
		}
		label span {
			font-size: var(--font-size-sm);
			color: var(--color-fg-muted);
		}
		input,
		textarea {
			padding: 0.6rem 0.9rem;
			border: 1px solid var(--color-border);
			border-radius: var(--radius-md);
			background-color: var(--color-bg-raised);
			color: var(--color-fg);
			font: inherit;
		}
		input:focus-visible,
		textarea:focus-visible {
			outline: 2px solid var(--color-brand);
			outline-offset: 2px;
		}
		button {
			justify-self: start;
			padding: 0.7rem 1.4rem;
			background-color: var(--color-brand);
			color: var(--color-brand-fg);
			border: 0;
			border-radius: var(--radius-md);
			font-weight: var(--font-weight-medium);
			cursor: pointer;
		}
		button:hover {
			background-color: var(--color-brand-hover);
		}
		.success {
			padding: 1rem;
			border: 1px solid var(--color-brand);
			border-radius: var(--radius-md);
			background-color: var(--color-bg-raised);
		}
		.error {
			color: var(--color-danger, var(--color-brand));
			font-size: var(--font-size-sm);
		}
	}
</style>
