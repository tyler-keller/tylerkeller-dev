

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/2.CxGRyGEL.js","_app/immutable/chunks/scheduler.E9WtA0gz.js","_app/immutable/chunks/index.DlCmWwsh.js"];
export const stylesheets = ["_app/immutable/assets/2.DEbzih5W.css"];
export const fonts = [];
