<script lang="js">
    import { page } from '$app/stores';
    import { onMount } from 'svelte';

    let currentPage = '';

    onMount(() => {
        // Get the current page from the store
        const unsubscribe = page.subscribe(value => {
            currentPage = value;
        });

        // Unsubscribe from the store when the component is destroyed
        return () => {
            unsubscribe();
        };
    });
</script>

<div class="container mx-auto px-9">
    <div class="flex flex-row">
        <ul class="links">
            <li>
                <a href="/" class:underline={currentPage === '/'}>home</a>
            </li>
            <li>
                <a href="/about" class:underline={currentPage === '/about'}>about</a>
            </li>
            <li>
                <a href="/projects" class:underline={currentPage === '/projects'}>projects</a>
            </li>
            <li>
                <a href="/posts" class:underline={currentPage === '/posts'}>posts</a>
            </li>
            <li>
                <a href="/recs" class:underline={currentPage === '/recs'}>recs</a>
            </li>
        </ul>
    </div>
</div>

<style>
	nav {
		padding-block: var(--size-7);
	}

	.links {
		margin-block: var(--size-7);
	}

	a {
		color: inherit;
		text-decoration: none;
	}

	@media (min-width: 768px) {
		nav {
			display: flex;
			justify-content: space-between;
		}

		.links {
			display: flex;
			gap: var(--size-7);
			margin-block: 0;
		}
	}
</style>
