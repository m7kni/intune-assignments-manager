import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs.recommended,
	prettier,
	...svelte.configs.prettier,
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node
			}
		},
		rules: {
			// `_` is the deliberate throwaway convention here, mostly for the item
			// binding in `{#each items as _, i}` where only the index is used.
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					varsIgnorePattern: '^_',
					argsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_',
					destructuredArrayIgnorePattern: '^_'
				}
			]
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				parser: ts.parser
			}
		},
		rules: {
			// Deployed to Cloudflare Pages root path — resolve() adds no value
			'svelte/no-navigation-without-resolve': 'off'
		}
	},
	{
		// `site/` is zensical build output and `docs/javascripts/` is vendored
		// third-party JS (mathjax bootstrap) — neither is ours to lint.
		ignores: ['build/', '.svelte-kit/', 'dist/', '.wrangler/', 'site/', 'docs/javascripts/']
	}
];
