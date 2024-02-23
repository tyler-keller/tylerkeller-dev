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
		client: {"start":"_app/immutable/entry/start.BT-IfxjV.js","app":"_app/immutable/entry/app.CCXrui7C.js","imports":["_app/immutable/entry/start.BT-IfxjV.js","_app/immutable/chunks/entry.49hqwe5Y.js","_app/immutable/chunks/scheduler.ChZvVNzW.js","_app/immutable/entry/app.CCXrui7C.js","_app/immutable/chunks/scheduler.ChZvVNzW.js","_app/immutable/chunks/index.B7UF46v5.js"],"stylesheets":[],"fonts":[],"uses_env_dynamic_public":false},
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
