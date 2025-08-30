<!-- src/lib/components/UnmuteConfigurator.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import {
    DEFAULT_UNMUTE_CONFIG,
    fetchVoices,
    getVoiceName,
    instructionsToPlaceholder,
    type Instructions,
    type UnmuteConfig,
    type VoiceSample
  } from '$lib/config';
  // ... your other imports

  // --- PROPS ---
  export let config: UnmuteConfig;
  export let backendServerUrl: string;
  export let voiceCloningUp: boolean = false;

  // --- STATE ---
  let voices: VoiceSample[] | null = null;
  let customInstructionsText = '';

  // --- LIFECYCLE ---
  onMount(async () => {
    if (backendServerUrl) {
      const voicesData = await fetchVoices(backendServerUrl);
      voices = voicesData;

      if (voicesData.length > 0) {
        const randomVoice = voicesData[Math.floor(Math.random() * voicesData.length)];
        config = {
          voice: randomVoice.source.path_on_server,
          voiceName: getVoiceName(randomVoice),
          instructions: randomVoice.instructions || DEFAULT_UNMUTE_CONFIG.instructions,
          isCustomInstructions: false,
        };
      }
    }
  });

  // --- DERIVED STATE & EVENT HANDLERS (THE FIX IS HERE) ---

  // We no longer have separate reactive declarations for `activeVoice` and `defaultInstructions`.
  // Instead, we calculate them when needed.

  function selectVoice(voice: VoiceSample) {
    // Calculate the default instructions for the *newly selected* voice on the spot.
    const newDefaultInstructions = voice.instructions || DEFAULT_UNMUTE_CONFIG.instructions;

    config = {
      // Keep existing custom instructions if they exist
      ...config,
      voice: voice.source.path_on_server,
      voiceName: getVoiceName(voice),
      // If not using custom instructions, switch to the character's default.
      instructions: config.isCustomInstructions ? config.instructions : newDefaultInstructions,
    }
  }

  // This single reactive block now handles all updates related to the textarea.
  // It runs whenever `customInstructionsText` or `voices` or `config.voice` changes.
  $: {
    // 1. Find the active voice and its default instructions inside the block.
    // These are now temporary constants, not reactive state, which breaks the cycle.
    const activeVoice = voices?.find((v) => v.source.path_on_server === config.voice);
    const defaultInstructions = activeVoice?.instructions || DEFAULT_UNMUTE_CONFIG.instructions;

    // 2. Determine the final instructions based on custom text.
    const finalInstructions: Instructions = customInstructionsText
      ? { type: 'constant', text: customInstructionsText, language: 'en/fr' }
      : defaultInstructions;

    // 3. Update the bound `config` object. This assignment is now safe.
    // We check to avoid redundant updates if only the placeholder text would change.
    if (config.instructions !== finalInstructions) {
      config.instructions = finalInstructions;
      config.isCustomInstructions = !!customInstructionsText;
    }

    // This also allows the placeholder to update when the voice changes.
    placeholder = instructionsToPlaceholder(defaultInstructions);
  }

  // A separate state for the placeholder to avoid re-rendering the textarea on every keystroke.
  let placeholder = instructionsToPlaceholder(DEFAULT_UNMUTE_CONFIG.instructions);

</script>

{#if !voices}
  <div class="w-full">
    <p class="text-lightgray">Loading characters...</p>
  </div>
{:else}
  <div class="w-full flex flex-col items-center">
    <div class="w-full max-w-6xl p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
      <!-- Character Selection -->
      <div>
        <h2 class="text-lightgray mb-2">Character</h2>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
          {#each voices as voice (voice.source.path_on_server)}
            <button
              on:click={() => selectVoice(voice)}
              class="p-2 border"
              class:bg-blue-500={voice.source.path_on_server === config.voice}
              class:text-white={voice.source.path_on_server === config.voice}
            >
              / {getVoiceName(voice)} /
            </button>
          {/each}
        </div>
      </div>

      <!-- Instructions Textarea -->
      <div>
        <h2 class="text-lightgray mb-2">Instructions</h2>
        <textarea
          bind:value={customInstructionsText}
          {placeholder}
          class="bg-gray-800 text-white text-sm w-full p-2 resize-none h-32"
        />
      </div>
    </div>
  </div>
{/if}