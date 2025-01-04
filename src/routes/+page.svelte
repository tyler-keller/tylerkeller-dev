<script>
    import Modal from './modal.svelte';
    import { onMount } from 'svelte';

    let isModalOpen = false;
    let modalContent = "";

    const openModal = async (state) => {
        isModalOpen = true;

        // Fetch dynamic content for the state
        const response = await fetch(`/states/${state}`);
        modalContent = await response.text();
    };
</script>

<div class="p-2 max-w-prose mx-auto space-y-8 flex-row">
    <div class="p-8 max-w-prose mx-auto space-y-8 flex-row">
        <p class="dark:text-white text-black text-center lg:text-justify">hi. i'm tyler.</p>
        <div class="md:flex md:flex-row">
            <p class="pr-1 pt-1 text-center">i'm a software engineer </p>
            <p class="lg:p-1 pb-2 text-xs text-center">(obv. not a designer)</p>
            <p class="p-1 text-center"> -- w/ a focus in ML.</p>
        </div>
        <!-- <p class="">no stranger to shipping.</p> -->
        <!-- <div class="md:py-8 justify-center">
            <p class="text-center pb-2">the journey so far:</p>
            <div class="md:flex md:flex-row sm:flex-col content-center md:w-3/4 md:space-x-16 lg:space-y-0 md:space-y-16 sm:space-y-16 md:pt-4">
                {#each ["texas", "hawaii", "california", "new-jersey", "germany", "virginia", "colorado"] as state}
                    <button
                        on:click={() => openModal(state)}
                        class="flex flex-row space-x-3 justify-center group hover:rotate-6"
                    >
                        <p class="text-center group-hover:text-blue-600 uppercase">{state.slice(0, 2).toUpperCase()}</p>
                        <img
                            src={`./${state}.png`}
                            alt={state}
                            class="md:size-5/6 sm:size-1/12 group-hover:scale-105 transition-transform duration-200"
                        />
                    </button>
                {/each}
            </div>
        </div>
        <Modal bind:isOpen={isModalOpen} bind:content={modalContent} /> -->
        <div class='md:py-8 justify-center'>
            <p class="text-center pb-2">the journey so far:</p>
            <div class="md:flex md:flex-row sm:flex-col content-center md:w-3/4 md:space-x-16 lg:space-y-0 md:space-y-16 sm:space-y-16 md:pt-4">
                <a href='/states/texas' class="flex flex-row space-x-3 justify-center group hover:rotate-6">
                    <p class="text-center group-hover:text-blue-600">TX </p>
                    <img src="./texas.png" alt="" class="md:size-5/6 sm:size-1/12 group-hover:scale-105 transition-transform duration-200">
                </a>
                <a href='/states/hawaii' class="flex flex-row space-x-3 justify-center group hover:rotate-6">
                    <p class="text-center group-hover:text-blue-600">HI</p>
                    <img src="./hawaii.png" alt="" class="md:size-5/6 sm:size-1/12 group-hover:scale-105 transition-transform duration-200">
                </a>
                <a href='/states/california' class="flex flex-row space-x-3 justify-center group hover:rotate-6">
                    <p class="text-center group-hover:text-blue-600">CA</p>
                    <img src="./california.png" alt="" class="md:size-5/6 sm:size-1/12 group-hover:scale-105 transition-transform duration-200">
                </a>
                <a href='/states/new-jersey' class="flex flex-row space-x-3 justify-center group hover:rotate-6">
                    <p class="text-center group-hover:text-blue-600">NJ</p>
                    <img src="./new-jersey.png" alt="" class="md:size-5/6 sm:size-1/12 group-hover:scale-105 transition-transform duration-200">
                </a>
                <a href='/states/germany' class="flex flex-row space-x-3 justify-center group hover:rotate-6">
                    <p class="text-center group-hover:text-blue-600">DEU</p>
                    <img src="./germany.png" alt="" class="md:size-5/6 sm:size-1/12 group-hover:scale-105 transition-transform duration-200">
                </a>
                <a href='/states/virginia' class="flex flex-row space-x-3 justify-center group hover:rotate-6">
                    <p class="text-center group-hover:text-blue-600">VA</p>
                    <img src="./virginia.png" alt="" class="md:size-5/6 sm:size-1/12 group-hover:scale-105 transition-transform duration-200">
                </a>
                <a href='/states/colorado' class="flex flex-row space-x-3 justify-center group hover:rotate-6">
                    <p class="text-center group-hover:text-blue-600">CO</p>
                    <img src="./colorado.png" alt="" class="md:size-5/6 sm:size-1/12 group-hover:scale-105 transition-transform duration-200">
                </a>
            </div>
        </div>

        <p>read my <a href="https://0xt4k.substack.com/" target="_blank" class="underline">devlogs</a> on substack</p>

        <p>projects: </p>
        <ul class="list-disc pl-5">
            <li class='pb-6'>
                <a href="https://linedodge.pro" target="_blank" class="underline">linedodge.pro</a>
                <ul class="list-disc pl-5">
                    <li>source:
                        <ul class="list-disc pl-5">
                            <li><a href="https://github.com/tyler-keller/line-dodge" target="_blank" class="underline">https://github.com/tyler-keller/line-dodge</a></li>
                        </ul>
                    </li>
                    <li>contributors:
                        <ul class="list-disc pl-5">
                            <li><a href="https://wesleyhu.dev/" target="_blank" class="underline">Wesley Hu</a></li>
                            <li><a href="https://github.com/ibovadilla" target="_blank" class="underline">Ivana Bovidilla</a></li>
                            <li><a href="https://github.com/mmcgrath2" target="_blank" class="underline">Matthew McGrath</a></li>
                        </ul>
                    </li>
                </ul>
            </li>
            <li class="pb-6">
                <a href="https://quityoutube.com" target="_blank" class="underline">quityoutube.com</a> 
                <ul class="list-disc pl-5">
                    <li>source:
                        <ul>
                            <li>
                                <a href="https://github.com/tyler-keller/quit-youtube" target="_blank" class="underline">https://github.com/tyler-keller/quit-youtube</a>
                            </li>
                        </ul>
                    </li>
                </ul>
            </li>
            <li class="pb-6">
                <a href="https://techtok.live" target="_blank" class="underline">techtok.live</a> 
                <ul class="list-disc pl-5">
                    <li>source:
                        <ul>
                            <li>
                                <a href="https://github.com/tyler-keller/tech-tok" target="_blank" class="underline">https://github.com/tyler-keller/tech-tok</a>
                            </li>
                        </ul>
                    </li>
                </ul>
            </li>
            <li class='pb-6'>
                <a href="https://dealio.ooo" target="_blank" class="underline">dealio.ooo</a>
                <ul class="list-disc pl-5">
                    <li>source:
                        <ul class="list-disc pl-5">
                            <li><a href="https://github.com/deal-io" target="_blank" class="underline">https://github.com/deal-io</a></li>
                        </ul>
                    </li>
                    <li>contributors:
                        <ul class="list-disc pl-5">
                            <li><a href="https://www.linkedin.com/in/leviortega/" target="_blank" class="underline">Levi Ortega</a></li>
                            <li><a href="https://github.com/NathanHowland0623" target="_blank" class="underline">Nathan Howland</a></li>
                        </ul>
                    </li>
                </ul>
            </li>
            <li class='pb-6'>
                <a href="https://sipwars.lol" target="_blank" class="underline">sipwars.lol</a>
                <ul class="list-disc pl-5">
                    <li>source:
                        <ul class="list-disc pl-5">
                            <li><a href="https://github.com/sip-wars" target="_blank" class="underline">https://github.com/sip-wars</a></li>
                        </ul>
                    </li>
                    <li>contributors:
                        <ul class="list-disc pl-5">
                            <li><a href="https://wesleyhu.dev/" target="_blank" class="underline">Wesley Hu</a></li>
                        </ul>
                    </li>
                </ul>
            </li>
        </ul>
    </div>
</div>