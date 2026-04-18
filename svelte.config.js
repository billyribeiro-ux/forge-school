import adapter from '@sveltejs/adapter-auto';
import { mdsvex, escapeSvelte } from 'mdsvex';
import { createHighlighter } from 'shiki';

/**
 * Shiki-backed syntax highlighter. Runs at build time via mdsvex; produces
 * inline-styled HTML with VS Code-grade grammars. escapeSvelte pipes the
 * output through the `{@html \`...\`}` template-literal wrapping mdsvex
 * inserts, handling backtick and $ escaping without losing the styling.
 *
 * Dual-theme: light / dark switched via the html[data-theme] attribute or
 * the @media (prefers-color-scheme: dark) cascade. Shiki emits both themes
 * as inline styles and toggles between them via CSS variables.
 */
const shiki = await createHighlighter({
	themes: ['github-light', 'github-dark'],
	langs: [
		'bash',
		'css',
		'diff',
		'html',
		'javascript',
		'json',
		'markdown',
		'shell',
		'sql',
		'svelte',
		'typescript',
		'yaml'
	]
});

function shikiHighlighter(code, lang) {
	const resolved = lang && shiki.getLoadedLanguages().includes(lang) ? lang : 'text';
	const html = shiki.codeToHtml(code, {
		lang: resolved,
		themes: { light: 'github-light', dark: 'github-dark' },
		defaultColor: false
	});
	return escapeSvelte(html);
}

/** @type {import('mdsvex').MdsvexOptions} */
const mdsvexOptions = {
	extensions: ['.md', '.svx'],
	smartypants: {
		dashes: 'oldschool'
	},
	highlight: {
		highlighter: shikiHighlighter
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
		// Inline any style chunk ≤ 4 KB directly into <head> to reduce
		// render-blocking requests on first paint. 4 KB balances HTML
		// payload vs. request overhead — empirically the sweet spot.
		inlineStyleThreshold: 4096
	}
};

export default config;
