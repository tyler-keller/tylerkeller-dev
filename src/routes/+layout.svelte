<script lang="js">
	import Header from './header.svelte'
	import Footer from './footer.svelte'

	import 'open-props/style'
	import 'open-props/normalize'
	import 'open-props/buttons'

	import '../app.css'
</script>

<div class="grid grid-cols items-stretch min-h-screen gap-x-3">
	<Header class='top-0 p-4'/>

	<main class="flex-grow">
		<slot />
	</main>

	<Footer class='bottom-0 p-4' />
</div>