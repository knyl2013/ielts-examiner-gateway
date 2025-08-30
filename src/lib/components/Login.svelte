<script lang="ts">
    import { onMount } from 'svelte';
    import { userStore, userSettingsStore, updateUserSettings } from '$lib/stores';
    import { signInWithGoogle, signOutUser } from '$lib/auth';
    import { scale } from 'svelte/transition';
	import FallbackAvatar from './FallbackAvatar.svelte';
	import { goto } from '$app/navigation';

    let isPopupOpen = false;
    let containerEl: HTMLDivElement;

    function togglePopup() {
        isPopupOpen = !isPopupOpen;
    }

    function closePopup() {
        isPopupOpen = false;
    }

    const handleClickOutside = (event: MouseEvent) => {
        if (isPopupOpen && containerEl && !containerEl.contains(event.target as Node)) {
            closePopup();
        }
    };

    async function handleMemoryToggle() {
        // The bind:checked already updated the store's local state.
        // Now we persist this change to Firebase.
        await updateUserSettings({ memory: $userSettingsStore.memory });
    }

    onMount(() => {
        window.addEventListener('click', handleClickOutside, true);
    });
</script>

<div class="auth-container" bind:this={containerEl}>
    {#if $userStore === undefined}
        <div class="loader-container">
            <div class="loader"></div>
        </div>
    {:else if $userStore}
        <div class="profile-container">
            <button class="avatar-button" on:click={togglePopup} aria-label="Open user menu">
                <FallbackAvatar name={$userStore.displayName || "Guest"} size={27} />
            </button>

            {#if isPopupOpen}
                <div class="popup-menu" transition:scale={{ duration: 150, start: 0.95 }}>
                    <div class="popup-header">
                        <strong>{$userStore.displayName}</strong>
                        <span class="email">{$userStore.email}</span>
                    </div>
                    <hr />
                    <div class="popup-item-toggle">
                        <span>Memory</span>
                        <div class="tooltip-container">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                class="info-icon"
                            >
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="16" x2="12" y2="12" />
                                <line x1="12" y1="8" x2="12.01" y2="8" />
                            </svg>
                            <div class="tooltip-text">
                                When enabled, the AI will remember the summaries of your last conversations for better context and continuity.
                            </div>
                        </div>
                        <label class="switch">
                            <input
                                type="checkbox"
                                bind:checked={$userSettingsStore.memory}
                                on:change={handleMemoryToggle}
                            />
                            <span class="slider round"></span>
                        </label>
                    </div>
                    <hr />
                    <button class="popup-item" on:click={() => goto('/feedback')}>
                        Give Feedback
                    </button>
                    <button class="popup-item" on:click={signOutUser}>
                        Sign Out
                    </button>
                </div>
            {/if}
        </div>
    {:else}
        <button class="auth-button sign-in" on:click={signInWithGoogle}>
            <span>Sign in</span>
        </button>
    {/if}
</div>

<style>
    .auth-container {
        position: absolute;
        right: 15px;
        top: 13.5px;
    }

    .auth-button {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 16px;
        border-radius: 20px;
        border: 1px solid rgba(255, 255, 255, 0.5);
        background: rgba(255, 255, 255, 0.1);
        color: white;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .auth-button:hover {
        background: rgba(255, 255, 255, 0.2);
    }

    .profile-container {
        position: relative;
        top: 6px;
        right: 45px;
    }

    .avatar-button {
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
        border-radius: 50%;
        display: block;
    }

    .popup-menu {
        position: absolute;
        top: calc(100% + 10px); /* Position below the avatar with a 10px gap */
        right: 0;
        background: #2c2c2e; /* A dark, iOS-like background */
        color: white;
        border-radius: 12px;
        width: 220px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.1);
        transform-origin: top left; /* Makes the scale transition look better */
        padding: 8px;
    }

    .popup-header {
        padding: 8px 12px;
        display: flex;
        flex-direction: column;
    }

    .popup-header .email {
        font-size: 0.8rem;
        color: #8e8e93; /* A lighter grey for the email */
        margin-top: 2px;
    }

    .popup-menu hr {
        border: none;
        height: 1px;
        background-color: rgba(255, 255, 255, 0.1);
        margin: 8px 0;
    }

    .popup-item {
        width: 100%;
        background: none;
        border: none;
        color: white;
        padding: 10px 12px;
        text-align: left;
        font-size: 0.95rem;
        cursor: pointer;
        border-radius: 8px;
        transition: background-color 0.2s;
    }

    .popup-item:hover {
        background-color: rgba(255, 255, 255, 0.1);
    }

    .loader-container {
        position: absolute;
        top: 6px;
        right: 45px;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 27px;
        width: 27px;
    }

    .loader {
        width: 20px;
        height: 20px;
        border: 3px solid rgba(255, 255, 255, 0.3);
        border-top-color: #ffffff;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }

    .popup-item-toggle {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 12px;
        font-size: 0.95rem;
    }

    .switch {
        position: relative;
        display: inline-block;
        width: 44px;
        height: 24px;
    }

    .switch input {
        opacity: 0;
        width: 0;
        height: 0;
    }

    .slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #555;
        transition: 0.4s;
    }

    .slider:before {
        position: absolute;
        content: '';
        height: 20px;
        width: 20px;
        left: 2px;
        bottom: 2px;
        background-color: white;
        transition: 0.4s;
    }

    input:checked + .slider {
        background-color: #4cd964; /* iOS green */
    }

    input:checked + .slider:before {
        transform: translateX(20px);
    }

    .slider.round {
        border-radius: 34px;
    }

    .slider.round:before {
        border-radius: 50%;
    }

    .tooltip-container {
        position: relative;
        display: flex;
        align-items: center;
    }

    .info-icon {
        color: #8e8e93; /* Lighter grey for the icon */
        cursor: help;
    }

    .tooltip-text {
        visibility: hidden;
        opacity: 0;
        width: 200px;
        background-color: #48484a; /* Darker than menu for contrast */
        color: #fff;
        text-align: center;
        border-radius: 6px;
        padding: 8px;
        position: absolute;
        z-index: 1;
        bottom: 150%; /* Position above the icon */
        left: 50%;
        transform: translateX(-50%);
        transition: opacity 0.2s ease-in-out;
        font-size: 0.8rem;
        line-height: 1.4;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    }

    /* The little arrow pointing down */
    .tooltip-text::after {
        content: '';
        position: absolute;
        top: 100%;
        left: 50%;
        margin-left: -5px;
        border-width: 5px;
        border-style: solid;
        border-color: #48484a transparent transparent transparent;
    }

    .tooltip-container:hover .tooltip-text {
        visibility: visible;
        opacity: 1;
    }

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }
</style>