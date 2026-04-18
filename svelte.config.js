import adapter from '@sveltejs/adapter-auto';
import { mdsvex } from 'mdsvex';

/** @type {import('mdsvex').MdsvexOptions} */
const mdsvexOptions = {
	extensions: ['.md', '.svx'],
	smartypants: {
		dashes: 'oldschool'
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
		adapter: adapter()
	}
};

export default config;
