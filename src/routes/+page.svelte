<script>
    import { onMount } from 'svelte';

    let darkMode = false;

    // Check for system preference on mount
    onMount(() => {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        darkMode = prefersDark;
    });

    // Function to toggle dark mode
    function toggleDarkMode() {
        darkMode = !darkMode;
    }
</script>

<style>
:global(body.dark) {
    background-color: #333;
    color: white;
}
:global(body) {
    transition: background-color 0.3s, color 0.3s;
}
</style>

<button on:click={toggleDarkMode}>Toggle Dark Mode</button>

<svelte:body class:dark={darkMode} />
  
<div class="mb-4 text-center">
    <img src="https://avatars.githubusercontent.com/u/96822088?s=400&u=df589e2e9891eaeebd69aaf79eb28f50f181ca0b&v=4" alt="Tyler Keller" class="rounded-full h-32 w-32 mx-auto" />
</div>

<div class="mb-4 text-center" class:dark={darkMode}>
    <h1 class="text-4xl font-bold dark:text-white" class:dark={darkMode}>Tyler Keller</h1>
    <h3 class="text-2xl font-semibold dark:text-white" class:dark={darkMode}>Software Engineer</h3>
</div>

<div class="mb-4 space-y-2 text-center" class:dark={darkMode}>
    <h1 class="text-xl font-bold">Contact Information</h1>

    <ul class="space-y-2">
        <li>
            <p class="font-semibold">Email:</p>
            <a class="text-blue-500" href="mailto:tylerkeller@mines.edu">tylerkeller@mines.edu</a>
        </li>
        <li>
            <p class="font-semibold">Location:</p>
            <p>Golden, CO</p>
        </li>
        <li class="flex justify-center space-x-3">
            <a href="https://github.com/tylerckeller" target="_blank" rel="noopener noreferrer" class="text-blue-500">
                <img src="https://cdn-icons-png.flaticon.com/512/25/25231.png" alt="GitHub" class="h-6 w-6" />
            </a>
            <a href="https://www.linkedin.com/in/tylerkeller-dev/" target="_blank" rel="noopener noreferrer" class="text-blue-500">
                <img src="https://www.edigitalagency.com.au/wp-content/uploads/linkedin-icon-black-png.png" alt="LinkedIn" class="h-6 w-6" />
            </a>
            <a href="https://discordapp.com/users/478985762059321360" target="_blank" rel="noopener noreferrer" class="text-blue-500">
                <img src="https://assets-global.website-files.com/6257adef93867e50d84d30e2/636e0a6918e57475a843f59f_icon_clyde_black_RGB.svg" alt="Discord" class="h-6 w-6" />
            </a>
            <!-- <a href="https://www.chess.com/member/unknownst" target="_blank" rel="noopener noreferrer" class="text-blue-500">
                <img src="static/logo-chess-com.svg" alt="Chess.com" class="h-6 w-6" />
            </a> -->
        </li>
    </ul>
</div>

<div class="mb-4 space-y-2 text-center" class:dark={darkMode}>

    <h5 class="font-semibold text-center text-xl" class:dark={darkMode}>What Drives Me</h5>
    <p class="text-center" class:dark={darkMode}>
    I love using software to fix everyday problems.
    </p>

    <h5 class="text-center text-xl font-semibold" class:dark={darkMode}>The Journey So Far</h5>
    <p class="text-center" class:dark={darkMode}>
    TX -> CO -> HI -> CA -> NJ -> VA -> DEU -> VA -> CO
    </p>

    <h5 class="text-center text-xl font-semibold" class:dark={darkMode}>Hobbies</h5>
    <p class="text-center" class:dark={darkMode}>
    My speedcubing PB is <strong>12.54 seconds</strong>. Still working on getting that sub-10 time.
    </p>
    <p class="text-center" class:dark={darkMode}>
    I love music. Currently, learning piano.
    </p>

    <h5 class="text-center text-xl font-semibold" class:dark={darkMode}>Reading</h5>
    <p class="text-center" class:dark={darkMode}>
    I love reading. A new favorite is <strong><a href="https://en.wikipedia.org/wiki/Permutation_City"
        target="_blank">"Permutation City" by Dan Egan</a></strong>.
    </p>

</div>