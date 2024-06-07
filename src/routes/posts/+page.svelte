<script lang="js">
	import { formatDate } from '$lib/utils'
	import * as config from '$lib/config'

	export let data
</script>

<!-- <svelte:head>
	<title>{config.title}</title>
</svelte:head> -->

<!-- Posts -->
<section>
	<ul class="posts">
		{#each data.posts as post}
			<li class="post">
				<a href={post.slug} class="title">{post.title}</a>
				<p class="date">{formatDate(post.date)}</p>
				<p class="description">{post.description}</p>
			</li>
		{/each}
	</ul>
</section>