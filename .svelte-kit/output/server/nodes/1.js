

export const index = 1;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/fallbacks/error.svelte.js')).default;
export const imports = ["_app/immutable/nodes/1.TQjpQ0HT.js","_app/immutable/chunks/scheduler.E9WtA0gz.js","_app/immutable/chunks/index.DlCmWwsh.js","_app/immutable/chunks/entry.BkXgVIML.js"];
export const stylesheets = [];
export const fonts = [];
