export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["favicon.png","logo-chess-com.svg"]),
	mimeTypes: {".png":"image/png",".svg":"image/svg+xml"},
	_: {
		client: {"start":"_app/immutable/entry/start.BzAKTVSZ.js","app":"_app/immutable/entry/app.DOKwr65W.js","imports":["_app/immutable/entry/start.BzAKTVSZ.js","_app/immutable/chunks/entry.BkXgVIML.js","_app/immutable/chunks/scheduler.E9WtA0gz.js","_app/immutable/entry/app.DOKwr65W.js","_app/immutable/chunks/scheduler.E9WtA0gz.js","_app/immutable/chunks/index.DlCmWwsh.js"],"stylesheets":[],"fonts":[],"uses_env_dynamic_public":false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js'))
		],
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			}
		],
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
