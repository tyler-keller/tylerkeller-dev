import { c as create_ssr_component } from "../../chunks/ssr.js";
const css = {
  code: "body.dark{background-color:#333;color:white}body{transition:background-color 0.3s, color 0.3s}",
  map: null
};
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  $$result.css.add(css);
  return `<button data-svelte-h="svelte-1uzjye4">Toggle Dark Mode</button>  <div class="mb-4 text-center"><img src="https://avatars.githubusercontent.com/u/96822088?s=400&u=df589e2e9891eaeebd69aaf79eb28f50f181ca0b&v=4" alt="Tyler Keller" class="rounded-full h-32 w-32 mx-auto"></div> <div class="${["mb-4 text-center", ""].join(" ").trim()}"><h1 class="${["text-4xl font-bold dark:text-white", ""].join(" ").trim()}" data-svelte-h="svelte-221oyq">Tyler Keller</h1> <h3 class="${["text-2xl font-semibold dark:text-white", ""].join(" ").trim()}" data-svelte-h="svelte-1vpt4ih">Software Engineer</h3></div> <div class="${["mb-4 space-y-2 text-center", ""].join(" ").trim()}"><h1 class="text-xl font-bold" data-svelte-h="svelte-e79kha">Contact Information</h1> <ul class="space-y-2"><li><p class="font-semibold" data-svelte-h="svelte-3f3ghs">Email:</p> <a class="text-blue-500" href="mailto:tylerkeller@mines.edu" data-svelte-h="svelte-1pxynz5">tylerkeller@mines.edu</a></li> <li><p class="font-semibold" data-svelte-h="svelte-srgbch">Location:</p> <p data-svelte-h="svelte-1kjv9v5">Golden, CO</p></li> <li class="flex justify-center space-x-3"><a href="https://github.com/tylerckeller" target="_blank" rel="noopener noreferrer" class="text-blue-500"><img src="https://cdn-icons-png.flaticon.com/512/25/25231.png" alt="GitHub" class="h-6 w-6"></a> <a href="https://www.linkedin.com/in/tylerkeller-dev/" target="_blank" rel="noopener noreferrer" class="text-blue-500"><img src="https://www.edigitalagency.com.au/wp-content/uploads/linkedin-icon-black-png.png" alt="LinkedIn" class="h-6 w-6"></a> <a href="https://discordapp.com/users/478985762059321360" target="_blank" rel="noopener noreferrer" class="text-blue-500"><img src="https://assets-global.website-files.com/6257adef93867e50d84d30e2/636e0a6918e57475a843f59f_icon_clyde_black_RGB.svg" alt="Discord" class="h-6 w-6"></a> </li></ul></div> <div class="${["mb-4 space-y-2 text-center", ""].join(" ").trim()}"><h5 class="${["font-semibold text-center text-xl", ""].join(" ").trim()}" data-svelte-h="svelte-19oilj4">What Drives Me</h5> <p class="${["text-center", ""].join(" ").trim()}" data-svelte-h="svelte-1vm5ynb">I love using software to fix everyday problems.</p> <h5 class="${["text-center text-xl font-semibold", ""].join(" ").trim()}" data-svelte-h="svelte-1fyoajh">The Journey So Far</h5> <p class="${["text-center", ""].join(" ").trim()}" data-svelte-h="svelte-caxor7">TX -&gt; CO -&gt; HI -&gt; CA -&gt; NJ -&gt; VA -&gt; DEU -&gt; VA -&gt; CO</p> <h5 class="${["text-center text-xl font-semibold", ""].join(" ").trim()}" data-svelte-h="svelte-11c66cp">Hobbies</h5> <p class="${["text-center", ""].join(" ").trim()}">My speedcubing PB is <strong data-svelte-h="svelte-9cjii7">12.54 seconds</strong>. Still working on getting that sub-10 time.</p> <p class="${["text-center", ""].join(" ").trim()}" data-svelte-h="svelte-6936jt">I love music. Currently, learning piano.</p> <h5 class="${["text-center text-xl font-semibold", ""].join(" ").trim()}" data-svelte-h="svelte-kdtkqp">Reading</h5> <p class="${["text-center", ""].join(" ").trim()}">I love reading. A new favorite is <strong><a href="https://en.wikipedia.org/wiki/Permutation_City" target="_blank" data-svelte-h="svelte-19j311q">&quot;Permutation City&quot; by Dan Egan</a></strong>.</p></div>`;
});
export {
  Page as default
};