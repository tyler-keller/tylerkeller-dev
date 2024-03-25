
// this file is generated — do not edit it


/// <reference types="@sveltejs/kit" />

/**
 * Environment variables [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env`. Like [`$env/dynamic/private`](https://kit.svelte.dev/docs/modules#$env-dynamic-private), this module cannot be imported into client-side code. This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://kit.svelte.dev/docs/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://kit.svelte.dev/docs/configuration#env) (if configured).
 * 
 * _Unlike_ [`$env/dynamic/private`](https://kit.svelte.dev/docs/modules#$env-dynamic-private), the values exported from this module are statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * ```ts
 * import { API_KEY } from '$env/static/private';
 * ```
 * 
 * Note that all environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * 
 * ```
 * MY_FEATURE_FLAG=""
 * ```
 * 
 * You can override `.env` values from the command line like so:
 * 
 * ```bash
 * MY_FEATURE_FLAG="enabled" npm run dev
 * ```
 */
declare module '$env/static/private' {
	export const PWD: string;
	export const CONDA_PYTHON_EXE: string;
	export const SECURITYSESSIONID: string;
	export const MANPATH: string;
	export const NVM_DIR: string;
	export const USER: string;
	export const HOMEBREW_PREFIX: string;
	export const INFOPATH: string;
	export const ITERM_PROFILE: string;
	export const MallocNanoZone: string;
	export const __CFBundleIdentifier: string;
	export const LS_COLORS: string;
	export const COMMAND_MODE: string;
	export const CONDA_PROMPT_MODIFIER: string;
	export const LANG: string;
	export const LC_TERMINAL_VERSION: string;
	export const PATH: string;
	export const CONDA_EXE: string;
	export const CONDA_PREFIX: string;
	export const TERM: string;
	export const LOGNAME: string;
	export const HOMEBREW_CELLAR: string;
	export const PAGER: string;
	export const TERM_PROGRAM_VERSION: string;
	export const SSH_AUTH_SOCK: string;
	export const _CE_CONDA: string;
	export const ZSH: string;
	export const CONDA_SHLVL: string;
	export const SHLVL: string;
	export const NVM_CD_FLAGS: string;
	export const TERM_SESSION_ID: string;
	export const HOMEBREW_REPOSITORY: string;
	export const LESS: string;
	export const COLORTERM: string;
	export const HOME: string;
	export const CONDA_DEFAULT_ENV: string;
	export const SHELL: string;
	export const LSCOLORS: string;
	export const ITERM_SESSION_ID: string;
	export const _CE_M: string;
	export const __CF_USER_TEXT_ENCODING: string;
	export const TMPDIR: string;
	export const TERM_PROGRAM: string;
	export const NVM_BIN: string;
	export const NVM_INC: string;
	export const LaunchInstanceID: string;
	export const COLORFGBG: string;
	export const LC_TERMINAL: string;
	export const XPC_SERVICE_NAME: string;
	export const XPC_FLAGS: string;
	export const ORIGINAL_XDG_CURRENT_DESKTOP: string;
	export const OPENAI_API_KEY: string;
	export const GIT_ASKPASS: string;
	export const VSCODE_GIT_ASKPASS_NODE: string;
	export const VSCODE_GIT_ASKPASS_EXTRA_ARGS: string;
	export const VSCODE_GIT_ASKPASS_MAIN: string;
	export const VSCODE_GIT_IPC_HANDLE: string;
	export const VSCODE_INJECTION: string;
	export const ZDOTDIR: string;
	export const USER_ZDOTDIR: string;
	export const OLDPWD: string;
	export const _: string;
	export const IS_FIREBASE_CLI: string;
	export const NODE_ENV: string;
}

/**
 * Similar to [`$env/static/private`](https://kit.svelte.dev/docs/modules#$env-static-private), except that it only includes environment variables that begin with [`config.kit.env.publicPrefix`](https://kit.svelte.dev/docs/configuration#env) (which defaults to `PUBLIC_`), and can therefore safely be exposed to client-side code.
 * 
 * Values are replaced statically at build time.
 * 
 * ```ts
 * import { PUBLIC_BASE_URL } from '$env/static/public';
 * ```
 */
declare module '$env/static/public' {
	
}

/**
 * This module provides access to runtime environment variables, as defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://kit.svelte.dev/docs/cli)), this is equivalent to `process.env`. This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://kit.svelte.dev/docs/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://kit.svelte.dev/docs/configuration#env) (if configured).
 * 
 * This module cannot be imported into client-side code.
 * 
 * Dynamic environment variables cannot be used during prerendering.
 * 
 * ```ts
 * import { env } from '$env/dynamic/private';
 * console.log(env.DEPLOYMENT_SPECIFIC_VARIABLE);
 * ```
 * 
 * > In `dev`, `$env/dynamic` always includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 */
declare module '$env/dynamic/private' {
	export const env: {
		PWD: string;
		CONDA_PYTHON_EXE: string;
		SECURITYSESSIONID: string;
		MANPATH: string;
		NVM_DIR: string;
		USER: string;
		HOMEBREW_PREFIX: string;
		INFOPATH: string;
		ITERM_PROFILE: string;
		MallocNanoZone: string;
		__CFBundleIdentifier: string;
		LS_COLORS: string;
		COMMAND_MODE: string;
		CONDA_PROMPT_MODIFIER: string;
		LANG: string;
		LC_TERMINAL_VERSION: string;
		PATH: string;
		CONDA_EXE: string;
		CONDA_PREFIX: string;
		TERM: string;
		LOGNAME: string;
		HOMEBREW_CELLAR: string;
		PAGER: string;
		TERM_PROGRAM_VERSION: string;
		SSH_AUTH_SOCK: string;
		_CE_CONDA: string;
		ZSH: string;
		CONDA_SHLVL: string;
		SHLVL: string;
		NVM_CD_FLAGS: string;
		TERM_SESSION_ID: string;
		HOMEBREW_REPOSITORY: string;
		LESS: string;
		COLORTERM: string;
		HOME: string;
		CONDA_DEFAULT_ENV: string;
		SHELL: string;
		LSCOLORS: string;
		ITERM_SESSION_ID: string;
		_CE_M: string;
		__CF_USER_TEXT_ENCODING: string;
		TMPDIR: string;
		TERM_PROGRAM: string;
		NVM_BIN: string;
		NVM_INC: string;
		LaunchInstanceID: string;
		COLORFGBG: string;
		LC_TERMINAL: string;
		XPC_SERVICE_NAME: string;
		XPC_FLAGS: string;
		ORIGINAL_XDG_CURRENT_DESKTOP: string;
		OPENAI_API_KEY: string;
		GIT_ASKPASS: string;
		VSCODE_GIT_ASKPASS_NODE: string;
		VSCODE_GIT_ASKPASS_EXTRA_ARGS: string;
		VSCODE_GIT_ASKPASS_MAIN: string;
		VSCODE_GIT_IPC_HANDLE: string;
		VSCODE_INJECTION: string;
		ZDOTDIR: string;
		USER_ZDOTDIR: string;
		OLDPWD: string;
		_: string;
		IS_FIREBASE_CLI: string;
		NODE_ENV: string;
		[key: `PUBLIC_${string}`]: undefined;
		[key: `${string}`]: string | undefined;
	}
}

/**
 * Similar to [`$env/dynamic/private`](https://kit.svelte.dev/docs/modules#$env-dynamic-private), but only includes variables that begin with [`config.kit.env.publicPrefix`](https://kit.svelte.dev/docs/configuration#env) (which defaults to `PUBLIC_`), and can therefore safely be exposed to client-side code.
 * 
 * Note that public dynamic environment variables must all be sent from the server to the client, causing larger network requests — when possible, use `$env/static/public` instead.
 * 
 * Dynamic environment variables cannot be used during prerendering.
 * 
 * ```ts
 * import { env } from '$env/dynamic/public';
 * console.log(env.PUBLIC_DEPLOYMENT_SPECIFIC_VARIABLE);
 * ```
 */
declare module '$env/dynamic/public' {
	export const env: {
		[key: `PUBLIC_${string}`]: string | undefined;
	}
}
