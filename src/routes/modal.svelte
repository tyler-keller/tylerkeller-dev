<script>
    export let isOpen = false; // Controls modal visibility
    export let content = ""; // Dynamic content to display

    const closeModal = () => {
        isOpen = false;
    };
</script>

{#if isOpen}
    <div class="fixed inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg w-3/4 p-5 relative">
            <button class="absolute top-2 right-2 text-red-500" on:click={closeModal}>Close</button>
            <div class="overflow-auto max-h-[80vh]">
                {@html content} <!-- Renders dynamic HTML content -->
            </div>
        </div>
    </div>
{/if}
