import adapter from '@sveltejs/adapter-auto';
import { mdsvex, escapeSvelte } from 'mdsvex';

/**
 * Minimal pre-shiki highlighter. mdsvex wraps the returned string inside a
 * Svelte template literal (`{@html \`...\`}`), so every backtick and dollar
 * sign we emit must be pre-escaped to survive that wrapping.
 * escapeSvelte from mdsvex handles backtick + $ escaping correctly.
 *
 * Lesson 034 replaces this with a shiki-based highlighter.
 */
function plainHighlighter(code, lang) {
	const safe = code
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
	const wrapped = `<pre class="language-${lang ?? 'text'}"><code>${safe}</code></pre>`;
	return escapeSvelte(wrapped);
}

/** @type {import('mdsvex').MdsvexOptions} */
const mdsvexOptions = {
	extensions: ['.md', '.svx'],
	smartypants: {
		dashes: 'oldschool'
	},
	highlight: {
		highlighter: plainHighlighter
	}
};

/** @type {import('@sveltejs/kit').Config} */
const config = {
	extensions: ['.svelte', '.md', '.svx'],
	preprocess: [mdsvex(mdsvexOptions)],
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	// Svelte Agentation — dev-mode, source-aware element inspector.
	// Press Control+Shift to toggle; hover an element to highlight it; click to
	// open the source file + line in your editor. Tree-shaken from production
	// builds by vite-plugin-svelte, so the inspector code never ships to users.
	vitePlugin: {
		inspector: {
			toggleKeyCombo: 'control-shift',
			holdMode: true,
			showToggleButton: 'active',
			toggleButtonPos: 'bottom-right'
		}
	},
	kit: {
		// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
		// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
		// See https://svelte.dev/docs/kit/adapters for more information about adapters.
		adapter: adapter(),
		prerender: {
			// Lesson 032 renders /lessons with anchors to /lessons/[slug]. Lesson
			// 033 creates the [slug] route; until then, prerender must tolerate
			// those dangling links rather than failing the build.
			handleHttpError: ({ path, referrer, message }) => {
				if (path.startsWith('/lessons/')) {
					console.warn(`[prerender] ${message} (from ${referrer}) — expected until lesson 033`);
					return;
				}
				throw new Error(message);
			}
		}
	}
};

export default config;
