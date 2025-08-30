<!-- src/routes/feedback/+page.svelte -->
<script lang="ts">
    import { goto } from '$app/navigation';
    import { saveFeedback } from '$lib/stores';
    import { userStore } from '$lib/stores';

    let rating = 0;
    let hoverRating = 0;
    let feedbackText = '';
    let allowContact = false;
    let formState: 'idle' | 'submitting' | 'submitted' | 'error' = 'idle';
    let errorMessage = '';

    const handleSubmit = async () => {
        if (rating === 0 || !$userStore) {
            return;
        }

        formState = 'submitting';
        try {
            await saveFeedback(rating, feedbackText, allowContact);
            formState = 'submitted';
        } catch (error: any) {
            console.error('Failed to submit feedback:', error);
            errorMessage = error.message || 'Something went wrong. Please try again.';
            formState = 'error';
        }
    };
</script>

<header class="header">
    <button class="backButton" on:click={() => goto('/')} aria-label="Go back to home">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z"
                fill="white"
            />
        </svg>
    </button>
</header>

<div class="pageContainer">
    <main class="content">
        {#if formState === 'submitted'}
            <div class="textContent">
                <h1 class="headline">Thank You!</h1>
                <p class="sub-headline">
                    Your feedback is valuable and helps us improve the app for everyone.
                </p>
                <button class="returnButton" on:click={() => goto('/')}>Return to Home</button>
            </div>
        {:else}
            <div class="textContent">
                <h1 class="headline">Share Your Feedback</h1>
                <p class="sub-headline">
                    How was your experience? Let us know what you think. We're always working to make it
                    better.
                </p>
            </div>

            {#if $userStore}
                <form class="feedbackForm" on:submit|preventDefault={handleSubmit}>
                    <!-- Star Rating -->
                    <div
                        class="starRating"
                        on:mouseleave={() => (hoverRating = 0)}
                        aria-label="Rate your experience"
                    >
                        {#each Array(5) as _, i}
                            {@const starValue = i + 1}
                            <button
                                type="button"
                                class="starButton"
                                on:click={() => (rating = starValue)}
                                on:mouseenter={() => (hoverRating = starValue)}
                                aria-label={`Rate ${starValue} out of 5 stars`}
                            >
                                <svg
                                    class:filled={(hoverRating || rating) >= starValue}
                                    width="36"
                                    height="36"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        d="M12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27Z"
                                        stroke="#FFD700"
                                        stroke-width="1.5"
                                        fill="none"
                                    />
                                </svg>
                            </button>
                        {/each}
                    </div>

                    <textarea
                        bind:value={feedbackText}
                        placeholder="Optional: Tell us more about your experience..."
                        rows="5"
                        disabled={formState === 'submitting'}
                    />

                    <!-- Permission Checkbox -->
                    <label class="checkboxContainer">
                        <input type="checkbox" bind:checked={allowContact} />
                        <span class="checkmark" />
                        <span class="checkboxLabel">You can contact me to follow up on this feedback.</span>
                    </label>

                    <button class="ctaButton" type="submit" disabled={formState === 'submitting' || rating === 0}>
                        {#if formState === 'submitting'}
                            Submitting...
                        {:else}
                            Submit Feedback
                        {/if}
                    </button>
                    {#if formState === 'error'}
                        <p class="errorText">{errorMessage}</p>
                    {/if}
                </form>
            {:else}
                <p class="sub-headline">Please <a href="/">log in</a> to submit feedback.</p>
            {/if}
        {/if}
    </main>
</div>

<style>
    /* ... Keep all existing styles from the previous answer ... */
    :global(body) {
        margin: 0;
        background: radial-gradient(circle at 50% 50%, #5a4743, #3a2723);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
            sans-serif;
        color: #ffffff;
    }

    .pageContainer {
        width: 100%;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        box-sizing: border-box;
        padding: 20px;
    }

    .content {
        width: 100%;
        max-width: 600px;
        text-align: center;
    }

    .textContent {
        margin-bottom: 40px;
    }

    .headline {
        font-size: clamp(2.2rem, 5vw, 3.5rem);
        font-weight: 700;
        margin: 0 0 15px 0;
        letter-spacing: -0.02em;
    }

    .sub-headline {
        font-size: clamp(1rem, 2.5vw, 1.25rem);
        font-weight: 400;
        color: #d1d1d6;
        line-height: 1.5;
        margin: 0 auto;
    }

    .sub-headline a {
        color: #34c759;
        text-decoration: none;
        font-weight: 600;
    }

    .feedbackForm {
        display: flex;
        flex-direction: column;
        gap: 20px;
    }

    textarea {
        background-color: rgba(0, 0, 0, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 12px;
        padding: 15px;
        color: #ffffff;
        font-family: inherit;
        font-size: 1rem;
        resize: vertical;
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }

    textarea:focus {
        outline: none;
        border-color: #34c759;
        box-shadow: 0 0 0 3px rgba(52, 199, 89, 0.3);
    }

    .ctaButton {
        background-color: #34c759;
        color: white;
        font-size: 1.1rem;
        font-weight: 600;
        border: none;
        border-radius: 9999px;
        padding: 18px 35px;
        cursor: pointer;
        transition: background-color 0.2s ease, transform 0.2s ease;
    }

    .ctaButton:hover:not(:disabled) {
        background-color: #30b452; /* A slightly darker shade for hover */
        transform: scale(1.03);
    }

    .ctaButton:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .header {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        padding: 20px;
        box-sizing: border-box;
    }

    .backButton {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        padding: 5px;
        opacity: 0.8;
        transition: opacity 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .backButton:hover {
        opacity: 1;
    }

    .returnButton {
        background-color: rgba(255, 255, 255, 0.1);
        color: white;
        font-size: 1rem;
        font-weight: 500;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 9999px;
        padding: 12px 24px;
        cursor: pointer;
        margin-top: 20px;
        transition: background-color 0.2s ease;
    }

    .returnButton:hover {
        background-color: rgba(255, 255, 255, 0.2);
    }

    .errorText {
        color: #ff453a; /* A noticeable error color */
        margin-top: -10px;
    }

    /* --- NEW STYLES --- */
    .starRating {
        display: flex;
        justify-content: center;
        gap: 10px;
        margin-bottom: 10px;
    }

    .starButton {
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
        line-height: 0; /* Prevents extra spacing */
    }

    .starButton svg {
        transition: transform 0.1s ease-in-out;
    }

    .starButton:hover svg {
        transform: scale(1.15);
    }

    .starButton svg path {
        transition: fill 0.2s ease;
    }

    .starButton svg.filled path {
        fill: #ffd700;
    }

    .checkboxContainer {
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: pointer;
        font-size: 0.9rem;
        color: #d1d1d6;
        margin: 0 auto; /* Center it */
        width: fit-content; /* Make it only as wide as its content */
    }

    .checkboxContainer input {
        display: none; /* Hide the default checkbox */
    }

    .checkmark {
        height: 20px;
        width: 20px;
        background-color: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 4px;
        display: inline-block;
        position: relative;
        transition: background-color 0.2s ease;
    }

    .checkboxContainer:hover .checkmark {
        background-color: rgba(0, 0, 0, 0.5);
    }

    .checkboxContainer input:checked + .checkmark {
        background-color: #34c759;
        border-color: #34c759;
    }

    .checkmark:after {
        content: '';
        position: absolute;
        display: none;
        left: 6px;
        top: 2px;
        width: 5px;
        height: 10px;
        border: solid white;
        border-width: 0 3px 3px 0;
        transform: rotate(45deg);
    }

    .checkboxContainer input:checked + .checkmark:after {
        display: block;
    }
</style>