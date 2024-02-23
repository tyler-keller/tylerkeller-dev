

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export const imports = ["_app/immutable/nodes/0.CnFNzUvM.js","_app/immutable/chunks/scheduler.ChZvVNzW.js","_app/immutable/chunks/index.B7UF46v5.js"];
export const stylesheets = ["_app/immutable/assets/0.Cs6IiUSd.css"];
export const fonts = [];
