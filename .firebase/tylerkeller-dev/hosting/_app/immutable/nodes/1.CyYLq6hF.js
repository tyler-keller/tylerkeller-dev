import{s as O,v as R,e as q,b as h,n as g}from"../chunks/scheduler.ChZvVNzW.js";import{S as B,i as D,d as C,v as H,a as E,n as $,s as N,c as w,b as S,o as k,f as d,g as P,k as m,l as j,r as x}from"../chunks/index.B7UF46v5.js";import{s as z}from"../chunks/entry.49hqwe5Y.js";const A=()=>{const t=z;return{page:{subscribe:t.page.subscribe},navigating:{subscribe:t.navigating.subscribe},updated:t.updated}},_={subscribe(t){return A().page.subscribe(t)}},y="node_modules/@sveltejs/kit/src/runtime/components/error.svelte";function f(t){var b;let e,i=t[0].status+"",o,l,n,c=((b=t[0].error)==null?void 0:b.message)+"",a;const v={c:function(){e=E("h1"),o=$(i),l=N(),n=E("p"),a=$(c),this.h()},l:function(s){e=w(s,"H1",{});var r=S(e);o=k(r,i),r.forEach(d),l=P(s),n=w(s,"P",{});var p=S(n);a=k(p,c),p.forEach(d),this.h()},h:function(){h(e,y,4,0,57),h(n,y,5,0,81)},m:function(s,r){m(s,e,r),j(e,o),m(s,l,r),m(s,n,r),j(n,a)},p:function(s,[r]){var p;r&1&&i!==(i=s[0].status+"")&&x(o,i),r&1&&c!==(c=((p=s[0].error)==null?void 0:p.message)+"")&&x(a,c)},i:g,o:g,d:function(s){s&&(d(e),d(l),d(n))}};return C("SvelteRegisterBlock",{block:v,id:f.name,type:"component",source:"",ctx:t}),v}function F(t,e,i){let o;R(_,"page"),q(t,_,a=>i(0,o=a));let{$$slots:l={},$$scope:n}=e;H("Error",l,[]);const c=[];return Object.keys(e).forEach(a=>{!~c.indexOf(a)&&a.slice(0,2)!=="$$"&&a!=="slot"&&console.warn(`<Error> was created with unknown prop '${a}'`)}),t.$capture_state=()=>({page:_,$page:o}),[o]}let K=class extends B{constructor(e){super(e),D(this,e,F,f,O,{}),C("SvelteRegisterComponent",{component:this,tagName:"Error",options:e,id:f.name})}};export{K as component};
