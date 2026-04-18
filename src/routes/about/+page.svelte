<svelte:head>
	<title>About — ForgeSchool</title>
	<meta
		name="description"
		content="ForgeSchool is Billy Ribeiro's ground-up course on building production-grade fullstack systems at PE7 Distinguished standard."
	/>
</svelte:head>

<main class="prose">
	<header>
		<p class="eyebrow">About</p>
		<h1>The course that teaches engineering judgment.</h1>
	</header>

	<p>
		ForgeSchool is a 170-lesson walkthrough of building a production-grade membership platform
		from a blank repo to a shipped product. Every lesson is one git commit. Every commit has a
		"Why we chose this" section naming the two-to-four alternatives we rejected and the concrete
		failure mode each one presents.
	</p>

	<h2>For who</h2>
	<p>
		Intermediate-to-advanced developers who have shipped code but want the judgment that
		separates a 2-year repo from a 10-year repo. Billy Ribeiro built this with his trading
		community of 18,000+ active traders in mind — adults who respect directness.
	</p>

	<h2>The stack</h2>
	<p>
		SvelteKit 2 + Svelte 5 runes, TypeScript strict, PostgreSQL 16 via Drizzle, Stripe in test
		mode, Motion for animations, Playwright + Vitest for tests, Biome for lint/format. Zero
		Tailwind, zero Lucide, zero <code>any</code>, zero <code>@ts-ignore</code>, zero shortcuts.
	</p>

	<h2>Two outputs, one build</h2>
	<p>
		The platform you're reading this on IS the course's worked example. When you finish Module 8,
		you've built ForgeSchool yourself. You can diff your repo against ours at every commit.
	</p>
</main>

<style>
	@layer components {
		.prose {
			max-inline-size: 48rem;
			margin-inline: auto;
			padding-inline: 1.5rem;
			padding-block: 3rem;
			line-height: var(--line-height-relaxed);
		}
		.eyebrow {
			font-size: var(--font-size-xs);
			letter-spacing: var(--letter-spacing-widest);
			text-transform: uppercase;
			color: var(--color-brand);
			font-weight: var(--font-weight-semibold);
		}
		h1 {
			font-size: var(--font-size-4xl);
			margin-block: 0.5rem 2rem;
		}
		h2 {
			font-size: var(--font-size-xl);
			margin-block: 2rem 0.5rem;
		}
		p {
			color: var(--color-fg-muted);
			margin-block-end: 1rem;
		}
		code {
			font-family: var(--font-mono);
			font-size: 0.95em;
			background-color: var(--color-bg-sunken);
			padding-inline: 0.3rem;
			border-radius: var(--radius-sm);
		}
	}
</style>
