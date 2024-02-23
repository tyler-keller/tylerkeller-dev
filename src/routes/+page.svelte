<script>
    let sections = [
        { title: 'Background', content: 'I\'m a Computer Science major at Colorado School of Mines.' },
        { title: 'What Drives Me', content: 'I love using software to fix everyday problems.' },
        // Add more sections as needed
    ];

    let darkMode = false;

    const toggleDarkMode = () => {
        darkMode = !darkMode;
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            darkMode = true;
        }
        document.body.classList.toggle('dark', darkMode);
    };
</script>
<div class="mb-4 text-center">
    <img src="https://avatars.githubusercontent.com/u/96822088?s=400&u=df589e2e9891eaeebd69aaf79eb28f50f181ca0b&v=4" alt="Tyler Keller" class="rounded-full h-32 w-32 mx-auto" />
</div>
<div class="mb-4 text-center">
    <h1 class="text-4xl font-bold">Tyler Keller</h1>
    <h3 class="text-2xl font-semibold">Software Engineer</h3>
</div>

<div class="mb-4 space-y-2 text-center">
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
<h1 class="text-center">About Me</h1>

<section class="about text-center" class:dark={darkMode}>
{#each sections as section}
    <h5 class="text-green">{section.title}</h5>
    <p>{section.content}</p>
{/each}
</section>