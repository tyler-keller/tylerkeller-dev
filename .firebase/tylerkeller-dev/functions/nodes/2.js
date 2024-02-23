

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/2.UBei7eY1.js","_app/immutable/chunks/scheduler.ChZvVNzW.js","_app/immutable/chunks/index.B7UF46v5.js"];
export const stylesheets = [];
export const fonts = [];
