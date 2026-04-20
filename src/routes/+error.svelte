<!--
	Root error boundary. SvelteKit renders this whenever a load function,
	+server endpoint, or page render throws — including anything surfaced
	by `handleError` in `src/hooks.server.ts` / `src/hooks.client.ts`.

	The `errorId` shown here is the correlation key written to server logs
	(and Sentry, once wired) by `handleError`. Users can quote it back in
	support requests; we can grep it in logs to find the original stack.
-->
<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head>
	<title>{page.status} — ForgeSchool</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="error">
	<p class="status">{page.status}</p>
	<h1>{page.error?.message ?? 'An unexpected error occurred'}</h1>

	{#if page.error?.errorId}
		<p class="error-id">
			Reference ID: <code>{page.error.errorId}</code>
		</p>
	{/if}

	<p class="help">
		Try <a href="/">returning home</a> or <a href="/support">contacting support</a>.
	</p>
</main>

<style>
	.error {
		max-width: 32rem;
		margin: 0 auto;
		padding: var(--space-16) var(--space-6);
		text-align: center;
	}

	.status {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-semibold);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-fg-muted);
		margin-bottom: var(--space-3);
	}

	h1 {
		font-size: var(--font-size-3xl);
		margin-bottom: var(--space-6);
	}

	.error-id {
		font-size: var(--font-size-sm);
		color: var(--color-fg-muted);
		margin-bottom: var(--space-6);
	}

	.error-id code {
		font-family: var(--font-mono);
		font-size: 0.95em;
	}

	.help {
		color: var(--color-fg-muted);
	}
</style>
