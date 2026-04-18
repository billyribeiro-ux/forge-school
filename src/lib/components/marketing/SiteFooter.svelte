<!--
	SiteFooter — shared marketing footer.
	Three columns (nav / legal / meta), plus a copyright strip.
-->
<script lang="ts">
	const year = new Date().getFullYear();
</script>

<footer class="site-footer">
	<div class="cols">
		<div class="col">
			<h3>ForgeSchool</h3>
			<ul>
				<li><a href="/">Home</a></li>
				<li><a href="/lessons">Curriculum</a></li>
				<li><a href="/products">Products</a></li>
				<li><a href="/pricing">Pricing</a></li>
			</ul>
		</div>
		<div class="col">
			<h3>Legal</h3>
			<ul>
				<li><a href="/terms">Terms</a></li>
				<li><a href="/privacy">Privacy</a></li>
				<li><a href="/refund-policy">Refund policy</a></li>
				<li><a href="/cookie-notice">Cookie notice</a></li>
			</ul>
		</div>
		<div class="col">
			<h3>Meta</h3>
			<ul>
				<li><a href="/about">About</a></li>
				<li><a href="/contact">Contact</a></li>
				<li><a href="/support">Support</a></li>
			</ul>
		</div>
	</div>
	<p class="copy">© {year} ForgeSchool. Built by Billy Ribeiro at PE7 standard.</p>
</footer>

<style>
	@layer components {
		.site-footer {
			padding-inline: 1.5rem;
			padding-block: 3rem;
			border-block-start: 1px solid var(--color-border);
			color: var(--color-fg-muted);
			background-color: var(--color-bg-sunken);
		}
		.cols {
			max-inline-size: 72rem;
			margin-inline: auto;
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
			gap: 2rem;
			margin-block-end: 2rem;
		}
		.col h3 {
			font-size: var(--font-size-xs);
			letter-spacing: var(--letter-spacing-widest);
			text-transform: uppercase;
			color: var(--color-fg);
			font-weight: var(--font-weight-semibold);
			margin-block-end: 1rem;
		}
		.col ul {
			list-style: none;
			padding: 0;
			margin: 0;
			display: grid;
			gap: 0.5rem;
		}
		.col a {
			color: var(--color-fg-muted);
			text-decoration: none;
			font-size: var(--font-size-sm);
		}
		.col a:hover {
			color: var(--color-fg);
		}
		.copy {
			max-inline-size: 72rem;
			margin-inline: auto;
			font-size: var(--font-size-xs);
			color: var(--color-fg-subtle);
			border-block-start: 1px solid var(--color-border);
			padding-block-start: 1.5rem;
		}
	}
</style>
