import { enhancedImages } from '@sveltejs/enhanced-img';
import { sveltekit } from '@sveltejs/kit/vite';
import type { Plugin } from 'vite';
import { defineConfig } from 'vite';

/**
 * Strip dev-only routes (currently /admin) from production builds.
 *
 * The route's `+layout.server.ts` already 404s in production at request
 * time (lesson 086). This plugin closes the second half: the route
 * module itself is replaced by an empty stub during prod builds, so
 * the admin code is not just unreachable but never compiled into the
 * production bundle. Vite tree-shakes the empty module + every
 * transitive import along with it.
 *
 * Active only when `NODE_ENV === 'production'` AND the request id
 * touches `src/routes/admin/`. Dev + test runs pass through unchanged.
 */
function stripAdminInProd(): Plugin {
	const STUB = `// Stripped from production build — see vite.config.ts \`stripAdminInProd\`.\nimport { error } from '@sveltejs/kit';\nexport const load = () => error(404, { message: 'Not found', errorId: 'admin-stripped' });\n`;
	return {
		name: 'forgeschool:strip-admin-in-prod',
		apply: 'build',
		enforce: 'pre',
		resolveId(id) {
			// Pass-through; we transform inside `load` below.
			return null;
		},
		load(id) {
			if (process.env['NODE_ENV'] !== 'production') return null;
			if (!id.includes('/src/routes/admin/')) return null;
			if (id.endsWith('+layout.server.ts')) return STUB;
			if (id.endsWith('+page.svelte') || id.endsWith('+layout.svelte')) {
				return '<!-- stripped admin route -->\n';
			}
			return null;
		}
	};
}

export default defineConfig({
	plugins: [stripAdminInProd(), enhancedImages(), sveltekit()]
});
