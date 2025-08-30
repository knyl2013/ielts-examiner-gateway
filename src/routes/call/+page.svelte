<script lang="ts">
  // Import your component using the $lib alias.
  // SvelteKit automatically knows that $lib points to the src/lib folder.
  import PhoneCallScreen from '$lib/components/PhoneCallScreen.svelte';
</script>

<main>
  <PhoneCallScreen />
</main>

<style>
  /* Basic styling to center the component on the page */
  main {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100dvh;
    background-color: #1c1c1e; /* A dark background to match the theme */
  }
</style>