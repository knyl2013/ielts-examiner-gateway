<script lang="ts">
    import { goto } from '$app/navigation';
    import Login from '$lib/components/Login.svelte';
    import { userProfileStore } from '$lib/stores';
    import { signInWithGoogle } from '$lib/auth';
	import { PUBLIC_GUEST_DAILY_LIMIT, PUBLIC_SIGNED_USER_DAILY_LIMIT } from '$env/static/public';

    const handleBack = () => {
        goto('/');
    };

    $: plans = [
        {
            title: 'Guest',
            price: 'Free',
            features: [
                // Use the limit from data and handle pluralization ('report' vs 'reports')
                `<strong>${PUBLIC_GUEST_DAILY_LIMIT}</strong> IELTS ${
                    PUBLIC_GUEST_DAILY_LIMIT === 1 ? 'report' : 'reports'
                } per day`
            ],
            cta: {
                text: 'Start Practicing',
                action: () => goto('/call')
            }
        },
        {
            title: 'Signed User',
            price: 'Free',
            features: [
                // Use the limit from data here as well
                `<strong>${PUBLIC_SIGNED_USER_DAILY_LIMIT}</strong> IELTS ${
                    PUBLIC_SIGNED_USER_DAILY_LIMIT === 1 ? 'report' : 'reports'
                } per day`,
                'AI Memory Control'
            ],
            cta: {
                text: 'Sign Up for Free',
                action: signInWithGoogle
            }
        },
        {
            title: 'Plus User',
            price: 'Premium',
            status: 'coming-soon',
            features: ['<strong>Unlimited</strong> IELTS reports per day', 'AI Memory Control'],
            cta: {
                text: 'Coming Soon',
                action: () => {} // This action won't be triggered
            }
        }
    ];

    // This reactive variable will hold the name of the user's current plan
    let currentPlanName: string;
    $: {
        if ($userProfileStore === null) {
            currentPlanName = 'Guest';
        } else if ($userProfileStore.plan === 'plus') {
            currentPlanName = 'Plus User';
        } else {
            currentPlanName = 'Signed User';
        }
    }
</script>

<header class="header">
    <div>
        <button class="backButton" on:click={handleBack} aria-label="Go Back">
            <svg width="28" height="28" viewBox="0 0 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 11H7.83L13.42 5.41L12 4L4 12L12 20L13.41 18.59L7.83 13H20V11Z" fill="white" />
            </svg>
        </button>
        <Login />
    </div>
</header>

<div class="pageContainer">
    <main class="scrollableContent">
        <section class="pageHeaderSection">
            <div class="textContent">
                <h1 class="headline">Choose Your Plan</h1>
                <p class="sub-headline">
                    Unlock your full potential with a plan that fits your practice needs.
                </p>
            </div>
        </section>

        <section class="pricingSection">
            <div class="pricingGrid">
                {#each plans as plan}
                    <div
                        class="pricingCard"
                        class:highlighted={plan.title === currentPlanName}
                        class:disabled={plan.status === 'coming-soon'}
                    >
                        {#if plan.status === 'coming-soon'}
                            <div class="badge badge-secondary">Coming Soon</div>
                        {:else if plan.title === currentPlanName}
                            <div class="badge">Current Plan</div>
                        {/if}

                        <h3 class="planTitle">{plan.title}</h3>
                        <p class="planPrice">{plan.price}</p>
                        <ul class="featureList">
                            {#each plan.features as feature}
                                <li>
                                    <svg viewBox="0 0 24 24"
                                        ><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg
                                    >
                                    <span>{@html feature}</span>
                                </li>
                            {/each}
                        </ul>

                        <button
                            class="ctaButton"
                            on:click={plan.cta.action}
                            disabled={plan.title === currentPlanName || plan.status === 'coming-soon'}
                        >
                            {plan.title === currentPlanName ? 'Your Current Plan' : plan.cta.text}
                        </button>
                    </div>
                {/each}
            </div>
        </section>
    </main>
</div>

<style>
    /* --- Inherited Global & Layout Styles --- */
    :global(body) {
        margin: 0;
        background: radial-gradient(circle at 50% 50%, #5a4743, #3a2723);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
            sans-serif;
        color: #ffffff;
    }

    .pageContainer {
        width: 100%;
        max-width: 1200px;
        margin: 0 auto;
    }

    .scrollableContent {
        padding: 0 20px 120px;
    }

    /* --- Inherited Component Styles --- */
    .textContent {
        max-width: 700px;
        margin: 0 auto;
    }

    .headline {
        font-size: clamp(2.5rem, 6vw, 4.5rem);
        font-weight: 700;
        margin: 0 0 15px 0;
        letter-spacing: -0.02em;
    }

    .sub-headline {
        font-size: clamp(1rem, 2.5vw, 1.5rem);
        font-weight: 400;
        color: #d1d1d6;
        line-height: 1.5;
        max-width: 550px;
        margin: 0 auto;
    }

    .ctaButton {
        background-color: #34c759;
        color: white;
        font-size: 1rem;
        font-weight: 600;
        border: none;
        border-radius: 9999px;
        padding: 15px 25px;
        cursor: pointer;
        transition: background-color 0.2s ease, transform 0.2s ease, opacity 0.2s ease;
        width: 100%;
        margin-top: auto;
    }

    .ctaButton:hover {
        background-color: #2da349;
        transform: scale(1.03);
    }

    .ctaButton:disabled,
    .ctaButton:disabled:hover {
        background-color: #555;
        cursor: not-allowed;
        transform: none;
        opacity: 0.8;
    }

    .header {
        padding: 50px 20px 20px;
        text-align: center;
        position: relative;
    }

    .backButton {
        position: absolute;
        left: 20px;
        top: 13px;
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        padding: 5px;
        opacity: 0.8;
        transition: opacity 0.2s ease;
    }

    .backButton:hover {
        opacity: 1;
    }

    /* --- Page-Specific Styles --- */

    .pageHeaderSection {
        text-align: center;
        padding: 40px 0 60px 0;
    }

    .pricingGrid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 30px;
        width: 100%;
        max-width: 1000px;
    }

    .pricingCard {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        padding: 30px;
        text-align: left;
        display: flex;
        flex-direction: column;
        transition: transform 0.3s ease, box-shadow 0.3s ease, opacity 0.3s ease;
        position: relative;
    }

    .pricingCard:hover {
        transform: translateY(-10px);
        box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.3);
    }

    .pricingCard.disabled {
        opacity: 0.6;
    }

    .pricingCard.disabled:hover {
        transform: none;
        box-shadow: none;
    }

    .pricingCard.highlighted {
        border-color: #34c759;
        transform: translateY(-10px);
    }

    .badge {
        position: absolute;
        top: -1px;
        right: 20px;
        background-color: #34c759;
        color: white;
        padding: 6px 14px;
        font-size: 0.8rem;
        font-weight: 600;
        border-radius: 0 0 8px 8px;
    }

    .badge-secondary {
        background-color: #8e8e93; /* A neutral gray */
    }

    .planTitle {
        font-size: 1.8rem;
        font-weight: 600;
        margin: 0;
    }

    .planPrice {
        font-size: 1.2rem;
        color: #d1d1d6;
        margin: 5px 0 25px 0;
        padding-bottom: 25px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .featureList {
        list-style: none;
        padding: 0;
        margin: 0 0 30px 0;
        flex-grow: 1;
    }

    .featureList li {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 15px;
        font-size: 1rem;
        line-height: 1.5;
        color: #d1d1d6;
    }

    .featureList li strong {
        color: #ffffff;
        font-weight: 500;
    }

    .featureList svg {
        width: 24px;
        height: 24px;
        fill: #34c759;
        flex-shrink: 0;
        margin-top: 1px;
    }
</style>