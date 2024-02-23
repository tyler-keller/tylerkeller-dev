

export const index = 1;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/fallbacks/error.svelte.js')).default;
export const imports = ["_app/immutable/nodes/1.CyYLq6hF.js","_app/immutable/chunks/scheduler.ChZvVNzW.js","_app/immutable/chunks/index.B7UF46v5.js","_app/immutable/chunks/entry.49hqwe5Y.js"];
export const stylesheets = [];
export const fonts = [];
