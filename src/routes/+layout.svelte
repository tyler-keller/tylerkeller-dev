<script lang="js">
	import Header from './header.svelte'
	import Footer from './footer.svelte'

	import 'open-props/style'
	import 'open-props/normalize'
	import 'open-props/buttons'

	import '../app.css'
</script>

<div class="grid grid-cols items-stretch h-screen">
	<Header class='top-0 p-4'/>

	<div class="flex-grow"></div>

	<main>
		<slot />
	</main>

	<div class="flex-grow"></div>

	<Footer class='bottom-0 p-4 pb-4' />
</div>